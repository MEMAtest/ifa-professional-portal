// =====================================================
// FILE: src/app/api/assessments/atr/route.ts
// Refactor: use shared auth + service client (no server-side auth.getUser fallbacks)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { isUUID } from '@/lib/utils'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { logger, getErrorMessage } from '@/lib/errors'
import { notifyATRCompleted } from '@/lib/notifications/notificationService'

export const dynamic = 'force-dynamic'

// GET method to fetch ATR scores for a client
export async function GET(request: NextRequest) {
  try {
    logger.debug('ATR GET request received')

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    logger.debug('ATR GET client ID', { clientId })

    if (!clientId) {
      logger.warn('No client ID provided in ATR GET request')
      return NextResponse.json(
        {
          error: 'Client ID is required',
          success: false
        },
        { status: 400 }
      )
    }

    if (!isUUID(clientId)) {
      logger.warn('Invalid client ID format in ATR GET', { clientId })
      return NextResponse.json(
        {
          error: 'Invalid client ID format',
          success: false
        },
        { status: 400 }
      )
    }

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }

    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    logger.debug('Fetching ATR data from database', { clientId })

    // Fetch current ATR assessment data from database
    const { data: atrData, error } = await supabase
      .from('atr_assessments')
      .select(`
        id,
        risk_level,
        risk_category,
        total_score,
        assessment_date,
        category_scores,
        recommendations,
        is_current,
        notes,
        completed_by,
        version,
        created_at,
        updated_at
      `)
      .eq('client_id', clientId)
      .eq('is_current', true)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logger.error('ATR database fetch error', error, { clientId })
      return NextResponse.json(
        {
          error: 'Failed to fetch ATR data',
          message: error.message,
          success: false
        },
        { status: 500 }
      )
    }

    // Also get the total count of versions for this client
    const { count: versionCount } = await supabase
      .from('atr_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    logger.debug('ATR data fetched successfully', { clientId, found: !!atrData })

    // Return successful response
    return NextResponse.json({
      success: true,
      data: atrData,
      hasAssessment: !!atrData,
      totalVersions: versionCount || 0,
      clientId: clientId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('ATR GET route error', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
        success: false
      },
      { status: 500 }
    )
  }
}

// POST method for creating new ATR assessments with PROPER VERSION INCREMENTING
export async function POST(request: NextRequest) {
  try {
    logger.debug('ATR POST request received')

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!
    const userId = ctx.userId || null
    const supabase = getSupabaseServiceClient()

    const body = await request.json()
    logger.debug('ATR POST body received', { clientId: body.clientId, hasAnswers: !!body.answers })

    const {
      clientId,
      answers,
      totalScore,
      riskCategory,
      riskLevel,
      categoryScores,
      recommendations,
      notes
    } = body

    // Validate required fields
    if (!clientId) {
      logger.warn('No client ID provided in ATR POST request')
      return NextResponse.json(
        {
          error: 'Client ID is required',
          success: false
        },
        { status: 400 }
      )
    }

    if (totalScore === undefined || totalScore === null || !riskCategory || riskLevel === undefined || riskLevel === null) {
      logger.warn('Missing required ATR assessment data', { clientId })
      return NextResponse.json(
        {
          error: 'Missing required assessment data: totalScore, riskCategory, and riskLevel are required',
          success: false
        },
        { status: 400 }
      )
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    // Validate score and level ranges
    if (typeof totalScore !== 'number' || totalScore < 0 || totalScore > 100) {
      return NextResponse.json(
        { 
          error: 'Total score must be a number between 0 and 100',
          success: false 
        },
        { status: 400 }
      )
    }

    if (typeof riskLevel !== 'number' || riskLevel < 1 || riskLevel > 10) {
      return NextResponse.json(
        { 
          error: 'Risk level must be a number between 1 and 10',
          success: false 
        },
        { status: 400 }
      )
    }

    // START TRANSACTION - Get the latest version number for this client
    logger.debug('Getting latest ATR version', { clientId })

    const { data: latestAssessment, error: versionError } = await supabase
      .from('atr_assessments')
      .select('version')
      .eq('client_id', clientId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionError && versionError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine for first assessment
      logger.error('Error fetching latest ATR version', versionError, { clientId })
      return NextResponse.json(
        {
          error: 'Failed to fetch version information',
          message: versionError.message,
          success: false
        },
        { status: 500 }
      )
    }

    // Calculate new version number
    const currentMaxVersion = latestAssessment?.version || 0
    const newVersion = currentMaxVersion + 1

    logger.info('Creating ATR assessment', { clientId, version: newVersion })

    // Mark all previous assessments as not current
    if (currentMaxVersion > 0) {
      logger.debug('Marking previous ATR assessments as not current', { clientId })

      const { error: updateError } = await supabase
        .from('atr_assessments')
        .update({
          is_current: false,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)
        .eq('is_current', true)

      if (updateError) {
        logger.warn('Error updating previous ATR assessments', { clientId, error: getErrorMessage(updateError) })
        // Don't fail the request, but log the error
      }
    }

    // Create new assessment with proper version number
    const { data, error } = await supabase
      .from('atr_assessments')
      .insert({
        client_id: clientId,
        answers: answers || {},
        total_score: totalScore,
        risk_category: riskCategory,
        risk_level: riskLevel,
        category_scores: categoryScores || {},
        recommendations: recommendations || [],
        version: newVersion, // EXPLICITLY SET VERSION
        is_current: true,
        completed_by: userId,
        notes: notes || '',
        assessment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logger.error('ATR creation error', error, { clientId })
      return NextResponse.json(
        {
          error: 'Failed to create ATR assessment',
          message: error.message,
          success: false
        },
        { status: 500 }
      )
    }

    logger.info('ATR assessment created successfully', { assessmentId: data.id, version: newVersion, clientId })

    // Log activity for ATR completion
    try {
      await supabase
        .from('activity_log')
        .insert({
          id: crypto.randomUUID(),
          client_id: clientId,
          action: `ATR assessment completed (Score: ${totalScore}, Level: ${riskLevel})`,
          type: 'atr_completed',
          date: new Date().toISOString()
        })
    } catch (activityError) {
      logger.warn('Failed to log ATR completion activity', { clientId, error: getErrorMessage(activityError) })
    }

    // Send bell notification
    if (userId) {
      try {
        // Fetch client name for notification
        const { data: clientData } = await supabase
          .from('clients')
          .select('personal_details')
          .eq('id', clientId)
          .single()
        const personalDetails = clientData?.personal_details as Record<string, unknown> | null
        const clientName = (personalDetails?.firstName || personalDetails?.first_name || 'Client') as string
        await notifyATRCompleted(userId, clientId, clientName, data.id, totalScore)
      } catch (notifyError) {
        logger.warn('Failed to send ATR notification', { clientId, error: notifyError instanceof Error ? notifyError.message : String(notifyError) })
      }
    }

    // Update client risk profile
    try {
      logger.debug('Updating client risk profile', { clientId })

      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({
          'riskProfile.attitudeToRisk': riskLevel,
          'riskProfile.riskTolerance': riskCategory,
          'riskProfile.lastAssessment': new Date().toISOString(),
          'riskProfile.lastAssessmentId': data.id,
          'riskProfile.lastAssessmentDate': new Date().toISOString(),
          'riskProfile.currentATRVersion': newVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)

      if (clientUpdateError) {
        logger.warn('Error updating client risk profile', { clientId, error: getErrorMessage(clientUpdateError) })
        // Don't fail the request if profile update fails
      } else {
        logger.debug('Client risk profile updated', { clientId })
      }
    } catch (profileError) {
      logger.warn('Exception updating client risk profile', { clientId, error: getErrorMessage(profileError) })
      // Don't fail the request if profile update fails
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: data,
      message: `ATR assessment created successfully (Version ${newVersion})`,
      clientId: clientId,
      assessmentId: data.id,
      version: newVersion,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('ATR POST route error', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
        success: false
      },
      { status: 500 }
    )
  }
}

// PUT method for updating existing ATR assessments
export async function PUT(request: NextRequest) {
  try {
    logger.debug('ATR PUT request received')
    
    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!
    const userId = ctx.userId || null
    const supabase = getSupabaseServiceClient()
    
    const body = await request.json()
    const { 
      assessmentId,
      clientId,
      answers, 
      totalScore,
      riskCategory,
      riskLevel,
      categoryScores, 
      recommendations,
      notes
    } = body

    if (!assessmentId) {
      logger.warn('No assessment ID provided in ATR PUT request')
      return NextResponse.json(
        {
          error: 'Assessment ID is required for updates',
          success: false
        },
        { status: 400 }
      )
    }

    logger.debug('Updating ATR assessment', { assessmentId })

    // Enforce access by looking up the owning client if not provided.
    const resolvedClientId =
      clientId ||
      (
        await supabase
          .from('atr_assessments')
          .select('client_id')
          .eq('id', assessmentId)
          .maybeSingle()
      ).data?.client_id

    if (!resolvedClientId) {
      return NextResponse.json({ error: 'Client not found', success: false }, { status: 404 })
    }

    const access = await requireClientAccess({
      supabase,
      clientId: String(resolvedClientId),
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    // Update existing assessment
    const { data, error } = await supabase
      .from('atr_assessments')
      .update({
        answers: answers || {},
        total_score: totalScore,
        risk_category: riskCategory,
        risk_level: riskLevel,
        category_scores: categoryScores || {},
        recommendations: recommendations || [],
        completed_by: userId,
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single()

    if (error) {
      logger.error('ATR update error', error, { assessmentId })
      return NextResponse.json(
        {
          error: 'Failed to update ATR assessment',
          message: error.message,
          success: false
        },
        { status: 500 }
      )
    }

    logger.info('ATR assessment updated successfully', { assessmentId })

    // Log activity for ATR update
    try {
      await supabase
        .from('activity_log')
        .insert({
          id: crypto.randomUUID(),
          client_id: resolvedClientId,
          action: 'Risk profile updated',
          type: 'atr_updated',
          date: new Date().toISOString()
        })
    } catch (activityError) {
      logger.warn('Failed to log ATR update activity', { clientId: resolvedClientId, error: getErrorMessage(activityError) })
    }

    // Update client risk profile if clientId provided
    if (resolvedClientId && riskLevel && riskCategory) {
      try {
        await supabase
          .from('clients')
          .update({
            'riskProfile.attitudeToRisk': riskLevel,
            'riskProfile.riskTolerance': riskCategory,
            'riskProfile.lastAssessment': new Date().toISOString(),
            'riskProfile.lastAssessmentId': assessmentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', resolvedClientId)
      } catch (profileError) {
        logger.warn('Error updating client profile during PUT', { clientId: resolvedClientId, error: getErrorMessage(profileError) })
      }
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'ATR assessment updated successfully',
      assessmentId: assessmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('ATR PUT route error', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
        success: false
      },
      { status: 500 }
    )
  }
}

// DELETE method for removing ATR assessments
export async function DELETE(request: NextRequest) {
  try {
    logger.debug('ATR DELETE request received')
    
    const { searchParams } = new URL(request.url)
    const assessmentId = searchParams.get('assessmentId')
    
    if (!assessmentId) {
      return NextResponse.json(
        { 
          error: 'Assessment ID is required for deletion',
          success: false 
        },
        { status: 400 }
      )
    }

    logger.debug('Deleting ATR assessment', { assessmentId })

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    // Enforce access by resolving client_id first.
    const { data: row } = await supabase
      .from('atr_assessments')
      .select('client_id')
      .eq('id', assessmentId)
      .maybeSingle()

    if (!row?.client_id) {
      return NextResponse.json({ error: 'Assessment not found', success: false }, { status: 404 })
    }

    const access = await requireClientAccess({
      supabase,
      clientId: String(row.client_id),
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    // Delete assessment
    const { error } = await supabase
      .from('atr_assessments')
      .delete()
      .eq('id', assessmentId)

    if (error) {
      logger.error('ATR deletion error', error, { assessmentId })
      return NextResponse.json(
        {
          error: 'Failed to delete ATR assessment',
          message: error.message,
          success: false
        },
        { status: 500 }
      )
    }

    logger.info('ATR assessment deleted successfully', { assessmentId })

    return NextResponse.json({
      success: true,
      message: 'ATR assessment deleted successfully',
      assessmentId: assessmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('ATR DELETE route error', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
        success: false
      },
      { status: 500 }
    )
  }
}

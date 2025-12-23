// =====================================================
// FILE: src/app/api/assessments/cfl/route.ts
// Refactor: use shared auth + service client (no server-side auth.getUser fallbacks)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { isUUID } from '@/lib/utils'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { logger, getErrorMessage } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// GET method to fetch CFL scores for a client
export async function GET(request: NextRequest) {
  try {
    logger.debug('CFL GET request received')

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    logger.debug('CFL GET client ID', { clientId })

    if (!clientId) {
      logger.warn('No client ID provided in CFL GET request')
      return NextResponse.json(
        {
          error: 'Client ID is required',
          success: false
        },
        { status: 400 }
      )
    }

    if (!isUUID(clientId)) {
      logger.warn('Invalid client ID format in CFL GET', { clientId })
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

    logger.debug('Fetching CFL data from database', { clientId })

    // Fetch current CFL assessment data from database
    const { data: cflData, error } = await supabase
      .from('cfl_assessments')
      .select(`
        id,
        capacity_level,
        capacity_category,
        total_score,
        max_loss_percentage,
        confidence_level,
        assessment_date,
        monthly_income,
        monthly_expenses,
        emergency_fund,
        other_investments,
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
      logger.error('CFL database fetch error', error, { clientId })
      return NextResponse.json(
        {
          error: 'Failed to fetch CFL data',
          message: error.message,
          success: false
        },
        { status: 500 }
      )
    }

    // Also get the total count of versions for this client
    const { count: versionCount } = await supabase
      .from('cfl_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    logger.debug('CFL data fetched successfully', { clientId, found: !!cflData })

    // Return successful response
    return NextResponse.json({
      success: true,
      data: cflData,
      hasAssessment: !!cflData,
      totalVersions: versionCount || 0,
      clientId: clientId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('CFL GET route error', error)
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

// POST method for creating new CFL assessments with PROPER VERSION INCREMENTING
export async function POST(request: NextRequest) {
  try {
    logger.debug('CFL POST request received')

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!
    const userId = ctx.userId || null
    const supabase = getSupabaseServiceClient()

    const body = await request.json()
    logger.debug('CFL POST body received', { clientId: body.clientId, hasAnswers: !!body.answers })

    const {
      clientId,
      answers,
      totalScore,
      capacityCategory,
      capacityLevel,
      maxLossPercentage,
      confidenceLevel,
      recommendations,
      monthlyIncome,
      monthlyExpenses,
      emergencyFund,
      otherInvestments,
      notes
    } = body

    // Validate required fields
    if (!clientId) {
      logger.warn('No client ID provided in CFL POST request')
      return NextResponse.json(
        {
          error: 'Client ID is required',
          success: false
        },
        { status: 400 }
      )
    }

    if (totalScore === undefined || totalScore === null || !capacityCategory || capacityLevel === undefined || capacityLevel === null) {
      logger.warn('Missing required CFL assessment data', { clientId })
      return NextResponse.json(
        {
          error: 'Missing required assessment data: totalScore, capacityCategory, and capacityLevel are required',
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

    if (typeof capacityLevel !== 'number' || capacityLevel < 1 || capacityLevel > 10) {
      return NextResponse.json(
        {
          error: 'Capacity level must be a number between 1 and 10',
          success: false
        },
        { status: 400 }
      )
    }

    // Validate percentage values
    if (maxLossPercentage !== undefined && (typeof maxLossPercentage !== 'number' || maxLossPercentage < 0 || maxLossPercentage > 100)) {
      return NextResponse.json(
        {
          error: 'Max loss percentage must be a number between 0 and 100',
          success: false
        },
        { status: 400 }
      )
    }

    if (confidenceLevel !== undefined && (typeof confidenceLevel !== 'number' || confidenceLevel < 0 || confidenceLevel > 100)) {
      return NextResponse.json(
        {
          error: 'Confidence level must be a number between 0 and 100',
          success: false
        },
        { status: 400 }
      )
    }

    // START TRANSACTION - Get the latest version number for this client
    logger.debug('Getting latest CFL version', { clientId })

    const { data: latestAssessment, error: versionError } = await supabase
      .from('cfl_assessments')
      .select('version')
      .eq('client_id', clientId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionError && versionError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine for first assessment
      logger.error('Error fetching latest CFL version', versionError, { clientId })
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

    logger.info('Creating CFL assessment', { clientId, version: newVersion })

    // Mark all previous assessments as not current
    if (currentMaxVersion > 0) {
      logger.debug('Marking previous CFL assessments as not current', { clientId })

      const { error: updateError } = await supabase
        .from('cfl_assessments')
        .update({
          is_current: false,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)
        .eq('is_current', true)

      if (updateError) {
        logger.warn('Error updating previous CFL assessments', { clientId, error: getErrorMessage(updateError) })
        // Don't fail the request, but log the error
      }
    }

    // Create new assessment with proper version number
    const { data, error } = await supabase
      .from('cfl_assessments')
      .insert({
        client_id: clientId,
        answers: answers || {},
        total_score: totalScore,
        capacity_category: capacityCategory,
        capacity_level: capacityLevel,
        max_loss_percentage: maxLossPercentage || 0,
        confidence_level: confidenceLevel || 0,
        monthly_income: monthlyIncome || 0,
        monthly_expenses: monthlyExpenses || 0,
        emergency_fund: emergencyFund || 0,
        other_investments: otherInvestments || 0,
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
      logger.error('CFL creation error', error, { clientId })
      return NextResponse.json(
        {
          error: 'Failed to create CFL assessment',
          message: error.message,
          success: false
        },
        { status: 500 }
      )
    }

    logger.info('CFL assessment created successfully', { assessmentId: data.id, version: newVersion, clientId })

    // Update client risk profile
    try {
      logger.debug('Updating client risk profile with CFL data', { clientId })

      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({
          'riskProfile.capacityForLoss': capacityCategory,
          'riskProfile.riskCapacity': capacityCategory,
          'riskProfile.lastAssessment': new Date().toISOString(),
          'riskProfile.lastAssessmentId': data.id,
          'riskProfile.lastAssessmentDate': new Date().toISOString(),
          'riskProfile.currentCFLVersion': newVersion,
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
      message: `CFL assessment created successfully (Version ${newVersion})`,
      clientId: clientId,
      assessmentId: data.id,
      version: newVersion,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('CFL POST route error', error)
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

// PUT method for updating existing CFL assessments
export async function PUT(request: NextRequest) {
  try {
    logger.debug('CFL PUT request received')

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
      capacityCategory,
      capacityLevel,
      maxLossPercentage,
      confidenceLevel,
      recommendations,
      monthlyIncome,
      monthlyExpenses,
      emergencyFund,
      otherInvestments,
      notes
    } = body

    if (!assessmentId) {
      logger.warn('No assessment ID provided in CFL PUT request')
      return NextResponse.json(
        {
          error: 'Assessment ID is required for updates',
          success: false
        },
        { status: 400 }
      )
    }

    logger.debug('Updating CFL assessment', { assessmentId })

    const resolvedClientId =
      clientId ||
      (
        await supabase
          .from('cfl_assessments')
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
      .from('cfl_assessments')
      .update({
        answers: answers || {},
        total_score: totalScore,
        capacity_category: capacityCategory,
        capacity_level: capacityLevel,
        max_loss_percentage: maxLossPercentage || 0,
        confidence_level: confidenceLevel || 0,
        monthly_income: monthlyIncome || 0,
        monthly_expenses: monthlyExpenses || 0,
        emergency_fund: emergencyFund || 0,
        other_investments: otherInvestments || 0,
        recommendations: recommendations || [],
        completed_by: userId,
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single()

    if (error) {
      logger.error('CFL update error', error, { assessmentId })
      return NextResponse.json(
        {
          error: 'Failed to update CFL assessment',
          message: error.message,
          success: false
        },
        { status: 500 }
      )
    }

    logger.info('CFL assessment updated successfully', { assessmentId })

    // Update client risk profile if clientId provided
    if (resolvedClientId && capacityLevel && capacityCategory) {
      try {
        await supabase
          .from('clients')
          .update({
            'riskProfile.capacityForLoss': capacityCategory,
            'riskProfile.riskCapacity': capacityCategory,
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
      message: 'CFL assessment updated successfully',
      assessmentId: assessmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('CFL PUT route error', error)
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

// DELETE method for removing CFL assessments
export async function DELETE(request: NextRequest) {
  try {
    logger.debug('CFL DELETE request received')

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

    logger.debug('Deleting CFL assessment', { assessmentId })

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    const { data: row } = await supabase
      .from('cfl_assessments')
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
      .from('cfl_assessments')
      .delete()
      .eq('id', assessmentId)

    if (error) {
      logger.error('CFL deletion error', error, { assessmentId })
      return NextResponse.json(
        {
          error: 'Failed to delete CFL assessment',
          message: error.message,
          success: false
        },
        { status: 500 }
      )
    }

    logger.info('CFL assessment deleted successfully', { assessmentId })

    return NextResponse.json({
      success: true,
      message: 'CFL assessment deleted successfully',
      assessmentId: assessmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('CFL DELETE route error', error)
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

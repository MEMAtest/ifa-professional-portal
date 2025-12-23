// src/app/api/assessments/share/[token]/route.ts
// API for validating tokens and submitting assessment responses

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger, getErrorMessage } from '@/lib/errors'
import { createAuditLogger, getClientIP, getUserAgent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Assessment type labels
const ASSESSMENT_LABELS: Record<string, string> = {
  atr: 'Attitude to Risk (ATR)',
  cfl: 'Capacity for Loss (CFL)',
  investor_persona: 'Investor Persona'
}

// GET: Validate token and return assessment info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Find the share by token
    const { data: share, error: queryError } = await supabase
      .from('assessment_shares')
      .select('*')
      .eq('token', token)
      .single()

    if (queryError || !share) {
      return NextResponse.json(
        { error: 'Invalid or expired assessment link', code: 'INVALID_TOKEN' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(share.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('assessment_shares')
        .update({ status: 'expired' })
        .eq('id', share.id)

      return NextResponse.json(
        { error: 'This assessment link has expired', code: 'EXPIRED' },
        { status: 410 }
      )
    }

    // Check if revoked
    if (share.status === 'revoked') {
      return NextResponse.json(
        { error: 'This assessment link has been revoked', code: 'REVOKED' },
        { status: 410 }
      )
    }

    // Check if already completed
    if (share.status === 'completed') {
      return NextResponse.json(
        { error: 'This assessment has already been completed', code: 'COMPLETED' },
        { status: 410 }
      )
    }

    // Check access count limit
    if (share.access_count >= share.max_access_count) {
      return NextResponse.json(
        { error: 'This link has reached its maximum access limit', code: 'ACCESS_LIMIT' },
        { status: 410 }
      )
    }

    // Increment access count and update status
    const newStatus = share.status === 'pending' ? 'viewed' : share.status
    await supabase
      .from('assessment_shares')
      .update({
        access_count: share.access_count + 1,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', share.id)

    // Audit log the share access
    const auditLogger = createAuditLogger(supabase)
    await auditLogger.logShareAccessed(
      share.id,
      share.client_id,
      getClientIP(request.headers),
      getUserAgent(request.headers)
    )

    logger.debug('Share accessed', { shareId: share.id, status: newStatus })

    // Return assessment info (without sensitive data)
    return NextResponse.json({
      success: true,
      assessment: {
        id: share.id,
        type: share.assessment_type,
        typeLabel: ASSESSMENT_LABELS[share.assessment_type] || share.assessment_type,
        clientName: share.client_name,
        advisorName: share.metadata?.advisor_name || 'Your Financial Advisor',
        expiresAt: share.expires_at,
        status: newStatus,
        customMessage: share.custom_message,
        requiresPassword: !!share.password_hash
      }
    })

  } catch (error) {
    logger.error('Error validating token', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Submit completed assessment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    // Find the share
    const { data: share, error: queryError } = await supabase
      .from('assessment_shares')
      .select('*')
      .eq('token', token)
      .single()

    if (queryError || !share) {
      return NextResponse.json(
        { error: 'Invalid assessment link' },
        { status: 404 }
      )
    }

    // Check if can submit
    if (share.status === 'completed') {
      return NextResponse.json(
        { error: 'This assessment has already been submitted' },
        { status: 400 }
      )
    }

    if (share.status === 'revoked' || share.status === 'expired') {
      return NextResponse.json(
        { error: 'This assessment link is no longer valid' },
        { status: 400 }
      )
    }

    if (new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This assessment link has expired' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { responses, scores, summary } = body

    if (!responses) {
      return NextResponse.json(
        { error: 'Missing assessment responses' },
        { status: 400 }
      )
    }

    // Update the share with responses
    const { error: updateError } = await supabase
      .from('assessment_shares')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        response_data: {
          responses,
          scores,
          summary,
          submittedAt: new Date().toISOString()
        }
      })
      .eq('id', share.id)

    if (updateError) {
      logger.error('Error saving responses', updateError, { shareId: share.id })
      return NextResponse.json(
        { error: 'Failed to save assessment responses' },
        { status: 500 }
      )
    }

    // Audit log the share completion
    const auditLogger = createAuditLogger(supabase)
    await auditLogger.logShareCompleted(
      share.id,
      share.client_id,
      share.assessment_type,
      getClientIP(request.headers)
    )

    logger.info('Assessment share completed', { shareId: share.id, type: share.assessment_type })

    // Also save to the appropriate assessment table based on type
    try {
      if (share.assessment_type === 'atr') {
        // Save ATR assessment
        await supabase
          .from('atr_assessments')
          .upsert({
            client_id: share.client_id,
            firm_id: share.firm_id,
            assessment_data: responses,
            risk_score: scores?.riskScore,
            risk_category: scores?.riskCategory,
            source: 'client_portal',
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'client_id' })
      } else if (share.assessment_type === 'cfl') {
        // Save CFL assessment
        await supabase
          .from('cfl_assessments')
          .upsert({
            client_id: share.client_id,
            firm_id: share.firm_id,
            assessment_data: responses,
            capacity_score: scores?.capacityScore,
            capacity_rating: scores?.capacityRating,
            source: 'client_portal',
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'client_id' })
      } else if (share.assessment_type === 'investor_persona') {
        // Save Investor Persona assessment
        await supabase
          .from('investor_persona_assessments')
          .upsert({
            client_id: share.client_id,
            firm_id: share.firm_id,
            assessment_data: responses,
            persona_type: scores?.personaType,
            persona_traits: scores?.traits,
            source: 'client_portal',
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'client_id' })
      }
    } catch (saveError) {
      // Log but don't fail - the main response is saved
      logger.warn('Error saving to assessment table', { shareId: share.id, error: getErrorMessage(saveError) })
    }

    // Send notification email to advisor
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin')
      if (!baseUrl) {
        logger.warn('NEXT_PUBLIC_APP_URL not set, skipping email notification')
        throw new Error('Application URL not configured')
      }
      await fetch(`${baseUrl}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'assessmentCompleted',
          recipient: share.metadata?.advisor_email,
          data: {
            clientName: share.client_name,
            advisorName: share.metadata?.advisor_name,
            assessmentType: ASSESSMENT_LABELS[share.assessment_type] || share.assessment_type,
            reviewLink: `${baseUrl}/clients/${share.client_id}?tab=risk`
          }
        })
      })
    } catch (emailError) {
      logger.warn('Failed to send completion email', { error: getErrorMessage(emailError) })
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment submitted successfully'
    })

  } catch (error) {
    logger.error('Error submitting assessment', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update share status (for starting assessment)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    const body = await request.json()
    const { status } = body

    if (!['started'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status update' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('assessment_shares')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('token', token)
      .in('status', ['pending', 'viewed'])

    if (updateError) {
      logger.error('Error updating status', updateError, { token })
      return NextResponse.json(
        { error: 'Failed to update assessment status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Error in PATCH', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

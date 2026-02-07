// src/app/api/assessments/share/[token]/route.ts
// API for validating tokens and submitting assessment responses

import { NextRequest, NextResponse } from 'next/server'
import { logger, getErrorMessage } from '@/lib/errors'
import { createAuditLogger, getClientIP, getUserAgent } from '@/lib/audit'
import { notifyAssessmentCompleted } from '@/lib/notifications/notificationService'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { rateLimit } from '@/lib/security/rateLimit'
import { parseRequestBody } from '@/app/api/utils'
import { sendEmail, sendEmailWithAttachment } from '@/lib/email/emailService'
import { EMAIL_TEMPLATES } from '@/lib/email/emailTemplates'

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
  // Rate limit: 100 requests per minute per IP (public endpoint)
  const rateLimitResponse = await rateLimit(request, 'api')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { token } = await params
    // Cast to any: assessment_shares table not yet in generated Supabase types
    const supabase: any = getSupabaseServiceClient()

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
    // Cast to any: assessment_shares table not yet in generated Supabase types
    const supabase: any = getSupabaseServiceClient()

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

    const body = await parseRequestBody(request)
    const { responses } = body
    // Safely extract scores and summary as objects (may be absent or malformed)
    const scores = body.scores && typeof body.scores === 'object' && !Array.isArray(body.scores) ? body.scores : {}
    const summary = body.summary && typeof body.summary === 'object' && !Array.isArray(body.summary) ? body.summary : {}

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
    // Uses proper versioning pattern matching the advisor-side routes
    let savedAssessmentId: string | null = null
    try {
      const now = new Date().toISOString()

      if (share.assessment_type === 'atr') {
        // Get latest version
        const { data: latestAtr } = await supabase
          .from('atr_assessments')
          .select('version')
          .eq('client_id', share.client_id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()
        const newVersion = (latestAtr?.version || 0) + 1

        // Mark previous as not current
        await supabase
          .from('atr_assessments')
          .update({ is_current: false, updated_at: now })
          .eq('client_id', share.client_id)
          .eq('is_current', true)

        // Insert new ATR assessment with correct column names
        const { data: atrData, error: atrInsertError } = await supabase
          .from('atr_assessments')
          .insert({
            client_id: share.client_id,
            answers: responses || {},
            total_score: scores?.totalScore ?? scores?.riskScore ?? 0,
            risk_category: scores?.riskCategory || summary?.riskCategory || 'Medium',
            risk_level: scores?.riskLevel ?? 5,
            category_scores: scores?.categoryScores || {},
            recommendations: scores?.recommendations || [],
            version: newVersion,
            is_current: true,
            completed_by: null,
            notes: 'Completed via shared assessment link',
            assessment_date: now,
            created_at: now,
            updated_at: now
          })
          .select('id')
          .single()
        if (atrInsertError) {
          logger.error('ATR insert failed', { error: atrInsertError.message, code: atrInsertError.code })
        }
        savedAssessmentId = atrData?.id || null

        // Update client risk_profile
        try {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('risk_profile')
            .eq('id', share.client_id)
            .single()
          const existingRiskProfile =
            existingClient?.risk_profile &&
            typeof existingClient.risk_profile === 'object' &&
            !Array.isArray(existingClient.risk_profile)
              ? (existingClient.risk_profile as Record<string, unknown>)
              : {}
          await supabase
            .from('clients')
            .update({
              risk_profile: {
                ...existingRiskProfile,
                attitudeToRisk: scores?.riskLevel ?? 5,
                riskTolerance: scores?.riskCategory || 'Medium',
                lastAssessment: now,
                lastAssessmentId: savedAssessmentId,
                lastAssessmentDate: now,
                currentATRVersion: newVersion,
              },
              updated_at: now
            })
            .eq('id', share.client_id)
        } catch (profileError) {
          logger.warn('Error updating client risk profile from shared ATR', { error: getErrorMessage(profileError) })
        }

      } else if (share.assessment_type === 'cfl') {
        // Get latest version
        const { data: latestCfl } = await supabase
          .from('cfl_assessments')
          .select('version')
          .eq('client_id', share.client_id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()
        const newVersion = (latestCfl?.version || 0) + 1

        // Mark previous as not current
        await supabase
          .from('cfl_assessments')
          .update({ is_current: false, updated_at: now })
          .eq('client_id', share.client_id)
          .eq('is_current', true)

        // Insert new CFL assessment with correct column names
        const { data: cflData, error: cflInsertError } = await supabase
          .from('cfl_assessments')
          .insert({
            client_id: share.client_id,
            answers: responses || {},
            total_score: scores?.totalScore ?? scores?.capacityScore ?? 0,
            capacity_category: scores?.capacityCategory || scores?.capacityRating || summary?.capacityCategory || 'Medium',
            capacity_level: scores?.capacityLevel ?? 5,
            max_loss_percentage: scores?.maxLossPercentage ?? 0,
            confidence_level: scores?.confidenceLevel ?? 0,
            version: newVersion,
            is_current: true,
            completed_by: null,
            notes: 'Completed via shared assessment link',
            assessment_date: now,
            created_at: now,
            updated_at: now
          })
          .select('id')
          .single()
        if (cflInsertError) {
          logger.error('CFL insert failed', { error: cflInsertError.message, code: cflInsertError.code })
        }
        savedAssessmentId = cflData?.id || null

        // Update client risk_profile
        try {
          const { data: existingClient } = await supabase
            .from('clients')
            .select('risk_profile')
            .eq('id', share.client_id)
            .single()
          const existingRiskProfile =
            existingClient?.risk_profile &&
            typeof existingClient.risk_profile === 'object' &&
            !Array.isArray(existingClient.risk_profile)
              ? (existingClient.risk_profile as Record<string, unknown>)
              : {}
          await supabase
            .from('clients')
            .update({
              risk_profile: {
                ...existingRiskProfile,
                capacityForLoss: scores?.capacityCategory || scores?.capacityRating || 'Medium',
                riskCapacity: scores?.capacityCategory || scores?.capacityRating || 'Medium',
                lastAssessment: now,
                lastAssessmentId: savedAssessmentId,
                lastAssessmentDate: now,
                currentCFLVersion: newVersion,
              },
              updated_at: now
            })
            .eq('id', share.client_id)
        } catch (profileError) {
          logger.warn('Error updating client risk profile from shared CFL', { error: getErrorMessage(profileError) })
        }

      } else if (share.assessment_type === 'investor_persona') {
        // Get latest version
        const { data: latestPersona } = await supabase
          .from('persona_assessments')
          .select('version')
          .eq('client_id', share.client_id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()
        const newVersion = (latestPersona?.version || 0) + 1

        // Mark previous as not current
        await supabase
          .from('persona_assessments')
          .update({ is_current: false, updated_at: now })
          .eq('client_id', share.client_id)
          .eq('is_current', true)

        // Insert new Persona assessment
        const { data: personaData, error: personaInsertError } = await supabase
          .from('persona_assessments')
          .insert({
            client_id: share.client_id,
            answers: responses || {},
            persona_type: scores?.personaType || summary?.personaType || 'Balanced',
            persona_level: scores?.personaLevel ?? 5,
            scores: scores?.scores ?? null,
            confidence: scores?.confidence ?? null,
            version: newVersion,
            is_current: true,
            completed_by: null,
            notes: 'Completed via shared assessment link',
            assessment_date: now,
            created_at: now,
            updated_at: now
          })
          .select('id')
          .single()
        if (personaInsertError) {
          logger.error('Persona insert failed', { error: personaInsertError.message, code: personaInsertError.code })
        }
        savedAssessmentId = personaData?.id || null
      }
    } catch (saveError) {
      // Log but don't fail - the main response is saved
      logger.warn('Error saving to assessment table', { shareId: share.id, error: getErrorMessage(saveError) })
    }

    // Send notification email to advisor (direct, no internal fetch)
    try {
      const advisorEmail = share.metadata?.advisor_email
      const advisorName = share.metadata?.advisor_name || 'Advisor'
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.plannetic.com'
      const assessmentLabel = ASSESSMENT_LABELS[share.assessment_type] || share.assessment_type
      const reviewLink = `${baseUrl}/clients/${share.client_id}?tab=risk`

      if (advisorEmail) {
        const template = EMAIL_TEMPLATES.assessmentCompleted({
          clientName: share.client_name || 'Client',
          advisorName,
          assessmentType: assessmentLabel,
          reviewLink
        })

        await sendEmail({
          to: advisorEmail,
          subject: template.subject,
          html: template.html,
          firmId: share.firm_id
        })
        logger.info('Advisor completion email sent', { advisorEmail, shareId: share.id })
      }
    } catch (emailError) {
      logger.warn('Failed to send advisor completion email', { error: getErrorMessage(emailError) })
    }

    // Send results email to client with PDF attachment
    try {
      const clientEmail = share.client_email || share.metadata?.client_email
      const clientName = share.client_name || 'Client'
      const advisorName = share.metadata?.advisor_name || 'Your Advisor'
      const firmName = share.metadata?.firm_name || 'Plannetic'
      const assessmentLabel = ASSESSMENT_LABELS[share.assessment_type] || share.assessment_type
      const rawScore = Number(scores?.totalScore ?? scores?.riskScore ?? scores?.capacityScore ?? 0)
      const totalScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0
      const category = String(scores?.riskCategory || scores?.capacityCategory || scores?.capacityRating || scores?.personaType || 'N/A')
      const completedDate = new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })

      if (clientEmail) {
        // Generate simple PDF summary with jsPDF
        const jsPDFModule = await import('jspdf')
        const jsPDF = jsPDFModule.default
        const doc = new jsPDF({ unit: 'pt', format: 'a4' })
        const pw = doc.internal.pageSize.getWidth()
        const margin = 40
        const cw = pw - margin * 2
        let y = margin

        // Header
        doc.setFillColor('#0f172a')
        doc.rect(0, 0, pw, 70, 'F')
        doc.setTextColor('#ffffff')
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(`${assessmentLabel} Results`, margin, 35)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text(`Prepared for ${clientName}`, margin, 52)
        doc.text(completedDate, pw - margin, 52, { align: 'right' })

        y = 95

        // Results card
        doc.setFillColor('#f0fdf4')
        doc.roundedRect(margin, y, cw, 80, 6, 6, 'F')
        doc.setFontSize(10)
        doc.setTextColor('#6b7280')
        doc.text('Score:', margin + 15, y + 25)
        doc.text('Category:', margin + 15, y + 50)
        doc.text('Assessment:', margin + cw / 2, y + 25)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#0f172a')
        doc.text(`${totalScore}/100`, margin + 80, y + 25)
        doc.text(category, margin + 100, y + 50)
        doc.setFontSize(10)
        doc.text(assessmentLabel, margin + cw / 2 + 90, y + 25)
        y += 110

        // Summary section
        doc.setFont('helvetica', 'normal')
        doc.setTextColor('#374151')
        doc.setFontSize(12)
        doc.text('Summary', margin, y)
        y += 20
        doc.setFontSize(10)
        const summaryText = summary?.description ||
          `This assessment was completed on ${completedDate} via a secure shared link. ` +
          `The results indicate a ${category} profile with a score of ${totalScore} out of 100.`
        const lines = doc.splitTextToSize(summaryText, cw)
        doc.text(lines, margin, y)
        y += lines.length * 14 + 30

        // Footer
        doc.setDrawColor('#e2e8f0')
        doc.line(margin, y, pw - margin, y)
        doc.setFontSize(8)
        doc.setTextColor('#9ca3af')
        doc.text(`${firmName} - Confidential`, margin, y + 15)
        doc.text(`Generated ${completedDate}`, pw - margin, y + 15, { align: 'right' })

        const pdfBuffer = doc.output('arraybuffer')
        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

        const template = EMAIL_TEMPLATES.assessmentResultsClient({
          clientName,
          assessmentType: assessmentLabel,
          score: totalScore,
          category,
          completedDate,
          advisorName,
          firmName
        })

        await sendEmailWithAttachment({
          to: clientEmail,
          subject: template.subject,
          html: template.html,
          firmId: share.firm_id,
          attachments: [{
            filename: `${assessmentLabel.replace(/[^a-zA-Z0-9]/g, '-')}-Results.pdf`,
            content: pdfBase64
          }]
        })
        logger.info('Client results email with PDF sent', { clientEmail, shareId: share.id })
      }
    } catch (clientEmailError) {
      logger.warn('Failed to send client results email', { error: getErrorMessage(clientEmailError) })
    }

    // Create in-app notification for advisor (high priority)
    try {
      await notifyAssessmentCompleted(
        share.advisor_id,
        share.client_id,
        share.client_name || 'Client',
        share.id,
        ASSESSMENT_LABELS[share.assessment_type] || share.assessment_type,
        share.firm_id
      )
      logger.info('Assessment completion notification created', { shareId: share.id, advisorId: share.advisor_id })
    } catch (notifyError) {
      logger.warn('Failed to create completion notification', { error: getErrorMessage(notifyError) })
    }

    // Log to activity_log for dashboard timeline
    try {
      await supabase
        .from('activity_log')
        .insert({
          id: crypto.randomUUID(),
          client_id: share.client_id,
          action: `${ASSESSMENT_LABELS[share.assessment_type] || share.assessment_type} completed by client`,
          type: 'assessment_completed',
          user_name: share.client_name || 'Client',
          date: new Date().toISOString()
        })
      logger.info('Activity log entry created', { shareId: share.id, clientId: share.client_id })
    } catch (activityError) {
      logger.warn('Failed to create activity log entry', { error: getErrorMessage(activityError) })
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
    // Cast to any: assessment_shares table not yet in generated Supabase types
    const supabase: any = getSupabaseServiceClient()

    const body = await parseRequestBody(request)
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

// ================================================================
// UNIFIED SIGNATURE API - SEND FOR SIGNATURE
// Uses custom internal signing flow (replaces OpenSign)
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/services/SignatureService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'
import { sendEmail } from '@/lib/email/emailService'
import { EMAIL_TEMPLATES } from '@/lib/email/emailTemplates'

export const dynamic = 'force-dynamic'

interface SendSignatureRequest {
  signatureRequestId: string
  customMessage?: string
}

export async function POST(request: NextRequest) {
  log.info('SEND SIGNATURE: API endpoint called')

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) return permissionError

    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const firmId = firmResult.firmId

    const body: SendSignatureRequest = await parseRequestBody(request)
    log.debug('SEND SIGNATURE: Request body', { body })

    const { signatureRequestId, customMessage } = body

    if (!signatureRequestId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request ID is required'
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    // Get the signature request from database
    const { data: signatureRequest, error: signatureError } = await supabase
      .from('signature_requests')
      .select(`
        *,
        documents:document_id (
          id,
          name,
          file_name
        )
      `)
      .eq('id', signatureRequestId)
      .eq('firm_id', firmId)
      .single()

    if (signatureError || !signatureRequest) {
      log.error('SEND SIGNATURE: Signature request not found', signatureError)
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request not found'
        },
        { status: 404 }
      )
    }

    const metadata = signatureRequest.opensign_metadata as Record<string, any> | null

    if (!['draft', 'pending'].includes(signatureRequest.status || '')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request has already been sent'
        },
        { status: 400 }
      )
    }

    // Get signers info
    let signers = signatureRequest.signers
    if (!signers && metadata?.signers) {
      signers = metadata.signers
    }
    if (typeof signers === 'string') {
      try {
        signers = JSON.parse(signers)
      } catch {
        signers = null
      }
    }
    if (!Array.isArray(signers) || signers.length === 0) {
      if (signatureRequest.recipient_email && signatureRequest.recipient_name) {
        signers = [{
          email: signatureRequest.recipient_email,
          name: signatureRequest.recipient_name,
          role: signatureRequest.recipient_role || 'Client'
        }]
      }
    }

    if (!Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signer details are missing'
        },
        { status: 400 }
      )
    }

    const validSigners = signers as Array<{ email: string; name: string; role: string }>

    // Generate signing token if not already present
    let signingUrl = signatureRequest.signing_token ? signatureService.getSigningUrl(signatureRequest.signing_token) : ''

    if (!signatureRequest.signing_token || signatureRequest.signing_token_used) {
      // Generate new token
      const expiryDays = signatureRequest.expires_at
        ? Math.max(1, Math.ceil((new Date(signatureRequest.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 30

      const tokenResult = await signatureService.generateSigningToken(signatureRequestId, expiryDays * 24)

      if (!tokenResult.success || !tokenResult.signingUrl) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to generate signing link'
          },
          { status: 500 }
        )
      }

      signingUrl = tokenResult.signingUrl
    }

    // Get advisor and firm info
    const { data: advisorProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', signatureRequest.created_by!)
      .single()

    const { data: firmInfo } = await supabase
      .from('firms')
      .select('name')
      .eq('id', firmId)
      .single()

    const document = signatureRequest.documents as any
    const documentName = document?.name || document?.file_name ||
      metadata?.document_name || 'Document'

    const expiryDate = signatureRequest.expires_at
      ? new Date(signatureRequest.expires_at)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Send email
    log.info('SEND SIGNATURE: Sending email to signer')
    try {
      const template = EMAIL_TEMPLATES.signatureRequest({
        clientName: validSigners[0].name,
        advisorName: advisorProfile?.full_name || 'Your Advisor',
        firmName: firmInfo?.name || 'Your Financial Advisor',
        documentName,
        signingUrl,
        expiryDate: expiryDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        customMessage: customMessage || metadata?.custom_message
      })

      const emailResult = await sendEmail({
        to: validSigners[0].email,
        subject: template.subject,
        html: template.html
      })

      if (!emailResult.success) {
        log.error('SEND SIGNATURE: Email send returned failure', { error: emailResult.error })
        return NextResponse.json(
          {
            success: false,
            error: emailResult.error || 'Failed to send signature request email. Please try again.'
          },
          { status: 500 }
        )
      }

      log.info('SEND SIGNATURE: Email sent successfully', { recipientEmail: validSigners[0].email, messageId: emailResult.messageId })
    } catch (emailError) {
      log.error('SEND SIGNATURE: Failed to send email', emailError instanceof Error ? emailError : undefined)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send signature request email. Please try again.'
        },
        { status: 500 }
      )
    }

    // Update signature request status
    log.info('SEND SIGNATURE: Updating status to sent')
    const { data: updatedRequest, error: updateError } = await supabase
      .from('signature_requests')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        opensign_metadata: {
          ...(metadata || {}),
          sent_at: new Date().toISOString(),
          custom_message: customMessage || metadata?.custom_message
        } as any
      })
      .eq('id', signatureRequestId)
      .eq('firm_id', firmId)
      .select()
      .single()

    if (updateError) {
      log.error('SEND SIGNATURE: Database update error', updateError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update signature request status'
        },
        { status: 500 }
      )
    }

    // Log audit event
    await signatureService.logAuditEvent(signatureRequestId, 'sent', {
      recipientEmail: validSigners[0].email
    })

    log.info('SEND SIGNATURE: Success')
    return NextResponse.json({
      success: true,
      signatureRequestId: updatedRequest.id,
      signingUrl,
      status: 'sent',
      sentAt: new Date().toISOString(),
      expiresAt: updatedRequest.expires_at,
      message: 'Signature request sent successfully'
    })

  } catch (error) {
    log.error('SEND SIGNATURE: Error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send signature request'
      },
      { status: 500 }
    )
  }
}

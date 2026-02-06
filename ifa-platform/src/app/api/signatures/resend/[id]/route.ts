// ================================================================
// UNIFIED SIGNATURE API - RESEND SIGNATURE REQUEST
// Resends the signature email with same or new token
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/services/SignatureService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { sendEmail } from '@/lib/email/emailService'
import { EMAIL_TEMPLATES } from '@/lib/email/emailTemplates'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  log.info('RESEND SIGNATURE: API endpoint called')

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const firmId = firmResult.firmId

    const signatureRequestId = params.id

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
      log.error('RESEND SIGNATURE: Signature request not found', signatureError)
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request not found'
        },
        { status: 404 }
      )
    }

    // Can only resend if not already completed
    if (['completed', 'signed', 'declined'].includes(signatureRequest.status || '')) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot resend - signature request is already ${signatureRequest.status}`
        },
        { status: 400 }
      )
    }

    // Get signers info
    const metadata = signatureRequest.opensign_metadata as Record<string, any> | null
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

    // Calculate remaining expiry or set new one
    let expiryDays = 30
    if (signatureRequest.expires_at) {
      const remaining = Math.ceil((new Date(signatureRequest.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      expiryDays = Math.max(7, remaining) // At least 7 more days
    }

    // Generate new signing token
    const tokenResult = await signatureService.generateSigningToken(signatureRequestId, expiryDays * 24)

    if (!tokenResult.success || !tokenResult.signingUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate new signing link'
        },
        { status: 500 }
      )
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

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + expiryDays)

    // Send email
    log.info('RESEND SIGNATURE: Sending email to signer')
    try {
      const template = EMAIL_TEMPLATES.signatureRequest({
        clientName: signers[0].name,
        advisorName: advisorProfile?.full_name || 'Your Advisor',
        firmName: firmInfo?.name || 'Your Financial Advisor',
        documentName,
        signingUrl: tokenResult.signingUrl,
        expiryDate: expiryDate.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        customMessage: metadata?.custom_message
      })

      await sendEmail({
        to: signers[0].email,
        subject: template.subject,
        html: template.html
      })

      log.info('RESEND SIGNATURE: Email sent successfully', { recipientEmail: signers[0].email })
    } catch (emailError) {
      log.error('RESEND SIGNATURE: Failed to send email', emailError instanceof Error ? emailError : undefined)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send signature request email. Please try again.'
        },
        { status: 500 }
      )
    }

    // Update signature request
    await supabase
      .from('signature_requests')
      .update({
        status: 'sent',
        expires_at: expiryDate.toISOString(),
        opensign_metadata: {
          ...(metadata || {}),
          resent_at: new Date().toISOString()
        } as any
      })
      .eq('id', signatureRequestId)
      .eq('firm_id', firmId)

    // Log audit event
    await signatureService.logAuditEvent(signatureRequestId, 'resent', {
      recipientEmail: signers[0].email
    })

    log.info('RESEND SIGNATURE: Success')
    return NextResponse.json({
      success: true,
      signatureRequestId,
      signingUrl: tokenResult.signingUrl,
      status: 'sent',
      sentAt: new Date().toISOString(),
      expiresAt: expiryDate.toISOString(),
      message: 'Signature request resent successfully'
    })

  } catch (error) {
    log.error('RESEND SIGNATURE: Error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resend signature request'
      },
      { status: 500 }
    )
  }
}

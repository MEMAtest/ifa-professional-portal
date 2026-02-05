// ================================================================
// UNIFIED SIGNATURE API - SEND FOR SIGNATURE
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { openSignService } from '@/services/OpenSignService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'

export const dynamic = 'force-dynamic'

interface SendSignatureRequest {
  signatureRequestId: string
}

export async function POST(request: NextRequest) {
  log.info('SEND SIGNATURE: API endpoint called')

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

    const body: SendSignatureRequest = await parseRequestBody(request)
    log.debug('SEND SIGNATURE: Request body', { body })

    const { signatureRequestId } = body

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
    const { data: signatureRequest, error: signatureError } = await (supabase
      .from('signature_requests') as any)
      .select('*')
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

    if (!['draft', 'pending'].includes(signatureRequest.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request has already been sent'
        },
        { status: 400 }
      )
    }

    if (!signatureRequest.opensign_document_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenSign document ID not found'
        },
        { status: 400 }
      )
    }

    let signers = signatureRequest.signers
    if (!signers && signatureRequest.opensign_metadata?.signers) {
      signers = signatureRequest.opensign_metadata.signers
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

    // Send for signature via OpenSign
    log.info('SEND SIGNATURE: Sending via OpenSign')
    const openSignResult = await openSignService.sendForSignature(
      signatureRequest.opensign_document_id,
      signers,
      {
        autoReminder: signatureRequest.auto_reminder,
        remindOnceInEvery: signatureRequest.remind_once_in_every,
        mergeCertificate: signatureRequest.merge_certificate
      }
    )

    if (!openSignResult.success) {
      log.error('SEND SIGNATURE: OpenSign send failed', { error: openSignResult.error })
      return NextResponse.json(
        {
          success: false,
          error: openSignResult.error || 'Failed to send for signature'
        },
        { status: 500 }
      )
    }

    // Update signature request status
    log.info('SEND SIGNATURE: Updating status to sent')
    const { data: updatedRequest, error: updateError } = await (supabase
      .from('signature_requests') as any)
      .update({
        status: 'sent',
        opensign_metadata: {
          ...signatureRequest.opensign_metadata,
          ...openSignResult.metadata,
          sent_at: new Date().toISOString()
        }
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

    log.info('SEND SIGNATURE: Success')
    return NextResponse.json({
      success: true,
      signatureRequestId: updatedRequest.id,
      opensignDocumentId: updatedRequest.opensign_document_id,
      status: 'sent',
      sentAt: new Date().toISOString(),
      expiresAt: updatedRequest.expires_at,
      metadata: openSignResult.metadata
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

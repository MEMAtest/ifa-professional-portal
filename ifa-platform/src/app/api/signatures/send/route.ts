// ================================================================
// UNIFIED SIGNATURE API - SEND FOR SIGNATURE
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { openSignService } from '@/services/OpenSignService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic'

interface SendSignatureRequest {
  signatureRequestId: string
}

export async function POST(request: NextRequest) {
  log.info('SEND SIGNATURE: API endpoint called')

  try {
    const body: SendSignatureRequest = await request.json()
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
    const { data: signatureRequest, error: signatureError } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('id', signatureRequestId)
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

    if (signatureRequest.status !== 'draft') {
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

    // Send for signature via OpenSign
    log.info('SEND SIGNATURE: Sending via OpenSign')
    const openSignResult = await openSignService.sendForSignature(
      signatureRequest.opensign_document_id,
      signatureRequest.signers,
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
    const { data: updatedRequest, error: updateError } = await supabase
      .from('signature_requests')
      .update({
        status: 'sent',
        opensign_metadata: {
          ...signatureRequest.opensign_metadata,
          ...openSignResult.metadata,
          sent_at: new Date().toISOString()
        }
      })
      .eq('id', signatureRequestId)
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
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
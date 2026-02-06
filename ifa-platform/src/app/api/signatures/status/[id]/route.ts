// ================================================================
// UNIFIED SIGNATURE API - GET STATUS
// Uses custom internal signing flow (replaces OpenSign)
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { signatureService } from '@/services/SignatureService'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  log.debug('GET STATUS: API endpoint called for ID:', { id: params.id })

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
      .select('*')
      .eq('id', signatureRequestId)
      .eq('firm_id', firmId)
      .single()

    if (signatureError || !signatureRequest) {
      log.error('GET STATUS: Signature request not found:', signatureError)
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request not found'
        },
        { status: 404 }
      )
    }

    let document: any = null
    if (signatureRequest.document_id) {
      const { data: doc } = await supabase
        .from('documents')
        .select('id, name, file_name, file_path, storage_path')
        .eq('id', signatureRequest.document_id)
        .eq('firm_id', firmId)
        .maybeSingle()
      document = doc || null
    }

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

    // Get signing URL if request is still pending
    let signingUrl = null
    if (['draft', 'pending', 'sent', 'viewed'].includes(signatureRequest.status || '') &&
        signatureRequest.signing_token &&
        !signatureRequest.signing_token_used) {
      signingUrl = signatureService.getSigningUrl(signatureRequest.signing_token)
    }

    // Get audit log events
    const { data: auditEvents } = await supabase
      .from('signature_audit_log')
      .select('event_type, event_timestamp, ip_address, metadata')
      .eq('signature_request_id', signatureRequestId)
      .order('event_timestamp', { ascending: true })

    log.debug('GET STATUS: Success', { signatureRequestId })
    return NextResponse.json({
      success: true,
      signatureRequest: {
        id: signatureRequest.id,
        documentId: signatureRequest.document_id,
        clientId: signatureRequest.client_id,
        status: signatureRequest.status,
        signers: signers || [],
        createdAt: signatureRequest.created_at,
        updatedAt: signatureRequest.updated_at,
        sentAt: signatureRequest.sent_at,
        viewedAt: signatureRequest.viewed_at,
        completedAt: signatureRequest.completed_at,
        expiresAt: signatureRequest.expires_at,
        signingUrl,
        signedDocumentPath: signatureRequest.signed_document_path,
        originalDocumentHash: signatureRequest.original_document_hash,
        signedDocumentHash: signatureRequest.signed_document_hash,
        signerConsentGiven: signatureRequest.signer_consent_given,
        signerConsentTimestamp: signatureRequest.signer_consent_timestamp,
        signerIpAddress: signatureRequest.signature_ip_address,
        autoReminder: signatureRequest.auto_reminder,
        remindOnceInEvery: signatureRequest.remind_once_in_every,
        metadata: signatureRequest.opensign_metadata
      },
      document,
      auditLog: auditEvents || []
    })

  } catch (error) {
    log.error('GET STATUS: Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch signature status'
      },
      { status: 500 }
    )
  }
}

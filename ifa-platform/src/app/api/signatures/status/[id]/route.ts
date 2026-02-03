// ================================================================
// UNIFIED SIGNATURE API - GET STATUS
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { openSignService } from '@/services/OpenSignService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'

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
    const { data: signatureRequest, error: signatureError } = await (supabase
      .from('signature_requests') as any)
      .select(`
        *,
        generated_documents!inner(
          id,
          name,
          file_url,
          user_id
        )
      `)
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

    // If we have an OpenSign document ID, get the latest status
    let openSignStatus: any = null
    if (signatureRequest.opensign_document_id) {
      log.debug('GET STATUS: Fetching from OpenSign', { documentId: signatureRequest.opensign_document_id })
      openSignStatus = await openSignService.getDocumentStatus(
        signatureRequest.opensign_document_id
      )

      // Update local status if OpenSign status is different
      if (openSignStatus && openSignStatus.status !== signatureRequest.status) {
        log.info('GET STATUS: Updating local status from OpenSign', {
          oldStatus: signatureRequest.status,
          newStatus: openSignStatus.status
        })

        const { error: updateError } = await (supabase
          .from('signature_requests') as any)
          .update({
            status: openSignStatus.status,
            download_url: openSignStatus.downloadUrl || signatureRequest.download_url,
            certificate_url: openSignStatus.certificateUrl || signatureRequest.certificate_url,
            opensign_metadata: {
              ...signatureRequest.opensign_metadata,
              last_sync: new Date().toISOString(),
              opensign_status: openSignStatus
            }
          })
          .eq('id', signatureRequestId)
          .eq('firm_id', firmId)

        if (updateError) {
          log.error('GET STATUS: Failed to sync status:', updateError)
        } else {
          // Update our local data
          signatureRequest.status = openSignStatus.status
          signatureRequest.download_url = openSignStatus.downloadUrl || signatureRequest.download_url
          signatureRequest.certificate_url = openSignStatus.certificateUrl || signatureRequest.certificate_url
        }
      }
    }

    log.debug('GET STATUS: Success', { signatureRequestId })
    return NextResponse.json({
      success: true,
      signatureRequest: {
        id: signatureRequest.id,
        documentId: signatureRequest.document_id,
        opensignDocumentId: signatureRequest.opensign_document_id,
        status: signatureRequest.status,
        signers: signatureRequest.signers,
        createdAt: signatureRequest.created_at,
        updatedAt: signatureRequest.updated_at,
        expiresAt: signatureRequest.expires_at,
        downloadUrl: signatureRequest.download_url,
        certificateUrl: signatureRequest.certificate_url,
        autoReminder: signatureRequest.auto_reminder,
        remindOnceInEvery: signatureRequest.remind_once_in_every,
        mergeCertificate: signatureRequest.merge_certificate,
        metadata: signatureRequest.opensign_metadata
      },
      document: signatureRequest.generated_documents,
      openSignStatus: openSignStatus
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

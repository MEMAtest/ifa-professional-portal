// ================================================================
// UNIFIED SIGNATURE API - DOWNLOAD SIGNED DOCUMENT
// Uses custom internal signing flow (replaces OpenSign)
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  log.debug('DOWNLOAD: API endpoint called for ID:', { id: params.id })

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
      log.error('DOWNLOAD: Signature request not found:', signatureError)
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request not found'
        },
        { status: 404 }
      )
    }

    const metadata = signatureRequest.opensign_metadata as Record<string, any> | null

    // Check if document is ready for download
    if (!['signed', 'completed'].includes(signatureRequest.status || '')) {
      return NextResponse.json(
        {
          success: false,
          error: `Document not ready for download. Current status: ${signatureRequest.status}`
        },
        { status: 400 }
      )
    }

    // Check if we have a signed document path
    if (!signatureRequest.signed_document_path) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signed document not found'
        },
        { status: 404 }
      )
    }

    // Download the signed document from Supabase storage
    log.info('DOWNLOAD: Downloading from storage', { path: signatureRequest.signed_document_path })

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(signatureRequest.signed_document_path)

    if (downloadError || !fileData) {
      log.error('DOWNLOAD: Failed to download from storage', downloadError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to download signed document'
        },
        { status: 500 }
      )
    }

    const signedDocumentBuffer = Buffer.from(await fileData.arrayBuffer())

    if (!signedDocumentBuffer || signedDocumentBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signed document is empty'
        },
        { status: 500 }
      )
    }

    // Set up response headers for file download
    const document = signatureRequest.documents as any
    const documentName = document?.name || document?.file_name ||
      metadata?.document_name || 'document'
    const safeFileName = documentName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.pdf$/i, '')
    const fileName = `${safeFileName}_signed.pdf`

    log.debug('DOWNLOAD: Success', { fileName })
    return new Response(signedDocumentBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': signedDocumentBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    log.error('DOWNLOAD: Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download signed document'
      },
      { status: 500 }
    )
  }
}

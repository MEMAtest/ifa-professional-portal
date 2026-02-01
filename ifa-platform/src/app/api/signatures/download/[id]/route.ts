// ================================================================
// UNIFIED SIGNATURE API - DOWNLOAD SIGNED DOCUMENT
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { openSignService } from '@/services/OpenSignService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  log.debug('DOWNLOAD: API endpoint called for ID:', { id: params.id })

  try {
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
        generated_documents!inner(
          id,
          name,
          file_url,
          user_id
        )
      `)
      .eq('id', signatureRequestId)
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

    // Check if document is ready for download
    if (!['signed', 'completed'].includes(signatureRequest.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Document not ready for download. Current status: ${signatureRequest.status}`
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

    // Download the signed document from OpenSign
    log.info('DOWNLOAD: Downloading from OpenSign', { documentId: signatureRequest.opensign_document_id })
    const signedDocumentBuffer = await openSignService.downloadSignedDocument(
      signatureRequest.opensign_document_id
    )

    if (!signedDocumentBuffer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to download signed document'
        },
        { status: 500 }
      )
    }

    // Set up response headers for file download
    const documentName = signatureRequest.generated_documents?.name || 'signed-document'
    const fileName = `${documentName}_signed.pdf`

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
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
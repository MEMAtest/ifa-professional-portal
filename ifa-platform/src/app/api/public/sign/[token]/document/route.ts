// ================================================================
// PUBLIC SIGNING API - STREAM DOCUMENT
// No authentication required - token-based access
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/services/SignatureService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token

  // Get client info for audit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    // Validate the token
    const validation = await signatureService.validateSigningToken(token)

    if (!validation.valid || !validation.signatureRequest) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid signing link',
          errorCode: validation.errorCode || 'INVALID_TOKEN'
        },
        { status: 400 }
      )
    }

    const request_data = validation.signatureRequest

    // Mark as viewed
    await signatureService.markDocumentViewed(request_data.id, ip, userAgent)

    // Get the document
    if (!request_data.originalDocumentPath) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
          errorCode: 'NOT_FOUND'
        },
        { status: 404 }
      )
    }

    const supabase = getSupabaseServiceClient()
    let pdfBuffer: Buffer | null = null

    // Download from storage or URL
    if (request_data.originalDocumentPath.startsWith('http')) {
      // Download from URL
      const response = await fetch(request_data.originalDocumentPath)
      if (!response.ok) {
        throw new Error('Failed to download document from URL')
      }
      pdfBuffer = Buffer.from(await response.arrayBuffer())
    } else {
      // Download from Supabase storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(request_data.originalDocumentPath)

      if (error || !data) {
        log.error('Failed to download document from storage', { error, path: request_data.originalDocumentPath })
        return NextResponse.json(
          {
            success: false,
            error: 'Document not available',
            errorCode: 'NOT_FOUND'
          },
          { status: 404 }
        )
      }

      pdfBuffer = Buffer.from(await data.arrayBuffer())
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document is empty',
          errorCode: 'EMPTY_DOCUMENT'
        },
        { status: 400 }
      )
    }

    // Return the PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(request_data.documentName)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    log.error('Error streaming document', error instanceof Error ? error : undefined)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load document',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

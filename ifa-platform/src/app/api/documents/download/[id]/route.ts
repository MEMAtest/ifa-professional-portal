// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/documents/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { notifyDocumentDownloaded } from '@/lib/notifications/notificationService'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get auth context for notifications
  const auth = await getAuthContext(request)
  const userId = auth.context?.userId

  try {
    const documentId = params.id
    log.info('Download requested for document', { documentId })

    const supabase: any = getSupabaseServiceClient()

    // Fetch document record
    const { data: rawDocument, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    // Cast to any: document schema has columns not yet in generated types
    const document = rawDocument as any

    if (error || !document) {
      log.error('Document not found', error)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Helper function to log download activity and send notification
    const logDownloadActivity = async () => {
      if (document.client_id) {
        const activitySupabase: any = getSupabaseServiceClient()

        // Log activity
        try {
          await activitySupabase
            .from('activity_log')
            .insert({
              id: crypto.randomUUID(),
              client_id: document.client_id,
              action: `Document downloaded: ${document.name || document.file_name || 'Document'}`,
              type: 'document_downloaded',
              date: new Date().toISOString()
            })
        } catch (activityError) {
          log.warn('Failed to log document download activity', { clientId: document.client_id, error: activityError })
        }

        // Send bell notification
        if (userId) {
          try {
            const { data: clientData } = await activitySupabase
              .from('clients')
              .select('personal_details')
              .eq('id', document.client_id)
              .single()
            const pd = clientData?.personal_details as Record<string, any> | null
            const clientName = pd?.firstName || pd?.first_name || 'Client'
            await notifyDocumentDownloaded(userId, document.client_id, clientName, documentId, document.name || document.file_name || 'Document')
          } catch (notifyError) {
            log.warn('Failed to send document download notification', { clientId: document.client_id, error: notifyError })
          }
        }
      }
    }

    // Option 1: If we have a direct storage URL, redirect with download header
    if (document.storage_path && document.storage_path.startsWith('http')) {
      log.info('Redirecting to storage URL for download', { documentId, storage_path: document.storage_path })
      await logDownloadActivity()
      // Add download parameter to force download
      const url = new URL(document.storage_path)
      url.searchParams.set('download', document.file_name || 'document.pdf')
      return NextResponse.redirect(url.toString())
    }

    // Option 2: If we have a file_path, download from Supabase storage
    if (document.file_path) {
      log.info('Downloading from Supabase storage', { documentId, file_path: document.file_path })
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (!downloadError && fileData) {
        await logDownloadActivity()
        // Return file with download headers
        const headers = new Headers()
        headers.set('Content-Type', document.mime_type || 'application/pdf')
        headers.set('Content-Disposition', `attachment; filename="${document.file_name || 'document.pdf'}"`)
        headers.set('Cache-Control', 'no-cache')

        if (document.file_size) {
          headers.set('Content-Length', document.file_size.toString())
        }

        return new NextResponse(fileData, { headers })
      }
    }

    // Option 3: Check for base64 PDF in metadata (fallback)
    const meta = document.metadata as Record<string, any> | null
    if (meta?.pdf_base64) {
      log.info('Using base64 PDF from metadata', { documentId })
      await logDownloadActivity()
      const pdfBuffer = Buffer.from(meta.pdf_base64, 'base64')

      const headers = new Headers()
      headers.set('Content-Type', 'application/pdf')
      headers.set('Content-Disposition', `attachment; filename="${document.name || 'document'}.pdf"`)
      headers.set('Cache-Control', 'no-cache')
      headers.set('Content-Length', pdfBuffer.length.toString())

      return new NextResponse(pdfBuffer, { headers })
    }

    // Option 4: Generate PDF from HTML content if available
    if (document.html_content || meta?.html_content) {
      log.warn('Only HTML content available, PDF generation needed', { documentId })
      // For now, return error suggesting PDF generation
      return NextResponse.json(
        {
          error: 'PDF not available',
          message: 'This document only has HTML content. Please regenerate the PDF.',
          hasHtml: true
        },
        { status: 404 }
      )
    }

    // No downloadable content found
    return NextResponse.json(
      { 
        error: 'No file available for download',
        documentId: documentId
      },
      { status: 404 }
    )

  } catch (error) {
    log.error('Download error', error)
    return NextResponse.json(
      {
        error: 'Failed to download document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
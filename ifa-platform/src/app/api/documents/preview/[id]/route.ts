import { createClient } from "@/lib/supabase/server"
// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/documents/preview/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { log } from '@/lib/logging/structured'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id
    log.info('Preview requested for document', { documentId })

    // Create Supabase client with auth
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Fetch document record
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error || !document) {
      log.error('Document not found', error)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Option 1: If we have a direct storage URL, redirect to it
    if (document.storage_path && document.storage_path.startsWith('http')) {
      log.info('Using storage URL for preview', { documentId, storage_path: document.storage_path })
      // For preview, we want inline display
      const url = new URL(document.storage_path)
      return NextResponse.redirect(url.toString())
    }

    // Option 2: If we have a file_path, download from Supabase storage
    if (document.file_path) {
      log.info('Downloading from Supabase storage', { documentId, file_path: document.file_path })
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (!downloadError && fileData) {
        // Return PDF for inline viewing
        const headers = new Headers()
        headers.set('Content-Type', document.mime_type || 'application/pdf')
        headers.set('Content-Disposition', `inline; filename="${document.file_name || 'document.pdf'}"`)
        headers.set('Cache-Control', 'public, max-age=3600')

        return new NextResponse(fileData, { headers })
      }
    }

    // Option 3: Check for base64 PDF in metadata (fallback)
    if (document.metadata?.pdf_base64) {
      log.info('Using base64 PDF from metadata', { documentId })
      const pdfBuffer = Buffer.from(document.metadata.pdf_base64, 'base64')
      
      const headers = new Headers()
      headers.set('Content-Type', 'application/pdf')
      headers.set('Content-Disposition', `inline; filename="${document.name || 'document.pdf'}"`)
      headers.set('Cache-Control', 'no-cache')

      return new NextResponse(pdfBuffer, { headers })
    }

    // Option 4: If we have HTML content, wrap it and display
    if (document.html_content || document.metadata?.html_content) {
      log.info('Displaying HTML content', { documentId })
      const htmlContent = document.html_content || document.metadata.html_content
      
      const headers = new Headers()
      headers.set('Content-Type', 'text/html; charset=utf-8')
      headers.set('Cache-Control', 'no-cache')

      return new NextResponse(htmlContent, { headers })
    }

    // No displayable content found
    return NextResponse.json(
      { 
        error: 'No preview available',
        details: 'Document has no associated file or content'
      },
      { status: 404 }
    )

  } catch (error) {
    log.error('Preview error', error)
    return NextResponse.json(
      {
        error: 'Failed to preview document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
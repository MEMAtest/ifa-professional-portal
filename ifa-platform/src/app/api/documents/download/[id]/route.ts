// src/app/api/documents/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id
    console.log('📥 Download requested for document:', documentId)

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
      console.error('Document not found:', error)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Option 1: If we have a direct storage URL, redirect with download header
    if (document.storage_path && document.storage_path.startsWith('http')) {
      console.log('✅ Redirecting to storage URL for download')
      // Add download parameter to force download
      const url = new URL(document.storage_path)
      url.searchParams.set('download', document.file_name || 'document.pdf')
      return NextResponse.redirect(url.toString())
    }

    // Option 2: If we have a file_path, download from Supabase storage
    if (document.file_path) {
      console.log('📥 Downloading from Supabase storage:', document.file_path)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (!downloadError && fileData) {
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
    if (document.metadata?.pdf_base64) {
      console.log('📄 Using base64 PDF from metadata')
      const pdfBuffer = Buffer.from(document.metadata.pdf_base64, 'base64')
      
      const headers = new Headers()
      headers.set('Content-Type', 'application/pdf')
      headers.set('Content-Disposition', `attachment; filename="${document.name || 'document'}.pdf"`)
      headers.set('Cache-Control', 'no-cache')
      headers.set('Content-Length', pdfBuffer.length.toString())

      return new NextResponse(pdfBuffer, { headers })
    }

    // Option 4: Generate PDF from HTML content if available
    if (document.html_content || document.metadata?.html_content) {
      console.log('⚠️ Only HTML content available, PDF generation needed')
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
    console.error('❌ Download error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to download document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
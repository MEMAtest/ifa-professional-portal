// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// src/app/api/documents/generate/route.ts - Document Generation from Templates
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { log } from '@/lib/logging/structured'
import { notifyDocumentGenerated } from '@/lib/notifications/notificationService'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { parseRequestBody } from '@/app/api/utils'

interface GenerateDocumentRequest {
  content: string
  title: string
  clientId?: string
  templateId?: string
  variables?: Record<string, string>
  format?: 'pdf' | 'docx' | 'html'
  metadata?: Record<string, any>
}

interface GenerateDocumentResponse {
  success: boolean
  document?: {
    id: string
    name: string
    file_path: string
    file_type: string
    created_at: string
  }
  url?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase: any = getSupabaseServiceClient()
    const body: GenerateDocumentRequest = await parseRequestBody(request)

    // Validate required fields
    if (!body.content || !body.title) {
      return NextResponse.json(
        { success: false, error: 'Content and title are required' },
        { status: 400 }
      )
    }

    const firmResult = requireFirmId(auth.context)
    if (firmResult instanceof NextResponse) {
      return firmResult
    }
    const firmId = firmResult.firmId
    const userId = auth.context?.userId

    if (body.clientId) {
      const access = await requireClientAccess({
        supabase,
        clientId: body.clientId,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }
    }

    // Generate unique document ID
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const safeTitle = body.title.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${safeTitle}_${Date.now()}.pdf`
    const filePath = `firms/${firmId}/documents/${fileName}`

    const metadata = {
      templateId: body.templateId,
      variables: body.variables,
      generatedAt: new Date().toISOString(),
      source: body.templateId ? 'template-generation' : 'api-generation',
      ...(body.metadata || {}),
    }

    const isFileReview = (metadata as any)?.type === 'file_review'
    const category = (metadata as any)?.category || (isFileReview ? 'Compliance' : 'Generated')
    const documentType = (metadata as any)?.document_type || (isFileReview ? 'compliance_document' : 'generated_document')
    const type = (metadata as any)?.type || (isFileReview ? 'file_review' : 'generated')

    const stripHtml = (html: string) => {
      return html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<\/(p|div|br|li|tr|h1|h2|h3|h4|h5|h6)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
    }

    const plainText = stripHtml(body.content)
    const { jsPDF } = await import('jspdf')
    const pdfDoc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = pdfDoc.internal.pageSize.getWidth()
    const pageHeight = pdfDoc.internal.pageSize.getHeight()
    const margin = 48
    const lineHeight = 16
    const maxWidth = pageWidth - margin * 2
    const lines = pdfDoc.splitTextToSize(plainText || ' ', maxWidth)

    let cursorY = margin
    lines.forEach((line: string) => {
      if (cursorY + lineHeight > pageHeight - margin) {
        pdfDoc.addPage()
        cursorY = margin
      }
      pdfDoc.text(line, margin, cursorY)
      cursorY += lineHeight
    })

    const buildPdfBuffer = () => {
      try {
        const nodeBuffer = pdfDoc.output('nodebuffer' as any) as unknown
        if (nodeBuffer && Buffer.isBuffer(nodeBuffer)) {
          return nodeBuffer as Buffer
        }
        if (nodeBuffer instanceof Uint8Array) {
          return Buffer.from(nodeBuffer)
        }
      } catch {
        // Fall back to arraybuffer output
      }

      const pdfArrayBuffer = pdfDoc.output('arraybuffer') as ArrayBuffer
      let buffer = Buffer.from(pdfArrayBuffer)
      if (buffer.length === 0) {
        try {
          const dataUri = pdfDoc.output('datauristring') as string
          const base64 = dataUri.split(',')[1] || ''
          buffer = Buffer.from(base64, 'base64')
        } catch {
          // Ignore, we'll return empty buffer and error upstream
        }
      }
      return buffer
    }

    let pdfBuffer = buildPdfBuffer()
    if (pdfBuffer.length === 0) {
      // Ensure we don't store an empty PDF
      pdfDoc.text(' ', margin, margin)
      pdfBuffer = buildPdfBuffer()
    }

    // Upload PDF content to storage so previews work reliably
    const contentBuffer = pdfBuffer
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, contentBuffer, {
        contentType: 'application/pdf',
        upsert: false,
        cacheControl: '3600'
      })

    if (uploadError) {
      log.error('Document upload error', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload document content' },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Create document record in database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: body.title,
        description: `Generated document from template`,
        category,
        file_name: fileName,
        file_path: filePath,
        storage_path: urlData?.publicUrl || filePath,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: contentBuffer.length,
        type,
        document_type: documentType,
        firm_id: firmId,
        client_id: body.clientId || null,
        created_by: userId,
        status: 'active',
        compliance_status: 'pending',
        metadata: {
          ...metadata,
          html_content: body.content
        }
      })
      .select()
      .single()

    if (dbError) {
      log.error('Document creation error', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    // Log activity for document generation
    if (body.clientId) {
      try {
        await supabase
          .from('activity_log')
          .insert({
            id: crypto.randomUUID(),
            client_id: body.clientId,
            action: `Document generated: ${body.title}`,
            type: 'document_generated',
            date: new Date().toISOString()
          })
      } catch (activityError) {
        log.warn('Failed to log document generation activity', { clientId: body.clientId, error: activityError })
      }

      // Send bell notification
      const userId = auth.context?.userId
      if (userId) {
        try {
          // Fetch client name for notification
          const { data: clientData } = await supabase
            .from('clients')
            .select('personal_details')
            .eq('id', body.clientId)
            .single()
          const clientName = clientData?.personal_details?.firstName || clientData?.personal_details?.first_name || 'Client'
          await notifyDocumentGenerated(userId, body.clientId, clientName, document.id, body.title)
        } catch (notifyError) {
          log.warn('Failed to send document generation notification', { clientId: body.clientId, error: notifyError })
        }
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        file_path: document.file_path,
        file_type: document.file_type,
        created_at: document.created_at
      },
      url: `/api/documents/preview/${document.id}`
    })

  } catch (error) {
    log.error('Document generation error', error)

    return NextResponse.json(
      {
        success: false,
        error: ''
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Document Generation API',
    endpoints: {
      'POST /': 'Generate document from template content'
    },
    required_fields: ['content', 'title'],
    optional_fields: ['clientId', 'templateId', 'variables', 'format', 'metadata']
  })
}

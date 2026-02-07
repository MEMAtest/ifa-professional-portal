// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// ===================================================================
// src/app/api/documents/generate/route.ts - Document Generation from Templates
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { log } from '@/lib/logging/structured'
import { notifyDocumentGenerated } from '@/lib/notifications/notificationService'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { parseRequestBody } from '@/app/api/utils'
import { DocumentTemplateService } from '@/services/documentTemplateService'
import { DocumentGenerationRouter } from '@/services/DocumentGenerationRouter'
import { renderHtmlToPdfBuffer } from '@/lib/pdf/renderHtmlToPdf'

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

    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) return permissionError

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
    const requestedFormat = body.format || 'pdf'

    const metadata = {
      templateId: body.templateId,
      variables: body.variables,
      generatedAt: new Date().toISOString(),
      source: body.templateId ? 'template-generation' : 'api-generation',
      ...(body.metadata || {}),
    }

    const isFileReview = (metadata as any)?.type === 'file_review'
    let templateDocumentType: string | null = null
    let templateRequiresSignature: boolean | null = null
    let templateCategory: string | null = null

    if (body.templateId) {
      const { data: templateRow } = await supabase
        .from('document_templates')
        .select('assessment_type, requires_signature, category_id, document_categories(name)')
        .eq('id', body.templateId)
        .eq('firm_id', firmId)
        .maybeSingle()

      if (templateRow) {
        templateDocumentType = templateRow.assessment_type || null
        templateRequiresSignature = templateRow.requires_signature ?? null
        templateCategory = (templateRow as any)?.document_categories?.name || null
      } else {
        const templateService = DocumentTemplateService.getInstance()
        const fallbackTemplate = templateService.getDefaultTemplateByIdOrName(body.templateId)
        if (fallbackTemplate) {
          templateDocumentType = body.templateId
          templateRequiresSignature = DocumentGenerationRouter.requiresSignature(templateDocumentType)
        }
      }
    }

    const documentType =
      (metadata as any)?.document_type ||
      templateDocumentType ||
      (isFileReview ? 'compliance_document' : 'generated_document')
    const requiresSignature =
      (metadata as any)?.requires_signature ??
      templateRequiresSignature ??
      DocumentGenerationRouter.requiresSignature(documentType)
    const category =
      (metadata as any)?.category ||
      templateCategory ||
      (isFileReview ? 'Compliance' : DocumentGenerationRouter.getCategory(documentType))
    const type = (metadata as any)?.type || documentType

    // Signing docs must always be a PDF so the signer sees exactly what they sign.
    const wantsHtml = requestedFormat === 'html'
    const outputFormat: 'pdf' | 'html' = wantsHtml && !requiresSignature ? 'html' : 'pdf'
    const fileName = `${safeTitle}_${Date.now()}.${outputFormat}`
    const filePath = `firms/${firmId}/documents/${fileName}`

    let contentBuffer: Buffer
    let mimeType: string

    if (outputFormat === 'html') {
      contentBuffer = Buffer.from(body.content, 'utf8')
      mimeType = 'text/html'
    } else {
      try {
        contentBuffer = await renderHtmlToPdfBuffer(body.content, {
          title: body.title,
          format: 'A4',
          // Signing docs should not execute any scripts during render.
          javaScriptEnabled: !requiresSignature
        })
        mimeType = 'application/pdf'
      } catch (pdfError) {
        log.error('HTML->PDF rendering failed', {
          error: pdfError instanceof Error ? pdfError.message : String(pdfError),
          templateId: body.templateId,
          firmId,
          clientId: body.clientId
        })

        // For signing documents, do not silently downgrade to a low-quality output.
        if (requiresSignature) {
          return NextResponse.json(
            { success: false, error: 'Failed to generate PDF for signing' },
            { status: 500 }
          )
        }

        // Non-signing docs: fall back to a plain-text PDF so the route still behaves
        // consistently even if chromium is unavailable in the runtime.
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

        try {
          const nodeBuffer = pdfDoc.output('nodebuffer' as any) as unknown
          contentBuffer = Buffer.isBuffer(nodeBuffer)
            ? (nodeBuffer as Buffer)
            : Buffer.from(pdfDoc.output('arraybuffer') as ArrayBuffer)
        } catch {
          contentBuffer = Buffer.from(pdfDoc.output('arraybuffer') as ArrayBuffer)
        }
        if (contentBuffer.length === 0) {
          pdfDoc.text(' ', margin, margin)
          contentBuffer = Buffer.from(pdfDoc.output('arraybuffer') as ArrayBuffer)
        }
        mimeType = 'application/pdf'
      }
    }
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, contentBuffer, {
        contentType: mimeType,
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
        file_type: outputFormat,
        mime_type: mimeType,
        file_size: contentBuffer.length,
        type,
        document_type: documentType,
        requires_signature: requiresSignature,
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
        error: 'Document generation failed'
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

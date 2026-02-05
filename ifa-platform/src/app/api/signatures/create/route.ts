// ================================================================
// UNIFIED SIGNATURE API - CREATE SIGNATURE REQUEST
// Supports both documentId and clientId flows
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestLogger } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'
import { openSignService } from '@/services/OpenSignService'

export const dynamic = 'force-dynamic'

interface SignerInfo {
  email: string
  name: string
  role?: string
}

interface CreateSignatureRequest {
  documentId?: string
  clientId?: string
  templateId?: string
  signers: SignerInfo[]
  options?: {
    expiryDays?: number
    autoReminder?: boolean
    remindOnceInEvery?: number
  }
}

const signerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().optional(),
})

const requestSchema = z.object({
  documentId: z.string().optional(),
  clientId: z.string().optional(),
  templateId: z.string().optional(),
  signers: z.array(signerSchema).min(1),
  options: z.object({
    expiryDays: z.number().int().min(1).max(365).optional(),
    autoReminder: z.boolean().optional(),
    remindOnceInEvery: z.number().int().min(1).max(30).optional(),
  }).optional()
})

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

const markdownToHtml = (markdown: string): string => {
  const lines = markdown.split('\n')
  const output: string[] = []
  let inList = false
  let listType = ''

  const closeList = () => {
    if (inList) {
      output.push(listType === 'ol' ? '</ol>' : '</ul>')
      inList = false
    }
  }

  const inline = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:2px 4px;border-radius:3px;font-size:0.9em;">$1</code>')
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      closeList()
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/)
    if (headingMatch) {
      closeList()
      const level = headingMatch[1].length
      output.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`)
      i++
      continue
    }

    const ulMatch = line.match(/^\s*[-*]\s+(.*)/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        output.push('<ul>')
        inList = true
        listType = 'ul'
      }
      output.push(`<li>${inline(ulMatch[1])}</li>`)
      i++
      continue
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.*)/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList()
        output.push('<ol>')
        inList = true
        listType = 'ol'
      }
      output.push(`<li>${inline(olMatch[1])}</li>`)
      i++
      continue
    }

    closeList()
    output.push(`<p>${inline(line)}</p>`)
    i++
  }

  closeList()
  return output.join('\n')
}

const buildPdfBuffer = async (plainText: string) => {
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

  let buffer: Buffer
  try {
    const nodeBuffer = pdfDoc.output('nodebuffer' as any) as unknown
    if (nodeBuffer && Buffer.isBuffer(nodeBuffer)) {
      buffer = nodeBuffer as Buffer
    } else if (nodeBuffer instanceof Uint8Array) {
      buffer = Buffer.from(nodeBuffer)
    } else {
      const arrayBuffer = pdfDoc.output('arraybuffer') as ArrayBuffer
      buffer = Buffer.from(arrayBuffer)
    }
  } catch {
    const arrayBuffer = pdfDoc.output('arraybuffer') as ArrayBuffer
    buffer = Buffer.from(arrayBuffer)
  }

  if (buffer.length === 0) {
    const dataUri = pdfDoc.output('datauristring') as string
    const base64 = dataUri.split(',')[1] || ''
    buffer = Buffer.from(base64, 'base64')
  }

  return buffer
}

const getPdfBufferForDocument = async (
  supabase: any,
  document: Record<string, any>,
  firmId: string,
  logger: ReturnType<typeof createRequestLogger>
) => {
  const downloadFromStorage = async (path: string) => {
    const { data, error } = await supabase.storage.from('documents').download(path)
    if (error || !data) return null
    const buffer = Buffer.from(await data.arrayBuffer())
    return buffer.length ? buffer : null
  }

  if (document.file_path) {
    const buffer = await downloadFromStorage(document.file_path)
    if (buffer) return buffer
  }

  if (document.storage_path && typeof document.storage_path === 'string' && document.storage_path.startsWith('http')) {
    try {
      const response = await fetch(document.storage_path)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        if (buffer.length) return buffer
      }
    } catch (error) {
      logger.warn('CREATE SIGNATURE: Failed to fetch storage URL', { error: error instanceof Error ? error.message : 'Unknown' })
    }
  }

  const meta = (document.metadata || {}) as Record<string, any>
  if (meta.pdf_base64) {
    const buffer = Buffer.from(meta.pdf_base64, 'base64')
    if (buffer.length) return buffer
  }

  let html = (document.html_content as string | undefined) || (meta.html_content as string | undefined)
  if (!html && meta.reviewMarkdown) {
    html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${markdownToHtml(meta.reviewMarkdown)}</body></html>`
  }

  if (html) {
    const plainText = stripHtml(html)
    const pdfBuffer = await buildPdfBuffer(plainText)
    if (!pdfBuffer.length) return null

    const safeTitle = (document.file_name || document.name || 'document')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 80)
    let fileName = document.file_name || `${safeTitle}_${Date.now()}.pdf`
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName = `${fileName}.pdf`
    }
    const filePath = document.file_path || `firms/${firmId}/documents/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600'
      })

    if (uploadError) {
      logger.warn('CREATE SIGNATURE: Failed to upload regenerated PDF', { error: uploadError.message })
      return pdfBuffer
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
    await supabase
      .from('documents')
      .update({
        file_path: filePath,
        storage_path: urlData?.publicUrl || filePath,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: pdfBuffer.length,
        file_name: fileName
      })
      .eq('id', document.id)
      .eq('firm_id', firmId)

    return pdfBuffer
  }

  return null
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request)
  logger.info('CREATE SIGNATURE: API endpoint called')

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'documents:sign')
    if (permissionError) {
      return permissionError
    }
    const { firmId } = firmResult

    let body: CreateSignatureRequest
    try {
      body = await parseRequestBody(request, requestSchema)
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }
    logger.debug('CREATE SIGNATURE: Request body', { documentId: body.documentId, clientId: body.clientId, signerCount: body.signers?.length })

    const { documentId, clientId, templateId, signers, options = {} } = body

    // Validate required fields
    if (!signers || signers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signers are required'
        },
        { status: 400 }
      )
    }

    // Need either documentId OR clientId
    if (!documentId && !clientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either Document ID or Client ID is required'
        },
        { status: 400 }
      )
    }

    // Validate signers
    for (const signer of signers) {
      if (!signer.email || !signer.name) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each signer must have email and name'
          },
          { status: 400 }
        )
      }
    }

    let supabase: any
    try {
      supabase = getSupabaseServiceClient()
    } catch (serviceError) {
      logger.warn('CREATE SIGNATURE: Service role unavailable, falling back to user client', {
        error: serviceError instanceof Error ? serviceError.message : 'Unknown'
      })
      supabase = await createClient()
    }

    if (clientId) {
      const access = await requireClientAccess({
        supabase,
        clientId,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }
    }

    let document: Record<string, any> | null = null
    if (documentId) {
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .select('id, client_id, firm_id, name, file_name, file_path, storage_path, file_size, file_type, mime_type, metadata, html_content')
        .eq('id', documentId)
        .eq('firm_id', firmId)
        .maybeSingle()

      if (documentError || !documentData) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
      }
      document = documentData
    }

    // Calculate expiry date
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + (options.expiryDays || 30))

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document is required for signature requests' },
        { status: 400 }
      )
    }

    if (!openSignService.isReady()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signature service is currently unavailable. Please check configuration and try again.'
        },
        { status: 503 }
      )
    }

    const pdfBuffer = await getPdfBufferForDocument(supabase, document, firmId, logger)
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document preview is not ready. Regenerate the PDF and try again.'
        },
        { status: 400 }
      )
    }

    const documentTitle = document.name || document.file_name || 'Document'
    const openSignCreate = await openSignService.createDocument(
      pdfBuffer,
      documentTitle,
      signers,
      {
        expiryDays: options.expiryDays,
        autoReminder: options.autoReminder,
        remindOnceInEvery: options.remindOnceInEvery,
        mergeCertificate: false
      }
    )

    if (!openSignCreate.success || !openSignCreate.documentId) {
      return NextResponse.json(
        {
          success: false,
          error: openSignCreate.error || 'Failed to create signature document'
        },
        { status: 502 }
      )
    }

    const opensignDocumentId = openSignCreate.documentId
    const signersPayload = signers.map((signer) => ({
      email: signer.email,
      name: signer.name,
      role: signer.role || 'Client'
    }))

    // Create signature request record using basic schema
    const primaryPayload: any = {
      client_id: clientId || null,
      document_id: documentId || null,
      firm_id: firmId,
      created_by: auth.context.userId,
      recipient_name: signers[0]?.name || '',
      recipient_email: signers[0]?.email || '',
      recipient_role: signers[0]?.role || 'Client',
      expires_at: expiryDate.toISOString(),
      status: 'draft',
      opensign_document_id: opensignDocumentId,
      auto_reminder: options.autoReminder ?? null,
      remind_once_in_every: options.remindOnceInEvery ?? null,
      merge_certificate: false,
      opensign_metadata: {
        created_at: new Date().toISOString(),
        signers: signersPayload,
        document_name: documentTitle,
        template_id: templateId || null
      },
      signers: signersPayload
    }

    const fallbackPayloads: any[] = [
      {
        firm_id: firmId,
        client_id: clientId || null,
        document_id: documentId || null,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'draft'
      },
      {
        firm_id: firmId,
        document_id: documentId || null,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'draft'
      },
      {
        firm_id: firmId,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'draft'
      },
      {
        client_id: clientId || null,
        document_id: documentId || null,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'draft'
      },
      {
        document_id: documentId || null,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'draft'
      },
      {
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'draft'
      }
    ]

    const attemptInsert = async (payload: any) => {
      return await (supabase
        .from('signature_requests') as any)
        .insert(payload)
        .select()
        .single()
    }

    const stripMissingColumn = (payload: Record<string, any>, error: any) => {
      const message = error?.message || ''
      const match = message.match(/column \"(.+?)\" does not exist/i)
      if (!match) return null
      const column = match[1]
      if (!Object.prototype.hasOwnProperty.call(payload, column)) return null
      const next = { ...payload }
      delete next[column]
      return next
    }

    const attemptWithAdaptivePayload = async (payload: Record<string, any>) => {
      let current = { ...payload }
      let result = await attemptInsert(current)
      let error = result.error

      for (let i = 0; i < 5 && error; i += 1) {
        const stripped = stripMissingColumn(current, error)
        if (!stripped) break
        current = stripped
        result = await attemptInsert(current)
        error = result.error
      }

      return result
    }

    logger.debug('CREATE SIGNATURE: Creating signature request', { clientId, documentId })

    let insertResult = await attemptWithAdaptivePayload(primaryPayload)
    let insertError = insertResult.error

    if (insertError && (insertError.message?.includes('does not exist') || insertError.code === '42P01')) {
      return NextResponse.json({
        success: false,
        error: 'Signature requests table not yet created.',
        code: 'TABLE_NOT_FOUND'
      }, { status: 500 })
    }

    if (insertError && (insertError.code === '42703' || insertError.message?.includes('column') || insertError.message?.includes('schema cache'))) {
      logger.warn('CREATE SIGNATURE: Falling back to legacy schema', { error: insertError.message })

      for (const payload of fallbackPayloads) {
        insertResult = await attemptWithAdaptivePayload(payload)
        insertError = insertResult.error
        if (!insertError) break
      }
    }

    const signatureRequest = insertResult.data

    if (insertError) {
      logger.error('CREATE SIGNATURE: Database insert failed', insertError)

      // Check if table doesn't exist
      if (insertError.message.includes('does not exist') || insertError.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: 'Signature requests table not yet created.',
          code: 'TABLE_NOT_FOUND'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to create signature request',
        details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
      }, { status: 500 })
    }

    logger.info('CREATE SIGNATURE: Success, created request', { requestId: signatureRequest?.id })

    const sendResult = await openSignService.sendForSignature(
      opensignDocumentId,
      signers,
      {
        expiryDays: options.expiryDays,
        autoReminder: options.autoReminder,
        remindOnceInEvery: options.remindOnceInEvery,
        mergeCertificate: false
      }
    )

    if (!sendResult.success) {
      logger.error('CREATE SIGNATURE: OpenSign send failed', { error: sendResult.error })
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || 'Failed to send signature request'
        },
        { status: 502 }
      )
    }

    const { error: updateError } = await (supabase
      .from('signature_requests') as any)
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        download_url: sendResult.downloadUrl || null,
        opensign_metadata: {
          ...signatureRequest.opensign_metadata,
          sent_at: new Date().toISOString(),
          send_result: sendResult.metadata
        }
      })
      .eq('id', signatureRequest.id)

    if (updateError) {
      logger.warn('CREATE SIGNATURE: Failed to update status to sent', { error: updateError.message })
    } else {
      signatureRequest.status = 'sent'
      signatureRequest.sent_at = new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      signatureRequest: {
        id: signatureRequest.id,
        client_id: signatureRequest.client_id,
        status: signatureRequest.status,
        recipient_name: signatureRequest.recipient_name,
        recipient_email: signatureRequest.recipient_email,
        created_at: signatureRequest.created_at,
        opensign_document_id: opensignDocumentId
      },
      message: 'Signature request created successfully'
    })

  } catch (error) {
    logger.error('CREATE SIGNATURE: Error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create signature request'
      },
      { status: 500 }
    )
  }
}

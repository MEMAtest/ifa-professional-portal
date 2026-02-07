// ================================================================
// UNIFIED SIGNATURE API - CREATE SIGNATURE REQUEST
// Uses custom internal signing flow (replaces OpenSign)
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestLogger } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'
import { signatureService } from '@/services/SignatureService'
import { sendEmail } from '@/lib/email/emailService'
import { EMAIL_TEMPLATES } from '@/lib/email/emailTemplates'
import { renderHtmlToPdfBuffer } from '@/lib/pdf/renderHtmlToPdf'

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
    customMessage?: string
    sendEmail?: boolean
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
    customMessage: z.string().optional(),
    sendEmail: z.boolean().optional()
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

function isPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false

  // Some PDF generators may prefix whitespace/newlines; tolerate a small prefix.
  let i = 0
  while (i < buffer.length && i < 32) {
    const b = buffer[i]
    if (b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d) {
      i += 1
      continue
    }
    break
  }

  return buffer.slice(i, i + 5).toString('ascii') === '%PDF-'
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
    if (buffer && isPdfBuffer(buffer)) return buffer
    if (buffer) {
      logger.warn('CREATE SIGNATURE: Stored file is not a PDF; regenerating', {
        documentId: document.id,
        file_path: document.file_path,
        file_type: document.file_type,
        mime_type: document.mime_type
      })
    }
  }

  if (document.storage_path && typeof document.storage_path === 'string' && document.storage_path.startsWith('http')) {
    try {
      const response = await fetch(document.storage_path)
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        if (buffer.length && isPdfBuffer(buffer)) return buffer
        if (buffer.length) {
          logger.warn('CREATE SIGNATURE: Storage URL is not a PDF; regenerating', {
            documentId: document.id,
            storage_path: document.storage_path,
            file_type: document.file_type,
            mime_type: document.mime_type
          })
        }
      }
    } catch (error) {
      logger.warn('CREATE SIGNATURE: Failed to fetch storage URL', { error: error instanceof Error ? error.message : 'Unknown' })
    }
  }

  const meta = (document.metadata || {}) as Record<string, any>
  if (meta.pdf_base64) {
    const buffer = Buffer.from(meta.pdf_base64, 'base64')
    if (buffer.length && isPdfBuffer(buffer)) return buffer
  }

  let html = (document.html_content as string | undefined) || (meta.html_content as string | undefined)
  if (!html && meta.reviewMarkdown) {
    html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${markdownToHtml(meta.reviewMarkdown)}</body></html>`
  }

  if (html) {
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await renderHtmlToPdfBuffer(html, {
        title: String(document.name || document.file_name || 'Document'),
        format: 'A4',
        javaScriptEnabled: false
      })
    } catch (error) {
      // Last-resort fallback if chromium rendering is unavailable.
      const plainText = stripHtml(html)
      pdfBuffer = await buildPdfBuffer(plainText)
    }

    if (!pdfBuffer.length) return null

    const rawName = String(document.file_name || document.name || 'document')
    const baseName = rawName.replace(/\.[a-z0-9]+$/i, '')
    const safeTitle = baseName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80) || 'document'

    const existingPath = typeof document.file_path === 'string' ? document.file_path : ''
    const reuseExistingPath = existingPath.toLowerCase().endsWith('.pdf')
    const existingFileName = typeof document.file_name === 'string' ? document.file_name : ''
    const existingFileNameIsPdf = existingFileName.toLowerCase().endsWith('.pdf')
    const fileNameFromPath = reuseExistingPath ? (existingPath.split('/').pop() || '') : ''

    const fileName = reuseExistingPath
      ? (existingFileNameIsPdf ? existingFileName : (fileNameFromPath || `${safeTitle}_${Date.now()}.pdf`))
      : `${safeTitle}_${Date.now()}.pdf`

    const filePath = reuseExistingPath ? existingPath : `firms/${firmId}/documents/${fileName}`

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
    const writePermissionError = requirePermission(auth.context, 'documents:write')
    if (writePermissionError) return writePermissionError
    const signPermissionError = requirePermission(auth.context, 'documents:sign')
    if (signPermissionError) return signPermissionError
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
    const { documentId, clientId, templateId, signers, options = {} } = body
    logger.info('CREATE SIGNATURE: Params', { documentId, clientId, firmId, signerCount: signers?.length })

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
      logger.info('CREATE SIGNATURE: Looking up document', { documentId, firmId })
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .select('id, client_id, firm_id, name, file_name, file_path, storage_path, file_size, file_type, mime_type, metadata')
        .eq('id', documentId)
        .eq('firm_id', firmId)
        .maybeSingle()

      if (documentError) {
        logger.error('CREATE SIGNATURE: Document query error', { documentId, firmId, error: documentError })
      }

      if (!documentData && !documentError) {
        // Diagnostic: check if document exists with a different firm_id
        const { data: anyDoc } = await supabase
          .from('documents')
          .select('id, firm_id')
          .eq('id', documentId)
          .maybeSingle()
        if (anyDoc) {
          logger.warn('CREATE SIGNATURE: Document exists with different firm_id', {
            documentId, expectedFirmId: firmId, actualFirmId: anyDoc.firm_id
          })
        } else {
          logger.warn('CREATE SIGNATURE: Document not found in any firm', { documentId })
        }
      }

      if (documentError || !documentData) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
      }
      document = documentData
    }

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document is required for signature requests' },
        { status: 400 }
      )
    }

    // Get PDF buffer and compute hash
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

    // Compute original document hash
    const originalDocumentHash = signatureService.hashDocument(pdfBuffer)

    // Calculate expiry date
    const expiryDays = options.expiryDays || 30
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + expiryDays)

    // Get advisor info
    const { data: advisorProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', auth.context.userId)
      .single()

    // Get firm info
    const { data: firmInfo } = await supabase
      .from('firms')
      .select('name')
      .eq('id', firmId)
      .single()

    const documentTitle = document.name || document.file_name || 'Document'
    const signersPayload = signers.map((signer) => ({
      email: signer.email,
      name: signer.name,
      role: signer.role || 'Client'
    }))

    // Create signature request record
    const payload: any = {
      client_id: clientId || document.client_id || null,
      document_id: documentId || null,
      firm_id: firmId,
      created_by: auth.context.userId,
      recipient_name: signers[0]?.name || '',
      recipient_email: signers[0]?.email || '',
      recipient_role: signers[0]?.role || 'Client',
      expires_at: expiryDate.toISOString(),
      status: options.sendEmail !== false ? 'sent' : 'draft',
      signing_method: 'internal',
      original_document_hash: originalDocumentHash,
      auto_reminder: options.autoReminder ?? null,
      remind_once_in_every: options.remindOnceInEvery ?? null,
      opensign_metadata: {
        created_at: new Date().toISOString(),
        signers: signersPayload,
        document_name: documentTitle,
        template_id: templateId || null,
        custom_message: options.customMessage || null
      }
    }

    logger.debug('CREATE SIGNATURE: Creating signature request', { clientId, documentId })

    const { data: signatureRequest, error: insertError } = await supabase
      .from('signature_requests')
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      logger.error('CREATE SIGNATURE: Database insert failed', insertError)

      if (insertError.message?.includes('does not exist') || insertError.code === '42P01') {
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

    // Generate signing token
    const tokenResult = await signatureService.generateSigningToken(signatureRequest.id, expiryDays * 24)

    if (!tokenResult.success || !tokenResult.signingUrl) {
      logger.error('CREATE SIGNATURE: Failed to generate signing token', { error: tokenResult.error })
      return NextResponse.json({
        success: false,
        error: 'Failed to generate signing link'
      }, { status: 500 })
    }

    // Log audit event
    await signatureService.logAuditEvent(signatureRequest.id, 'created', {
      createdBy: auth.context.userId,
      documentId,
      signers: signersPayload
    })

    // Send email if enabled (default: true)
    if (options.sendEmail !== false) {
      try {
        const template = EMAIL_TEMPLATES.signatureRequest({
          clientName: signers[0].name,
          advisorName: advisorProfile?.full_name || 'Your Advisor',
          firmName: firmInfo?.name || 'Your Financial Advisor',
          documentName: documentTitle,
          signingUrl: tokenResult.signingUrl,
          expiryDate: expiryDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          customMessage: options.customMessage
        })

        const emailResult = await sendEmail({
          to: signers[0].email,
          subject: template.subject,
          html: template.html
        })

        if (!emailResult.success) {
          logger.error('CREATE SIGNATURE: Email send returned failure', { error: emailResult.error })
          // Update status back to draft since email failed
          await supabase
            .from('signature_requests')
            .update({ status: 'draft' })
            .eq('id', signatureRequest.id)
        } else {
          // Update sent_at only on successful email
          const { error: sentAtError } = await supabase
            .from('signature_requests')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', signatureRequest.id)

          if (!sentAtError) {
            // Log send event only if DB update succeeded
            await signatureService.logAuditEvent(signatureRequest.id, 'sent', {
              recipientEmail: signers[0].email
            })
          } else {
            logger.error('CREATE SIGNATURE: Failed to update sent_at', { error: sentAtError })
          }

          logger.info('CREATE SIGNATURE: Email sent successfully', { requestId: signatureRequest.id })
        }
      } catch (emailError) {
        logger.error('CREATE SIGNATURE: Failed to send email', emailError instanceof Error ? emailError : undefined)
        // Don't fail the request, just log the error
      }
    }

    logger.info('CREATE SIGNATURE: Success, created request', { requestId: signatureRequest.id })

    return NextResponse.json({
      success: true,
      signatureRequest: {
        id: signatureRequest.id,
        client_id: signatureRequest.client_id,
        status: signatureRequest.status,
        recipient_name: signatureRequest.recipient_name,
        recipient_email: signatureRequest.recipient_email,
        created_at: signatureRequest.created_at,
        signing_url: tokenResult.signingUrl,
        signing_token: tokenResult.token,
        expires_at: tokenResult.expiresAt
      },
      message: options.sendEmail !== false
        ? 'Signature request created and sent successfully'
        : 'Signature request created successfully'
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

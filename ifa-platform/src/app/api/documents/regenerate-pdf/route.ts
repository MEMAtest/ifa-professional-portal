export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { parseRequestBody } from '@/app/api/utils'
import { log } from '@/lib/logging/structured'

type RegenerateRequest = {
  documentId?: string
  documentIds?: string[]
  mode?: 'firm_zero'
  limit?: number
}

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

const wrapHtml = (title: string, body: string) => {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title></head><body>${body}</body></html>`
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

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) {
      return permissionError
    }

    const body = await parseRequestBody<RegenerateRequest>(request, undefined, { allowEmpty: true })
    const { documentId, documentIds, mode, limit } = body || {}

    const supabase = getSupabaseServiceClient()
    const firmId = firmResult.firmId

    let query = supabase
      .from('documents')
      .select('id, name, file_name, file_path, file_type, mime_type, file_size, metadata')
      .eq('firm_id', firmId)

    if (documentId) {
      query = query.eq('id', documentId)
    } else if (documentIds && documentIds.length > 0) {
      query = query.in('id', documentIds)
    } else if (mode === 'firm_zero') {
      query = query.lte('file_size', 0).limit(limit ?? 50)
    } else {
      return NextResponse.json({ error: 'documentId/documentIds or mode=firm_zero required' }, { status: 400 })
    }

    const { data: documents, error } = await query
    if (error || !documents) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    let updated = 0
    let skipped = 0
    const failures: Array<{ id: string; error: string }> = []

    for (const doc of documents) {
      try {
        const meta = (doc.metadata || {}) as Record<string, any>
        let html = meta.html_content as string | undefined
        if (!html && meta.reviewMarkdown) {
          html = wrapHtml(doc.name || 'File Review', markdownToHtml(meta.reviewMarkdown as string))
        }
        if (!html) {
          skipped += 1
          continue
        }

        const plainText = stripHtml(html)
        const pdfBuffer = await buildPdfBuffer(plainText)
        if (!pdfBuffer.length) {
          failures.push({ id: doc.id, error: 'Generated PDF was empty' })
          continue
        }

        const safeTitle = (doc.name || doc.file_name || 'document')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .slice(0, 80)
        let fileName = doc.file_name || `${safeTitle}_${Date.now()}.pdf`
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          fileName = `${fileName}.pdf`
        }
        const filePath = doc.file_path || `firms/${firmId}/documents/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
            cacheControl: '3600'
          })

        if (uploadError) {
          failures.push({ id: doc.id, error: 'Upload failed' })
          continue
        }

        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)

        const { error: updateError } = await supabase
          .from('documents')
          .update({
            file_name: fileName,
            file_path: filePath,
            storage_path: urlData?.publicUrl || filePath,
            file_type: 'pdf',
            mime_type: 'application/pdf',
            file_size: pdfBuffer.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id)
          .eq('firm_id', firmId)

        if (updateError) {
          failures.push({ id: doc.id, error: 'DB update failed' })
          continue
        }

        updated += 1
      } catch (err) {
        failures.push({ id: doc.id, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      failed: failures.length,
      failures
    })
  } catch (error) {
    log.error('Regenerate PDF error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/documents/preview/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { parseEml, parseMsg } from '@/lib/documents/emailParser'
import sanitizeHtml from 'sanitize-html'

// Max file size for in-memory conversion (5MB)
const MAX_CONVERSION_SIZE = 5 * 1024 * 1024

// CSP header to block inline scripts and restrict content
const PREVIEW_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:;"

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a1a;
    background: #fff;
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
    line-height: 1.6;
  }
  h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.5em; }
  p { margin: 0.5em 0; }
  img { max-width: 100%; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td {
    border: 1px solid #d1d5db;
    padding: 8px 12px;
    text-align: left;
    font-size: 13px;
  }
  th { background: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) { background: #f9fafb; }
  .sheet-heading {
    font-size: 15px;
    font-weight: 600;
    color: #374151;
    margin: 2rem 0 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
  }
  .sheet-heading:first-of-type { margin-top: 0; }
  .email-header {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 1.5rem;
  }
  .email-header-row {
    display: flex;
    padding: 4px 0;
    font-size: 14px;
  }
  .email-header-label {
    width: 80px;
    font-weight: 600;
    color: #6b7280;
    flex-shrink: 0;
  }
  .email-header-value {
    color: #1a1a1a;
  }
  .email-body {
    white-space: pre-wrap;
    font-size: 14px;
    line-height: 1.7;
  }
  .doc-title {
    font-size: 14px;
    color: #6b7280;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
  }
  @media print {
    body { padding: 1rem; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function convertDocxToHtml(buffer: Buffer, fileName: string): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer })
  const body = `
<div class="doc-title">${escapeHtml(fileName)}</div>
${result.value}`
  return wrapHtml(fileName, body)
}

function convertXlsxToHtml(buffer: Buffer, fileName: string): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetNames = workbook.SheetNames

  if (sheetNames.length === 0) {
    return wrapHtml(fileName, '<p>This spreadsheet has no sheets.</p>')
  }

  let sheetsHtml = ''

  for (let i = 0; i < sheetNames.length; i++) {
    const sheet = workbook.Sheets[sheetNames[i]]
    const html = XLSX.utils.sheet_to_html(sheet, { editable: false })
    if (sheetNames.length > 1) {
      sheetsHtml += `<div class="sheet-heading">${escapeHtml(sheetNames[i])}</div>`
    }
    sheetsHtml += `<div>${html}</div>`
  }

  const body = `
<div class="doc-title">${escapeHtml(fileName)}</div>
${sheetsHtml}`
  return wrapHtml(fileName, body)
}

function convertEmlToHtml(buffer: Buffer, fileName: string): string {
  const parsed = parseEml(buffer)
  return renderEmailHtml(parsed, fileName)
}

function convertMsgToHtml(buffer: Buffer, fileName: string): string {
  const parsed = parseMsg(buffer)
  return renderEmailHtml(parsed, fileName)
}

function renderEmailHtml(
  parsed: { from: string; to: string; date: string; subject: string; bodyText: string; bodyHtml?: string },
  fileName: string
): string {
  const bodyContent = parsed.bodyHtml
    ? sanitizeHtml(parsed.bodyHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          '*': ['style', 'class', 'id'],
          img: ['src', 'alt', 'width', 'height'],
        },
        allowedSchemes: ['http', 'https', 'mailto', 'data'],
      })
    : `<div class="email-body">${escapeHtml(parsed.bodyText)}</div>`

  const body = `
<div class="doc-title">${escapeHtml(fileName)}</div>
<div class="email-header">
  <div class="email-header-row"><span class="email-header-label">From:</span><span class="email-header-value">${escapeHtml(parsed.from)}</span></div>
  <div class="email-header-row"><span class="email-header-label">To:</span><span class="email-header-value">${escapeHtml(parsed.to)}</span></div>
  ${parsed.date ? `<div class="email-header-row"><span class="email-header-label">Date:</span><span class="email-header-value">${escapeHtml(parsed.date)}</span></div>` : ''}
  <div class="email-header-row"><span class="email-header-label">Subject:</span><span class="email-header-value"><strong>${escapeHtml(parsed.subject)}</strong></span></div>
</div>
${bodyContent}`

  return wrapHtml(parsed.subject, body)
}

/**
 * Convert markdown to HTML for preview rendering.
 * Handles headings, bold, italic, lists, tables, and paragraphs.
 */
function markdownToHtml(markdown: string): string {
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

    // Empty line
    if (!line.trim()) {
      closeList()
      i++
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/)
    if (headingMatch) {
      closeList()
      const level = headingMatch[1].length
      output.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`)
      i++
      continue
    }

    // Table (detect header + separator)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      closeList()
      const splitRow = (row: string) =>
        row.split('|').map(c => c.trim()).filter(c => c.length > 0)

      const headers = splitRow(line)
      output.push('<table><thead><tr>')
      headers.forEach(h => output.push(`<th>${inline(h)}</th>`))
      output.push('</tr></thead><tbody>')

      i += 2 // skip header and separator
      while (i < lines.length && lines[i].includes('|')) {
        const cells = splitRow(lines[i])
        output.push('<tr>')
        cells.forEach(c => output.push(`<td>${inline(c)}</td>`))
        output.push('</tr>')
        i++
      }
      output.push('</tbody></table>')
      continue
    }

    // Unordered list
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

    // Ordered list
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

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      closeList()
      output.push('<hr />')
      i++
      continue
    }

    // Paragraph
    closeList()
    output.push(`<p>${inline(line)}</p>`)
    i++
  }

  closeList()
  return output.join('\n')
}

function getEffectiveMimeType(document: Record<string, any>): string {
  const mime = document.file_type || document.mime_type || ''
  if (mime && mime !== 'application/octet-stream') return mime

  // Fallback: infer from file extension
  const fileName = document.file_name || document.name || ''
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  const extMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.msg': 'application/vnd.ms-outlook',
    '.eml': 'message/rfc822',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  }
  return extMap[ext] || mime || 'application/octet-stream'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id
    log.info('Preview requested for document', { documentId })

    const supabase = getSupabaseServiceClient()

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
      const url = new URL(document.storage_path)
      return NextResponse.redirect(url.toString())
    }

    // Option 2: If we have a file_path, download from Supabase storage and convert if needed
    if (document.file_path) {
      log.info('Downloading from Supabase storage', { documentId, file_path: document.file_path })
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (!downloadError && fileData) {
        const mimeType = getEffectiveMimeType(document)
        const fileName = document.file_name || document.name || 'document'
        const buffer = Buffer.from(await fileData.arrayBuffer())

        // Helper: build headers for converted HTML responses
        const htmlHeaders = () => {
          const h = new Headers()
          h.set('Content-Type', 'text/html; charset=utf-8')
          h.set('Content-Security-Policy', PREVIEW_CSP)
          h.set('Cache-Control', 'public, max-age=3600')
          return h
        }

        // Helper: force-download response when conversion fails
        const downloadFallback = (buf: Buffer, name: string, contentType: string) => {
          const h = new Headers()
          h.set('Content-Type', contentType)
          h.set('Content-Disposition', `attachment; filename="${name}"`)
          h.set('Cache-Control', 'public, max-age=3600')
          return new NextResponse(buf, { headers: h })
        }

        // DOCX → HTML
        if (
          mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          mimeType === 'application/msword'
        ) {
          try {
            const html = await convertDocxToHtml(buffer, fileName)
            return new NextResponse(html, { headers: htmlHeaders() })
          } catch (convError) {
            log.error('DOCX conversion failed, falling back to download', { documentId, error: convError })
            return downloadFallback(buffer, fileName, mimeType)
          }
        }

        // XLSX → HTML
        if (
          mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          mimeType === 'application/vnd.ms-excel'
        ) {
          if (buffer.length > MAX_CONVERSION_SIZE) {
            log.info('XLSX too large for preview, forcing download', { documentId, size: buffer.length })
            return downloadFallback(buffer, fileName, mimeType)
          }
          try {
            const html = convertXlsxToHtml(buffer, fileName)
            return new NextResponse(html, { headers: htmlHeaders() })
          } catch (convError) {
            log.error('XLSX conversion failed, falling back to download', { documentId, error: convError })
            return downloadFallback(buffer, fileName, mimeType)
          }
        }

        // EML → HTML
        if (mimeType === 'message/rfc822') {
          try {
            const html = convertEmlToHtml(buffer, fileName)
            return new NextResponse(html, { headers: htmlHeaders() })
          } catch (convError) {
            log.error('EML conversion failed, falling back to download', { documentId, error: convError })
            return downloadFallback(buffer, fileName, mimeType)
          }
        }

        // MSG → HTML (parse with MsgReader, fall back to download on failure)
        if (mimeType === 'application/vnd.ms-outlook') {
          try {
            const html = convertMsgToHtml(buffer, fileName)
            return new NextResponse(html, { headers: htmlHeaders() })
          } catch (convError) {
            log.error('MSG conversion failed, falling back to download', { documentId, error: convError })
            return downloadFallback(buffer, fileName, mimeType)
          }
        }

        // Browser-native types (PDF, images, text) → serve raw bytes
        const headers = new Headers()
        headers.set('Content-Type', mimeType || 'application/pdf')
        headers.set('Content-Disposition', `inline; filename="${fileName}"`)
        headers.set('Cache-Control', 'public, max-age=3600')

        return new NextResponse(fileData, { headers })
      }
    }

    // Option 3: Check for base64 PDF in metadata (fallback)
    const meta = document.metadata as Record<string, any> | null
    if (meta?.pdf_base64) {
      log.info('Using base64 PDF from metadata', { documentId })
      const pdfBuffer = Buffer.from(meta.pdf_base64, 'base64')

      const headers = new Headers()
      headers.set('Content-Type', 'application/pdf')
      headers.set('Content-Disposition', `inline; filename="${document.name || 'document.pdf'}"`)
      headers.set('Cache-Control', 'no-cache')

      return new NextResponse(pdfBuffer, { headers })
    }

    // Option 4: If we have HTML content, wrap it and display
    const doc = document as Record<string, any>
    if (doc.html_content || meta?.html_content) {
      log.info('Displaying HTML content', { documentId })
      const htmlContent = doc.html_content || meta?.html_content

      const headers = new Headers()
      headers.set('Content-Type', 'text/html; charset=utf-8')
      headers.set('Cache-Control', 'no-cache')

      return new NextResponse(htmlContent, { headers })
    }

    // Option 5: File review documents with reviewMarkdown in metadata
    if (meta?.reviewMarkdown) {
      log.info('Rendering file review markdown', { documentId })
      const markdownHtml = markdownToHtml(meta.reviewMarkdown as string)
      const title = document.name || 'File Review'
      const generatedAt = meta.generatedAt
        ? new Date(meta.generatedAt as string).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
          })
        : ''
      const docsAnalyzed = meta.documentsAnalyzed || 0
      const totalDocs = meta.totalDocuments || 0

      const headerHtml = `
        <div class="doc-title">
          ${escapeHtml(title)}
          ${generatedAt ? `<br/><small style="color:#6b7280;">Generated ${escapeHtml(generatedAt)} &mdash; ${docsAnalyzed} of ${totalDocs} documents analysed</small>` : ''}
        </div>`

      const fullHtml = wrapHtml(title, headerHtml + markdownHtml)

      const headers = new Headers()
      headers.set('Content-Type', 'text/html; charset=utf-8')
      headers.set('Content-Security-Policy', PREVIEW_CSP)
      headers.set('Cache-Control', 'no-cache')
      return new NextResponse(fullHtml, { headers })
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

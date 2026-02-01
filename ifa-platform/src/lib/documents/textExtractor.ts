// src/lib/documents/textExtractor.ts
// Pure utility — takes a Buffer + MIME type, returns extracted text. No DB or AI calls.

import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { parseEml, parseMsg } from './emailParser'

const MAX_TEXT_LENGTH = 50_000

export interface ExtractionResult {
  text: string
  charCount: number
  method: string
  error?: string
  pageImages?: Buffer[]  // Populated only when scan quality is too low, for visual reading fallback
}

/**
 * Extract text content from a document buffer based on its MIME type.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractionResult> {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()

  try {
    // PDF
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      return await extractPdf(buffer)
    }

    // DOCX / DOC
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      ext === '.docx' ||
      ext === '.doc'
    ) {
      return await extractDocx(buffer)
    }

    // XLSX / XLS
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      ext === '.xlsx' ||
      ext === '.xls'
    ) {
      return extractXlsx(buffer)
    }

    // EML
    if (mimeType === 'message/rfc822' || ext === '.eml') {
      return extractEmlText(buffer)
    }

    // MSG
    if (mimeType === 'application/vnd.ms-outlook' || ext === '.msg') {
      return extractMsgText(buffer)
    }

    // Plain text / CSV
    if (
      mimeType === 'text/plain' ||
      mimeType === 'text/csv' ||
      ext === '.txt' ||
      ext === '.csv'
    ) {
      return extractPlainText(buffer)
    }

    // Images — no OCR, return empty
    if (mimeType.startsWith('image/')) {
      return { text: '', charCount: 0, method: 'none (image)' }
    }

    // Unknown type
    return { text: '', charCount: 0, method: 'unsupported' }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown extraction error'
    return { text: '', charCount: 0, method: `error: ${msg}` }
  }
}

const MIN_CHARS_PER_PAGE = 50      // Below this average per page, OCR quality is too low
const MAX_SCAN_PAGES = 10          // Cap page image processing
const PDF_IMAGE_SCALE = 2.0        // ~200 DPI (default 96 * 2 ≈ 192)
const MAX_IMAGE_BYTES = 10 * 1024 * 1024  // 10MB per page image

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  // Render PDF pages to images using pdf-to-img, then OCR with Tesseract.
  // We avoid pdf-parse because it uses an incompatible pdfjs-dist version
  // that conflicts with pdf-to-img when both are loaded in the same process.

  // Step 1: Convert PDF pages to PNG images
  let pageImages: Buffer[]
  try {
    pageImages = await pdfToImages(buffer)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { text: '', charCount: 0, method: 'pdf-render-failed', error: msg }
  }

  if (pageImages.length === 0) {
    return { text: '', charCount: 0, method: 'pdf-no-pages' }
  }

  // Step 2: Run Tesseract OCR on each page image
  let ocrText: string
  try {
    ocrText = await ocrPages(pageImages)
  } catch {
    // OCR failed — return page images for visual AI fallback
    return { text: '', charCount: 0, method: 'pdf-ocr-failed', pageImages }
  }

  const avgCharsPerPage = ocrText.length / pageImages.length

  if (avgCharsPerPage >= MIN_CHARS_PER_PAGE) {
    const text = truncate(ocrText)
    return { text, charCount: text.length, method: 'pdf-ocr' }
  }

  // OCR quality too low — return best text + images for visual reading fallback
  const text = truncate(ocrText)
  return { text, charCount: text.length, method: 'pdf-ocr-low', pageImages }
}

async function pdfToImages(buffer: Buffer): Promise<Buffer[]> {
  const { pdf: convert } = await import('pdf-to-img')
  const pages: Buffer[] = []
  let count = 0
  const doc = await convert(buffer, { scale: PDF_IMAGE_SCALE })
  for await (const page of doc) {
    if (count >= MAX_SCAN_PAGES) break
    const buf = Buffer.from(page)
    if (buf.length > MAX_IMAGE_BYTES) continue  // Skip oversized pages
    pages.push(buf)
    count++
  }
  return pages
}

async function ocrPages(pageImages: Buffer[]): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const parts: string[] = []
    for (const img of pageImages) {
      const { data } = await worker.recognize(img)
      parts.push(data.text)
    }
    return parts.join('\n').trim()
  } finally {
    await worker.terminate()
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer })
  const text = truncate(result.value)
  return { text, charCount: text.length, method: 'mammoth' }
}

function extractXlsx(buffer: Buffer): ExtractionResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheets: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    if (csv.trim()) {
      sheets.push(`[Sheet: ${sheetName}]\n${csv}`)
    }
  }

  const text = truncate(sheets.join('\n\n'))
  return { text, charCount: text.length, method: 'xlsx' }
}

function extractEmlText(buffer: Buffer): ExtractionResult {
  const parsed = parseEml(buffer)
  const parts = [
    `From: ${parsed.from}`,
    `To: ${parsed.to}`,
    parsed.date ? `Date: ${parsed.date}` : '',
    `Subject: ${parsed.subject}`,
    '',
    parsed.bodyText,
  ].filter(Boolean)

  const text = truncate(parts.join('\n'))
  return { text, charCount: text.length, method: 'eml-parser' }
}

function extractMsgText(buffer: Buffer): ExtractionResult {
  const parsed = parseMsg(buffer)
  const parts = [
    `From: ${parsed.from}`,
    `To: ${parsed.to}`,
    parsed.date ? `Date: ${parsed.date}` : '',
    `Subject: ${parsed.subject}`,
    '',
    parsed.bodyText,
  ].filter(Boolean)

  const text = truncate(parts.join('\n'))
  return { text, charCount: text.length, method: 'msg-parser' }
}

function extractPlainText(buffer: Buffer): ExtractionResult {
  const text = truncate(buffer.toString('utf-8'))
  return { text, charCount: text.length, method: 'plain-text' }
}

function truncate(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text
  return text.slice(0, MAX_TEXT_LENGTH)
}

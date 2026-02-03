// src/app/api/documents/extract/route.ts
// POST endpoint for document text extraction + AI analysis

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { log } from '@/lib/logging/structured'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { extractText } from '@/lib/documents/textExtractor'
import { analyzeDocument, readPageImages } from '@/lib/documents/aiAnalyzer'
import { parseRequestBody } from '@/app/api/utils'

const MAX_BATCH_SIZE = 50
const CONCURRENCY = 3
const TIMEOUT_MS = 55_000 // Stop before Vercel's 60s limit

const requestSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE)
})

interface ExtractionResult {
  documentId: string
  status: 'analyzed' | 'extracted' | 'failed'
  error?: string
}

function getEffectiveMimeType(document: Record<string, any>): string {
  const mime = document.file_type || document.mime_type || ''
  if (mime && mime !== 'application/octet-stream') return mime

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

async function processDocument(
  documentId: string,
  supabase: ReturnType<typeof getSupabaseServiceClient>
): Promise<ExtractionResult> {
  // 1. Mark as processing
  await supabase
    .from('documents')
    .update({ status: 'processing' } as any)
    .eq('id', documentId)

  // 2. Fetch document record
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    return { documentId, status: 'failed', error: 'Document not found' }
  }

  // 3. Download file from storage
  if (!doc.file_path) {
    await supabase
      .from('documents')
      .update({ status: 'failed', metadata: { ...((doc.metadata as any) || {}), extraction_error: 'No file path' } } as any)
      .eq('id', documentId)
    return { documentId, status: 'failed', error: 'No file path' }
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('documents')
    .download(doc.file_path)

  if (downloadError || !fileData) {
    await supabase
      .from('documents')
      .update({ status: 'failed', metadata: { ...((doc.metadata as any) || {}), extraction_error: 'Download failed' } } as any)
      .eq('id', documentId)
    return { documentId, status: 'failed', error: 'File download failed' }
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const mimeType = getEffectiveMimeType(doc)
  const fileName = doc.file_name || doc.name || 'document'

  // 4. Extract text
  let extraction
  try {
    extraction = await extractText(buffer, mimeType, fileName)
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'Text extraction failed'
    const publicMsg = 'Text extraction failed'
    await supabase
      .from('documents')
      .update({
        status: 'failed',
        metadata: { ...((doc.metadata as any) || {}), extraction_error: rawMsg },
      } as any)
      .eq('id', documentId)
    return { documentId, status: 'failed', error: publicMsg }
  }

  // 4b. Visual reading fallback for low-quality scans
  if (extraction.pageImages && extraction.pageImages.length > 0) {
    try {
      const visualText = await readPageImages(extraction.pageImages, fileName)
      if (visualText.trim().length > extraction.text.length) {
        extraction = {
          text: visualText.trim().slice(0, 50_000),
          charCount: Math.min(visualText.trim().length, 50_000),
          method: 'pdf-visual',
        }
      } else if (extraction.method === 'pdf-scanned-low') {
        // Keep existing text but note we attempted visual reading
        extraction = { ...extraction, method: 'pdf-visual-partial' }
      }
    } catch (err) {
      log.error('Visual reading fallback failed', {
        documentId,
        error: err instanceof Error ? err.message : String(err),
      })
      // Continue with whatever text we have
    }
    // Drop pageImages from extraction to avoid storing them in metadata
    delete extraction.pageImages
  }

  const now = new Date().toISOString()
  const baseMetadata = {
    ...((doc.metadata as any) || {}),
    extracted_text: extraction.text,
    extracted_text_length: extraction.charCount,
    extraction_method: extraction.method,
    ...(extraction.error ? { extraction_error: extraction.error } : {}),
    extracted_at: now,
  }

  // 5. AI analysis
  try {
    const { analysis, provider } = await analyzeDocument(extraction.text, fileName, mimeType)

    await supabase
      .from('documents')
      .update({
        status: 'analyzed',
        metadata: {
          ...baseMetadata,
          ai_analysis: {
            summary: analysis.summary,
            classification: analysis.classification,
            confidence: analysis.confidence,
            entities: analysis.entities,
          },
          ai_analyzed_at: new Date().toISOString(),
          ai_provider: provider,
        },
      } as any)
      .eq('id', documentId)

    return { documentId, status: 'analyzed' }
  } catch (aiErr) {
    // Text extraction succeeded but AI failed — store text, mark as extracted
    const aiMsg = aiErr instanceof Error ? aiErr.message : 'AI analysis failed'
    const publicMsg = 'AI analysis failed'
    log.error('AI analysis failed for document', { documentId, error: aiMsg })

    await supabase
      .from('documents')
      .update({
        status: 'extracted',
        metadata: {
          ...baseMetadata,
          ai_error: aiMsg,
        },
      } as any)
      .eq('id', documentId)

    return { documentId, status: 'extracted', error: publicMsg }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify authentication
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await parseRequestBody(request, requestSchema)
    const documentIds: string[] = body.documentIds

    // Validate document IDs are strings (UUIDs expected)
    const validIds = documentIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 100)
    if (!validIds) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const results: ExtractionResult[] = []
    let partial = false

    // Process in batches of CONCURRENCY
    for (let i = 0; i < documentIds.length; i += CONCURRENCY) {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        log.warn('Extraction timeout reached, returning partial results', {
          processed: results.length,
          total: documentIds.length,
        })
        partial = true
        break
      }

      const batch = documentIds.slice(i, i + CONCURRENCY)
      const batchResults = await Promise.allSettled(
        batch.map((id) => processDocument(id, supabase))
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          const failedId = batch[batchResults.indexOf(result)]
          results.push({
            documentId: failedId,
            status: 'failed',
            error: 'Extraction failed',
          })
        }
      }
    }

    const analyzed = results.filter((r) => r.status === 'analyzed').length
    const extracted = results.filter((r) => r.status === 'extracted').length
    const failed = results.filter((r) => r.status === 'failed').length

    log.info('Document extraction complete', {
      total: documentIds.length,
      analyzed,
      extracted,
      failed,
      partial,
      durationMs: Date.now() - startTime,
    })

    return NextResponse.json({
      success: true,
      results,
      summary: { analyzed, extracted, failed, total: documentIds.length },
      partial,
    })
  } catch (error) {
    log.error('Document extraction API error', error)
    return NextResponse.json(
      { error: 'Failed to process documents' },
      { status: 500 }
    )
  }
}

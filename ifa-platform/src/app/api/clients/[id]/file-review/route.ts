// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// src/app/api/clients/[id]/file-review/route.ts
// Generate a comprehensive client file review from analyzed documents.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, getValidatedFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger } from '@/lib/logging/structured'
import {
  buildFileReviewPrompt,
  generateDeterministicTasks,
  normalizeTaskTitle,
  parseFileReviewResponse,
  parseGapsIntoTasks,
  type SuggestedTask,
} from '@/lib/documents/fileReviewGenerator'

type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'mock'

interface AIConfig {
  provider: AIProvider
  apiKey: string | null
  apiUrl: string
  model: string
}

const AI_TIMEOUT_MS = 120_000
const AI_MAX_TOKENS = 12000

function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || 'mock') as AIProvider
  const configs: Record<AIProvider, AIConfig> = {
    openai: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || null,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    },
    anthropic: {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || null,
      apiUrl: 'https://api.anthropic.com/v1/messages',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
    },
    deepseek: {
      provider: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY || null,
      apiUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
    mock: {
      provider: 'mock',
      apiKey: null,
      apiUrl: '',
      model: 'mock',
    },
  }

  return configs[provider]
}

async function callOpenAICompatible(
  config: AIConfig,
  systemPrompt: string,
  userMessage: string,
  logger: ReturnType<typeof createRequestLogger>
): Promise<string> {
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: AI_MAX_TOKENS,
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(
      'AI API error',
      new Error(`status ${response.status}`),
      { provider: config.provider, status: response.status, body: errorText.slice(0, 500) }
    )
    throw new Error(`${config.provider} API error (status ${response.status})`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callAnthropic(
  config: AIConfig,
  systemPrompt: string,
  userMessage: string,
  logger: ReturnType<typeof createRequestLogger>
): Promise<string> {
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.3,
      max_tokens: AI_MAX_TOKENS,
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(
      'AI API error',
      new Error(`status ${response.status}`),
      { provider: config.provider, status: response.status, body: errorText.slice(0, 500) }
    )
    throw new Error(`${config.provider} API error (status ${response.status})`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

function generateMockFileReview(
  clientProfile: Record<string, unknown>,
  documents: { fileName: string; classification: string; confidence: number; summary: string }[],
  assessments: Record<string, unknown> | null
): string {
  const personal = (clientProfile as any)?.personal_details || {}
  const clientName = `${personal.firstName || ''} ${personal.lastName || ''}`.trim() || 'Client'

  const docRows = documents
    .map((doc, index) => {
      const confidencePct = Math.round(doc.confidence * 100)
      return `| ${index + 1} | ${doc.fileName} | ${doc.classification} | ${doc.summary} | ${confidencePct}% |`
    })
    .join('\n')

  const gaps: string[] = []
  if (!(assessments as any)?.suitability) gaps.push('Complete the suitability assessment and add the report to file.')
  if (!(assessments as any)?.atr) gaps.push('Complete the attitude to risk assessment and record the outcome.')
  if (!(assessments as any)?.cfl) gaps.push('Complete the capacity for loss assessment and record the outcome.')
  if (gaps.length === 0) gaps.push('No critical gaps identified from the available information.')

  return [
    `# Client File Review - ${clientName}`,
    '',
    '## 1. Client Overview',
    '| Category | Detail | Source |',
    '| --- | --- | --- |',
    `| Name | ${clientName} | Client profile |`,
    `| Date of birth | ${personal.dateOfBirth || personal.date_of_birth || 'Not recorded'} | Client profile |`,
    `| Address | ${(clientProfile as any)?.contact_info?.address?.line1 || 'Not recorded'} | Client profile |`,
    '',
    '## 2. Documents on File',
    '| # | Document | Classification | Key Contents | Confidence |',
    '| --- | --- | --- | --- | --- |',
    docRows || '| 1 | No documents available | Other | No summaries available | 0% |',
    '',
    '## 3. Client Information Extracted',
    '| Category | Data Found | Source Document | Completeness |',
    '| --- | --- | --- | --- |',
    '| Personal details | Name and DOB | Client profile | Partial |',
    '| Employment & income | Not identified | Not found | Not Found |',
    '| Financial assets | Not identified | Not found | Not Found |',
    '| Liabilities | Not identified | Not found | Not Found |',
    '| Pensions & retirement | Review documents | Document summaries | Partial |',
    '| Insurance | Not identified | Not found | Not Found |',
    '| Risk profile | Not identified | Not found | Not Found |',
    '| Objectives & goals | Not identified | Not found | Not Found |',
    '',
    '## 4. Advice Information Extracted',
    '| Category | Detail | Source Document | Completeness |',
    '| --- | --- | --- | --- |',
    '| Transaction type | Not identified | Not found | Not documented |',
    '| Ceding provider | Not identified | Not found | Not documented |',
    '| Receiving provider | Not identified | Not found | Not documented |',
    '| Product recommended | Not identified | Not found | Not documented |',
    '| Transfer value | Not identified | Not found | Not documented |',
    '| Fund selections | Not identified | Not found | Not documented |',
    '| Charges & fees | Not identified | Not found | Not documented |',
    '| Ongoing advice fees | Not identified | Not found | Not documented |',
    '| Reason for advice | Not identified | Not found | Not documented |',
    '| Suitability rationale | Not identified | Not found | Not documented |',
    '',
    '## 5. Advice Summary & Rationale',
    'The file currently contains limited advice rationale. Additional suitability documentation is required to explain the advice given and how it aligns with the client\'s objectives.',
    '',
    '## 6. Suitability & Risk Assessment Summary',
    'Suitability, ATR, and CFL assessment results are not fully documented in the file. These should be completed and recorded before advice is confirmed.',
    '',
    '## 7. Compliance Summary',
    'Client information collection and suitability evidence remain incomplete. Ensure COBS 9.2.1R, 9.2.2R, and 9.4.1R requirements are met with documented assessments and a suitability report.',
    '',
    '## 8. Gaps & Recommendations',
    ...gaps.map((gap) => `- ${gap}`),
    '',
    '## 9. Overall Assessment',
    'The file requires additional evidence to demonstrate suitability and regulatory compliance. Core assessments and advice rationale documentation should be prioritised.',
    '',
  ].join('\n')
}

function shouldSkipAiTask(aiTitle: string, deterministic: SuggestedTask[]): boolean {
  const lowered = aiTitle.toLowerCase()
  if (/\batr\b|\battitude to risk\b/.test(lowered)) {
    return deterministic.some((task) => task.title.toLowerCase().includes('atr'))
  }
  if (/\bcfl\b|\bcapacity for loss\b/.test(lowered)) {
    return deterministic.some((task) => task.title.toLowerCase().includes('cfl'))
  }
  if (/\bsuitability\b/.test(lowered)) {
    return deterministic.some((task) => task.title.toLowerCase().includes('suitability'))
  }
  if (/\bemail\b/.test(lowered)) {
    return deterministic.some((task) => task.title.toLowerCase().includes('email'))
  }
  return false
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const logger = createRequestLogger(request)

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const firmId = getValidatedFirmId(auth.context)
    const clientId = context?.params?.id
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID is required' }, { status: 400 })
    }
    if (!firmId) {
      return NextResponse.json({ success: false, error: 'Firm ID required' }, { status: 403 })
    }

    const supabase = getSupabaseServiceClient()

    let clientQuery = supabase
      .from('clients')
      .select('id, client_ref, personal_details, financial_profile, risk_profile, contact_info, firm_id')
      .eq('id', clientId)

    clientQuery = clientQuery.eq('firm_id', firmId)

    const { data: client, error: clientError } = await clientQuery.single()
    if (clientError || !client) {
      logger.warn('Client not found for file review', { clientId })
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
    }

    const effectiveFirmId = firmId

    interface DocumentRow {
      id: string
      file_name: string | null
      name: string | null
      metadata: Record<string, any> | null
      status: string | null
    }

    let allDocsQuery = supabase
      .from('documents')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('firm_id', effectiveFirmId)

    const { data: allDocuments, error: allDocsError } = await allDocsQuery

    if (allDocsError) {
      logger.error('Failed to fetch document count for file review', allDocsError, { clientId })
      return NextResponse.json({ success: false, error: 'Failed to fetch documents' }, { status: 500 })
    }

    let docsQuery = supabase
      .from('documents')
      .select('id, file_name, name, metadata, status')
      .eq('client_id', clientId)
      .eq('status', 'analyzed')
      .eq('firm_id', effectiveFirmId)

    const { data: documents, error: docError } = await docsQuery

    if (docError) {
      logger.error('Failed to fetch documents for file review', docError, { clientId })
      return NextResponse.json({ success: false, error: 'Failed to fetch documents' }, { status: 500 })
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ success: false, error: 'No analysed documents found' }, { status: 400 })
    }

    const docAnalyses = (documents as unknown as DocumentRow[]).map((doc) => {
      const meta = doc.metadata || {}
      const analysis = meta.ai_analysis || {}
      return {
        fileName: doc.file_name || doc.name || 'Document',
        classification: analysis.classification || 'other',
        confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0,
        summary: analysis.summary || 'No summary available',
        entities: analysis.entities || {},
        extractedText: meta.extracted_text || '',
      }
    })

    const clientProfile = {
      client_ref: client.client_ref,
      personal_details: client.personal_details || {},
      financial_profile: client.financial_profile || {},
      risk_profile: client.risk_profile || {},
      contact_info: client.contact_info || {},
    }

    let suitQ = supabase
      .from('suitability_assessments')
      .select('id, total_score, status, created_at')
      .eq('client_id', clientId)
    suitQ = suitQ.eq('firm_id', effectiveFirmId)

    let atrQ = supabase
      .from('atr_assessments')
      .select('id, total_score, risk_category, status, created_at')
      .eq('client_id', clientId)
      .eq('firm_id', effectiveFirmId)

    let cflQ = supabase
      .from('cfl_assessments')
      .select('id, total_score, risk_category, status, created_at')
      .eq('client_id', clientId)
      .eq('firm_id', effectiveFirmId)

    const [
      suitabilityResult,
      atrResult,
      cflResult,
    ] = await Promise.all([
      suitQ.order('created_at', { ascending: false }).limit(1).maybeSingle(),
      atrQ.order('created_at', { ascending: false }).limit(1).maybeSingle(),
      cflQ.order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const assessments = {
      suitability: (suitabilityResult?.data as Record<string, unknown> | null) || null,
      atr: (atrResult?.data as Record<string, unknown> | null) || null,
      cfl: (cflResult?.data as Record<string, unknown> | null) || null,
    }

    const { systemPrompt, userMessage } = buildFileReviewPrompt(clientProfile, docAnalyses, assessments)

    const config = getAIConfig()
    if (config.provider !== 'mock' && !config.apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI API key not configured' },
        { status: 500 }
      )
    }

    let raw = ''
    if (config.provider === 'anthropic') {
      raw = await callAnthropic(config, systemPrompt, userMessage, logger)
    } else if (config.provider === 'mock') {
      raw = generateMockFileReview(clientProfile, docAnalyses, assessments)
    } else {
      raw = await callOpenAICompatible(config, systemPrompt, userMessage, logger)
    }
    const review = parseFileReviewResponse(raw)
    const deterministicTasks = generateDeterministicTasks(assessments, clientProfile)
    const aiTasks = parseGapsIntoTasks(review)
      .filter((task) => !shouldSkipAiTask(task.title, deterministicTasks))

    const dedupe = new Set(deterministicTasks.map((task) => normalizeTaskTitle(task.title)))
    const suggestedTasks: SuggestedTask[] = [
      ...deterministicTasks,
      ...aiTasks.filter((task) => {
        const normalized = normalizeTaskTitle(task.title)
        if (dedupe.has(normalized)) return false
        dedupe.add(normalized)
        return true
      }),
    ]

    const averageConfidence =
      docAnalyses.reduce((sum, doc) => sum + (doc.confidence || 0), 0) / docAnalyses.length

    return NextResponse.json({
      success: true,
      review,
      suggestedTasks,
      metadata: {
        documentsAnalyzed: docAnalyses.length,
        totalDocuments: allDocuments?.length || 0,
        provider: config.provider,
        averageConfidence: Number.isFinite(averageConfidence)
          ? Math.round(averageConfidence * 100) / 100
          : 0,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error('File review generation error', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate file review' },
      { status: 500 }
    )
  }
}

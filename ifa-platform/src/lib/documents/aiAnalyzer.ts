// src/lib/documents/aiAnalyzer.ts
// AI-powered document analysis — reuses provider config pattern from ai/complete/route.ts

import { log } from '@/lib/logging/structured'

// =====================================================
// TYPES
// =====================================================

export interface FinancialAmount {
  amount: number
  currency: string
  context: string
}

export interface DocumentEntities {
  clientNames: string[]
  dates: string[]
  providerNames: string[]
  policyNumbers: string[]
  financialAmounts: FinancialAmount[]
  addresses: string[]
  referenceNumbers: string[]
}

export interface DocumentAnalysis {
  summary: string
  classification: string
  confidence: number
  entities: DocumentEntities
}

type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'mock'

interface AIConfig {
  provider: AIProvider
  apiKey: string | null
  apiUrl: string
  model: string
}

// =====================================================
// CONFIGURATION
// =====================================================

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

// =====================================================
// SYSTEM PROMPT
// =====================================================

const SYSTEM_PROMPT = `You are a document analyst for a UK Independent Financial Adviser (IFA) firm.
Analyse the provided document text and extract structured information.

Return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence summary of the document",
  "classification": "one of: pension_statement, bank_statement, investment_report, insurance_policy, tax_document, identity_document, correspondence, transfer_form, valuation_report, fund_factsheet, application_form, meeting_notes, compliance_document, other",
  "confidence": 0.0 to 1.0,
  "entities": {
    "clientNames": ["Full names found"],
    "dates": ["YYYY-MM-DD format"],
    "providerNames": ["Company/provider names"],
    "policyNumbers": ["Policy/plan/account numbers"],
    "financialAmounts": [{"amount": 0.00, "currency": "GBP", "context": "what this amount represents"}],
    "addresses": ["Full addresses found"],
    "referenceNumbers": ["Any other reference numbers"]
  }
}

Guidelines:
- Dates should be in ISO format (YYYY-MM-DD). If only month/year, use first of month.
- Financial amounts: extract the numeric value, currency (default GBP), and what the amount represents.
- Be conservative — only extract entities you're confident about.
- For classification, choose the most specific category that fits.
- Confidence: 0.9+ for clear documents, 0.5-0.8 for partial text, below 0.5 for unclear.
- If the document text is empty or unreadable, return a summary explaining this with confidence 0.0.
- Return ONLY valid JSON, no markdown fences or extra text.`

// =====================================================
// AI PROVIDER CALLS
// =====================================================

const AI_MAX_CHARS = 15_000
const AI_TIMEOUT_MS = 30_000

async function callOpenAICompatible(
  config: AIConfig,
  text: string,
  fileName: string,
  fileType: string
): Promise<string> {
  const userMessage = `Document: "${fileName}" (${fileType})\n\n${text.slice(0, AI_MAX_CHARS)}`

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`${config.provider} API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callAnthropic(
  config: AIConfig,
  text: string,
  fileName: string,
  fileType: string
): Promise<string> {
  const userMessage = `Document: "${fileName}" (${fileType})\n\n${text.slice(0, AI_MAX_CHARS)}`

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 2000,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

function generateMockAnalysis(fileName: string, text: string): DocumentAnalysis {
  const lower = fileName.toLowerCase()

  let classification = 'other'
  if (lower.includes('pension') || lower.includes('sipp')) classification = 'pension_statement'
  else if (lower.includes('bank') || lower.includes('statement')) classification = 'bank_statement'
  else if (lower.includes('insurance') || lower.includes('policy')) classification = 'insurance_policy'
  else if (lower.includes('tax') || lower.includes('hmrc') || lower.includes('p60')) classification = 'tax_document'
  else if (lower.includes('passport') || lower.includes('licence')) classification = 'identity_document'
  else if (lower.includes('invest') || lower.includes('fund') || lower.includes('portfolio')) classification = 'investment_report'
  else if (lower.includes('transfer')) classification = 'transfer_form'
  else if (lower.includes('valuation')) classification = 'valuation_report'
  else if (lower.match(/\.msg$|\.eml$/)) classification = 'correspondence'

  return {
    summary: `Mock analysis of "${fileName}". This document contains ${text.length} characters of extracted text. Classification: ${classification}.`,
    classification,
    confidence: text.length > 100 ? 0.75 : 0.3,
    entities: {
      clientNames: ['S Bucknill'],
      dates: ['2024-01-15'],
      providerNames: ['Royal London'],
      policyNumbers: ['4079140'],
      financialAmounts: [{ amount: 33042.56, currency: 'GBP', context: 'Fund value' }],
      addresses: [],
      referenceNumbers: [],
    },
  }
}

// =====================================================
// VISUAL PAGE READING (for scanned PDFs with low OCR quality)
// =====================================================

const VISION_TIMEOUT_MS = 30_000
const VISION_PAGES_PER_BATCH = 4

/**
 * Send page images to a vision-capable AI model to extract text.
 * Used as a fallback when Tesseract OCR quality is too low.
 */
export async function readPageImages(
  pageImages: Buffer[],
  fileName: string
): Promise<string> {
  const config = getAIConfig()

  if (config.provider === 'mock' || !config.apiKey) {
    return ''
  }

  const visionModel = process.env.VISION_MODEL || config.model
  const results: string[] = []
  const totalBatches = Math.ceil(pageImages.length / VISION_PAGES_PER_BATCH)
  let failedBatches = 0

  for (let i = 0; i < pageImages.length; i += VISION_PAGES_PER_BATCH) {
    const batch = pageImages.slice(i, i + VISION_PAGES_PER_BATCH)
    const prompt = `Extract all text from ${batch.length > 1 ? 'these document pages' : 'this document page'} of "${fileName}" exactly as written. Preserve layout and formatting. Return only the extracted text, no commentary.`

    try {
      let text: string
      if (config.provider === 'anthropic') {
        text = await callAnthropicVision(config, visionModel, batch, prompt)
      } else {
        text = await callOpenAICompatibleVision(config, visionModel, batch, prompt)
      }
      results.push(text)
    } catch (err) {
      failedBatches++
      log.error('Visual reading failed for page batch', {
        fileName,
        batchStart: i,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (failedBatches === totalBatches && totalBatches > 0) {
    throw new Error(`All ${totalBatches} vision API batches failed for "${fileName}"`)
  }

  return results.join('\n\n')
}

async function callOpenAICompatibleVision(
  config: AIConfig,
  model: string,
  images: Buffer[],
  prompt: string
): Promise<string> {
  const content: Array<Record<string, unknown>> = images.map((buf) => ({
    type: 'image_url',
    image_url: { url: `data:image/png;base64,${buf.toString('base64')}` },
  }))
  content.push({ type: 'text', text: prompt })

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      temperature: 0.1,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`${config.provider} vision API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callAnthropicVision(
  config: AIConfig,
  model: string,
  images: Buffer[],
  prompt: string
): Promise<string> {
  const content: Array<Record<string, unknown>> = images.map((buf) => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/png',
      data: buf.toString('base64'),
    },
  }))
  content.push({ type: 'text', text: prompt })

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      max_tokens: 4000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic vision API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

// =====================================================
// MAIN EXPORT
// =====================================================

/**
 * Analyse extracted document text using AI.
 * Returns structured analysis including summary, classification, and entities.
 */
export async function analyzeDocument(
  text: string,
  fileName: string,
  fileType: string
): Promise<{ analysis: DocumentAnalysis; provider: string }> {
  const config = getAIConfig()
  let provider = config.provider

  // Fall back to mock if no API key configured
  if (provider !== 'mock' && !config.apiKey) {
    log.warn(`${provider} API key not configured for document analysis, using mock`)
    provider = 'mock'
  }

  if (provider === 'mock') {
    return {
      analysis: generateMockAnalysis(fileName, text),
      provider: 'mock',
    }
  }

  // If text is empty, return early with low-confidence result
  if (!text.trim()) {
    return {
      analysis: {
        summary: `No text could be extracted from "${fileName}". The document may be scanned/image-based.`,
        classification: 'other',
        confidence: 0,
        entities: {
          clientNames: [],
          dates: [],
          providerNames: [],
          policyNumbers: [],
          financialAmounts: [],
          addresses: [],
          referenceNumbers: [],
        },
      },
      provider,
    }
  }

  let rawContent: string

  switch (provider) {
    case 'anthropic':
      rawContent = await callAnthropic(config, text, fileName, fileType)
      break
    case 'openai':
    case 'deepseek':
    default:
      rawContent = await callOpenAICompatible(config, text, fileName, fileType)
      break
  }

  // Parse the JSON response
  const analysis = parseAnalysisResponse(rawContent, fileName)

  return { analysis, provider }
}

function parseAnalysisResponse(raw: string, fileName: string): DocumentAnalysis {
  try {
    // Strip markdown code fences if present
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const parsed = JSON.parse(cleaned)

    // Validate and normalize the response (cap arrays at 50 to prevent metadata bloat)
    const cap = <T,>(arr: T[], max = 50): T[] => arr.slice(0, max)

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 2000) : `Analysis of ${fileName}`,
      classification: typeof parsed.classification === 'string' ? parsed.classification : 'other',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      entities: {
        clientNames: cap(Array.isArray(parsed.entities?.clientNames) ? parsed.entities.clientNames : []),
        dates: cap(Array.isArray(parsed.entities?.dates) ? parsed.entities.dates : []),
        providerNames: cap(Array.isArray(parsed.entities?.providerNames) ? parsed.entities.providerNames : []),
        policyNumbers: cap(Array.isArray(parsed.entities?.policyNumbers) ? parsed.entities.policyNumbers : []),
        financialAmounts: cap(
          Array.isArray(parsed.entities?.financialAmounts)
            ? parsed.entities.financialAmounts.map((a: any) => ({
                amount: typeof a.amount === 'number' ? a.amount : 0,
                currency: typeof a.currency === 'string' ? a.currency : 'GBP',
                context: typeof a.context === 'string' ? a.context : '',
              }))
            : []
        ),
        addresses: cap(Array.isArray(parsed.entities?.addresses) ? parsed.entities.addresses : []),
        referenceNumbers: cap(Array.isArray(parsed.entities?.referenceNumbers) ? parsed.entities.referenceNumbers : []),
      },
    }
  } catch (error) {
    log.error('Failed to parse AI analysis response', { error, raw: raw.slice(0, 500) })
    return {
      summary: `AI returned an unparseable response for "${fileName}".`,
      classification: 'other',
      confidence: 0,
      entities: {
        clientNames: [],
        dates: [],
        providerNames: [],
        policyNumbers: [],
        financialAmounts: [],
        addresses: [],
        referenceNumbers: [],
      },
    }
  }
}

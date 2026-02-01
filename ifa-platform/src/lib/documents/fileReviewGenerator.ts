// src/lib/documents/fileReviewGenerator.ts
// Build prompt + parse response for client file review generation.

export interface FileReviewDocumentAnalysis {
  fileName: string
  classification: string
  confidence: number
  summary: string
  entities: Record<string, unknown>
  extractedText: string
}

export type SuggestedTaskType =
  | 'general'
  | 'review'
  | 'compliance'
  | 'client_follow_up'
  | 'deadline'
  | 'meeting'

export type SuggestedTaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface SuggestedTask {
  id: string
  title: string
  description?: string
  type: SuggestedTaskType
  priority: SuggestedTaskPriority
  source: 'deterministic' | 'ai_parsed'
}

export interface FileReviewPrompt {
  systemPrompt: string
  userMessage: string
}

const AI_MAX_CHARS = 30_000

const SYSTEM_PROMPT = `You are a senior compliance officer at a UK Independent Financial Adviser (IFA) firm conducting a comprehensive client file review.

You have been given:
1. The client's profile information
2. All documents in the client's file with their extracted analysis
3. Assessment results (if available)

Produce a detailed Client File Review in Markdown format following this exact structure:

# Client File Review - {Client Name}

## 1. Client Overview
(DETAILED: Full name, DOB, NI number, address, employment status, employer, marital status, dependants with ages, income, expenditure, existing assets, liabilities, pensions — use table format:
| Category | Detail | Source |
Pull from both client profile AND extracted document data. Mark gaps explicitly.)

## 2. Documents on File
(List ALL documents with: file name, classification, what it contains, date if known.
Use table: | # | Document | Classification | Key Contents | Confidence |)

## 3. Client Information Extracted
(Table: | Category | Data Found | Source Document | Completeness |
Categories: Personal details, Employment & income, Financial assets, Liabilities, Pensions & retirement, Insurance, Risk profile, Objectives & goals.
Mark each as Complete / Partial / Limited / Not Found.)

## 4. Advice Information Extracted
(Table: | Category | Detail | Source Document | Completeness |
Categories: Transaction type, Ceding provider, Receiving provider, Product recommended, Transfer value, Fund selections, Charges & fees, Ongoing advice fees, Reason for advice, Suitability rationale.
Mark each Complete / Partial / Limited / Not documented.)

## 5. Advice Summary & Rationale
(NARRATIVE: Why was the advice given? What was the client's situation? What were their objectives?
What product/solution was recommended and why? How does it meet the client's needs?
Reference suitability assessment findings. Reference risk profile and capacity for loss.
This is the most important narrative section — it should enable any reader to understand the full advice story.)

## 6. Suitability & Risk Assessment Summary
(Brief: Client's ATR result, CFL result, how the recommended product aligns with risk profile.
Reference any suitability report on file. Note any concerns or gaps.)

## 7. Compliance Summary
(Brief narrative — NOT detailed tables. Note key FCA COBS compliance points:
- Was client information collected adequately? (COBS 9.2.1R)
- Was suitability assessed? (COBS 9.2.2R)
- Was a suitability report provided? (COBS 9.4.1R)
- Any deficiencies or gaps noted.
Keep this to 1–2 short paragraphs.)

## 8. Gaps & Recommendations
(Bullet list: What's missing from the file? What should be added?
What follow-up actions are needed?)

## 9. Overall Assessment
(2–3 sentence summary: Overall quality of the file, key strengths, key concerns.)

Rules:
- Reference specific FCA COBS rules (9.2.1R, 9.2.2R, 9.4.1R, 6.1E, 6.2B.11R, etc.)
- Be factual — only reference information actually found in the documents
- Where information is missing, explicitly note it as a gap
- Use UK English spelling
- Financial amounts in GBP
- Dates in DD/MM/YYYY format
- When referencing source documents in tables, use the actual file name (abbreviated if long), NOT document numbers like "Doc 1" or "Document 3". For example, write "Bucknill_pension.pdf" not "Doc 1".
- Do NOT use markdown bold (**text**) inside table cells. Use plain text only in tables.
- If assessment data shows "Not completed", flag this as a critical gap in the Gaps & Recommendations section. Do NOT treat default risk profile scores (e.g. attitudeToRisk = 5) from the client profile as verified assessment results — these are system defaults, not evidence of a completed assessment.
- The review should enable anyone reading it to fully understand the client, their file contents, and why advice was given. Prioritise completeness of information extraction over regulatory assessment.`

function truncate(text: string, maxChars: number): string {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars)
}

export function normalizeTaskTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyTaskFromText(text: string): { type: SuggestedTaskType; priority: SuggestedTaskPriority } {
  const lowered = text.toLowerCase()
  if (/\burgent\b|\bimmediate\b|\basap\b/.test(lowered)) {
    return { type: 'general', priority: 'urgent' }
  }
  if (/\batr\b|\battitude to risk\b/.test(lowered)) {
    return { type: 'compliance', priority: 'high' }
  }
  if (/\bcfl\b|\bcapacity for loss\b/.test(lowered)) {
    return { type: 'compliance', priority: 'high' }
  }
  if (/\bsuitability\b/.test(lowered)) {
    return { type: 'review', priority: 'high' }
  }
  if (/\bemail\b|\bphone\b|\baddress\b|\bcontact\b/.test(lowered)) {
    return { type: 'client_follow_up', priority: 'medium' }
  }
  if (/\bidentity\b|\bid\b|\bkyc\b/.test(lowered)) {
    return { type: 'compliance', priority: 'high' }
  }
  if (/\bmissing\b|\bgap\b/.test(lowered)) {
    return { type: 'review', priority: 'medium' }
  }
  return { type: 'general', priority: 'medium' }
}

export function generateDeterministicTasks(
  assessments?: Record<string, unknown> | null,
  clientProfile?: Record<string, unknown> | null
): SuggestedTask[] {
  const tasks: SuggestedTask[] = []

  const suitability = assessments && (assessments as any).suitability
  const atr = assessments && (assessments as any).atr
  const cfl = assessments && (assessments as any).cfl

  if (!atr) {
    tasks.push({
      id: 'det_atr',
      title: 'Complete ATR Assessment',
      description: 'Attitude to risk assessment is missing.',
      type: 'compliance',
      priority: 'high',
      source: 'deterministic',
    })
  }

  if (!cfl) {
    tasks.push({
      id: 'det_cfl',
      title: 'Complete CFL Assessment',
      description: 'Capacity for loss assessment is missing.',
      type: 'compliance',
      priority: 'high',
      source: 'deterministic',
    })
  }

  if (!suitability) {
    tasks.push({
      id: 'det_suitability',
      title: 'Complete Suitability Assessment',
      description: 'Suitability assessment is missing.',
      type: 'review',
      priority: 'high',
      source: 'deterministic',
    })
  }

  const contactInfo = (clientProfile as any)?.contact_info || (clientProfile as any)?.contactInfo || {}
  const email = contactInfo.email || contactInfo.primary_email || contactInfo.primaryEmail
  if (!email) {
    tasks.push({
      id: 'det_email',
      title: 'Obtain Client Email Address',
      description: 'Client email is missing from the profile.',
      type: 'client_follow_up',
      priority: 'medium',
      source: 'deterministic',
    })
  }

  return tasks
}

export function parseGapsIntoTasks(reviewMarkdown: string): SuggestedTask[] {
  if (!reviewMarkdown) return []
  const match = reviewMarkdown.match(/##\s*8\.\s*Gaps\s*&\s*Recommendations([\s\S]*?)(\n##\s|\n#\s|$)/i)
  if (!match) return []
  const section = match[1] || ''
  const lines = section.split('\n')
  const bullets: string[] = []
  let current: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)/)
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)/)
    if (bulletMatch) {
      if (current) bullets.push(current)
      current = bulletMatch[1].trim()
      continue
    }
    if (orderedMatch) {
      if (current) bullets.push(current)
      current = orderedMatch[1].trim()
      continue
    }
    if (current && trimmed) {
      current = `${current} ${trimmed}`
    }
  }
  if (current) bullets.push(current)

  return bullets
    .map((text, index): SuggestedTask => {
      const classification = classifyTaskFromText(text)
      return {
        id: `ai_gap_${index + 1}`,
        title: text,
        type: classification.type,
        priority: classification.priority,
        source: 'ai_parsed',
      }
    })
    .filter((task) => task.title.length > 0)
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-GB')
}

interface AssessmentRecord {
  id?: string
  total_score?: number | null
  suitability_score?: number | null
  risk_category?: string | null
  status?: string | null
  created_at?: string | null
  [key: string]: unknown
}

export interface AssessmentData {
  suitability?: AssessmentRecord | null
  atr?: AssessmentRecord | null
  cfl?: AssessmentRecord | null
}

function buildAssessmentSummary(assessments?: AssessmentData | null): string {
  if (!assessments) return '- Suitability Assessment: Not completed\n- ATR Assessment: Not completed\n- CFL Assessment: Not completed'
  const lines: string[] = []

  const suitability = assessments.suitability
  if (suitability) {
    const score = suitability.total_score ?? suitability.suitability_score
    const date = formatDate(suitability.created_at)
    lines.push(`- Suitability Assessment: Score ${score ?? 'n/a'}${date ? `, completed ${date}` : ''}`)
  } else {
    lines.push('- Suitability Assessment: Not completed')
  }

  const atr = assessments.atr
  if (atr) {
    const score = atr.total_score ?? atr.suitability_score
    const category = atr.risk_category ? ` (${atr.risk_category})` : ''
    const date = formatDate(atr.created_at)
    lines.push(`- ATR Assessment: Score ${score ?? 'n/a'}${category}${date ? `, completed ${date}` : ''}`)
  } else {
    lines.push('- ATR Assessment: Not completed')
  }

  const cfl = assessments.cfl
  if (cfl) {
    const score = cfl.total_score ?? cfl.suitability_score
    const category = cfl.risk_category ? ` (${cfl.risk_category})` : ''
    const date = formatDate(cfl.created_at)
    lines.push(`- CFL Assessment: Score ${score ?? 'n/a'}${category}${date ? `, completed ${date}` : ''}`)
  } else {
    lines.push('- CFL Assessment: Not completed')
  }

  return lines.join('\n')
}

export function buildFileReviewPrompt(
  clientData: Record<string, unknown>,
  documents: FileReviewDocumentAnalysis[],
  assessments?: AssessmentData | null
): FileReviewPrompt {
  const docCount = Math.max(1, documents.length)
  const perDocLimit = Math.max(500, Math.floor(AI_MAX_CHARS / docCount))
  const assessmentSummary = buildAssessmentSummary(assessments)

  const documentBlocks = documents.map((doc, index) => {
    const confidencePct = Math.round(doc.confidence * 100)
    return [
      `--- Document ${index + 1}: ${doc.fileName} ---`,
      `Classification: ${doc.classification} (Confidence: ${confidencePct}%)`,
      `Summary: ${doc.summary}`,
      `Entities: ${JSON.stringify(doc.entities)}`,
      `Extracted Text (excerpt): ${truncate(doc.extractedText, perDocLimit)}`,
      '',
    ].join('\n')
  }).join('\n')

  const userMessage = [
    'CLIENT PROFILE:',
    JSON.stringify(clientData, null, 2),
    '',
    'ASSESSMENT DATA:',
    assessmentSummary,
    '',
    `DOCUMENTS IN FILE (${documents.length} documents):`,
    '',
    documentBlocks,
    'Please produce the complete Client File Review.',
  ].join('\n')

  return {
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
  }
}

export function parseFileReviewResponse(raw: string): string {
  if (!raw) return ''
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:markdown|md)?\n?/, '').replace(/\n?```$/, '')
  }
  return cleaned.trim()
}

import type { SuitabilityReportAIContent, SuitabilityReportData } from '@/lib/suitability/reporting/types'
import { personalisationPrompts, type ReportPersonalisationInput } from '@/prompts/suitability/reportPersonalisation'

const DEFAULT_TEMPERATURE = 0.3

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function parseJsonContent(content: string): any | null {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function callAI(args: {
  baseUrl: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  clientId?: string
  maxTokens?: number
  temperature?: number
}): Promise<any | null> {
  const { baseUrl, messages, clientId, maxTokens, temperature } = args
  const url = new URL('/api/ai/complete', baseUrl)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(clientId ? { 'x-client-id': clientId } : {})
    },
    body: JSON.stringify({
      messages,
      temperature: temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: maxTokens ?? 1200
    })
  })

  if (!response.ok) return null
  const payload = await response.json()
  const content = normalizeText(payload?.content)
  if (!content) return null

  return parseJsonContent(content) ?? { text: content }
}

function buildPersonalisationInput(reportData: SuitabilityReportData): ReportPersonalisationInput {
  return {
    client: {
      name: reportData.client.personalDetails.fullName || 'Client',
      age: reportData.client.personalDetails.age,
      occupation: reportData.client.personalDetails.occupation,
      employmentStatus: reportData.client.personalDetails.employmentStatus,
      dependants: reportData.client.personalDetails.dependants
    },
    objectives: {
      primary: reportData.objectives.primaryObjective,
      secondary: reportData.objectives.secondaryObjectives,
      timeHorizonYears: reportData.objectives.timeHorizonYears ?? reportData.riskAssessment.timeHorizonYears,
      incomeRequirement: reportData.objectives.incomeRequirement
    },
    risk: {
      atr: reportData.riskAssessment.attitudeToRisk,
      cfl: reportData.riskAssessment.capacityForLoss,
      combinedCategory: reportData.riskAssessment.combinedRiskCategory,
      atrCategory: reportData.riskAssessment.attitudeCategory,
      cflCategory: reportData.riskAssessment.capacityCategory
    },
    recommendation: {
      portfolioName: reportData.recommendation.portfolioName,
      totalInvestment: reportData.client.financialDetails.investmentAmount,
      assetAllocation: reportData.recommendation.assetAllocation,
      products: reportData.recommendation.products
    },
    alternatives: reportData.optionsConsidered.options
      .filter((option) => !option.selected)
      .map((option) => ({
        name: option.name,
        pros: option.pros,
        cons: option.cons
      }))
  }
}

function shouldUseAI(useAI?: boolean): boolean {
  if (useAI === false) return false
  const provider = process.env.AI_PROVIDER || 'mock'
  return useAI === true ? true : provider !== 'mock'
}

export async function generateSuitabilityReportAIContent(args: {
  reportData: SuitabilityReportData
  baseUrl: string
  clientId?: string
  useAI?: boolean
}): Promise<SuitabilityReportAIContent> {
  const { reportData, baseUrl, clientId, useAI } = args
  const aiContent: SuitabilityReportAIContent = {}

  if (!shouldUseAI(useAI)) return aiContent

  const input = buildPersonalisationInput(reportData)

  const tasks: Array<Promise<Partial<SuitabilityReportAIContent> | null>> = []

  tasks.push(
    (async () => {
      const prompt = personalisationPrompts.executiveSummary
      const result = await callAI({
        baseUrl,
        clientId,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user(input) }
        ],
        maxTokens: 900
      })
      const summary = normalizeText(result?.summary ?? result?.text)
      return summary ? { executiveSummary: summary } : null
    })()
  )

  if (reportData.recommendation.products.length > 0) {
    tasks.push(
      (async () => {
        const prompt = personalisationPrompts.whySuitable
        const result = await callAI({
          baseUrl,
          clientId,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user(input) }
          ],
          maxTokens: 1200
        })
        const narrative = normalizeText(result?.narrative ?? result?.text)
        return narrative ? { whySuitable: narrative } : null
      })()
    )

    tasks.push(
      (async () => {
        const prompt = personalisationPrompts.objectiveAlignment
        const result = await callAI({
          baseUrl,
          clientId,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user(input) }
          ],
          maxTokens: 1200
        })
        const alignments = Array.isArray(result?.alignments) ? result.alignments : null
        if (!alignments) return null

        const normalized = alignments
          .map((alignment: any) => ({
            objective: normalizeText(alignment?.objective),
            narrative: normalizeText(alignment?.narrative),
            products: Array.isArray(alignment?.products)
              ? alignment.products.map((p: unknown) => normalizeText(p)).filter(Boolean)
              : undefined
          }))
          .filter((alignment: any) => alignment.objective && alignment.narrative)

        return normalized.length ? { objectiveAlignments: normalized } : null
      })()
    )

    tasks.push(
      (async () => {
        const prompt = personalisationPrompts.productJustification
        const result = await callAI({
          baseUrl,
          clientId,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user(input) }
          ],
          maxTokens: 1200
        })
        const justifications = Array.isArray(result?.justifications) ? result.justifications : null
        if (!justifications) return null

        const normalized = justifications
          .map((justification: any) => ({
            product: normalizeText(justification?.product),
            narrative: normalizeText(justification?.narrative)
          }))
          .filter((justification: any) => justification.product && justification.narrative)

        return normalized.length ? { productJustifications: normalized } : null
      })()
    )
  }

  if (input.alternatives && input.alternatives.length > 0) {
    tasks.push(
      (async () => {
        const prompt = personalisationPrompts.alternativeRejection
        const result = await callAI({
          baseUrl,
          clientId,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user(input) }
          ],
          maxTokens: 900
        })
        const rejections = Array.isArray(result?.rejections) ? result.rejections : null
        if (!rejections) return null

        const normalized = rejections
          .map((rejection: any) => ({
            option: normalizeText(rejection?.option),
            reason: normalizeText(rejection?.reason)
          }))
          .filter((rejection: any) => rejection.option && rejection.reason)

        return normalized.length ? { alternativeRejections: normalized } : null
      })()
    )
  }

  const atr = reportData.riskAssessment.attitudeToRisk
  const cfl = reportData.riskAssessment.capacityForLoss
  if (typeof atr === 'number' && typeof cfl === 'number' && Math.abs(atr - cfl) > 2) {
    tasks.push(
      (async () => {
        const prompt = personalisationPrompts.riskReconciliation
        const result = await callAI({
          baseUrl,
          clientId,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user(input) }
          ],
          maxTokens: 700
        })
        const narrative = normalizeText(result?.narrative ?? result?.text)
        return narrative ? { riskReconciliation: narrative } : null
      })()
    )
  }

  const results = await Promise.allSettled(tasks)
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      Object.assign(aiContent, result.value)
    }
  }

  return aiContent
}

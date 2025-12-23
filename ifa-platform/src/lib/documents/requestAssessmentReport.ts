export type SuitabilityReportVariant =
  | 'fullReport'
  | 'clientLetter'
  | 'executiveSummary'
  | 'complianceReport'
  | 'advisorReport'

type RequestArgs = {
  assessmentType: string
  assessmentId: string
  clientId: string
  reportType: SuitabilityReportVariant
  includeWarnings?: boolean
  allowAutoFallbackToWarnings?: boolean
}

type RequestResult = {
  inlinePdf?: string
  signedUrl?: string
  fallbackToWarningsUsed?: boolean
  missingFields?: string[]
}

function normalizeMissingFields(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const strings = value
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object') {
        const key = (entry as any).key
        const message = (entry as any).message
        if (typeof message === 'string' && message.trim()) return message
        if (typeof key === 'string' && key.trim()) return key
      }
      return null
    })
    .filter((entry): entry is string => Boolean(entry))

  return strings.length ? strings : undefined
}

export async function requestAssessmentReport(args: RequestArgs): Promise<RequestResult> {
  const requestBody = {
    assessmentType: args.assessmentType,
    assessmentId: args.assessmentId,
    clientId: args.clientId,
    reportType: args.reportType,
    includeWarnings: args.includeWarnings
  }

  let response = await fetch('/api/documents/generate-assessment-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null)
    const missing = normalizeMissingFields(errorJson?.missing ?? errorJson?.missingForFinal)
    const canFallback = Boolean(args.allowAutoFallbackToWarnings ?? true)

    if (!args.includeWarnings && canFallback && response.status === 400) {
      response = await fetch('/api/documents/generate-assessment-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody, includeWarnings: true })
      })

      if (!response.ok) {
        const retryJson = await response.json().catch(() => null)
        throw new Error(retryJson?.error || errorJson?.error || 'Failed to generate report')
      }

      const result = (await response.json().catch(() => null)) as any
      return {
        inlinePdf: result?.inlinePdf,
        signedUrl: result?.signedUrl,
        fallbackToWarningsUsed: true,
        missingFields: missing
      }
    }

    throw new Error(errorJson?.error || 'Failed to generate report')
  }

  const result = (await response.json().catch(() => null)) as any
  const downgradedToDraft = Boolean(result?.downgradedToDraft)
  const missingForFinal = normalizeMissingFields(result?.missingForFinal)

  return {
    inlinePdf: result?.inlinePdf,
    signedUrl: result?.signedUrl,
    fallbackToWarningsUsed: downgradedToDraft || undefined,
    missingFields: downgradedToDraft ? missingForFinal : undefined
  }
}

export interface GenerateAssessmentReportRequest {
  assessmentType: string
  assessmentId: string
  clientId: string
  reportType?: string
  includeWarnings?: boolean
  includeAI?: boolean
  missingFieldsReport?: unknown
}

export type SuitabilityReportVariant =
  | 'fullReport'
  | 'clientLetter'
  | 'executiveSummary'
  | 'complianceReport'
  | 'advisorReport'

export function normalizeSuitabilityReportVariant(value: string | undefined): SuitabilityReportVariant {
  if (
    value === 'fullReport' ||
    value === 'clientLetter' ||
    value === 'executiveSummary' ||
    value === 'complianceReport' ||
    value === 'advisorReport'
  ) {
    return value
  }

  // Backwards compatibility (older UI values)
  if (value === 'full') return 'fullReport'
  if (value === 'letter') return 'clientLetter'
  if (value === 'summary') return 'executiveSummary'
  if (value === 'fca') return 'complianceReport'

  return 'fullReport'
}

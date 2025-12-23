export type NormalizedAssessmentType =
  | 'atr'
  | 'cfl'
  | 'persona'
  | 'suitability'
  | 'monte_carlo'
  | 'cashflow'
  | string

export function normalizeAssessmentType(type: string): NormalizedAssessmentType {
  const raw = (type || '').trim()
  const lower = raw.toLowerCase()

  if (lower === 'investor_persona' || lower === 'investor-persona') return 'persona'
  if (lower === 'montecarlo') return 'monte_carlo'
  if (lower === 'cashflow') return 'cashflow'
  if (lower === 'cashflowplanning') return 'cashflow'

  return lower.replace(/-/g, '_')
}

export function getAssessmentResumeUrl(assessmentType: string, clientId: string): string {
  const type = normalizeAssessmentType(assessmentType)

  switch (type) {
    case 'atr':
      return `/assessments/atr?clientId=${clientId}`
    case 'cfl':
      return `/assessments/cfl?clientId=${clientId}`
    case 'persona':
      return `/assessments/persona-assessment?clientId=${clientId}`
    case 'suitability':
      return `/assessments/suitability?clientId=${clientId}`
    case 'monte_carlo':
      return `/monte-carlo?clientId=${clientId}`
    case 'cashflow':
      return `/cashflow?clientId=${clientId}`
    default:
      return `/assessments/client/${clientId}`
  }
}


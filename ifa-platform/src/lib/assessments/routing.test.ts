import { describe, expect, it } from 'vitest'

import { getAssessmentResumeUrl, normalizeAssessmentType } from './routing'

describe('normalizeAssessmentType', () => {
  it('normalizes common aliases', () => {
    expect(normalizeAssessmentType('investor_persona')).toBe('persona')
    expect(normalizeAssessmentType('investor-persona')).toBe('persona')
    expect(normalizeAssessmentType('monteCarlo')).toBe('monte_carlo')
    expect(normalizeAssessmentType('cashFlow')).toBe('cashflow')
  })

  it('handles underscores/hyphens', () => {
    expect(normalizeAssessmentType('monte_carlo')).toBe('monte_carlo')
    expect(normalizeAssessmentType('monte-carlo')).toBe('monte_carlo')
  })
})

describe('getAssessmentResumeUrl', () => {
  it('maps assessment types to correct routes', () => {
    const clientId = 'client-123'
    expect(getAssessmentResumeUrl('atr', clientId)).toBe(`/assessments/atr?clientId=${clientId}`)
    expect(getAssessmentResumeUrl('cfl', clientId)).toBe(`/assessments/cfl?clientId=${clientId}`)
    expect(getAssessmentResumeUrl('persona', clientId)).toBe(
      `/assessments/persona-assessment?clientId=${clientId}`
    )
    expect(getAssessmentResumeUrl('suitability', clientId)).toBe(
      `/assessments/suitability?clientId=${clientId}`
    )
    expect(getAssessmentResumeUrl('monteCarlo', clientId)).toBe(`/monte-carlo?clientId=${clientId}`)
    expect(getAssessmentResumeUrl('cashFlow', clientId)).toBe(`/cashflow?clientId=${clientId}`)
  })

  it('falls back to client assessment hub', () => {
    expect(getAssessmentResumeUrl('unknown_type', 'client-xyz')).toBe('/assessments/client/client-xyz')
  })
})


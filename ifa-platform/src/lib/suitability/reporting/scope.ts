import type { SuitabilityAdviceScopeOption, SuitabilityReportFacts, SuitabilityReportScope } from './types'
import type { JsonObject } from './utils'
import { asTrimmedString, safeArray, splitLines } from './utils'

export function normalizeScope(selected: unknown): SuitabilityReportScope {
  const raw = safeArray<string>(selected)
  const allowed: SuitabilityAdviceScopeOption[] = [
    'Pension Planning',
    'Investment Planning',
    'Protection Review',
    'Estate Planning',
    'Tax Planning'
  ]

  const selectedOptions = raw.filter((v): v is SuitabilityAdviceScopeOption =>
    allowed.includes(v as SuitabilityAdviceScopeOption)
  )

  return {
    selected: selectedOptions,
    includePensions: selectedOptions.includes('Pension Planning'),
    includeInvestments: selectedOptions.includes('Investment Planning'),
    includeProtection: selectedOptions.includes('Protection Review'),
    includeEstatePlanning: selectedOptions.includes('Estate Planning'),
    includeTaxPlanning: selectedOptions.includes('Tax Planning')
  }
}

export function inferLegacyScope(params: {
  objectives: JsonObject
  facts: SuitabilityReportFacts
  existingArrangements: JsonObject
}): SuitabilityAdviceScopeOption[] {
  const selected = new Set<SuitabilityAdviceScopeOption>()

  const primaryObjective = asTrimmedString(params.objectives.primary_objective)?.toLowerCase()

  if (primaryObjective?.includes('tax')) selected.add('Tax Planning')
  if (primaryObjective?.includes('estate')) selected.add('Estate Planning')

  // If the assessment contains any investment objectives (most suitability assessments do),
  // default to Investment Planning.
  if (
    primaryObjective &&
    [
      'capital growth',
      'income generation',
      'capital preservation',
      'retirement planning',
      'tax efficiency',
      'estate planning'
    ].some((v) => primaryObjective.includes(v.replace(/\s+/g, ' ')))
  ) {
    selected.add('Investment Planning')
  }

  // Infer pensions/protection scope from declared facts when scope wasn't captured (legacy assessments).
  if (params.facts.hasPensions === true) selected.add('Pension Planning')
  if (params.facts.hasProtection === true) selected.add('Protection Review')

  // Additional hints from form fields that existed historically.
  if (splitLines(params.existingArrangements.pension_type).length > 0) selected.add('Pension Planning')
  if (splitLines(params.existingArrangements.has_protection).some((v) => v.toLowerCase() !== 'none')) {
    selected.add('Protection Review')
  }

  // Ensure at least one in-scope area so legacy reports render meaningful advice sections.
  if (selected.size === 0) selected.add('Investment Planning')

  return Array.from(selected)
}


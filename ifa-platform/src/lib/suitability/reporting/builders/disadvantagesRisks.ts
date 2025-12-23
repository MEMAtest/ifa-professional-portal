import type { SuitabilityFormData } from '@/types/suitability'

import type { SuitabilityDisadvantagesRisks } from '../types'
import { asObject, asTrimmedString, splitLines } from '../utils'

export function buildDisadvantagesRisks(formData: SuitabilityFormData): SuitabilityDisadvantagesRisks {
  const disadvantagesSection = asObject((formData as any).disadvantages_risks)

  return {
    disadvantages: splitLines(disadvantagesSection.disadvantages),
    risks: splitLines(disadvantagesSection.risks),
    mitigations: splitLines(disadvantagesSection.mitigations),
    notes: asTrimmedString(disadvantagesSection.notes)
  }
}


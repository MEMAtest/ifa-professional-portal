import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'
import { conditionalLogicEngine } from '@/lib/suitability/conditionalLogic'

export function buildConditionalVisibilityIndex(
  formData: SuitabilityFormData,
  pulledData: PulledPlatformData
): Record<string, Set<string>> {
  const index: Record<string, Set<string>> = {}
  const sectionIds = [
    'personal_information',
    'contact_details',
    'objectives',
    'financial_situation',
    'risk_assessment',
    'knowledge_experience',
    'existing_arrangements',
    'vulnerability_assessment',
    'regulatory_compliance',
    'costs_charges',
    'recommendation',
    'options_considered',
    'disadvantages_risks',
    'ongoing_service',
    'suitability_declaration'
  ]

  for (const sectionId of sectionIds) {
    const groups = conditionalLogicEngine.getConditionalFields(sectionId, formData, pulledData)
    for (const group of groups) {
      for (const field of group.fields) {
        if (!index[sectionId]) index[sectionId] = new Set()
        index[sectionId].add(field.id)
      }
    }
  }

  return index
}


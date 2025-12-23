export const REQUIRED_SUITABILITY_SECTION_IDS = [
  'personal_information',
  'contact_details',
  'financial_situation',
  'objectives',
  'risk_assessment',
  'knowledge_experience',
  'existing_arrangements',
  'vulnerability_assessment',
  'regulatory_compliance',
  'costs_charges',
  'recommendation',
  'options_considered',
  'disadvantages_risks',
  'suitability_declaration'
] as const

// Optional sections are still available in the form, but they should not block
// submission or drag down the “required completion” percentage.
export const OPTIONAL_SUITABILITY_SECTION_IDS = ['ongoing_service'] as const

export type SuitabilitySectionId =
  | (typeof REQUIRED_SUITABILITY_SECTION_IDS)[number]
  | (typeof OPTIONAL_SUITABILITY_SECTION_IDS)[number]


export const AI_GENERATABLE_FIELDS = [
  'product_1_reason',
  'product_2_reason',
  'product_3_reason',
  'recommendation_rationale',
  'objectives_explanation',
  'risk_explanation',
  'affordability_explanation',
  'option_1_description',
  'option_1_reason',
  'option_2_description',
  'option_2_reason',
  'option_3_description',
  'option_3_reason'
] as const

export type AIGeneratableFieldId = (typeof AI_GENERATABLE_FIELDS)[number]

export const isAIGeneratableField = (fieldId: string): fieldId is AIGeneratableFieldId => {
  return (AI_GENERATABLE_FIELDS as readonly string[]).includes(fieldId)
}

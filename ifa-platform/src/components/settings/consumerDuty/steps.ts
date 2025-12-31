// Consumer Duty wizard steps - aligned with FCA PRIN 2A

export const consumerDutySteps = [
  { id: 'products', label: 'Products & Services' },
  { id: 'pricing', label: 'Price & Value' },
  { id: 'understanding', label: 'Consumer Understanding' },
  { id: 'support', label: 'Consumer Support' },
  { id: 'summary', label: 'Summary' }
] as const

export type ConsumerDutyStepId = (typeof consumerDutySteps)[number]['id']

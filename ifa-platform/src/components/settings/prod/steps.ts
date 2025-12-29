export const prodServiceSteps = [
  { id: 'governance', label: 'Governance' },
  { id: 'target-market', label: 'Target Market' },
  { id: 'services', label: 'Services' },
  { id: 'summary', label: 'Summary' }
] as const

export type ProdServiceStepId = (typeof prodServiceSteps)[number]['id']

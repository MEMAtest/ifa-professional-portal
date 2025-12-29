export interface ProdServiceDefinition {
  id: string
  label: string
  description: string
  targetMarketChecks: {
    id: string
    label: string
    description: string
  }[]
  prodNotes?: string
  active?: boolean
}

export const DEFAULT_PROD_SERVICES: ProdServiceDefinition[] = [
  {
    id: 'retirement_planning',
    label: 'Retirement Planning',
    description: 'Pension advice, drawdown, annuity, retirement income planning',
    targetMarketChecks: [
      { id: 'age_appropriate', label: 'Age-appropriate for retirement planning', description: 'Client is within reasonable retirement planning age range' },
      { id: 'pension_assets', label: 'Has pension assets or accumulation phase', description: 'Client has existing pension or capacity to contribute' },
      { id: 'understands_risks', label: 'Understands retirement income risks', description: 'Client understands longevity, inflation, and market risks' }
    ],
    active: true
  },
  {
    id: 'investment_management',
    label: 'Investment Management',
    description: 'Portfolio management, fund selection, investment strategy',
    targetMarketChecks: [
      { id: 'min_investment', label: 'Meets minimum investment threshold', description: 'Client has minimum investable assets for service tier' },
      { id: 'investment_horizon', label: 'Appropriate investment horizon', description: 'Client has suitable time horizon for investment strategy' },
      { id: 'risk_capacity', label: 'Risk capacity assessed', description: 'Capacity for loss has been assessed and documented' }
    ],
    active: true
  },
  {
    id: 'protection',
    label: 'Protection',
    description: 'Life insurance, critical illness, income protection',
    targetMarketChecks: [
      { id: 'protection_need', label: 'Identified protection need', description: 'Gap analysis shows protection requirements' },
      { id: 'health_disclosure', label: 'Health disclosure understood', description: 'Client understands importance of accurate health disclosure' },
      { id: 'affordability', label: 'Premiums affordable', description: 'Protection premiums fit within client budget' }
    ],
    active: true
  },
  {
    id: 'mortgage_advice',
    label: 'Mortgage Advice',
    description: 'Residential, buy-to-let, remortgage advice',
    targetMarketChecks: [
      { id: 'property_purpose', label: 'Property purpose confirmed', description: 'Residential vs investment purpose clarified' },
      { id: 'affordability_assessed', label: 'Affordability assessed', description: 'Income and expenditure reviewed for mortgage affordability' },
      { id: 'deposit_source', label: 'Deposit source verified', description: 'Source of deposit funds has been verified' }
    ],
    active: true
  },
  {
    id: 'estate_planning',
    label: 'Estate Planning',
    description: 'IHT planning, trusts, will planning',
    targetMarketChecks: [
      { id: 'estate_value', label: 'Estate value warrants planning', description: 'Estate size makes IHT planning relevant' },
      { id: 'succession_wishes', label: 'Succession wishes discussed', description: 'Client has expressed wishes for asset distribution' },
      { id: 'legal_referral', label: 'Legal referral where appropriate', description: 'Will/trust matters referred to qualified solicitor' }
    ],
    active: true
  },
  {
    id: 'tax_planning',
    label: 'Tax Planning',
    description: 'Tax-efficient investing, ISA, CGT planning',
    targetMarketChecks: [
      { id: 'tax_status', label: 'Tax status confirmed', description: 'Client tax residency and status confirmed' },
      { id: 'allowances_reviewed', label: 'Tax allowances reviewed', description: 'Annual allowances and thresholds considered' },
      { id: 'accountant_liaison', label: 'Accountant liaison where needed', description: 'Complex tax matters coordinated with accountant' }
    ],
    active: true
  }
]

import type { RiskCategory } from '@/lib/suitability/reporting/types'

export type RiskProfileTier = 'cautious' | 'balanced' | 'adventurous'

export const reportTemplates = {
  greeting: {
    standard:
      'Thank you for meeting with {adviser_name} on {meeting_date} to discuss your financial planning requirements. Following our detailed review of your circumstances, objectives, and attitude to risk, we are pleased to present our recommendation.',
    review:
      'Following our review meeting on {meeting_date}, we have updated our understanding of your circumstances and objectives. This letter summarises our updated recommendation.'
  },
  riskCategories: {
    cautious: {
      description:
        'This means you prefer stability over growth. You are uncomfortable with significant fluctuations in your investment value and prioritise capital preservation. Suitable investments typically hold higher allocations to bonds and cash, with limited equity exposure.',
      allocationGuidance:
        'For clients with a Cautious risk profile, we typically recommend equity allocations of 20-40% with a larger allocation to bonds and cash.'
    },
    balanced: {
      description:
        'This means you accept moderate fluctuations in exchange for potential growth. You understand that investments may fall in value over shorter periods but are comfortable with this for long-term gains. A balanced portfolio typically holds a mix of equities and bonds.',
      allocationGuidance:
        'For clients with a Balanced risk profile, we typically recommend equity allocations of 40-70%, with bonds and cash providing stability.'
    },
    adventurous: {
      description:
        'This means you are comfortable with significant fluctuations in pursuit of higher returns. You understand investments may fall substantially but have the capacity and willingness to accept this. Suitable investments typically have high equity allocations.',
      allocationGuidance:
        'For clients with an Adventurous risk profile, we typically recommend equity allocations of 70% or more, with limited bonds/cash exposure.'
    }
  },
  productTypes: {
    isa: {
      description: 'An Individual Savings Account provides tax-free growth and withdrawals, subject to annual allowances.',
      benefits: ['Tax-free growth', 'Tax-free withdrawals', 'Annual allowance of GBP 20,000']
    },
    sipp: {
      description: 'A Self-Invested Personal Pension provides tax relief on contributions and long-term retirement savings.',
      benefits: ['Tax relief on contributions', 'Long-term retirement planning', 'Flexible investment choice']
    },
    gia: {
      description: 'A General Investment Account provides flexible investment access without pension or ISA restrictions.',
      benefits: ['Flexible access', 'No annual contribution limit', 'Wide investment choice']
    }
  },
  costsCharges: {
    fairValue:
      'These charges represent fair value for the service provided. Our ongoing service includes annual reviews, portfolio rebalancing recommendations, and access to your adviser for questions throughout the year.'
  },
  risks: {
    marketRisk:
      'The value of your investments can fall as well as rise. You may get back less than you invest.',
    pensionAccess:
      'Pension funds cannot normally be accessed until age 55 (rising to 57 from 2028).',
    transferRisk:
      'By transferring a defined benefit pension, you are giving up guaranteed benefits. This decision is irreversible.',
    currencyRisk:
      'Investments in overseas markets may be affected by exchange rate movements.'
  },
  consumerDuty: {
    standard:
      'This recommendation has been prepared in accordance with our obligations under the FCA Consumer Duty. We have ensured that the products and services meet your identified needs, the costs represent fair value, the report is clear and understandable, and ongoing support is available throughout our relationship.'
  },
  nextSteps: [
    'Review this letter and the accompanying full suitability report.',
    'Contact us with any questions or concerns.',
    'Sign and return the enclosed application forms to proceed.',
    'Provide proof of identity if not already held on file.'
  ]
}

export function formatTemplate(template: string, values: Record<string, string | number | undefined>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const value = values[key]
    if (value === null || value === undefined) return ''
    return String(value)
  })
}

export function mapRiskCategoryToTier(category?: RiskCategory): RiskProfileTier | null {
  if (!category || category === 'Not assessed') return null

  if (category === 'Very Low' || category === 'Low' || category === 'Low-Medium') return 'cautious'
  if (category === 'Medium' || category === 'Medium-High') return 'balanced'
  return 'adventurous'
}

export function getRiskCategoryDescription(category?: RiskCategory): string | undefined {
  const tier = mapRiskCategoryToTier(category)
  if (!tier) return undefined
  return reportTemplates.riskCategories[tier].description
}

export function getRiskAllocationGuidance(category?: RiskCategory): string | undefined {
  const tier = mapRiskCategoryToTier(category)
  if (!tier) return undefined
  return reportTemplates.riskCategories[tier].allocationGuidance
}

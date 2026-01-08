export const RECOMMENDATION_PORTFOLIOS = [
  'Conservative',
  'Cautious',
  'Balanced',
  'Growth',
  'Aggressive Growth'
]

export const PRODUCT_NAME_SUGGESTIONS = [
  'Stocks & Shares ISA',
  'SIPP',
  'GIA',
  'Cash ISA',
  'Lifetime ISA',
  'Junior ISA',
  'Pension',
  'Investment Bond',
  'Onshore Bond',
  'Offshore Bond',
  'Unit Trust/OEIC'
]

export const PROVIDER_SUGGESTIONS = [
  'Vanguard',
  'AJ Bell',
  'Hargreaves Lansdown',
  'Fidelity',
  'Aviva',
  'Legal & General',
  'Standard Life',
  'Prudential',
  'Royal London',
  'Scottish Widows',
  'BlackRock',
  'HSBC',
  'Quilter',
  'Zurich',
  'Schroders',
  'Aberdeen',
  'Interactive Investor',
  'Nutmeg',
  'True Potential',
  'Santander'
]

export const SERVICE_RECOMMENDATION_SUGGESTIONS: Record<
  string,
  { products: string[]; providers: string[] }
> = {
  retirement_planning: {
    products: ['SIPP', 'Personal Pension', 'Drawdown Plan', 'Annuity', 'Lifetime ISA'],
    providers: ['Aviva', 'Standard Life', 'Scottish Widows', 'Prudential', 'Royal London', 'Legal & General']
  },
  investment_management: {
    products: ['Stocks & Shares ISA', 'GIA', 'Model Portfolio', 'Unit Trust/OEIC', 'Investment Bond'],
    providers: ['Vanguard', 'AJ Bell', 'Hargreaves Lansdown', 'Fidelity', 'BlackRock', 'Quilter']
  },
  protection: {
    products: ['Life Insurance', 'Critical Illness Cover', 'Income Protection', 'Family Income Benefit'],
    providers: ['Aviva', 'Legal & General', 'Zurich', 'LV', 'Royal London']
  },
  mortgage_advice: {
    products: ['Residential Mortgage', 'Buy-to-Let Mortgage', 'Remortgage', 'Fixed Rate Mortgage', 'Tracker Mortgage'],
    providers: ['Nationwide', 'Halifax', 'Santander', 'HSBC', 'Barclays', 'NatWest']
  },
  estate_planning: {
    products: ['Will Writing', 'Trust Planning', 'IHT Planning', 'Lasting Power of Attorney'],
    providers: ['Private Client Lawyer', 'Trust Company', 'STEP Solicitor']
  },
  tax_planning: {
    products: ['ISA', 'VCT', 'EIS', 'SEIS', 'Onshore Bond'],
    providers: ['Vanguard', 'Fidelity', 'Schroders', 'Quilter', 'HSBC']
  }
}

export const OPTIONS_CONSIDERED_SUGGESTIONS = [
  'Balanced Portfolio (Recommended)',
  'Growth Portfolio',
  'Cautious Portfolio',
  'Cash / Deposit-based approach',
  'Annuity',
  'Model Portfolio Service',
  'No Change / Existing Arrangement',
  'Debt Reduction Focus'
]

export const OPTION_PROS_SUGGESTIONS = [
  'Aligned to objectives',
  'Diversified',
  'Lower volatility',
  'Tax efficient',
  'Low cost',
  'Capital growth potential',
  'Income flexibility',
  'Liquidity',
  'Simplicity'
]

export const OPTION_CONS_SUGGESTIONS = [
  'Market risk',
  'Potential loss of capital',
  'Lower returns',
  'Liquidity constraints',
  'Higher charges',
  'Complexity',
  'Inflation risk',
  'Limited growth potential'
]

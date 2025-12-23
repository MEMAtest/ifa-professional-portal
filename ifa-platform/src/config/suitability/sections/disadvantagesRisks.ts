import { AlertTriangle } from 'lucide-react'

export const disadvantagesRisksSection = {
  id: 'disadvantages_risks',
  title: 'Disadvantages & Risks',
  icon: AlertTriangle,
  status: 'incomplete',
  fields: [
    {
      id: 'disadvantages',
      label: 'Key Disadvantages',
      type: 'checkbox',
      required: true,
      options: [
        'Capital at risk',
        'Income is not guaranteed',
        'Returns may be lower than expected',
        'Charges and fees reduce returns',
        'Tax rules and allowances can change',
        'Early exit charges/penalties may apply',
        'Access to funds may be restricted (illiquidity)',
        'Inflation may reduce purchasing power',
        'Provider/platform failure risk',
        'Market volatility can be unsettling'
      ]
    },
    {
      id: 'risks',
      label: 'Key Risks',
      type: 'checkbox',
      required: true,
      options: [
        'Market risk',
        'Liquidity risk',
        'Inflation risk',
        'Interest rate risk',
        'Credit/default risk',
        'Currency risk',
        'Concentration risk',
        'Counterparty risk',
        'Regulatory/tax change risk',
        'Operational risk'
      ]
    },
    {
      id: 'mitigations',
      label: 'Mitigations',
      type: 'checkbox',
      options: [
        'Diversification across asset classes',
        'Diversification across providers/funds',
        'Appropriate time horizon and capacity for loss',
        'Maintain an emergency fund',
        'Regular reviews and rebalancing',
        'Phased investing (pound-cost averaging)',
        'Use of lower-risk assets where appropriate',
        'Documented client understanding and consent'
      ]
    },
    {
      id: 'notes',
      label: 'Notes (optional)',
      type: 'textarea',
      placeholder: 'Add any client-specific disadvantages/risks/mitigations not covered above.',
      rows: 3
    }
  ]
}


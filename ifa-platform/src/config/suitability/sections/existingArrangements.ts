import { Briefcase } from 'lucide-react'

export const existingArrangementsSection = {
  id: 'existing_arrangements',
  title: 'Existing Financial Arrangements',
  icon: Briefcase,
  status: 'incomplete',
  fields: [
    {
      id: 'has_pension',
      label: 'Do you have existing pensions?',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'pension_value',
      label: 'Total Pension Value (£)',
      type: 'number',
      placeholder: '100000',
      min: 0,
      pullFrom: 'client.financialProfile.pensionValue' // ✅ AUTO-GENERATION: Pull pension value
    },
    {
      id: 'pension_type',
      label: 'Pension Types',
      type: 'checkbox',
      options: [
        'Defined Contribution (DC) - Workplace',
        'Defined Contribution (DC) - Personal/SIPP',
        'Defined Benefit (DB) - Final Salary',
        'Defined Benefit (DB) - Career Average',
        'State Pension'
      ]
    },
    {
      id: 'has_investments',
      label: 'Do you have other investments?',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'investment_value',
      label: 'Total Investment Value (£)',
      type: 'number',
      placeholder: '50000',
      min: 0,
      pullFrom: 'client.financialProfile.existingInvestments' // ✅ AUTO-GENERATION: Pull investments
    },
    {
      id: 'has_protection',
      label: 'Life Insurance/Protection',
      type: 'checkbox',
      options: ['Life Insurance', 'Critical Illness', 'Income Protection', 'None']
    },
    {
      id: 'will_in_place',
      label: 'Do you have a will?',
      type: 'radio',
      options: ['Yes', 'No', 'In Progress']
    }
  ]
}


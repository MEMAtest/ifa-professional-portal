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
      id: 'has_existing_protection',
      label: 'Any existing protection in place?',
      type: 'radio',
      options: ['Yes', 'No'],
      smartDefault: (formData: any) => {
        const selections = formData.existing_arrangements?.has_protection
        if (Array.isArray(selections) && selections.length > 0) {
          return selections.some((option) => option && option !== 'None') ? 'Yes' : 'No'
        }
        if (typeof selections === 'string' && selections) {
          return selections !== 'None' ? 'Yes' : 'No'
        }
        return undefined
      }
    },
    {
      id: 'will_in_place',
      label: 'Do you have a will?',
      type: 'radio',
      options: ['Yes', 'No', 'In Progress']
    }
  ],
  conditionalFields: [
    {
      condition: (formData: Record<string, any>) => {
        const value = formData.existing_arrangements?.has_pension
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') return value.toLowerCase() === 'yes'
        return false
      },
      fields: [
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
        }
      ]
    },
    {
      condition: (formData: Record<string, any>) => {
        const flag = formData.existing_arrangements?.has_existing_protection
        if (typeof flag === 'boolean') return flag
        if (typeof flag === 'string') return flag.toLowerCase() === 'yes'
        const selections = formData.existing_arrangements?.has_protection
        if (Array.isArray(selections)) return selections.length > 0
        if (typeof selections === 'string') return selections.trim().length > 0
        return false
      },
      fields: [
        {
          id: 'has_protection',
          label: 'Life Insurance/Protection',
          type: 'checkbox',
          options: ['Life Insurance', 'Critical Illness', 'Income Protection', 'None']
        }
      ]
    }
  ]
}

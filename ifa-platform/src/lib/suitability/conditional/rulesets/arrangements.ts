import type { ConditionalRule } from '../types'

export const arrangementsRules: ConditionalRule[] = [
  // ===== EXISTING ARRANGEMENTS CASCADE (Rules 31-35) =====
  {
    id: 'pension_details',
    name: 'Show pension arrangement details',
    sections: ['existing_arrangements'],
    priority: 31,
    condition: (formData) => {
      const value = formData.existing_arrangements?.has_pension
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value.toLowerCase() === 'yes'
      return false
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'existing_arrangements',
        fields: [
          {
            id: 'pension_providers',
            label: 'Pension Providers (list all)',
            type: 'textarea',
            required: true
          },
          {
            id: 'total_pension_value',
            label: 'Total Pension Value (£)',
            type: 'number',
            required: true
          },
          {
            id: 'pension_contributions',
            label: 'Monthly Pension Contributions (£)',
            type: 'number'
          },
          {
            id: 'pension_review_needed',
            label: 'Pension Review Needed?',
            type: 'radio',
            options: ['Yes', 'No', 'Unsure']
          }
        ]
      }
    ]
  },
  {
    id: 'pension_contribution_review',
    name: 'Prompt review when pension contributions are zero',
    sections: ['existing_arrangements'],
    priority: 32,
    condition: (formData) => {
      const hasPension = formData.existing_arrangements?.has_pension === 'Yes'
      if (!hasPension) return false
      const raw = (formData.existing_arrangements as any)?.pension_contributions
      if (raw === null || raw === undefined || raw === '') return false
      const contributions = Number(raw)
      return Number.isFinite(contributions) && contributions <= 0
    },
    actions: [
      {
        type: 'validate',
        sectionId: 'existing_arrangements',
        message: 'No ongoing pension contributions recorded. Consider reviewing retirement funding.'
      }
    ]
  },

  {
    id: 'protection_details',
    name: 'Show protection arrangement details',
    sections: ['existing_arrangements'],
    priority: 33,
    condition: (formData) => {
      const protection = formData.existing_arrangements?.has_protection
      if (Array.isArray(protection)) {
        return protection.some((option) => option && option !== 'None')
      }
      if (typeof protection === 'string') {
        return protection !== 'None' && protection.toLowerCase() !== 'no'
      }
      if (typeof protection === 'boolean') return protection
      return false
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'existing_arrangements',
        fields: [
          {
            id: 'life_cover_amount',
            label: 'Life Cover Amount (£)',
            type: 'number'
          },
          {
            id: 'critical_illness_cover',
            label: 'Critical Illness Cover (£)',
            type: 'number'
          },
          {
            id: 'income_protection',
            label: 'Income Protection (£ per month)',
            type: 'number'
          },
          {
            id: 'protection_review_needed',
            label: 'Protection Review Needed?',
            type: 'radio',
            options: ['Yes', 'No', 'Unsure']
          }
        ]
      }
    ]
  }
]

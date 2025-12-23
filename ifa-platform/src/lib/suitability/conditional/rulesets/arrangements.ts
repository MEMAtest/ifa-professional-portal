import type { ConditionalRule } from '../types'

export const arrangementsRules: ConditionalRule[] = [
  // ===== EXISTING ARRANGEMENTS CASCADE (Rules 31-35) =====
  {
    id: 'pension_details',
    name: 'Show pension arrangement details',
    sections: ['existing_arrangements'],
    priority: 31,
    condition: (formData) => formData.existing_arrangements?.has_pension === 'Yes',
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
    id: 'protection_details',
    name: 'Show protection arrangement details',
    sections: ['existing_arrangements'],
    priority: 32,
    condition: (formData) => formData.existing_arrangements?.has_protection === 'Yes',
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


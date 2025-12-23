import { COUNTRY_OPTIONS } from '@/lib/constants/countries'
import type { SuitabilityFormData } from '@/types/suitability'

import type { ConditionalRule } from '../types'

export const regulatoryRules: ConditionalRule[] = [
  // ===== REGULATORY & COMPLIANCE (Rules 36-40) =====
  {
    id: 'politically_exposed_details',
    name: 'PEP additional requirements',
    sections: ['regulatory_compliance'],
    priority: 36,
    condition: (formData) =>
      (formData.regulatory_compliance as any)?.politically_exposed === 'Yes' ||
      (formData.regulatory_compliance as any)?.pep === 'Yes',
    actions: [
      {
        type: 'show_field',
        sectionId: 'regulatory_compliance',
        fields: [
          {
            id: 'pep_position',
            label: 'Position Held',
            type: 'text',
            required: true
          },
          {
            id: 'pep_country',
            label: 'Country',
            type: 'select',
            required: true,
            options: COUNTRY_OPTIONS
          },
          {
            id: 'pep_date_from',
            label: 'Dates in Position (From)',
            type: 'date',
            required: true
          },
          {
            id: 'pep_date_to',
            label: 'Dates in Position (To)',
            type: 'date',
            required: false,
            helpText: 'Leave blank if currently in this position.'
          },
          {
            id: 'wealth_source_details',
            label: 'Detailed Source of Wealth',
            type: 'textarea',
            required: true
          }
        ]
      }
    ]
  },

  {
    id: 'holistic_planning_scope',
    name: 'Expand scope for holistic planning',
    sections: ['objectives'],
    priority: 37,
    condition: (formData) => {
      const scope = (formData.objectives as any)?.advice_scope
      if (!Array.isArray(scope)) return false
      return scope.includes('Estate Planning') || scope.includes('Tax Planning')
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'estate_planning',
            label: 'Estate Planning Required?',
            type: 'radio',
            options: ['Yes', 'No', 'Future Consideration']
          },
          {
            id: 'tax_planning',
            label: 'Tax Planning Required?',
            type: 'radio',
            options: ['Yes', 'No', 'Future Consideration']
          },
          {
            id: 'cashflow_modelling',
            label: 'Cashflow Modelling Required?',
            type: 'radio',
            options: ['Yes', 'No', 'Future Consideration']
          }
        ]
      }
    ]
  },

  {
    id: 'pension_transfer_specialist',
    name: 'Require specialist for DB transfers',
    sections: ['regulatory_compliance', 'existing_arrangements'],
    priority: 38,
    condition: (formData) => {
      const existingArrangements = formData.existing_arrangements as any
      return existingArrangements?.db_transfer_considered === 'Yes'
    },
    actions: [
      {
        type: 'validate',
        sectionId: 'regulatory_compliance',
        message: 'Pension Transfer Specialist qualification required for DB transfers'
      },
      {
        type: 'show_field',
        sectionId: 'regulatory_compliance',
        fields: [
          {
            id: 'pts_confirmation',
            label: 'Pension Transfer Specialist (PTS) Confirmation',
            type: 'checkbox',
            required: true,
            options: ['I confirm I hold the appropriate PTS permissions for DB transfer advice']
          }
        ]
      }
    ]
  },

  {
    id: 'costs_calculation',
    name: 'Calculate total costs',
    sections: ['costs_charges'],
    priority: 39,
    condition: (formData) => {
      return Boolean(formData.costs_charges?.initial_adviser_charge || formData.costs_charges?.ongoing_adviser_charge)
    },
    actions: [
      {
        type: 'calculate',
        sectionId: 'costs_charges',
        fieldId: 'total_ongoing_charges',
        value: (formData: SuitabilityFormData) => {
          const adviser = formData.costs_charges?.ongoing_adviser_charge || 0
          const platform = formData.costs_charges?.platform_charge || 0.25
          const fund = formData.costs_charges?.fund_charges || 0.75
          return `${(adviser + platform + fund).toFixed(2)}%`
        }
      }
    ]
  },

  {
    id: 'final_suitability_check',
    name: 'Final suitability validation',
    sections: ['suitability_declaration'],
    priority: 40,
    condition: (formData) => {
      return (
        formData.suitability_declaration?.meets_objectives === 'Yes' &&
        formData.suitability_declaration?.suitable_risk === 'Yes'
      )
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'suitability_declaration',
        fields: [
          {
            id: 'best_interests_declaration',
            label: "I confirm this recommendation is in the client's best interests",
            type: 'checkbox',
            options: ['Confirmed'],
            required: true
          }
        ]
      }
    ]
  }
]


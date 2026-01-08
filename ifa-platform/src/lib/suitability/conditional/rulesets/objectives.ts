import type { ConditionalRule } from '../types'

const resolveTimeHorizonYears = (formData: any): number | undefined => {
  const numeric = formData.objectives?.time_horizon
  if (typeof numeric === 'number' && Number.isFinite(numeric)) return numeric

  const timeline = String(formData.objectives?.investment_timeline || '').trim()
  if (!timeline) return undefined

  const mapping: Record<string, number> = {
    'Less than 3': 2,
    '3-5': 4,
    '5-10': 7.5,
    '10-15': 12.5,
    'More than 15': 25
  }

  return mapping[timeline]
}

export const objectiveRules: ConditionalRule[] = [
  // ===== INVESTMENT OBJECTIVES INTELLIGENCE (Rules 11-20) =====
  {
    id: 'income_generation_details',
    name: 'Show income requirements for income objective',
    sections: ['objectives'],
    priority: 11,
    condition: (formData) => formData.objectives?.primary_objective === 'Income Generation',
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'required_monthly_income',
            label: 'Required Monthly Income (£)',
            type: 'number',
            required: true
          },
          {
            id: 'income_frequency',
            label: 'Income Frequency',
            type: 'select',
            options: ['Monthly', 'Quarterly', 'Annually'],
            required: true
          },
          {
            id: 'income_escalation',
            label: 'Income Escalation Required?',
            type: 'radio',
            options: ['Yes - Inflation Linked', 'Yes - Fixed %', 'No']
          },
          {
            id: 'income_start_date',
            label: 'Income Start Date',
            type: 'date',
            required: true
          }
        ]
      }
    ]
  },

  {
    id: 'income_sustainability_warning',
    name: 'Warn if income unsustainable',
    sections: ['objectives', 'financial_situation'],
    priority: 12,
    condition: (formData) => {
      const required = ((formData.objectives as any)?.required_monthly_income || 0) * 12
      const capital =
        ((formData.financial_situation as any)?.investment_amount ??
          (formData.objectives as any)?.investment_amount ??
          1) || 1
      return required / capital > 0.04
    },
    actions: [
      {
        type: 'validate',
        sectionId: 'objectives',
        message: 'Warning: Required income exceeds 4% of capital - may not be sustainable long-term'
      }
    ]
  },

  {
    id: 'growth_timeframe_check',
    name: 'Show growth timeline options',
    sections: ['objectives'],
    priority: 13,
    condition: (formData) => formData.objectives?.primary_objective === 'Capital Growth',
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'growth_target',
            label: 'Target Growth Rate (% p.a.)',
            type: 'number',
            placeholder: '7'
          },
          {
            id: 'growth_priority',
            label: 'Growth Priority',
            type: 'select',
            options: ['Maximum Growth', 'Balanced Growth', 'Steady Growth']
          },
          {
            id: 'can_tolerate_volatility',
            label: 'Can Tolerate Short-Term Volatility?',
            type: 'radio',
            options: ['Yes', 'No'],
            required: true
          }
        ]
      }
    ]
  },

  {
    id: 'short_timeframe_limit',
    name: 'Limit products for short timeframe',
    sections: ['objectives', 'recommendation'],
    priority: 14,
    condition: (formData) => {
      const horizon = resolveTimeHorizonYears(formData)
      return typeof horizon === 'number' && horizon < 5
    },
    actions: [
      {
        type: 'set_value',
        sectionId: 'recommendation',
        fieldId: 'product_universe',
        value: 'Conservative products only - short investment horizon'
      },
      {
        type: 'validate',
        sectionId: 'objectives',
        message: 'Short time horizon (<5 years) increases equity risk. Consider more defensive allocations.'
      }
    ]
  },

  {
    id: 'long_timeframe_strategies',
    name: 'Unlock aggressive strategies for long timeframe',
    sections: ['objectives', 'recommendation'],
    priority: 15,
    condition: (formData) => {
      const horizon = resolveTimeHorizonYears(formData)
      return typeof horizon === 'number' && horizon > 20
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'lifecycle_strategy',
            label: 'Use Lifecycle Investment Strategy?',
            type: 'radio',
            options: ['Yes', 'No'],
            helpText: 'Automatically reduce risk as you approach target date'
          },
          {
            id: 'aggressive_growth_acceptable',
            label: 'Consider Aggressive Growth?',
            type: 'radio',
            options: ['Yes', 'No']
          }
        ]
      }
    ]
  },

  {
    id: 'tax_efficiency_details',
    name: 'Show tax efficiency options',
    sections: ['objectives', 'financial_situation'],
    priority: 16,
    condition: (formData) => formData.objectives?.primary_objective === 'Tax Efficiency',
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'current_tax_bracket',
            label: 'Current Tax Bracket',
            type: 'select',
            options: ['Basic Rate (20%)', 'Higher Rate (40%)', 'Additional Rate (45%)'],
            required: true
          },
          {
            id: 'isa_allowance_used',
            label: 'ISA Allowance Used This Year (£)',
            type: 'number',
            placeholder: '0'
          },
          {
            id: 'pension_allowance_used',
            label: 'Pension Allowance Used (£)',
            type: 'number',
            placeholder: '0'
          },
          {
            id: 'vct_eis_eligible',
            label: 'Consider VCT/EIS?',
            type: 'radio',
            options: ['Yes', 'No', 'Need More Information']
          }
        ]
      }
    ]
  },

  {
    id: 'retirement_planning_cascade',
    name: 'Show retirement planning details',
    sections: ['objectives', 'personal_information'],
    priority: 17,
    condition: (formData) => formData.objectives?.primary_objective === 'Retirement Planning',
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'target_retirement_age',
            label: 'Target Retirement Age',
            type: 'number',
            required: true
          },
          {
            id: 'retirement_income_target',
            label: 'Target Retirement Income (£ p.a.)',
            type: 'number',
            required: true
          },
          {
            id: 'state_pension_forecast',
            label: 'State Pension Forecast (£ p.a.)',
            type: 'number'
          },
          {
            id: 'other_pension_income',
            label: 'Other Pension Income (£ p.a.)',
            type: 'number'
          },
          {
            id: 'retirement_lifestyle',
            label: 'Retirement Lifestyle',
            type: 'select',
            options: ['Essential', 'Moderate', 'Comfortable', 'Luxury']
          }
        ]
      }
    ]
  },

  {
    id: 'education_planning',
    name: 'Show education planning for dependants',
    sections: ['objectives', 'personal_information'],
    priority: 18,
    condition: (formData) => {
      const hasDependants = (formData.personal_information?.dependents || 0) > 0
      const needsEducation = formData.personal_information?.education_planning_required === 'Yes'
      return hasDependants && needsEducation
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'number_of_children',
            label: 'Number of Children Requiring Education Funding',
            type: 'number',
            required: true
          },
          {
            id: 'education_timeline',
            label: 'Years Until Education Starts',
            type: 'number',
            required: true
          },
          {
            id: 'education_fund_target',
            label: 'Target Education Fund (£)',
            type: 'number',
            required: true
          },
          {
            id: 'education_type',
            label: 'Education Type',
            type: 'select',
            options: ['State School', 'Private School', 'University', 'All Levels']
          }
        ]
      }
    ]
  }
]

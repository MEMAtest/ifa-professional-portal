// =====================================================
// FILE: src/lib/suitability/conditionalLogic.ts
// COMPLETE CONDITIONAL LOGIC ENGINE - 40+ RULES
// =====================================================

import { 
  SuitabilityFormData, 
  PulledPlatformData,
  SuitabilityField,
  ConditionalFieldGroup
} from '@/types/suitability'

export interface ConditionalRule {
  id: string
  name: string
  sections: string[]
  condition: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => boolean
  actions: ConditionalAction[]
  priority: number
}

export interface ConditionalAction {
  type: 'show_field' | 'hide_field' | 'set_value' | 'require_field' | 'validate' | 'calculate' | 'show_section'
  sectionId: string
  fieldId?: string
  value?: any
  fields?: SuitabilityField[]
  message?: string
}

// =====================================================
// COMPLETE SET OF 40+ CONDITIONAL LOGIC RULES
// =====================================================

export const conditionalRules: ConditionalRule[] = [
  // ===== PERSONAL INFORMATION CASCADES (Rules 1-10) =====
  {
    id: 'marriage_cascade',
    name: 'Show partner details for married/civil partnership',
    sections: ['personal_information'],
    priority: 1,
    condition: (formData) => {
      const status = formData.personal_information?.marital_status
      return status === 'Married' || status === 'Civil Partnership'
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'partner_name',
            label: 'Partner\'s Full Name',
            type: 'text',
            required: true,
            placeholder: 'Enter partner\'s full name'
          },
          {
            id: 'partner_date_of_birth',
            label: 'Partner\'s Date of Birth',
            type: 'date',
            required: true
          },
          {
            id: 'partner_employment_status',
            label: 'Partner\'s Employment Status',
            type: 'select',
            options: ['Employed', 'Self-Employed', 'Retired', 'Not Working'],
            required: true
          },
          {
            id: 'joint_assessment',
            label: 'Joint Assessment Required?',
            type: 'radio',
            options: ['Yes', 'No'],
            required: true
          }
        ]
      }
    ]
  },

  {
    id: 'joint_assessment_cascade',
    name: 'Enable joint financial planning',
    sections: ['personal_information', 'financial_situation'],
    priority: 2,
    condition: (formData) => formData.personal_information?.joint_assessment === 'Yes',
    actions: [
      {
        type: 'show_field',
        sectionId: 'financial_situation',
        fields: [
          {
            id: 'partner_annual_income',
            label: 'Partner\'s Annual Income (£)',
            type: 'number',
            required: true
          },
          {
            id: 'joint_monthly_expenditure',
            label: 'Joint Monthly Expenditure (£)',
            type: 'number',
            required: true
          },
          {
            id: 'partner_assets',
            label: 'Partner\'s Assets (£)',
            type: 'number'
          },
          {
            id: 'partner_liabilities',
            label: 'Partner\'s Liabilities (£)',
            type: 'number'
          }
        ]
      }
    ]
  },

  {
    id: 'dependants_details',
    name: 'Show dependant details when has dependants',
    sections: ['personal_information'],
    priority: 3,
    condition: (formData) => (formData.personal_information?.dependents || 0) > 0,
    actions: [
      {
        type: 'show_section',
        sectionId: 'dependants_information',
        fields: [
          {
            id: 'dependant_names',
            label: 'Dependant Names and Ages',
            type: 'textarea',
            required: true,
            placeholder: 'List each dependant with their age'
          },
          {
            id: 'education_planning_required',
            label: 'Education Planning Required?',
            type: 'radio',
            options: ['Yes', 'No']
          },
          {
            id: 'disability_care_required',
            label: 'Disability Care Required?',
            type: 'radio',
            options: ['Yes', 'No']
          }
        ]
      }
    ]
  },

  {
    id: 'disability_vulnerability',
    name: 'Trigger vulnerability for disability care',
    sections: ['personal_information', 'vulnerability_assessment'],
    priority: 4,
    condition: (formData) => formData.dependants_information?.disability_care_required === 'Yes',
    actions: [
      {
        type: 'set_value',
        sectionId: 'vulnerability_assessment',
        fieldId: 'vulnerability_flag',
        value: 'High'
      },
      {
        type: 'require_field',
        sectionId: 'vulnerability_assessment',
        fieldId: 'care_planning_details'
      }
    ]
  },

  {
    id: 'employment_employed',
    name: 'Show employed details',
    sections: ['personal_information', 'financial_situation'],
    priority: 5,
    condition: (formData) => formData.personal_information?.employment_status === 'Employed',
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'employer',
            label: 'Employer Name',
            type: 'text',
            required: true
          },
          {
            id: 'employment_duration',
            label: 'Years with Current Employer',
            type: 'number'
          },
          {
            id: 'pension_scheme',
            label: 'Pension Scheme Type',
            type: 'select',
            options: ['Defined Contribution', 'Defined Benefit', 'None'],
            required: true
          },
          {
            id: 'bonus_percentage',
            label: 'Bonus as % of Salary',
            type: 'number',
            placeholder: '0'
          }
        ]
      }
    ]
  },

  {
  id: 'db_pension_transfer',
  name: 'Show DB transfer analysis',
  sections: ['personal_information', 'existing_arrangements'],
  priority: 6,
  condition: (formData) => {
    // FIX: Add type assertion for pension_scheme
    const personalInfo = formData.personal_information as any
    return personalInfo?.pension_scheme === 'Defined Benefit'
  },
  actions: [
    {
      type: 'show_field',
      sectionId: 'existing_arrangements',
      fields: [
        {
          id: 'db_transfer_considered',
          label: 'Considering DB Transfer?',
          type: 'radio',
          options: ['Yes', 'No', 'Unsure'],
          required: true
        },
        {
          id: 'transfer_value',
          label: 'Current Transfer Value (£)',
          type: 'number'
        },
        {
          id: 'db_warning_acknowledged',
          label: 'I understand DB transfers carry significant risks',
          type: 'checkbox',
          options: ['Acknowledged'],
          required: true
        }
      ]
    }
  ]
},


  {
  id: 'high_bonus_smoothing',
  name: 'Suggest income smoothing for high bonus',
  sections: ['personal_information', 'objectives'],
  priority: 7,
  condition: (formData) => {
    // FIX: Add type assertion for bonus_percentage
    const personalInfo = formData.personal_information as any
    return (personalInfo?.bonus_percentage || 0) > 20
  },
  actions: [
    {
      type: 'show_field',
      sectionId: 'objectives',
      fields: [
        {
          id: 'income_smoothing_strategy',
          label: 'Income Smoothing Strategy',
          type: 'select',
          options: ['Regular Averaging', 'Bonus Investment', 'Deferred Compensation'],
          helpText: 'High bonus earners benefit from income smoothing strategies'
        }
      ]
    }
  ]
},

  {
    id: 'self_employed_cascade',
    name: 'Show self-employed details',
    sections: ['personal_information', 'financial_situation'],
    priority: 8,
    condition: (formData) => formData.personal_information?.employment_status === 'Self-Employed',
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'business_name',
            label: 'Business Name',
            type: 'text',
            required: true
          },
          {
            id: 'business_type',
            label: 'Business Type',
            type: 'select',
            options: ['Sole Trader', 'Limited Company', 'Partnership', 'LLP']
          },
          {
            id: 'years_trading',
            label: 'Years Trading',
            type: 'number',
            required: true
          }
        ]
      },
      {
        type: 'show_field',
        sectionId: 'financial_situation',
        fields: [
          {
            id: 'business_income_3_years',
            label: 'Average Income (Last 3 Years)',
            type: 'number',
            required: true
          },
          {
            id: 'income_volatility',
            label: 'Income Volatility',
            type: 'select',
            options: ['Stable', 'Moderate', 'High'],
            required: true
          }
        ]
      }
    ]
  },

  {
    id: 'ltd_company_strategies',
    name: 'Unlock corporate strategies for Ltd companies',
    sections: ['personal_information', 'objectives'],
    priority: 9,
    condition: (formData) => formData.personal_information?.business_type === 'Limited Company',
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'corporate_investment_wrapper',
            label: 'Consider Corporate Investment Wrapper?',
            type: 'radio',
            options: ['Yes', 'No'],
            helpText: 'Tax-efficient investment through your company'
          },
          {
            id: 'dividend_salary_split',
            label: 'Optimize Dividend/Salary Split?',
            type: 'radio',
            options: ['Yes', 'No']
          }
        ]
      }
    ]
  },

  {
  id: 'retirement_income_replacement',
  name: 'Calculate income replacement for retired',
  sections: ['personal_information', 'financial_situation'],
  priority: 10,
  condition: (formData) => formData.personal_information?.employment_status === 'Retired',
  actions: [
    {
      type: 'show_field',
      sectionId: 'financial_situation',
      fields: [
        {
          id: 'pension_income',
          label: 'Total Pension Income (£)',
          type: 'number',
          required: true
        },
        {
          id: 'state_pension',
          label: 'State Pension (£)',
          type: 'number'
        },
        {
          id: 'pre_retirement_income',
          label: 'Pre-Retirement Income (£)',
          type: 'number'
        }
      ]
    },
    {
      type: 'calculate',
      sectionId: 'financial_situation',
      fieldId: 'income_replacement_ratio',
      value: (formData: SuitabilityFormData) => {
        // FIX: Add type assertions for pension_income and pre_retirement_income
        const financial = formData.financial_situation as any
        const current = financial?.pension_income || 0
        const previous = financial?.pre_retirement_income || 1
        return Math.round((current / previous) * 100)
      }
    }
  ]
},

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
            id: 'income_requirement',
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
      const required = (formData.objectives?.income_requirement || 0) * 12
      const capital = formData.objectives?.investment_amount || 1
      return (required / capital) > 0.04
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
    condition: (formData) => (formData.objectives?.time_horizon || 0) < 5,
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
        message: 'Note: Investment horizon under 5 years limits growth potential'
      }
    ]
  },

  {
    id: 'long_timeframe_strategies',
    name: 'Unlock aggressive strategies for long timeframe',
    sections: ['objectives', 'recommendation'],
    priority: 15,
    condition: (formData) => (formData.objectives?.time_horizon || 0) > 20,
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
      const needsEducation = formData.dependants_information?.education_planning_required === 'Yes'
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
  },

  // ===== FINANCIAL SITUATION INTELLIGENCE (Rules 19-28) =====
  {
    id: 'calculate_disposable_income',
    name: 'Auto-calculate disposable income',
    sections: ['financial_situation'],
    priority: 19,
    condition: (formData) => {
      return Boolean(formData.financial_situation?.annual_income && 
                    formData.financial_situation?.monthly_expenditure)
    },
    actions: [
      {
        type: 'calculate',
        sectionId: 'financial_situation',
        fieldId: 'disposable_income',
        value: (formData: SuitabilityFormData) => {
          const annual = formData.financial_situation?.annual_income || 0
          const monthly = formData.financial_situation?.monthly_expenditure || 0
          return annual - (monthly * 12)
        }
      }
    ]
  },

  {
    id: 'surplus_warning',
    name: 'Warn if expenditure exceeds income',
    sections: ['financial_situation'],
    priority: 20,
    condition: (formData) => {
      const income = formData.financial_situation?.annual_income || 0
      const expenses = (formData.financial_situation?.monthly_expenditure || 0) * 12
      return expenses > income
    },
    actions: [
      {
        type: 'validate',
        sectionId: 'financial_situation',
        message: 'Warning: Annual expenditure exceeds income - review budget before investing'
      }
    ]
  },

  {
    id: 'emergency_fund_check',
    name: 'Check emergency fund adequacy',
    sections: ['financial_situation'],
    priority: 21,
    condition: (formData) => {
      const liquid = formData.financial_situation?.liquid_assets || 0
      const monthly = formData.financial_situation?.monthly_expenditure || 0
      return liquid < (monthly * 6)
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'financial_situation',
        fields: [
          {
            id: 'emergency_fund',
            label: 'Current Emergency Fund (£)',
            type: 'number',
            helpText: 'Recommendation: Build 6 months expenses before investing'
          },
          {
            id: 'emergency_months',
            label: 'Months of Expenses Covered',
            type: 'select',
            options: ['Less than 3', '3-6 months', '6-12 months', 'Over 12 months']
          }
        ]
      }
    ]
  },

  {
    id: 'high_net_worth_options',
    name: 'Show HNW options for high net worth',
    sections: ['financial_situation', 'objectives'],
    priority: 22,
    condition: (formData) => (formData.financial_situation?.net_worth || 0) > 1000000,
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'sophisticated_investor',
            label: 'Certified Sophisticated Investor?',
            type: 'radio',
            options: ['Yes', 'No', 'Seeking Certification']
          },
          {
            id: 'alternative_investments',
            label: 'Consider Alternative Investments?',
            type: 'radio',
            options: ['Yes', 'No']
          },
          {
            id: 'discretionary_management',
            label: 'Consider Discretionary Management?',
            type: 'radio',
            options: ['Yes', 'No']
          }
        ]
      }
    ]
  },

  {
    id: 'joint_income_calculation',
    name: 'Calculate joint income for couples',
    sections: ['financial_situation', 'personal_information'],
    priority: 23,
    condition: (formData) => formData.personal_information?.joint_assessment === 'Yes',
    actions: [
      {
        type: 'calculate',
        sectionId: 'financial_situation',
        fieldId: 'joint_annual_income',
        value: (formData: SuitabilityFormData) => {
          const personal = formData.financial_situation?.annual_income || 0
          const partner = formData.financial_situation?.partner_annual_income || 0
          return personal + partner
        }
      }
    ]
  },

  // ===== RISK ASSESSMENT INTELLIGENCE (Rules 24-32) =====
  {
    id: 'atr_cfl_reconciliation',
    name: 'Reconcile ATR and CFL scores',
    sections: ['risk_assessment'],
    priority: 24,
    condition: (formData, pulledData) => {
      return Boolean(pulledData.atrScore && pulledData.cflScore)
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'risk_assessment',
        fields: [
          {
            id: 'risk_reconciliation',
            label: 'Risk Profile Reconciliation',
            type: 'textarea',
            helpText: 'System reconciling ATR and CFL assessments...'
          }
        ]
      },
      {
        type: 'calculate',
        sectionId: 'risk_assessment',
        fieldId: 'risk_reconciliation',
        value: (formData: SuitabilityFormData, pulledData: PulledPlatformData) => {
          const atr = pulledData.atrScore || 50
          const cfl = pulledData.cflScore || 50
          if (Math.abs(atr - cfl) > 30) {
            return 'Significant discrepancy detected - advisor review required'
          }
          return `Risk profile aligned: ATR ${atr}, CFL ${cfl}`
        }
      }
    ]
  },

  {
    id: 'age_risk_mismatch',
    name: 'Flag age/risk mismatch',
    sections: ['risk_assessment', 'personal_information'],
    priority: 25,
    condition: (formData) => {
      const age = formData.personal_information?.age || 0
      const riskLevel = parseInt(formData.risk_assessment?.attitude_to_risk?.match(/\d/)?.[0] || '0')
      return age > 65 && riskLevel > 5
    },
    actions: [
      {
        type: 'validate',
        sectionId: 'risk_assessment',
        message: 'High risk appetite may not be suitable given age - additional justification required'
      },
      {
        type: 'require_field',
        sectionId: 'risk_assessment',
        fieldId: 'high_risk_justification'
      }
    ]
  },

  {
    id: 'loss_experience_details',
    name: 'Show loss experience details',
    sections: ['risk_assessment'],
    priority: 26,
    condition: (formData) => formData.risk_assessment?.previous_losses === 'Yes',
    actions: [
      {
        type: 'show_field',
        sectionId: 'risk_assessment',
        fields: [
          {
            id: 'loss_amount',
            label: 'Approximate Loss Amount (£)',
            type: 'number'
          },
          {
            id: 'loss_impact',
            label: 'How did the loss affect you?',
            type: 'select',
            options: ['No significant impact', 'Some concern', 'Very stressful', 'Changed investment approach']
          },
          {
            id: 'loss_learning',
            label: 'What did you learn?',
            type: 'textarea'
          }
        ]
      }
    ]
  },

  {
    id: 'capacity_override',
    name: 'Override risk if low capacity',
    sections: ['risk_assessment'],
    priority: 27,
    condition: (formData, pulledData) => {
      const cfl = pulledData.cflScore || 100
      const stated = parseInt(formData.risk_assessment?.attitude_to_risk?.match(/\d/)?.[0] || '0')
      return cfl < 30 && stated > 4
    },
    actions: [
      {
        type: 'set_value',
        sectionId: 'risk_assessment',
        fieldId: 'adjusted_risk_level',
        value: 'Risk level adjusted down due to limited capacity for loss'
      }
    ]
  },

  // ===== KNOWLEDGE & EXPERIENCE INTELLIGENCE (Rules 28-35) =====
  {
    id: 'novice_limitations',
    name: 'Limit products for novice investors',
    sections: ['knowledge_experience', 'recommendation'],
    priority: 28,
    condition: (formData) => formData.knowledge_experience?.investment_knowledge === 'Basic',
    actions: [
      {
        type: 'show_field',
        sectionId: 'knowledge_experience',
        fields: [
          {
            id: 'education_needs',
            label: 'Investment Education Needed',
            type: 'select',
            options: ['Basic Concepts', 'Risk Understanding', 'Product Knowledge', 'All Areas'],
            required: true
          },
          {
            id: 'prefer_managed_solutions',
            label: 'Prefer Professionally Managed Solutions?',
            type: 'radio',
            options: ['Yes', 'No'],
            required: true
          }
        ]
      }
    ]
  },

  {
    id: 'experienced_investor_options',
    name: 'Unlock options for experienced investors',
    sections: ['knowledge_experience', 'objectives'],
    priority: 29,
    condition: (formData) => {
      const knowledge = formData.knowledge_experience?.investment_knowledge
      return knowledge === 'Advanced' || knowledge === 'Expert'
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'self_directed',
            label: 'Prefer Self-Directed Investment?',
            type: 'radio',
            options: ['Yes', 'No', 'Hybrid Approach']
          },
          {
            id: 'complex_products',
            label: 'Consider Complex Products?',
            type: 'radio',
            options: ['Yes', 'No']
          }
        ]
      }
    ]
  },

  {
    id: 'existing_portfolio_analysis',
    name: 'Analyze existing portfolio',
    sections: ['knowledge_experience', 'existing_arrangements'],
    priority: 30,
    condition: (formData) => formData.knowledge_experience?.current_investments === 'Yes',
    actions: [
      {
        type: 'show_field',
        sectionId: 'knowledge_experience',
        fields: [
          {
            id: 'portfolio_value',
            label: 'Current Portfolio Value (£)',
            type: 'number'
          },
          {
            id: 'portfolio_composition',
            label: 'Portfolio Composition',
            type: 'select',
            options: ['Mostly Cash', 'Bonds Heavy', 'Balanced', 'Equity Heavy', 'Alternative Assets']
          },
          {
            id: 'investment_performance',
            label: 'Performance vs Expectations',
            type: 'select',
            options: ['Exceeding', 'Meeting', 'Below', 'Unsure']
          },
          {
            id: 'current_adviser',
            label: 'Currently Using an Adviser?',
            type: 'radio',
            options: ['Yes', 'No', 'Previously']
          }
        ]
      }
    ]
  },

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
  },

  // ===== VULNERABILITY ASSESSMENT (Rules 33-37) =====
  {
    id: 'age_vulnerability',
    name: 'Trigger vulnerability for elderly',
    sections: ['vulnerability_assessment', 'personal_information'],
    priority: 33,
    condition: (formData) => (formData.personal_information?.age || 0) > 75,
    actions: [
      {
        type: 'show_field',
        sectionId: 'vulnerability_assessment',
        fields: [
          {
            id: 'cognitive_ability',
            label: 'Cognitive Ability',
            type: 'select',
            options: ['Fully Capable', 'Some Assistance Needed', 'Significant Support Required'],
            required: true
          },
          {
            id: 'power_of_attorney',
            label: 'Power of Attorney in Place?',
            type: 'radio',
            options: ['Yes', 'No', 'In Progress']
          }
        ]
      }
    ]
  },

  {
    id: 'health_vulnerability',
    name: 'Enhanced support for health concerns',
    sections: ['vulnerability_assessment'],
    priority: 34,
    condition: (formData) => {
      const health = formData.vulnerability_assessment?.health_concerns
      return health === 'Moderate' || health === 'Significant'
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'vulnerability_assessment',
        fields: [
          {
            id: 'communication_preferences',
            label: 'Communication Preferences',
            type: 'checkbox',
            options: ['Large Print', 'Audio', 'Video Calls', 'Face-to-Face', 'Written Summary'],
            required: true
          },
          {
            id: 'support_person',
            label: 'Support Person Details',
            type: 'textarea',
            placeholder: 'Name and relationship of support person if applicable'
          }
        ]
      }
    ]
  },

  {
  id: 'life_event_vulnerability',
  name: 'Support for major life events',
  sections: ['vulnerability_assessment'],
  priority: 35,
  condition: (formData) => {
    const events = formData.vulnerability_assessment?.life_events || []
    // Show for any significant life event selected (except 'None')
    const significantEvents = ['Bereavement', 'Divorce/Separation', 'Job Loss', 'Health Diagnosis', 'Retirement']
    return events.length > 0 && events.some(event => significantEvents.includes(event))
  },
    actions: [
      {
        type: 'show_field',
        sectionId: 'vulnerability_assessment',
        fields: [
          {
            id: 'cooling_off_period',
            label: 'Prefer Cooling-Off Period?',
            type: 'radio',
            options: ['Yes - 30 days', 'Yes - 60 days', 'No'],
            helpText: 'Time to reconsider major financial decisions'
          },
          {
            id: 'emotional_support',
            label: 'Additional Support Needed?',
            type: 'checkbox',
            options: ['Counseling Resources', 'Family Involvement', 'Gradual Implementation']
          }
        ]
      }
    ]
  },

  // ===== REGULATORY & COMPLIANCE (Rules 36-40) =====
  {
    id: 'politically_exposed_details',
    name: 'PEP additional requirements',
    sections: ['regulatory_compliance'],
    priority: 36,
    condition: (formData) => formData.regulatory_compliance?.politically_exposed === 'Yes',
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
            type: 'text',
            required: true
          },
          {
            id: 'pep_dates',
            label: 'Dates in Position',
            type: 'text',
            required: true
          },
          {
            id: 'source_of_wealth',
            label: 'Source of Wealth',
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
    sections: ['regulatory_compliance', 'objectives'],
    priority: 37,
    condition: (formData) => formData.regulatory_compliance?.advice_scope === 'Holistic Financial Planning',
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
    // FIX: Add type assertion for db_transfer_considered
    const existingArrangements = formData.existing_arrangements as any
    return formData.regulatory_compliance?.advice_scope === 'Pension Transfer' ||
           existingArrangements?.db_transfer_considered === 'Yes'
  },
  actions: [
    {
      type: 'validate',
      sectionId: 'regulatory_compliance',
      message: 'Pension Transfer Specialist qualification required for DB transfers'
    },
    {
      type: 'require_field',
      sectionId: 'regulatory_compliance',
      fieldId: 'pts_confirmation'
    }
  ]
},


  {
    id: 'costs_calculation',
    name: 'Calculate total costs',
    sections: ['costs_charges'],
    priority: 39,
    condition: (formData) => {
      return Boolean(formData.costs_charges?.initial_adviser_charge || 
                    formData.costs_charges?.ongoing_adviser_charge)
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
      return formData.suitability_declaration?.meets_objectives === 'Yes' &&
             formData.suitability_declaration?.suitable_risk === 'Yes'
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'suitability_declaration',
        fields: [
          {
            id: 'best_interests_declaration',
            label: 'I confirm this recommendation is in the client\'s best interests',
            type: 'checkbox',
            options: ['Confirmed'],
            required: true
          }
        ]
      }
    ]
  }
]

// =====================================================
// CONDITIONAL LOGIC ENGINE
// =====================================================

export class ConditionalLogicEngine {
  private rules: ConditionalRule[]
  
  constructor() {
    this.rules = conditionalRules.sort((a, b) => a.priority - b.priority)
  }
  
  evaluateRules(
    formData: SuitabilityFormData, 
    pulledData: PulledPlatformData
  ): ConditionalAction[] {
    const applicableActions: ConditionalAction[] = []
    
    for (const rule of this.rules) {
      if (rule.condition(formData, pulledData)) {
        applicableActions.push(...rule.actions)
      }
    }
    
    return applicableActions
  }
  
  getConditionalFields(
    sectionId: string,
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ConditionalFieldGroup[] {
    const groups: ConditionalFieldGroup[] = []
    const actions = this.evaluateRules(formData, pulledData)
    
    const fieldActions = actions.filter(
      a => (a.type === 'show_field' || a.type === 'show_section') && 
           a.sectionId === sectionId
    )
    
    fieldActions.forEach(action => {
      if (action.fields) {
        groups.push({
          condition: () => true, // Already evaluated
          fields: action.fields,
          aiReason: action.message
        })
      }
    })
    
    return groups
  }
  
  getValidationMessages(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): Record<string, string[]> {
    const messages: Record<string, string[]> = {}
    const actions = this.evaluateRules(formData, pulledData)
    
    actions
      .filter(a => a.type === 'validate')
      .forEach(action => {
        if (!messages[action.sectionId]) {
          messages[action.sectionId] = []
        }
        if (action.message) {
          messages[action.sectionId].push(action.message)
        }
      })
    
    return messages
  }
  
  getCalculatedValues(
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): Record<string, any> {
    const calculated: Record<string, any> = {}
    const actions = this.evaluateRules(formData, pulledData)
    
    actions
      .filter(a => a.type === 'calculate')
      .forEach(action => {
        if (action.fieldId && typeof action.value === 'function') {
          const key = `${action.sectionId}.${action.fieldId}`
          calculated[key] = action.value(formData, pulledData)
        }
      })
    
    return calculated
  }
}

// Export singleton instance
export const conditionalLogicEngine = new ConditionalLogicEngine()
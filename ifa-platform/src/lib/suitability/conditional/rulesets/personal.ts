import type { SuitabilityFormData } from '@/types/suitability'

import type { ConditionalRule } from '../types'

export const personalRules: ConditionalRule[] = [
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
            label: "Partner's Full Name",
            type: 'text',
            required: true,
            placeholder: "Enter partner's full name"
          },
          {
            id: 'partner_date_of_birth',
            label: "Partner's Date of Birth",
            type: 'date',
            required: true
          },
          {
            id: 'partner_employment_status',
            label: "Partner's Employment Status",
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

  // FIX Issue 5: Handle Widowed status for estate planning
  {
    id: 'widowed_cascade',
    name: 'Show deceased partner details for widowed clients',
    sections: ['personal_information'],
    priority: 1,
    condition: (formData) => {
      const status = formData.personal_information?.marital_status
      return status === 'Widowed'
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'deceased_partner_name',
            label: "Deceased Partner's Name",
            type: 'text',
            placeholder: 'For estate planning reference'
          },
          {
            id: 'date_of_bereavement',
            label: 'Date of Bereavement',
            type: 'date',
            helpText: 'Important for grief/vulnerability assessment'
          },
          {
            id: 'inherited_assets',
            label: 'Have you inherited assets from your partner?',
            type: 'radio',
            options: ['Yes', 'No', 'Pending Probate'],
            required: true
          },
          {
            id: 'estate_planning_needs',
            label: 'Estate Planning Needs',
            type: 'select',
            options: ['Will Update Required', 'IHT Planning', 'Beneficiary Updates', 'None Currently'],
            helpText: 'Common needs following bereavement'
          }
        ]
      }
    ]
  },

  // FIX Issue 5: Handle Divorced status for financial settlements
  {
    id: 'divorced_cascade',
    name: 'Show divorce-related financial details',
    sections: ['personal_information', 'financial_situation'],
    priority: 1,
    condition: (formData) => {
      const status = formData.personal_information?.marital_status
      return status === 'Divorced' || status === 'Separated'
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'divorce_settlement_complete',
            label: 'Is the financial settlement complete?',
            type: 'radio',
            options: ['Yes', 'No', 'In Progress'],
            required: true
          },
          {
            id: 'pension_sharing_order',
            label: 'Is there a Pension Sharing Order?',
            type: 'radio',
            options: ['Yes', 'No', 'Pending'],
            helpText: 'Important for pension planning'
          },
          {
            id: 'maintenance_payments',
            label: 'Maintenance Payments (Monthly £)',
            type: 'number',
            placeholder: '0',
            helpText: 'Either paying or receiving'
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
            label: "Partner's Annual Income (£)",
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
            label: "Partner's Assets (£)",
            type: 'number'
          },
          {
            id: 'partner_liabilities',
            label: "Partner's Liabilities (£)",
            type: 'number'
          }
        ]
      }
    ]
  },

  {
    id: 'dependants_details',
    name: 'Show dependant information when dependents exist',
    sections: ['personal_information', 'objectives'],
    priority: 3,
    condition: (formData) => (formData.personal_information?.dependents || 0) > 0,
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'dependant_details',
            label: 'Dependant Details',
            type: 'list',
            required: true,
            placeholder: 'Name and age (e.g. Ava, 12)'
          },
          {
            id: 'education_planning_required',
            label: 'Education Planning Required?',
            type: 'radio',
            options: ['Yes', 'No'],
            required: true
          }
        ]
      }
    ]
  },

  {
    id: 'disability_vulnerability',
    name: 'Set vulnerability flag for disability care needs',
    sections: ['vulnerability_assessment'],
    priority: 4,
    condition: (formData) => (formData.vulnerability_assessment as any)?.disability_care === 'Yes',
    actions: [
      {
        type: 'set_value',
        sectionId: 'vulnerability_assessment',
        fieldId: 'has_vulnerability',
        value: true
      },
      {
        type: 'show_field',
        sectionId: 'vulnerability_assessment',
        fields: [
          {
            id: 'disability_details',
            label: 'Disability Care Details',
            type: 'textarea',
            required: true,
            placeholder: 'Describe care needs and support requirements'
          }
        ]
      }
    ]
  },

  {
    id: 'employment_employed',
    name: 'Show employment details for employed clients',
    sections: ['personal_information'],
    priority: 5,
    condition: (formData) => formData.personal_information?.employment_status === 'Employed',
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'employer_name',
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
      // FIX Issue 6: Add compound condition - must be employed AND have DB pension
      // This prevents DB transfer fields from showing when employment status changes
      // but stale pension_scheme value persists in the form data.
      const personalInfo = formData.personal_information as any
      const isEmployed = personalInfo?.employment_status === 'Employed'
      const hasDBPension = personalInfo?.pension_scheme === 'Defined Benefit'
      return isEmployed && hasDBPension
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
      const personalInfo = formData.personal_information as any
      return (personalInfo?.bonus_percentage || 0) > 20
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'income_smoothing_required',
            label: 'Consider Income Smoothing Strategy?',
            type: 'radio',
            options: ['Yes', 'No'],
            helpText: 'High bonus variability may benefit from smoothing'
          }
        ]
      }
    ]
  },

  {
    id: 'self_employed_cascade',
    name: 'Show business details for self-employed',
    sections: ['personal_information'],
    priority: 8,
    condition: (formData) => formData.personal_information?.employment_status === 'Self-Employed',
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'business_type',
            label: 'Business Type',
            type: 'select',
            options: ['Sole Trader', 'Partnership', 'Limited Company'],
            required: true
          },
          {
            id: 'business_income',
            label: 'Annual Business Income (£)',
            type: 'number',
            required: true
          },
          {
            id: 'business_expenses',
            label: 'Annual Business Expenses (£)',
            type: 'number'
          }
        ]
      }
    ]
  },

  {
    id: 'ltd_company_strategies',
    name: 'Show limited company strategies',
    sections: ['personal_information', 'objectives'],
    priority: 9,
    condition: (formData) => (formData.personal_information as any)?.business_type === 'Limited Company',
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
            helpText: 'Tax-efficient investment through company structure'
          },
          {
            id: 'dividend_optimization',
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
          const financial = formData.financial_situation as any
          const current = Number(financial?.pension_income || 0)
          const previous = Number(financial?.pre_retirement_income)
          if (!Number.isFinite(previous) || previous <= 0) return undefined
          return Math.round((current / previous) * 100)
        }
      }
    ]
  },

  // FIX Issue 7: Add Student employment status rules
  {
    id: 'student_cascade',
    name: 'Show student-specific details',
    sections: ['personal_information', 'financial_situation'],
    priority: 10,
    condition: (formData) => formData.personal_information?.employment_status === 'Student',
    actions: [
      {
        type: 'show_field',
        sectionId: 'personal_information',
        fields: [
          {
            id: 'institution_name',
            label: 'Educational Institution',
            type: 'text'
          },
          {
            id: 'course_name',
            label: 'Course/Program',
            type: 'text'
          },
          {
            id: 'graduation_date',
            label: 'Expected Graduation Date',
            type: 'date'
          }
        ]
      },
      {
        type: 'show_field',
        sectionId: 'financial_situation',
        fields: [
          {
            id: 'student_loans',
            label: 'Student Loans Outstanding (£)',
            type: 'number',
            helpText: 'Include all student debt'
          },
          {
            id: 'part_time_income',
            label: 'Part-time Income (£ annually)',
            type: 'number'
          },
          {
            id: 'parental_support',
            label: 'Parental Financial Support?',
            type: 'radio',
            options: ['Yes - Regular', 'Yes - Occasional', 'No'],
            helpText: 'Important for affordability assessment'
          }
        ]
      }
    ]
  },

  // FIX Issue 7: Add Not Working employment status rules
  {
    id: 'not_working_cascade',
    name: 'Show unemployment/benefits details',
    sections: ['personal_information', 'financial_situation', 'vulnerability_assessment'],
    priority: 10,
    condition: (formData) => formData.personal_information?.employment_status === 'Not Working',
    actions: [
      {
        type: 'show_field',
        sectionId: 'financial_situation',
        fields: [
          {
            id: 'benefits_received',
            label: 'Receiving Benefits?',
            type: 'radio',
            options: ['Yes', 'No'],
            required: true
          },
          {
            id: 'benefits_type',
            label: 'Type of Benefits',
            type: 'select',
            options: [
              'Universal Credit',
              'Jobseeker Allowance',
              'Employment Support Allowance',
              'Disability Benefits',
              'Pension Credit',
              'Other'
            ]
          },
          {
            id: 'benefits_amount',
            label: 'Annual Benefits Amount (£)',
            type: 'number'
          },
          {
            id: 'severance_payment',
            label: 'Received Severance/Redundancy Payment?',
            type: 'radio',
            options: ['Yes', 'No']
          },
          {
            id: 'severance_amount',
            label: 'Severance Amount (£)',
            type: 'number'
          }
        ]
      }
    ]
  }
]

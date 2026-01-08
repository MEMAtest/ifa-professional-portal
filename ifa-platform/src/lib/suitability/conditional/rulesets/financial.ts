import type { SuitabilityFormData } from '@/types/suitability'

import type { ConditionalRule } from '../types'

export const financialRules: ConditionalRule[] = [
  // ===== FINANCIAL SITUATION INTELLIGENCE (Rules 19-28) =====
  {
    id: 'calculate_disposable_income',
    name: 'Auto-calculate disposable income',
    sections: ['financial_situation'],
    priority: 19,
    condition: (formData) => {
      return Boolean(formData.financial_situation?.annual_income && formData.financial_situation?.monthly_expenditure)
    },
    actions: [
      {
        type: 'calculate',
        sectionId: 'financial_situation',
        fieldId: 'disposable_income',
        value: (formData: SuitabilityFormData) => {
          const annual = formData.financial_situation?.annual_income || 0
          const monthly = formData.financial_situation?.monthly_expenditure || 0
          return annual - monthly * 12
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
      return liquid < monthly * 6
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
    id: 'emergency_fund_critical',
    name: 'Warn when emergency fund is under 3 months',
    sections: ['financial_situation'],
    priority: 21.5,
    condition: (formData) => {
      const financial = formData.financial_situation as any
      const monthly = Number(financial?.monthly_expenses ?? financial?.monthly_expenditure ?? 0)
      const fund = Number(financial?.emergency_fund ?? financial?.liquid_assets ?? 0)
      if (!Number.isFinite(monthly) || monthly <= 0) return false
      if (!Number.isFinite(fund)) return false
      return fund / monthly < 3
    },
    actions: [
      {
        type: 'validate',
        sectionId: 'financial_situation',
        message: 'Emergency fund covers less than 3 months of expenses. Prioritise building cash reserves.'
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
  {
    id: 'debt_ratio_warning',
    name: 'Warn when total debt exceeds 50% of income',
    sections: ['financial_situation'],
    priority: 24,
    condition: (formData) => {
      const financial = formData.financial_situation as any
      const income = Number(financial?.income_total ?? financial?.annual_income ?? 0)
      if (!Number.isFinite(income) || income <= 0) return false
      const mortgage = Number(financial?.mortgage_outstanding ?? financial?.outstanding_mortgage ?? 0)
      const otherDebts = Number(financial?.other_debts ?? financial?.other_liabilities ?? 0)
      const totalDebt = (Number.isFinite(mortgage) ? mortgage : 0) + (Number.isFinite(otherDebts) ? otherDebts : 0)
      return totalDebt / income > 0.5
    },
    actions: [
      {
        type: 'validate',
        sectionId: 'financial_situation',
        message: 'Total debts exceed 50% of annual income. Review affordability before recommending risk assets.'
      }
    ]
  }
]

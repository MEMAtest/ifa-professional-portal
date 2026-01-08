import { PoundSterling } from 'lucide-react'

export const financialSituationSection = {
  id: 'financial_situation',
  title: 'Financial Situation',
  icon: PoundSterling,
  status: 'incomplete',
  fields: [
    {
      id: 'annual_income',
      label: 'Annual Gross Income (£)',
      type: 'number',
      required: true,
      placeholder: '50000',
      min: 0,
      pullFrom: 'client.financialProfile.annualIncome' // ✅ AUTO-GENERATION: Pull income
    },
    {
      id: 'monthly_expenses',
      label: 'Monthly Essential Expenses (£)',
      type: 'number',
      required: true,
      placeholder: '2500',
      min: 0,
      pullFrom: 'client.financialProfile.monthlyExpenses' // ✅ AUTO-GENERATION: Pull expenses
    },
    {
      id: 'savings',
      label: 'Total Savings (£)',
      type: 'number',
      required: true,
      placeholder: '10000',
      min: 0,
      pullFrom: 'client.financialProfile.liquidAssets' // ✅ AUTO-GENERATION: Pull savings
    },
    {
      id: 'has_property',
      label: 'Do you own property?',
      type: 'radio',
      options: ['Yes', 'No'],
      autoGenerate: true,
      smartDefault: (formData: any) => {
        const propertyValue = Number(formData.financial_situation?.property_value ?? 0)
        if (Number.isFinite(propertyValue) && propertyValue > 0) return 'Yes'
        if (propertyValue === 0) return 'No'
        return undefined
      }
    },
    {
      id: 'has_mortgage',
      label: 'Do you have a mortgage?',
      type: 'radio',
      options: ['Yes', 'No'],
      autoGenerate: true
    },
    {
      id: 'other_debts',
      label: 'Other Debts (£)',
      type: 'number',
      placeholder: '5000',
      min: 0,
      pullFrom: 'client.financialProfile.otherDebts' // ✅ AUTO-GENERATION: Pull debts
    },
    {
      id: 'emergency_fund',
      label: 'Emergency Fund (£)',
      type: 'number',
      required: true,
      placeholder: '10000',
      min: 0,
      pullFrom: 'client.financialProfile.emergencyFund', // ✅ AUTO-GENERATION: Pull emergency fund
      smartDefault: (formData: any, pulledData: any) => {
        // Smart default: 6 months of expenses
        const raw = formData.financial_situation?.monthly_expenses
        const monthlyExpenses =
          typeof raw === 'number'
            ? raw
            : typeof raw === 'string'
              ? raw.trim() === ''
                ? undefined
                : Number(raw)
              : raw === null || raw === undefined
                ? undefined
                : Number(raw)

        if (monthlyExpenses === undefined || Number.isNaN(monthlyExpenses)) return undefined
        return monthlyExpenses * 6
      }
    },
    {
      id: 'monthly_surplus',
      label: 'Monthly Surplus Income (£)',
      type: 'number',
      placeholder: '1000',
      min: 0,
      calculate: 'disposable_income' // ✅ AUTO-GENERATION: Calculate surplus
    },
    {
      id: 'investment_amount',
      label: 'Amount Available to Invest (£)',
      type: 'number',
      required: true,
      placeholder: '25000',
      min: 0
    },
    {
      id: 'net_worth',
      label: 'Total Net Worth (£)',
      type: 'number',
      placeholder: 'Auto-calculated',
      calculate: 'net_worth' // ✅ AUTO-GENERATION: Calculate net worth
    },
    {
      id: 'income_state_pension',
      label: 'State Pension (At Retirement, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 11500',
      min: 0,
      helpText: 'Expected annual state pension at retirement.'
    },
    {
      id: 'income_defined_benefit',
      label: 'Defined Benefit Pension(s) (At Retirement, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 12000',
      min: 0,
      helpText: 'Expected annual income from DB pensions at retirement.'
    },
    {
      id: 'income_dividends',
      label: 'Dividend Income (Current, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 2000',
      min: 0
    },
    {
      id: 'income_other',
      label: 'Other Income (Current, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 1000',
      min: 0
    },
    {
      id: 'income_total',
      label: 'Total Current Income (Calculated, £ p.a.)',
      type: 'number',
      placeholder: 'Auto-calculated',
      calculate: 'income_total',
      helpText: 'Calculated from Employment + Rental + Dividends + Other (or falls back to Annual Gross Income).'
    },
    {
      id: 'exp_housing',
      label: 'Housing (Essential, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 12000',
      min: 0
    },
    {
      id: 'exp_utilities',
      label: 'Utilities & Household (Essential, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 2400',
      min: 0
    },
    {
      id: 'exp_food',
      label: 'Food & Groceries (Essential, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 3600',
      min: 0
    },
    {
      id: 'exp_transport',
      label: 'Transport (Essential, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 3000',
      min: 0
    },
    {
      id: 'exp_healthcare',
      label: 'Healthcare & Insurance (Essential, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 1200',
      min: 0
    },
    {
      id: 'exp_leisure',
      label: 'Leisure (Discretionary, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 2000',
      min: 0
    },
    {
      id: 'exp_holidays',
      label: 'Holidays (Discretionary, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 1500',
      min: 0
    },
    {
      id: 'exp_other',
      label: 'Other Expenditure (Discretionary, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 1000',
      min: 0
    },
    {
      id: 'exp_total_essential',
      label: 'Total Essential Expenditure (Calculated, £ p.a.)',
      type: 'number',
      placeholder: 'Auto-calculated',
      calculate: 'exp_total_essential',
      helpText: 'Calculated from essential categories (or falls back to Monthly Essential Expenses × 12).'
    },
    {
      id: 'exp_total_discretionary',
      label: 'Total Discretionary Expenditure (Calculated, £ p.a.)',
      type: 'number',
      placeholder: 'Auto-calculated',
      calculate: 'exp_total_discretionary'
    }
  ],
  conditionalFields: [
    {
      condition: (formData) => {
        const hasProperty = formData.financial_situation?.has_property
        if (typeof hasProperty === 'string') return hasProperty === 'Yes'
        if (typeof hasProperty === 'boolean') return hasProperty
        const value = Number((formData.financial_situation as any)?.property_value ?? 0)
        return Number.isFinite(value) && value > 0
      },
      fields: [
        {
          id: 'property_value',
          label: 'Property Value (£)',
          type: 'number',
          placeholder: '300000',
          min: 0,
          pullFrom: 'client.financialProfile.propertyValue' // ✅ AUTO-GENERATION: Pull property
        }
      ]
    },
    {
      condition: (formData) => {
        const mortgageFlag = formData.financial_situation?.has_mortgage
        if (typeof mortgageFlag === 'string') return mortgageFlag === 'Yes'
        if (typeof mortgageFlag === 'boolean') return mortgageFlag
        const mortgageValue = Number(
          (formData.financial_situation as any)?.mortgage_outstanding ??
            (formData.financial_situation as any)?.outstanding_mortgage ??
            0
        )
        return Number.isFinite(mortgageValue) && mortgageValue > 0
      },
      fields: [
        {
          id: 'mortgage_outstanding',
          label: 'Outstanding Mortgage (£)',
          type: 'number',
          placeholder: '150000',
          min: 0,
          pullFrom: 'client.financialProfile.mortgageBalance' // ✅ AUTO-GENERATION: Pull mortgage
        }
      ]
    },
    {
      condition: (formData) => {
        const status = formData.personal_information?.employment_status
        const hasEmployment = status === 'Employed' || status === 'Self-Employed'
        const existing = (formData.financial_situation as any)?.income_employment
        return Boolean(hasEmployment || existing !== undefined)
      },
      fields: [
        {
          id: 'income_employment',
          label: 'Employment Income (Current, £ p.a.)',
          type: 'number',
          placeholder: 'e.g. 60000',
          min: 0,
          helpText: 'Current gross annual employment/self-employment income.'
        }
      ]
    },
    {
      condition: (formData) => {
        const propertyFlag = formData.financial_situation?.has_property
        const hasProperty = typeof propertyFlag === 'string' ? propertyFlag === 'Yes' : Boolean(propertyFlag)
        const propertyValue = Number((formData.financial_situation as any)?.property_value ?? 0)
        const rental = (formData.financial_situation as any)?.income_rental
        return hasProperty || (Number.isFinite(propertyValue) && propertyValue > 0) || rental !== undefined
      },
      fields: [
        {
          id: 'income_rental',
          label: 'Rental Income (Current, £ p.a.)',
          type: 'number',
          placeholder: 'e.g. 9000',
          min: 0
        }
      ]
    },
    {
      condition: (formData) => {
        const hasDependents = formData.personal_information?.has_dependents
        if (typeof hasDependents === 'string' && hasDependents === 'Yes') return true
        if (typeof hasDependents === 'boolean' && hasDependents) return true
        const dependents = Number(formData.personal_information?.dependents ?? 0)
        return Number.isFinite(dependents) && dependents > 0
      },
      fields: [
        {
          id: 'exp_childcare',
          label: 'Childcare (Essential, £ p.a.)',
          type: 'number',
          placeholder: 'e.g. 2400',
          min: 0
        }
      ]
    }
  ]
}

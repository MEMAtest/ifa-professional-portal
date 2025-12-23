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
      id: 'property_value',
      label: 'Property Value (£)',
      type: 'number',
      placeholder: '300000',
      min: 0,
      pullFrom: 'client.financialProfile.propertyValue' // ✅ AUTO-GENERATION: Pull property
    },
    {
      id: 'mortgage_outstanding',
      label: 'Outstanding Mortgage (£)',
      type: 'number',
      placeholder: '150000',
      min: 0,
      pullFrom: 'client.financialProfile.mortgageBalance' // ✅ AUTO-GENERATION: Pull mortgage
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
      id: 'income_employment',
      label: 'Employment Income (Current, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 60000',
      min: 0,
      helpText: 'Current gross annual employment/self-employment income.'
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
      id: 'income_rental',
      label: 'Rental Income (Current, £ p.a.)',
      type: 'number',
      placeholder: 'e.g. 9000',
      min: 0
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
  ]
}


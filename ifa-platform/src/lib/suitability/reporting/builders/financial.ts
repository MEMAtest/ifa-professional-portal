import type { SuitabilityFinancialAnalysis } from '../types'
import { parseOptionalNumber } from '../utils'

export type FinancialSummary = {
  incomeTotal?: number
  essentialAnnual?: number
  discretionaryIncome?: number
  savings?: number
  propertyValue?: number
  mortgage?: number
  otherDebts?: number
  totalAssets?: number
  totalLiabilities?: number
  emergencyFund?: number
  pensionValue?: number
  investmentAmountFromForm?: number
  financialAnalysis: SuitabilityFinancialAnalysis
}

export function buildFinancialSummary(args: {
  formFinancial: Record<string, unknown>
  formExistingArrangements: Record<string, unknown>
  pensionArrangements: Array<{ currentValue?: number }>
}): FinancialSummary {
  const annualIncomeFallback = parseOptionalNumber(
    (args.formFinancial as any).annual_income ?? (args.formFinancial as any).annualIncome
  )
  const incomeTotal =
    parseOptionalNumber((args.formFinancial as any).income_total) ?? annualIncomeFallback

  const essentialAnnual =
    parseOptionalNumber((args.formFinancial as any).exp_total_essential) ??
    (() => {
      const monthly = parseOptionalNumber(
        (args.formFinancial as any).monthly_expenses ??
          (args.formFinancial as any).monthly_expenditure ??
          (args.formFinancial as any).monthlyExpenses
      )
      return monthly !== undefined ? monthly * 12 : undefined
    })()

  const discretionaryIncome =
    incomeTotal !== undefined && essentialAnnual !== undefined ? Math.max(0, incomeTotal - essentialAnnual) : undefined

  const savings = parseOptionalNumber(
    (args.formFinancial as any).savings ?? (args.formFinancial as any).liquid_assets ?? (args.formFinancial as any).liquidAssets
  )
  const propertyValue = parseOptionalNumber((args.formFinancial as any).property_value ?? (args.formFinancial as any).propertyValue)
  const mortgage = parseOptionalNumber(
    (args.formFinancial as any).mortgage_outstanding ??
      (args.formFinancial as any).outstanding_mortgage ??
      (args.formFinancial as any).mortgage_outstanding ??
      (args.formFinancial as any).mortgageBalance
  )
  const otherDebts = parseOptionalNumber(
    (args.formFinancial as any).other_debts ?? (args.formFinancial as any).other_liabilities ?? (args.formFinancial as any).otherDebts
  )

  const totalAssets = savings !== undefined || propertyValue !== undefined ? (savings || 0) + (propertyValue || 0) : undefined
  const totalLiabilities = mortgage !== undefined || otherDebts !== undefined ? (mortgage || 0) + (otherDebts || 0) : undefined

  const emergencyFund = parseOptionalNumber((args.formFinancial as any).emergency_fund ?? (args.formFinancial as any).emergencyFund)

  const pensionValueFromForm = parseOptionalNumber((args.formExistingArrangements as any).pension_value)
  const pensionValueFromProfile =
    args.pensionArrangements.length > 0
      ? args.pensionArrangements.reduce<number>((sum, row) => sum + (row.currentValue ?? 0), 0)
      : undefined
  const pensionValue =
    pensionValueFromForm !== undefined
      ? pensionValueFromForm
      : pensionValueFromProfile && pensionValueFromProfile > 0
        ? pensionValueFromProfile
        : undefined

  const investmentAmountFromForm = parseOptionalNumber(
    (args.formFinancial as any).investment_amount ?? (args.formFinancial as any).investmentAmount
  )

  const incomeBreakdownCurrent = [
    parseOptionalNumber((args.formFinancial as any).income_employment),
    parseOptionalNumber((args.formFinancial as any).income_rental),
    parseOptionalNumber((args.formFinancial as any).income_dividends),
    parseOptionalNumber((args.formFinancial as any).income_other)
  ]

  const hasAnyCurrentIncomeBreakdown = incomeBreakdownCurrent.some((v) => v !== undefined)
  const incomeTotalCurrent = hasAnyCurrentIncomeBreakdown
    ? incomeBreakdownCurrent.reduce<number>((sum, v) => sum + (v ?? 0), 0)
    : incomeTotal

  const incomeAtRetirementParts = [
    parseOptionalNumber((args.formFinancial as any).income_state_pension),
    parseOptionalNumber((args.formFinancial as any).income_defined_benefit)
  ]
  const hasAnyAtRetirementIncomeBreakdown = incomeAtRetirementParts.some((v) => v !== undefined)
  const incomeAtRetirementTotal = hasAnyAtRetirementIncomeBreakdown
    ? incomeAtRetirementParts.reduce<number>((sum, v) => sum + (v ?? 0), 0)
    : undefined

  const financialAnalysis: SuitabilityFinancialAnalysis = {
    income: {
      rows: [
        { label: 'Employment Income', current: parseOptionalNumber((args.formFinancial as any).income_employment) },
        { label: 'Rental Income', current: parseOptionalNumber((args.formFinancial as any).income_rental) },
        { label: 'Dividend Income', current: parseOptionalNumber((args.formFinancial as any).income_dividends) },
        { label: 'Other Income', current: parseOptionalNumber((args.formFinancial as any).income_other) },
        { label: 'State Pension', atRetirement: parseOptionalNumber((args.formFinancial as any).income_state_pension) },
        {
          label: 'Defined Benefit Pension(s)',
          atRetirement: parseOptionalNumber((args.formFinancial as any).income_defined_benefit)
        }
      ],
      totalCurrent: incomeTotalCurrent,
      totalAtRetirement: incomeAtRetirementTotal
    },
    expenditure: {
      rows: [
        { label: 'Housing', essential: parseOptionalNumber((args.formFinancial as any).exp_housing) },
        { label: 'Utilities & household', essential: parseOptionalNumber((args.formFinancial as any).exp_utilities) },
        { label: 'Food & groceries', essential: parseOptionalNumber((args.formFinancial as any).exp_food) },
        { label: 'Transport', essential: parseOptionalNumber((args.formFinancial as any).exp_transport) },
        { label: 'Healthcare & insurance', essential: parseOptionalNumber((args.formFinancial as any).exp_healthcare) },
        { label: 'Leisure', discretionary: parseOptionalNumber((args.formFinancial as any).exp_leisure) },
        { label: 'Holidays', discretionary: parseOptionalNumber((args.formFinancial as any).exp_holidays) },
        { label: 'Other expenditure', discretionary: parseOptionalNumber((args.formFinancial as any).exp_other) }
      ],
      totalEssential: essentialAnnual,
      totalDiscretionary:
        parseOptionalNumber((args.formFinancial as any).exp_total_discretionary) ??
        (() => {
          const parts = [
            parseOptionalNumber((args.formFinancial as any).exp_leisure),
            parseOptionalNumber((args.formFinancial as any).exp_holidays),
            parseOptionalNumber((args.formFinancial as any).exp_other)
          ]
          return parts.some((v) => v !== undefined) ? parts.reduce<number>((sum, v) => sum + (v ?? 0), 0) : undefined
        })()
    }
  }

  return {
    incomeTotal,
    essentialAnnual,
    discretionaryIncome,
    savings,
    propertyValue,
    mortgage,
    otherDebts,
    totalAssets,
    totalLiabilities,
    emergencyFund,
    pensionValue,
    investmentAmountFromForm,
    financialAnalysis
  }
}


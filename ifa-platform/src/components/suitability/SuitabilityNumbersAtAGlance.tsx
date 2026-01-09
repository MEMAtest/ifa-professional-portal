'use client'

import React, { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import type { SuitabilityFormData } from '@/types/suitability'

type GlanceFormat = 'currency' | 'percent' | 'months'
type GlanceItem = {
  label: string
  value: number
  category: string
  format: GlanceFormat
  status?: 'positive' | 'negative' | 'warning'
}

const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return Number.isNaN(value) ? undefined : value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed.replace(/,/g, ''))
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

const formatCurrency = (value: number) => `£${Math.round(value).toLocaleString()}`
const formatPercent = (value: number) => `${Math.round(value * 10) / 10}%`

const formatValue = (item: GlanceItem) => {
  switch (item.format) {
    case 'percent':
      return formatPercent(item.value)
    case 'months':
      return `${Math.round(item.value * 10) / 10} months`
    case 'currency':
    default:
      return formatCurrency(item.value)
  }
}

export function SuitabilityNumbersAtAGlance(props: { formData: SuitabilityFormData }) {
  const [query, setQuery] = useState('')
  const [showBreakdown, setShowBreakdown] = useState(false)

  const financial = (props.formData.financial_situation || {}) as any
  const arrangements = (props.formData.existing_arrangements || {}) as any
  const objectives = (props.formData.objectives || {}) as any

  const snapshot = useMemo(() => {
    const incomeBreakdown = [
      parseNumber(financial.income_employment),
      parseNumber(financial.income_rental),
      parseNumber(financial.income_dividends),
      parseNumber(financial.income_other),
      parseNumber(financial.income_state_pension),
      parseNumber(financial.income_defined_benefit)
    ].filter((value): value is number => value !== undefined)

    const incomeBreakdownTotal = incomeBreakdown.length > 0 ? incomeBreakdown.reduce((sum, value) => sum + value, 0) : 0
    const annualIncomeInput = parseNumber(financial.annual_income ?? financial.annualIncome) ?? 0
    const incomeTotal = parseNumber(financial.income_total ?? financial.incomeTotal) ?? 0

    const annualIncome = incomeBreakdownTotal || incomeTotal || annualIncomeInput || 0

    const monthlyExpensesInput = parseNumber(
      financial.monthly_expenses ?? financial.monthlyExpenses ?? financial.monthly_expenditure ?? financial.monthlyExpenditure
    ) ?? 0
    const essentialBreakdown = [
      parseNumber(financial.exp_housing),
      parseNumber(financial.exp_utilities),
      parseNumber(financial.exp_food),
      parseNumber(financial.exp_transport),
      parseNumber(financial.exp_healthcare),
      parseNumber(financial.exp_childcare)
    ].filter((value): value is number => value !== undefined)
    const discretionaryBreakdown = [
      parseNumber(financial.exp_leisure),
      parseNumber(financial.exp_holidays),
      parseNumber(financial.exp_other)
    ].filter((value): value is number => value !== undefined)

    const essentialBreakdownTotal = essentialBreakdown.length > 0 ? essentialBreakdown.reduce((sum, value) => sum + value, 0) : 0
    const discretionaryBreakdownTotal = discretionaryBreakdown.length > 0 ? discretionaryBreakdown.reduce((sum, value) => sum + value, 0) : 0

    const essentialAnnual =
      essentialBreakdownTotal ||
      parseNumber(financial.exp_total_essential) ||
      (monthlyExpensesInput ? monthlyExpensesInput * 12 : 0)
    const discretionaryAnnual = discretionaryBreakdownTotal || parseNumber(financial.exp_total_discretionary) || 0
    const annualExpenditure = essentialAnnual + discretionaryAnnual
    const monthlyExpenditure = monthlyExpensesInput || (annualExpenditure > 0 ? Math.round(annualExpenditure / 12) : 0)

    const liquidAssets =
      parseNumber(financial.savings ?? financial.liquid_assets ?? financial.liquidAssets) ?? 0
    const propertyValue = parseNumber(financial.property_value ?? financial.propertyValue) ?? 0
    const mortgage = parseNumber(financial.mortgage_outstanding ?? financial.outstanding_mortgage ?? financial.mortgageOutstanding) ?? 0
    const otherLiabilities = parseNumber(financial.other_debts ?? financial.other_liabilities ?? financial.otherLiabilities) ?? 0
    const emergencyFund = parseNumber(financial.emergency_fund ?? financial.emergencyFund) ?? 0

    const pensionValue =
      parseNumber(arrangements?.pension_value ?? arrangements?.total_pension_value ?? arrangements?.pensionValue ?? arrangements?.totalPensionValue) ?? 0
    const investmentValue =
      parseNumber(arrangements?.investment_value ?? arrangements?.total_investment_value ?? arrangements?.investmentValue ?? arrangements?.totalInvestmentValue) ??
      parseNumber(arrangements?.isa_value ?? arrangements?.isaValue) ??
      0

    const investmentAmount = parseNumber(financial.investment_amount ?? financial.investmentAmount) ?? 0
    const objectiveInvestmentAmount = parseNumber(objectives?.investment_amount ?? objectives?.investmentAmount) ?? 0

    const totalAssets = liquidAssets + propertyValue + pensionValue + investmentValue
    const totalLiabilities = mortgage + otherLiabilities
    const netWorth = totalAssets - totalLiabilities
    const disposableIncome = annualIncome - annualExpenditure
    const savingsRate = annualIncome > 0 ? (disposableIncome / annualIncome) * 100 : 0
    const debtToIncomeRatio = annualIncome > 0 ? totalLiabilities / annualIncome : 0
    const emergencyFundMonths = monthlyExpenditure > 0 ? emergencyFund / monthlyExpenditure : 0

    const hasExpenseBreakdown = essentialBreakdown.length > 0 || discretionaryBreakdown.length > 0
    const expenseBreakdownTotal = hasExpenseBreakdown ? essentialBreakdownTotal + discretionaryBreakdownTotal : 0

    return {
      annualIncome,
      annualIncomeInput,
      incomeBreakdownTotal,
      monthlyExpenditure,
      monthlyExpensesInput,
      annualExpenditure,
      expenseBreakdownTotal,
      disposableIncome,
      liquidAssets,
      propertyValue,
      pensionValue,
      investmentValue,
      investmentAmount,
      objectiveInvestmentAmount,
      mortgage,
      otherLiabilities,
      totalAssets,
      totalLiabilities,
      netWorth,
      emergencyFund,
      emergencyFundMonths,
      savingsRate,
      debtToIncomeRatio
    }
  }, [arrangements, financial, objectives])

  const items = useMemo(() => {
    const list: GlanceItem[] = []

    const pushItem = (item: GlanceItem) => {
      if (!Number.isFinite(item.value)) return
      list.push(item)
    }

    pushItem({ label: 'Annual income', value: snapshot.annualIncome, category: 'Income', format: 'currency' })
    pushItem({ label: 'Monthly income', value: Math.round(snapshot.annualIncome / 12), category: 'Income', format: 'currency' })
    pushItem({ label: 'Annual expenses', value: snapshot.annualExpenditure, category: 'Expenses', format: 'currency' })
    pushItem({ label: 'Monthly expenses', value: snapshot.monthlyExpenditure, category: 'Expenses', format: 'currency' })
    pushItem({
      label: 'Annual surplus',
      value: snapshot.disposableIncome,
      category: 'Surplus',
      format: 'currency',
      status: snapshot.disposableIncome >= 0 ? 'positive' : 'negative'
    })
    pushItem({ label: 'Amount available to invest', value: snapshot.investmentAmount, category: 'Investment', format: 'currency' })
    if (snapshot.objectiveInvestmentAmount > 0 && snapshot.objectiveInvestmentAmount !== snapshot.investmentAmount) {
      pushItem({
        label: 'Investment amount (objectives)',
        value: snapshot.objectiveInvestmentAmount,
        category: 'Investment',
        format: 'currency'
      })
    }
    pushItem({ label: 'Liquid assets', value: snapshot.liquidAssets, category: 'Assets', format: 'currency' })
    pushItem({ label: 'Investments (existing)', value: snapshot.investmentValue, category: 'Assets', format: 'currency' })
    pushItem({ label: 'Pensions (existing)', value: snapshot.pensionValue, category: 'Assets', format: 'currency' })
    pushItem({ label: 'Property value', value: snapshot.propertyValue, category: 'Assets', format: 'currency' })
    pushItem({ label: 'Total assets', value: snapshot.totalAssets, category: 'Totals', format: 'currency' })
    pushItem({ label: 'Mortgage outstanding', value: snapshot.mortgage, category: 'Liabilities', format: 'currency' })
    pushItem({ label: 'Other liabilities', value: snapshot.otherLiabilities, category: 'Liabilities', format: 'currency' })
    pushItem({ label: 'Total liabilities', value: snapshot.totalLiabilities, category: 'Totals', format: 'currency' })
    pushItem({
      label: 'Net worth',
      value: snapshot.netWorth,
      category: 'Totals',
      format: 'currency',
      status: snapshot.netWorth >= 0 ? 'positive' : 'negative'
    })
    pushItem({ label: 'Emergency fund', value: snapshot.emergencyFund, category: 'Reserves', format: 'currency' })
    pushItem({
      label: 'Emergency fund coverage',
      value: snapshot.emergencyFundMonths,
      category: 'Reserves',
      format: 'months'
    })
    pushItem({
      label: 'Savings rate',
      value: snapshot.savingsRate,
      category: 'Ratios',
      format: 'percent',
      status: snapshot.savingsRate >= 20 ? 'positive' : snapshot.savingsRate >= 10 ? 'warning' : 'negative'
    })
    pushItem({
      label: 'Debt-to-income',
      value: snapshot.debtToIncomeRatio * 100,
      category: 'Ratios',
      format: 'percent',
      status: snapshot.debtToIncomeRatio <= 0.36 ? 'positive' : snapshot.debtToIncomeRatio <= 0.43 ? 'warning' : 'negative'
    })

    if (showBreakdown) {
      const addBreakdown = (label: string, value: number | undefined, category: string) => {
        if (!Number.isFinite(value) || Number(value) === 0) return
        list.push({ label, value: value as number, category, format: 'currency' })
      }

      addBreakdown('Employment income (p.a.)', parseNumber(financial.income_employment), 'Income breakdown')
      addBreakdown('Rental income (p.a.)', parseNumber(financial.income_rental), 'Income breakdown')
      addBreakdown('Dividends (p.a.)', parseNumber(financial.income_dividends), 'Income breakdown')
      addBreakdown('Other income (p.a.)', parseNumber(financial.income_other), 'Income breakdown')
      addBreakdown('State pension (p.a.)', parseNumber(financial.income_state_pension), 'Income breakdown')
      addBreakdown('Defined benefit (p.a.)', parseNumber(financial.income_defined_benefit), 'Income breakdown')
      addBreakdown('Total income (p.a.)', parseNumber(financial.income_total), 'Income breakdown')

      addBreakdown('Housing (p.a.)', parseNumber(financial.exp_housing), 'Expense breakdown')
      addBreakdown('Utilities (p.a.)', parseNumber(financial.exp_utilities), 'Expense breakdown')
      addBreakdown('Food (p.a.)', parseNumber(financial.exp_food), 'Expense breakdown')
      addBreakdown('Transport (p.a.)', parseNumber(financial.exp_transport), 'Expense breakdown')
      addBreakdown('Healthcare (p.a.)', parseNumber(financial.exp_healthcare), 'Expense breakdown')
      addBreakdown('Childcare (p.a.)', parseNumber(financial.exp_childcare), 'Expense breakdown')
      addBreakdown('Leisure (p.a.)', parseNumber(financial.exp_leisure), 'Expense breakdown')
      addBreakdown('Holidays (p.a.)', parseNumber(financial.exp_holidays), 'Expense breakdown')
      addBreakdown('Other expenditure (p.a.)', parseNumber(financial.exp_other), 'Expense breakdown')
      addBreakdown('Total essential (p.a.)', parseNumber(financial.exp_total_essential), 'Expense breakdown')
      addBreakdown('Total discretionary (p.a.)', parseNumber(financial.exp_total_discretionary), 'Expense breakdown')

      addBreakdown('Pension contributions (monthly)', parseNumber(arrangements?.pension_contributions), 'Pensions')
      addBreakdown('Total pension value', parseNumber(arrangements?.total_pension_value ?? arrangements?.pension_value), 'Pensions')
      addBreakdown('Total investment value', parseNumber(arrangements?.total_investment_value ?? arrangements?.investment_value), 'Investments')
    }

    return list
  }, [arrangements, financial, showBreakdown, snapshot])

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return items
    return items.filter((item) => item.label.toLowerCase().includes(trimmed) || item.category.toLowerCase().includes(trimmed))
  }, [items, query])

  const warnings = useMemo(() => {
    const list: string[] = []

    const incomeBreakdownGap = Math.abs(snapshot.annualIncomeInput - snapshot.incomeBreakdownTotal)
    if (snapshot.annualIncomeInput > 0 && snapshot.incomeBreakdownTotal > 0 && incomeBreakdownGap > Math.max(1000, snapshot.annualIncomeInput * 0.1)) {
      list.push('Income breakdown total does not align with annual income.')
    }

    const annualExpenseFromMonthly = snapshot.monthlyExpensesInput * 12
    const expenseBreakdownGap = Math.abs(annualExpenseFromMonthly - snapshot.expenseBreakdownTotal)
    if (snapshot.monthlyExpensesInput > 0 && snapshot.expenseBreakdownTotal > 0 && expenseBreakdownGap > Math.max(1000, annualExpenseFromMonthly * 0.1)) {
      list.push('Expense breakdown total does not align with monthly expenses.')
    }

    if (snapshot.annualIncome > 0 && snapshot.annualExpenditure > snapshot.annualIncome) {
      list.push('Annual expenses exceed annual income.')
    }

    if (snapshot.totalAssets > 0 && snapshot.totalLiabilities > snapshot.totalAssets) {
      list.push('Total liabilities exceed total assets.')
    }

    if (snapshot.propertyValue > 0 && snapshot.mortgage > snapshot.propertyValue) {
      list.push('Mortgage outstanding exceeds property value.')
    }

    if (snapshot.liquidAssets > 0 && snapshot.emergencyFund > snapshot.liquidAssets) {
      list.push('Emergency fund exceeds liquid assets.')
    }

    if (snapshot.investmentAmount > 0 && snapshot.liquidAssets > 0 && snapshot.investmentAmount > snapshot.liquidAssets) {
      list.push('Investment amount exceeds available liquid assets.')
    }

    if (
      snapshot.investmentAmount > 0 &&
      snapshot.objectiveInvestmentAmount > 0 &&
      Math.abs(snapshot.objectiveInvestmentAmount - snapshot.investmentAmount) > Math.max(1000, snapshot.investmentAmount * 0.1)
    ) {
      list.push('Investment amount differs between financials and objectives.')
    }

    const reportedNetWorth = parseNumber(financial.net_worth)
    if (reportedNetWorth !== undefined && Math.abs(reportedNetWorth - snapshot.netWorth) > Math.max(2000, Math.abs(snapshot.netWorth) * 0.1)) {
      list.push('Reported net worth does not align with calculated net worth.')
    }

    return list
  }, [financial.net_worth, snapshot])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search numbers or categories"
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowBreakdown((prev) => !prev)}
          >
            {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          </Button>
          <Badge variant="outline">{filteredItems.length} items</Badge>
        </div>
      </div>

      {warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4 text-xs text-amber-800">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="divide-y rounded-lg border text-xs">
        {filteredItems.length === 0 ? (
          <div className="p-3 text-gray-500">No matching numbers.</div>
        ) : (
          filteredItems.map((item) => (
            <div key={`${item.category}-${item.label}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs font-medium text-gray-700">{item.label}</span>
                <Badge variant="outline" className="text-[10px]">
                  {item.category}
                </Badge>
              </div>
              <span
                className={cn(
                  'text-xs font-semibold',
                  item.status === 'positive' && 'text-green-600',
                  item.status === 'negative' && 'text-red-600',
                  item.status === 'warning' && 'text-amber-600'
                )}
              >
                {formatValue(item)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

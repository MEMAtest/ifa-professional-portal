'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { cn } from '@/lib/utils'
import type { AUMBreakdown } from '@/lib/financials/aumCalculator'
import type { FinancialProfile } from '@/types/client'

type SnapshotFormat = 'currency' | 'percent' | 'months' | 'ratio'

interface SnapshotItem {
  label: string
  value: number
  category: string
  format: SnapshotFormat
  status?: 'positive' | 'negative' | 'warning'
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)

const formatPercent = (value: number) => `${Math.round(value * 10) / 10}%`
const formatRatio = (value: number) => `${Math.round(value * 10) / 10}x`

const formatValue = (item: SnapshotItem) => {
  switch (item.format) {
    case 'percent':
      return formatPercent(item.value)
    case 'months':
      return `${Math.round(item.value * 10) / 10} months`
    case 'ratio':
      return formatRatio(item.value)
    case 'currency':
    default:
      return formatCurrency(item.value)
  }
}

export function FinancialAtAGlance(props: {
  financialProfile: Partial<FinancialProfile>
  aum: AUMBreakdown
}) {
  const { financialProfile, aum } = props
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const snapshot = useMemo(() => {
    const annualIncome = financialProfile.annualIncome || 0
    const monthlyExpenses = financialProfile.monthlyExpenses || 0
    const annualExpenses = monthlyExpenses * 12
    const liquidAssets = financialProfile.liquidAssets ?? aum.liquidAssets ?? 0
    const propertyValue = financialProfile.propertyValue ?? 0
    const investmentTotal = aum.investments || 0
    const pensionTotal = aum.pensions || 0
    const totalAssets = financialProfile.totalAssets ?? (investmentTotal + pensionTotal + liquidAssets + propertyValue)
    const totalLiabilities = (financialProfile.mortgageOutstanding ?? 0) + (financialProfile.otherLiabilities ?? 0)
    const computedNetWorth = totalAssets - totalLiabilities
    const netWorth = financialProfile.netWorth ?? computedNetWorth
    const investmentAmount = financialProfile.investmentAmount ?? 0
    const emergencyFund = financialProfile.emergencyFund ?? 0
    const disposableIncome = financialProfile.disposableIncome ?? (annualIncome - annualExpenses)
    const debtToIncomeRatio = annualIncome > 0 ? totalLiabilities / annualIncome : 0
    const savingsRate = annualIncome > 0 ? ((annualIncome - annualExpenses) / annualIncome) * 100 : 0
    const emergencyFundMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0
    const wealthRatio = annualIncome > 0 ? netWorth / annualIncome : 0

    return {
      annualIncome,
      monthlyExpenses,
      annualExpenses,
      liquidAssets,
      propertyValue,
      investmentTotal,
      pensionTotal,
      investmentAmount,
      totalAssets,
      totalLiabilities,
      computedNetWorth,
      netWorth,
      emergencyFund,
      disposableIncome,
      debtToIncomeRatio,
      savingsRate,
      emergencyFundMonths,
      wealthRatio
    }
  }, [aum.investments, aum.liquidAssets, aum.pensions, financialProfile])

  const items = useMemo(() => {
    const list: SnapshotItem[] = [
      {
        label: 'Assets under management',
        value: aum.totalAUM,
        category: 'Assets',
        format: 'currency'
      },
      {
        label: 'Annual income',
        value: snapshot.annualIncome,
        category: 'Income',
        format: 'currency'
      },
      {
        label: 'Monthly expenses',
        value: snapshot.monthlyExpenses,
        category: 'Expenses',
        format: 'currency'
      },
      {
        label: 'Annual expenses',
        value: snapshot.annualExpenses,
        category: 'Expenses',
        format: 'currency'
      },
      {
        label: 'Annual surplus',
        value: snapshot.disposableIncome,
        category: 'Surplus',
        format: 'currency',
        status: snapshot.disposableIncome >= 0 ? 'positive' : 'negative'
      },
      {
        label: 'Amount available to invest',
        value: snapshot.investmentAmount,
        category: 'Investment',
        format: 'currency'
      },
      {
        label: 'Liquid assets',
        value: snapshot.liquidAssets,
        category: 'Assets',
        format: 'currency'
      },
      {
        label: 'Property value',
        value: snapshot.propertyValue,
        category: 'Assets',
        format: 'currency'
      },
      {
        label: 'Investments',
        value: snapshot.investmentTotal,
        category: 'Assets',
        format: 'currency'
      },
      {
        label: 'Pensions',
        value: snapshot.pensionTotal,
        category: 'Assets',
        format: 'currency'
      },
      {
        label: 'Total assets',
        value: snapshot.totalAssets,
        category: 'Totals',
        format: 'currency'
      },
      {
        label: 'Mortgage outstanding',
        value: financialProfile.mortgageOutstanding ?? 0,
        category: 'Liabilities',
        format: 'currency'
      },
      {
        label: 'Other liabilities',
        value: financialProfile.otherLiabilities ?? 0,
        category: 'Liabilities',
        format: 'currency'
      },
      {
        label: 'Total liabilities',
        value: snapshot.totalLiabilities,
        category: 'Totals',
        format: 'currency'
      },
      {
        label: 'Net worth',
        value: snapshot.netWorth,
        category: 'Totals',
        format: 'currency',
        status: snapshot.netWorth >= 0 ? 'positive' : 'negative'
      },
      {
        label: 'Emergency fund',
        value: snapshot.emergencyFund,
        category: 'Reserves',
        format: 'currency'
      },
      {
        label: 'Emergency fund coverage',
        value: snapshot.emergencyFundMonths,
        category: 'Reserves',
        format: 'months'
      },
      {
        label: 'Savings rate',
        value: snapshot.savingsRate,
        category: 'Ratios',
        format: 'percent',
        status: snapshot.savingsRate >= 20 ? 'positive' : snapshot.savingsRate >= 10 ? 'warning' : 'negative'
      },
      {
        label: 'Debt-to-income',
        value: snapshot.debtToIncomeRatio * 100,
        category: 'Ratios',
        format: 'percent',
        status: snapshot.debtToIncomeRatio <= 0.36 ? 'positive' : snapshot.debtToIncomeRatio <= 0.43 ? 'warning' : 'negative'
      },
      {
        label: 'Wealth ratio',
        value: snapshot.wealthRatio,
        category: 'Ratios',
        format: 'ratio',
        status: snapshot.wealthRatio >= 5 ? 'positive' : snapshot.wealthRatio >= 2 ? 'warning' : 'negative'
      }
    ]

    return list
  }, [aum.totalAUM, financialProfile.mortgageOutstanding, financialProfile.otherLiabilities, snapshot])

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return items
    return items.filter((item) => {
      return item.label.toLowerCase().includes(trimmed) || item.category.toLowerCase().includes(trimmed)
    })
  }, [items, query])

  const warnings = useMemo(() => {
    const list: string[] = []

    if (snapshot.annualIncome === 0 && snapshot.monthlyExpenses > 0) {
      list.push('Income is missing but expenses are recorded.')
    }
    if (snapshot.annualIncome > 0 && snapshot.annualExpenses > snapshot.annualIncome) {
      list.push('Annual expenses exceed annual income.')
    }
    if (snapshot.totalAssets > 0 && snapshot.totalLiabilities > snapshot.totalAssets) {
      list.push('Total liabilities exceed total assets.')
    }
    if (snapshot.propertyValue > 0 && (financialProfile.mortgageOutstanding ?? 0) > snapshot.propertyValue) {
      list.push('Mortgage outstanding exceeds property value.')
    }
    if (snapshot.liquidAssets > 0 && snapshot.emergencyFund > snapshot.liquidAssets) {
      list.push('Emergency fund exceeds liquid assets.')
    }
    if (snapshot.investmentAmount > 0 && snapshot.liquidAssets > 0 && snapshot.investmentAmount > snapshot.liquidAssets) {
      list.push('Investment amount exceeds liquid assets.')
    }
    if (
      financialProfile.netWorth !== undefined &&
      Math.abs(financialProfile.netWorth - snapshot.computedNetWorth) >
        Math.max(2000, Math.abs(snapshot.computedNetWorth) * 0.1)
    ) {
      list.push('Reported net worth does not align with calculated net worth.')
    }

    return list
  }, [financialProfile.mortgageOutstanding, financialProfile.netWorth, snapshot])

  const maxValue = useMemo(() => {
    const values = items.map((item) => Math.abs(item.value)).filter((value) => value > 0)
    return values.length > 0 ? Math.max(...values) : 1
  }, [items])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Numbers at a glance</CardTitle>
            <CardDescription>Key client financials synced from suitability.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{filteredItems.length} items</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen((prev) => !prev)}
              className="gap-2"
            >
              {isOpen ? 'Hide' : 'View'}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {!isOpen && (
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 md:grid-cols-3">
            <div className="rounded-md border border-gray-200 px-3 py-2">
              <p className="font-medium text-gray-800">Annual income</p>
              <p>{formatCurrency(snapshot.annualIncome)}</p>
            </div>
            <div className="rounded-md border border-gray-200 px-3 py-2">
              <p className="font-medium text-gray-800">Annual expenses</p>
              <p>{formatCurrency(snapshot.annualExpenses)}</p>
            </div>
            <div className="rounded-md border border-gray-200 px-3 py-2">
              <p className="font-medium text-gray-800">Net worth</p>
              <p>{formatCurrency(snapshot.netWorth)}</p>
            </div>
          </div>
        )}
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-sm">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search numbers or categories"
              />
            </div>
          </div>

          {warnings.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4 text-sm text-amber-800">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Scale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-gray-500">
                    No matching numbers.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const barWidth = Math.min(100, Math.round((Math.abs(item.value) / maxValue) * 100))
                  return (
                    <TableRow key={`${item.category}-${item.label}`}>
                      <TableCell className="font-medium text-gray-700">{item.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold',
                          item.status === 'positive' && 'text-green-600',
                          item.status === 'negative' && 'text-red-600',
                          item.status === 'warning' && 'text-amber-600'
                        )}
                      >
                        {formatValue(item)}
                      </TableCell>
                      <TableCell>
                        <div className="h-2 w-24 rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-2 rounded-full',
                              item.status === 'negative' ? 'bg-red-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                            )}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  )
}

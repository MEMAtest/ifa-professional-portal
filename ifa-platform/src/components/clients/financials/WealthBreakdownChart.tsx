'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { PieChart, Briefcase, Landmark, Home, Wallet, CreditCard, TrendingUp } from 'lucide-react'
import type { FinancialProfile } from '@/types/client'

interface WealthBreakdownChartProps {
  financialProfile: Partial<FinancialProfile>
  showLiabilities?: boolean
}

interface WealthCategory {
  label: string
  value: number
  color: string
  bgColor: string
  icon: typeof PieChart
  percentage: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`
  }
  return formatCurrency(value)
}

export function WealthBreakdownChart({ financialProfile, showLiabilities = true }: WealthBreakdownChartProps) {
  const { assets, liabilities, netWorth, categories } = useMemo(() => {
    const fp = financialProfile || {}

    // Calculate investment total
    const investmentTotal = (fp.existingInvestments || []).reduce(
      (sum, inv) => sum + (inv.currentValue || 0),
      0
    )

    // Calculate pension total
    const pensionTotal = (fp.pensionArrangements || []).reduce(
      (sum, p) => sum + (p.currentValue || 0),
      0
    )

    // Get other values
    const propertyValue = fp.propertyValue || 0
    const liquidAssets = fp.liquidAssets || 0
    const mortgageOutstanding = fp.mortgageOutstanding || 0
    const otherLiabilities = fp.otherLiabilities || 0

    // Calculate totals
    const totalAssets = investmentTotal + pensionTotal + propertyValue + liquidAssets
    const totalLiabilities = mortgageOutstanding + otherLiabilities
    const netWorth = totalAssets - totalLiabilities

    // Build categories for assets
    const assetCategories: WealthCategory[] = [
      {
        label: 'Investments',
        value: investmentTotal,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500',
        icon: Briefcase,
        percentage: totalAssets > 0 ? (investmentTotal / totalAssets) * 100 : 0
      },
      {
        label: 'Pensions',
        value: pensionTotal,
        color: 'text-purple-600',
        bgColor: 'bg-purple-500',
        icon: Landmark,
        percentage: totalAssets > 0 ? (pensionTotal / totalAssets) * 100 : 0
      },
      {
        label: 'Property',
        value: propertyValue,
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        icon: Home,
        percentage: totalAssets > 0 ? (propertyValue / totalAssets) * 100 : 0
      },
      {
        label: 'Cash & Savings',
        value: liquidAssets,
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        icon: Wallet,
        percentage: totalAssets > 0 ? (liquidAssets / totalAssets) * 100 : 0
      }
    ].filter(c => c.value > 0)

    // Build liability categories
    const liabilityCategories: WealthCategory[] = [
      {
        label: 'Mortgage',
        value: mortgageOutstanding,
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        icon: Home,
        percentage: totalLiabilities > 0 ? (mortgageOutstanding / totalLiabilities) * 100 : 0
      },
      {
        label: 'Other Debts',
        value: otherLiabilities,
        color: 'text-orange-600',
        bgColor: 'bg-orange-500',
        icon: CreditCard,
        percentage: totalLiabilities > 0 ? (otherLiabilities / totalLiabilities) * 100 : 0
      }
    ].filter(c => c.value > 0)

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      netWorth,
      categories: {
        assets: assetCategories,
        liabilities: liabilityCategories
      }
    }
  }, [financialProfile])

  if (assets === 0 && liabilities === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            Wealth Breakdown
          </CardTitle>
          <CardDescription>
            Asset allocation and net worth overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <PieChart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No financial data available</p>
            <p className="text-sm mt-1">Add investments, pensions, or savings to see wealth breakdown</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-blue-600" />
          Wealth Breakdown
        </CardTitle>
        <CardDescription>
          Asset allocation and net worth overview
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Net Worth Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <p className="text-xs text-green-600 font-medium">Total Assets</p>
            <p className="text-xl font-bold text-green-700">{formatCompact(assets)}</p>
          </div>
          {showLiabilities && liabilities > 0 && (
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-xs text-red-600 font-medium">Liabilities</p>
              <p className="text-xl font-bold text-red-700">-{formatCompact(liabilities)}</p>
            </div>
          )}
          <div className={`p-4 rounded-lg text-center ${netWorth >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <p className={`text-xs font-medium ${netWorth >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              Net Worth
            </p>
            <p className={`text-xl font-bold ${netWorth >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {formatCompact(netWorth)}
            </p>
          </div>
        </div>

        {/* Asset Distribution Bar */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Asset Distribution</p>
          <div className="h-6 flex rounded-lg overflow-hidden">
            {categories.assets.map((cat, index) => (
              <div
                key={cat.label}
                className={`${cat.bgColor} flex items-center justify-center transition-all`}
                style={{ width: `${cat.percentage}%` }}
                title={`${cat.label}: ${formatCurrency(cat.value)} (${cat.percentage.toFixed(1)}%)`}
              >
                {cat.percentage > 15 && (
                  <span className="text-white text-xs font-medium truncate px-1">
                    {cat.percentage.toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Asset Categories List */}
        <div className="space-y-3">
          {categories.assets.map((cat) => {
            const Icon = cat.icon
            return (
              <div key={cat.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded ${cat.bgColor}`}></div>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cat.color}`} />
                    <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(cat.value)}</p>
                  <p className="text-xs text-gray-500">{cat.percentage.toFixed(1)}%</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Liabilities Section */}
        {showLiabilities && categories.liabilities.length > 0 && (
          <>
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Liabilities</p>
              <div className="space-y-3">
                {categories.liabilities.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <div key={cat.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded ${cat.bgColor}`}></div>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${cat.color}`} />
                          <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">-{formatCurrency(cat.value)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Investment Breakdown (if investments exist) */}
        {(financialProfile.existingInvestments || []).length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Investment Breakdown</p>
            <div className="space-y-2">
              {(financialProfile.existingInvestments || []).map((inv, index) => (
                <div
                  key={inv.id || index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {inv.provider || 'Unknown Provider'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {inv.type?.replace(/_/g, ' ') || 'Investment'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(inv.currentValue)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pension Breakdown (if pensions exist) */}
        {(financialProfile.pensionArrangements || []).length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Pension Breakdown</p>
            <div className="space-y-2">
              {(financialProfile.pensionArrangements || []).map((pension, index) => (
                <div
                  key={pension.id || index}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {pension.provider || 'Unknown Provider'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {pension.type?.replace(/_/g, ' ') || 'Pension'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(pension.currentValue || 0)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

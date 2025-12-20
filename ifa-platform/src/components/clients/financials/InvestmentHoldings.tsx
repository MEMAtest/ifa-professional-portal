'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Briefcase, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import type { Investment } from '@/types/client'

interface InvestmentHoldingsProps {
  investments: Investment[]
  totalValue: number
  onAddInvestment?: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function getInvestmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    isa: 'ISA',
    pension: 'Pension',
    general_investment: 'General Investment',
    property: 'Property',
    savings: 'Savings',
    other: 'Other'
  }
  return labels[type] || type
}

function getInvestmentTypeColor(type: string): string {
  const colors: Record<string, string> = {
    isa: 'bg-blue-100 text-blue-700',
    pension: 'bg-purple-100 text-purple-700',
    general_investment: 'bg-green-100 text-green-700',
    property: 'bg-orange-100 text-orange-700',
    savings: 'bg-yellow-100 text-yellow-700',
    other: 'bg-gray-100 text-gray-700'
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

export function InvestmentHoldings({
  investments,
  totalValue,
  onAddInvestment
}: InvestmentHoldingsProps) {
  const sortedInvestments = [...investments].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Investment Holdings</CardTitle>
              <CardDescription>Current investment portfolio</CardDescription>
            </div>
          </div>
          {onAddInvestment && (
            <Button variant="outline" size="sm" onClick={onAddInvestment}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {investments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No investments recorded</p>
            {onAddInvestment && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onAddInvestment}>
                <Plus className="h-4 w-4 mr-1" />
                Add Investment
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
              <div className="col-span-4">Investment</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Provider</div>
              <div className="col-span-2 text-right">Value</div>
              <div className="col-span-2 text-right">% of Total</div>
            </div>

            {/* Investment Rows */}
            {sortedInvestments.map((investment) => {
              const percentage = totalValue > 0
                ? ((investment.currentValue || 0) / totalValue) * 100
                : 0

              return (
                <div
                  key={investment.id}
                  className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="col-span-4">
                    <p className="font-medium text-gray-900">
                      {investment.description || getInvestmentTypeLabel(investment.type)}
                    </p>
                    {investment.monthlyContribution && investment.monthlyContribution > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        +{formatCurrency(investment.monthlyContribution)}/month
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getInvestmentTypeColor(investment.type)}`}>
                      {getInvestmentTypeLabel(investment.type)}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-gray-600">
                    {investment.provider || '-'}
                  </div>
                  <div className="col-span-2 text-right font-medium">
                    {formatCurrency(investment.currentValue || 0)}
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Total Row */}
            <div className="grid grid-cols-12 gap-4 items-center pt-3 border-t-2 border-gray-200 font-semibold">
              <div className="col-span-4">Total</div>
              <div className="col-span-2"></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 text-right text-lg">
                {formatCurrency(totalValue)}
              </div>
              <div className="col-span-2 text-right text-gray-600">
                100%
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

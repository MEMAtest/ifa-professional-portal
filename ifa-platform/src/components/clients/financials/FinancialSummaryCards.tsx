'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { PoundSterling, TrendingUp, Wallet, CreditCard } from 'lucide-react'
import type { AUMBreakdown } from '@/lib/financials/aumCalculator'

interface FinancialSummaryCardsProps {
  aum: AUMBreakdown
  annualIncome: number
  monthlyExpenses: number
  netWorth: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function FinancialSummaryCards({
  aum,
  annualIncome,
  monthlyExpenses,
  netWorth
}: FinancialSummaryCardsProps) {
  const cards = [
    {
      title: 'Assets Under Management',
      value: aum.totalAUM,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: `${aum.breakdown.length} asset categories`
    },
    {
      title: 'Net Worth',
      value: netWorth,
      icon: PoundSterling,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: 'Total assets minus liabilities'
    },
    {
      title: 'Annual Income',
      value: annualIncome,
      icon: Wallet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: `${formatCurrency(annualIncome / 12)}/month`
    },
    {
      title: 'Monthly Expenses',
      value: monthlyExpenses,
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      subtitle: `${formatCurrency(monthlyExpenses * 12)}/year`
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(card.value)}</p>
                <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

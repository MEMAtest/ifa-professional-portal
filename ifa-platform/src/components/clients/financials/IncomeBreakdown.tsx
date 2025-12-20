'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Wallet, TrendingUp, Home, Coins, FileText } from 'lucide-react'

interface IncomeSource {
  label: string
  amount: number
  frequency: 'annual' | 'monthly'
  icon: typeof Wallet
  color: string
}

interface IncomeBreakdownProps {
  annualIncome: number
  employmentIncome?: number
  pensionIncome?: number
  rentalIncome?: number
  investmentIncome?: number
  otherIncome?: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function IncomeBreakdown({
  annualIncome,
  employmentIncome = 0,
  pensionIncome = 0,
  rentalIncome = 0,
  investmentIncome = 0,
  otherIncome = 0
}: IncomeBreakdownProps) {
  // If no breakdown provided, use total as employment income
  const hasBreakdown = employmentIncome > 0 || pensionIncome > 0 || rentalIncome > 0 || investmentIncome > 0 || otherIncome > 0
  const effectiveEmployment = hasBreakdown ? employmentIncome : annualIncome

  const sources: IncomeSource[] = [
    { label: 'Employment', amount: effectiveEmployment, frequency: 'annual' as const, icon: Wallet, color: 'bg-blue-500' },
    { label: 'Pension', amount: pensionIncome, frequency: 'annual' as const, icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Rental', amount: rentalIncome, frequency: 'annual' as const, icon: Home, color: 'bg-green-500' },
    { label: 'Investment', amount: investmentIncome, frequency: 'annual' as const, icon: Coins, color: 'bg-orange-500' },
    { label: 'Other', amount: otherIncome, frequency: 'annual' as const, icon: FileText, color: 'bg-gray-500' }
  ].filter(s => s.amount > 0)

  const totalIncome = sources.reduce((sum, s) => sum + s.amount, 0) || annualIncome

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-green-600" />
          <div>
            <CardTitle>Income Breakdown</CardTitle>
            <CardDescription>Annual income sources</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Income Header */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-green-700">Total Annual Income</span>
            <span className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)}</span>
          </div>

          {/* Income Sources */}
          <div className="space-y-3">
            {sources.map((source) => {
              const percentage = totalIncome > 0 ? (source.amount / totalIncome) * 100 : 0
              const Icon = source.icon

              return (
                <div key={source.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${source.color.replace('bg-', 'bg-').replace('-500', '-100')}`}>
                        <Icon className={`h-4 w-4 ${source.color.replace('bg-', 'text-')}`} />
                      </div>
                      <span className="font-medium text-gray-700">{source.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(source.amount)}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(source.amount / 12)}/mo</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${source.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {sources.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No income breakdown available</p>
              <p className="text-xs mt-1">Total annual income: {formatCurrency(annualIncome)}</p>
            </div>
          )}

          {/* Monthly Summary */}
          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monthly Gross</span>
              <span className="font-medium">{formatCurrency(totalIncome / 12)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { CreditCard, Home, Car, ShoppingCart, Utensils, Zap, Users, MoreHorizontal } from 'lucide-react'

interface ExpenseCategory {
  label: string
  amount: number
  icon: typeof CreditCard
  color: string
  isEssential: boolean
}

interface ExpenseBreakdownProps {
  monthlyExpenses: number
  housing?: number
  utilities?: number
  transport?: number
  food?: number
  insurance?: number
  childcare?: number
  discretionary?: number
  other?: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function ExpenseBreakdown({
  monthlyExpenses,
  housing = 0,
  utilities = 0,
  transport = 0,
  food = 0,
  insurance = 0,
  childcare = 0,
  discretionary = 0,
  other = 0
}: ExpenseBreakdownProps) {
  // If no breakdown provided, show total as "General Expenses"
  const hasBreakdown = housing > 0 || utilities > 0 || transport > 0 || food > 0 || insurance > 0

  const categories: ExpenseCategory[] = hasBreakdown
    ? [
        { label: 'Housing', amount: housing, icon: Home, color: 'bg-blue-500', isEssential: true },
        { label: 'Utilities', amount: utilities, icon: Zap, color: 'bg-yellow-500', isEssential: true },
        { label: 'Transport', amount: transport, icon: Car, color: 'bg-purple-500', isEssential: true },
        { label: 'Food & Groceries', amount: food, icon: Utensils, color: 'bg-green-500', isEssential: true },
        { label: 'Insurance', amount: insurance, icon: CreditCard, color: 'bg-red-500', isEssential: true },
        { label: 'Childcare', amount: childcare, icon: Users, color: 'bg-pink-500', isEssential: true },
        { label: 'Discretionary', amount: discretionary, icon: ShoppingCart, color: 'bg-orange-500', isEssential: false },
        { label: 'Other', amount: other, icon: MoreHorizontal, color: 'bg-gray-500', isEssential: false }
      ].filter(c => c.amount > 0)
    : [{ label: 'Monthly Expenses', amount: monthlyExpenses, icon: CreditCard, color: 'bg-orange-500', isEssential: true }]

  const totalExpenses = hasBreakdown
    ? categories.reduce((sum, c) => sum + c.amount, 0)
    : monthlyExpenses

  const essentialExpenses = categories.filter(c => c.isEssential).reduce((sum, c) => sum + c.amount, 0)
  const discretionaryExpenses = categories.filter(c => !c.isEssential).reduce((sum, c) => sum + c.amount, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          <div>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Monthly outgoings by category</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Expenses Header */}
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
            <span className="text-sm font-medium text-orange-700">Total Monthly Expenses</span>
            <span className="text-2xl font-bold text-orange-700">{formatCurrency(totalExpenses)}</span>
          </div>

          {/* Essential vs Discretionary Summary */}
          {hasBreakdown && discretionaryExpenses > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Essential</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(essentialExpenses)}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600 font-medium">Discretionary</p>
                <p className="text-lg font-bold text-orange-700">{formatCurrency(discretionaryExpenses)}</p>
              </div>
            </div>
          )}

          {/* Expense Categories */}
          <div className="space-y-3">
            {categories.map((category) => {
              const percentage = totalExpenses > 0 ? (category.amount / totalExpenses) * 100 : 0
              const Icon = category.icon

              return (
                <div key={category.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${category.color.replace('bg-', 'bg-').replace('-500', '-100')}`}>
                        <Icon className={`h-4 w-4 ${category.color.replace('bg-', 'text-')}`} />
                      </div>
                      <span className="font-medium text-gray-700">{category.label}</span>
                      {!category.isEssential && (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded">
                          Optional
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(category.amount)}</p>
                      <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${category.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Annual Summary */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Annual Total</span>
              <span className="font-medium">{formatCurrency(totalExpenses * 12)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

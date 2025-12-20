'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Activity, TrendingUp, Wallet, Scale, AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface FinancialHealthScoreProps {
  savingsRate: number      // % of income saved
  liquidityRatio: number   // months of expenses covered
  wealthRatio: number      // net worth as multiple of income
  debtToIncomeRatio: number // total debt as multiple of income
}

function getScoreColor(score: number, thresholds: { good: number; warning: number }): string {
  if (score >= thresholds.good) return 'text-green-600'
  if (score >= thresholds.warning) return 'text-yellow-600'
  return 'text-red-600'
}

function getProgressColor(score: number, thresholds: { good: number; warning: number }): string {
  if (score >= thresholds.good) return 'bg-green-500'
  if (score >= thresholds.warning) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getScoreIcon(score: number, thresholds: { good: number; warning: number }) {
  if (score >= thresholds.good) return CheckCircle
  if (score >= thresholds.warning) return Info
  return AlertTriangle
}

function calculateOverallScore(props: FinancialHealthScoreProps): number {
  // Weight each metric and calculate overall score (0-100)
  const { savingsRate, liquidityRatio, wealthRatio, debtToIncomeRatio } = props

  // Savings rate score (target: 20%, max score at 30%+)
  const savingsScore = Math.min(100, (savingsRate / 30) * 100)

  // Liquidity score (target: 6 months, max score at 12 months)
  const liquidityScore = Math.min(100, (liquidityRatio / 12) * 100)

  // Wealth score (target: 5x income, max score at 10x)
  const wealthScore = Math.min(100, (wealthRatio / 10) * 100)

  // Debt score (inverse - lower is better, 0 debt = 100, 3x+ = 0)
  const debtScore = Math.max(0, 100 - (debtToIncomeRatio / 3) * 100)

  // Weighted average (savings and liquidity most important)
  return Math.round((savingsScore * 0.3) + (liquidityScore * 0.3) + (wealthScore * 0.25) + (debtScore * 0.15))
}

function getOverallGrade(score: number): { grade: string; label: string; color: string } {
  if (score >= 80) return { grade: 'A', label: 'Excellent', color: 'text-green-600' }
  if (score >= 60) return { grade: 'B', label: 'Good', color: 'text-blue-600' }
  if (score >= 40) return { grade: 'C', label: 'Fair', color: 'text-yellow-600' }
  if (score >= 20) return { grade: 'D', label: 'Needs Work', color: 'text-orange-600' }
  return { grade: 'F', label: 'Critical', color: 'text-red-600' }
}

export function FinancialHealthScore({
  savingsRate,
  liquidityRatio,
  wealthRatio,
  debtToIncomeRatio
}: FinancialHealthScoreProps) {
  const overallScore = calculateOverallScore({ savingsRate, liquidityRatio, wealthRatio, debtToIncomeRatio })
  const grade = getOverallGrade(overallScore)

  const metrics = [
    {
      label: 'Savings Rate',
      value: `${savingsRate}%`,
      target: '20%+ recommended',
      score: savingsRate,
      thresholds: { good: 20, warning: 10 },
      icon: Wallet,
      description: 'Percentage of income saved'
    },
    {
      label: 'Emergency Fund',
      value: `${liquidityRatio} months`,
      target: '6+ months recommended',
      score: liquidityRatio,
      thresholds: { good: 6, warning: 3 },
      maxScore: 12,
      icon: TrendingUp,
      description: 'Expenses covered by liquid assets'
    },
    {
      label: 'Wealth Ratio',
      value: `${wealthRatio}x`,
      target: '10x income by retirement',
      score: wealthRatio,
      thresholds: { good: 5, warning: 2 },
      maxScore: 10,
      icon: Scale,
      description: 'Net worth relative to annual income'
    },
    {
      label: 'Debt-to-Income',
      value: `${(debtToIncomeRatio * 100).toFixed(0)}%`,
      target: 'Below 36% recommended',
      score: debtToIncomeRatio <= 0.36 ? 100 : debtToIncomeRatio <= 0.43 ? 50 : 0,
      thresholds: { good: 75, warning: 40 },
      icon: Activity,
      description: 'Total debt as percentage of income',
      isInverse: true
    }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Financial Health Score</CardTitle>
              <CardDescription>Key financial wellness indicators</CardDescription>
            </div>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${grade.color}`}>{grade.grade}</div>
            <div className={`text-xs font-medium ${grade.color}`}>{grade.label}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Score Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Overall Score</span>
              <span className="font-bold">{overallScore}/100</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallScore >= 60 ? 'bg-green-500' : overallScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${overallScore}%` }}
              />
            </div>
          </div>

          {/* Individual Metrics */}
          <div className="space-y-4">
            {metrics.map((metric) => {
              const Icon = metric.icon
              const StatusIcon = getScoreIcon(metric.score, metric.thresholds)
              const maxScore = metric.maxScore || 100
              const progressWidth = Math.min(100, (metric.score / maxScore) * 100)

              return (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${getScoreColor(metric.score, metric.thresholds)}`}>
                        {metric.value}
                      </span>
                      <StatusIcon className={`h-4 w-4 ${getScoreColor(metric.score, metric.thresholds)}`} />
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(metric.score, metric.thresholds)}`}
                      style={{ width: `${metric.isInverse ? 100 - progressWidth : progressWidth}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{metric.target}</p>
                </div>
              )
            })}
          </div>

          {/* Recommendations */}
          {overallScore < 60 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                {savingsRate < 20 && (
                  <li>• Aim to save at least 20% of income</li>
                )}
                {liquidityRatio < 6 && (
                  <li>• Build emergency fund to cover 6 months of expenses</li>
                )}
                {debtToIncomeRatio > 0.36 && (
                  <li>• Consider debt reduction strategies</li>
                )}
                {wealthRatio < 2 && (
                  <li>• Focus on long-term wealth building through regular investing</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

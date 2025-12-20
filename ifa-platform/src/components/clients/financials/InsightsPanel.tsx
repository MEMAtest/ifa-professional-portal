'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Lightbulb,
  Calendar,
  AlertTriangle,
  Shield,
  Scale,
  Wallet,
  Clock,
  Calculator,
  Heart,
  Info,
  ChevronRight,
  Eye
} from 'lucide-react'
import type { Client } from '@/types/client'
import {
  generateFirmInsights,
  getInsightPriorityColor,
  getInsightCategoryLabel,
  type FinancialInsight,
  type InsightsSummary,
  type InsightCategory
} from '@/lib/financials/insightsEngine'

interface InsightsPanelProps {
  clients: Client[]
  maxInsights?: number
  showSummary?: boolean
}

const CategoryIcon: Record<InsightCategory, typeof Lightbulb> = {
  review_due: Calendar,
  concentration_risk: AlertTriangle,
  protection_gap: Shield,
  rebalancing: Scale,
  cash_drag: Wallet,
  retirement_planning: Clock,
  fee_optimization: Calculator,
  vulnerability: Heart
}

function InsightCard({ insight, onView }: { insight: FinancialInsight; onView?: () => void }) {
  const Icon = CategoryIcon[insight.category] || Info

  return (
    <div
      className={`p-4 rounded-lg border ${getInsightPriorityColor(insight.priority)} transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{insight.title}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-current/10 whitespace-nowrap">
              {getInsightCategoryLabel(insight.category)}
            </span>
          </div>
          <p className="text-sm mt-1 opacity-90 line-clamp-2">{insight.description}</p>
          {insight.metric && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="font-medium">{insight.metric.label}:</span>
              <span>{insight.metric.value}</span>
              {insight.metric.threshold && (
                <span className="opacity-75">(threshold: {insight.metric.threshold})</span>
              )}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs opacity-75 truncate flex-1">
              {insight.actionRequired}
            </p>
            {insight.clientId && onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                className="ml-2 h-7 px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function InsightsPanel({ clients, maxInsights = 10, showSummary = true }: InsightsPanelProps) {
  const router = useRouter()

  const summary = useMemo(() => generateFirmInsights(clients), [clients])

  const displayInsights = summary.insights.slice(0, maxInsights)

  if (summary.totalInsights === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Actionable Insights
          </CardTitle>
          <CardDescription>
            Recommendations and action items for your client base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No insights at this time</p>
            <p className="text-sm mt-1">
              Insights will appear when client data indicates action is needed
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Actionable Insights
        </CardTitle>
        <CardDescription>
          {summary.totalInsights} recommendations for your client base
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Priority Summary */}
        {showSummary && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-700">{summary.byPriority.high}</p>
              <p className="text-xs text-red-600">High Priority</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-700">{summary.byPriority.medium}</p>
              <p className="text-xs text-amber-600">Medium Priority</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-700">{summary.byPriority.low}</p>
              <p className="text-xs text-blue-600">Low Priority</p>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {showSummary && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.byCategory)
              .filter(([_, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const Icon = CategoryIcon[category as InsightCategory] || Info
                return (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                  >
                    <Icon className="h-3 w-3" />
                    {getInsightCategoryLabel(category as InsightCategory)}: {count}
                  </span>
                )
              })}
          </div>
        )}

        {/* Insights List */}
        <div className="space-y-3">
          {displayInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onView={
                insight.clientId
                  ? () => router.push(`/clients/${insight.clientId}?tab=financial`)
                  : undefined
              }
            />
          ))}
        </div>

        {/* Show More */}
        {summary.totalInsights > maxInsights && (
          <div className="pt-2 text-center">
            <Button variant="outline" size="sm" className="gap-1">
              View All {summary.totalInsights} Insights
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

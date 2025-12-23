'use client'

import { useState, useMemo } from 'react'
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
  Eye,
  X,
  ExternalLink,
  Filter
} from 'lucide-react'
import type { Client } from '@/types/client'
import {
  generateFirmInsights,
  getInsightPriorityColor,
  getInsightCategoryLabel,
  type FinancialInsight,
  type InsightsSummary,
  type InsightCategory,
  type InsightPriority
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

type PriorityFilter = 'all' | InsightPriority

// Insight Detail Modal Component
function InsightDetailModal({
  insight,
  onClose,
  onViewClient
}: {
  insight: FinancialInsight
  onClose: () => void
  onViewClient?: () => void
}) {
  const Icon = CategoryIcon[insight.category] || Info

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-4 rounded-t-xl ${getInsightPriorityColor(insight.priority)}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-medium uppercase opacity-80">
                  {insight.priority} Priority
                </span>
                <h3 className="font-semibold text-lg">{insight.title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Category Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
              {getInsightCategoryLabel(insight.category)}
            </span>
            {insight.clientName && (
              <span className="px-3 py-1 bg-blue-100 rounded-full text-sm font-medium text-blue-700">
                {insight.clientName}
              </span>
            )}
          </div>

          {/* Description - Full, not truncated */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Description</h4>
            <p className="text-gray-700">{insight.description}</p>
          </div>

          {/* Metric Details */}
          {insight.metric && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Key Metric</h4>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{insight.metric.label}</span>
                <span className="font-bold text-lg">{insight.metric.value}</span>
              </div>
              {insight.metric.threshold && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Threshold</span>
                  <span className="text-gray-700">{insight.metric.threshold}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Required */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h4 className="text-sm font-semibold text-amber-800 uppercase mb-1">Action Required</h4>
            <p className="text-amber-900">{insight.actionRequired}</p>
          </div>

          {/* Suggested Next Steps */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Suggested Next Steps</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-gray-700">
                <ChevronRight className="h-4 w-4 mt-1 text-blue-500 flex-shrink-0" />
                Schedule a review meeting with the client
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <ChevronRight className="h-4 w-4 mt-1 text-blue-500 flex-shrink-0" />
                Document the issue and proposed solution
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <ChevronRight className="h-4 w-4 mt-1 text-blue-500 flex-shrink-0" />
                Update client records after resolution
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {insight.clientId && onViewClient && (
            <Button onClick={onViewClient} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Client
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function InsightCard({
  insight,
  onView,
  onShowDetail
}: {
  insight: FinancialInsight
  onView?: () => void
  onShowDetail: () => void
}) {
  const Icon = CategoryIcon[insight.category] || Info

  return (
    <div
      onClick={onShowDetail}
      className={`p-4 rounded-lg border ${getInsightPriorityColor(insight.priority)} transition-all hover:shadow-md cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-current/10 whitespace-nowrap">
              {getInsightCategoryLabel(insight.category)}
            </span>
          </div>
          <p className="text-sm mt-1 opacity-90">{insight.description}</p>
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
            <p className="text-xs opacity-75 flex-1">
              {insight.actionRequired}
            </p>
            {insight.clientId && onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onView()
                }}
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
  const [selectedPriority, setSelectedPriority] = useState<PriorityFilter | null>(null) // null = no filter selected, insights hidden
  const [selectedInsight, setSelectedInsight] = useState<FinancialInsight | null>(null)
  const [showAll, setShowAll] = useState(false)

  const summary = useMemo(() => generateFirmInsights(clients), [clients])

  // Filter insights based on selected priority - only show when a priority is selected
  const filteredInsights = useMemo(() => {
    if (selectedPriority === null) {
      return [] // Don't show insights until user clicks a priority
    }
    if (selectedPriority === 'all') {
      return summary.insights
    }
    return summary.insights.filter(i => i.priority === selectedPriority)
  }, [summary.insights, selectedPriority])

  const displayInsights = showAll ? filteredInsights : filteredInsights.slice(0, maxInsights)

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Actionable Insights
              </CardTitle>
              <CardDescription>
                {summary.totalInsights} recommendations for your client base
                {selectedPriority !== null && (
                  <span className="ml-2 text-blue-600">
                    (Showing {filteredInsights.length} {selectedPriority === 'all' ? '' : selectedPriority + ' priority'} insights)
                  </span>
                )}
                {selectedPriority === null && (
                  <span className="ml-2 text-gray-500">
                    — Click a priority below to view
                  </span>
                )}
              </CardDescription>
            </div>
            {selectedPriority !== null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPriority(null)}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Hide Insights
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Priority Summary - Clickable */}
          {showSummary && (
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedPriority(selectedPriority === 'high' ? null : 'high')}
                className={`p-3 bg-red-50 rounded-lg text-center transition-all hover:bg-red-100 ${
                  selectedPriority === 'high' ? 'ring-2 ring-red-500 ring-offset-2' : ''
                }`}
              >
                <p className="text-2xl font-bold text-red-700">{summary.byPriority.high}</p>
                <p className="text-xs text-red-600">High Priority</p>
              </button>
              <button
                onClick={() => setSelectedPriority(selectedPriority === 'medium' ? null : 'medium')}
                className={`p-3 bg-amber-50 rounded-lg text-center transition-all hover:bg-amber-100 ${
                  selectedPriority === 'medium' ? 'ring-2 ring-amber-500 ring-offset-2' : ''
                }`}
              >
                <p className="text-2xl font-bold text-amber-700">{summary.byPriority.medium}</p>
                <p className="text-xs text-amber-600">Medium Priority</p>
              </button>
              <button
                onClick={() => setSelectedPriority(selectedPriority === 'low' ? null : 'low')}
                className={`p-3 bg-blue-50 rounded-lg text-center transition-all hover:bg-blue-100 ${
                  selectedPriority === 'low' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
              >
                <p className="text-2xl font-bold text-blue-700">{summary.byPriority.low}</p>
                <p className="text-xs text-blue-600">Low Priority</p>
              </button>
            </div>
          )}

          {/* Category Breakdown - only show when insights are visible */}
          {showSummary && selectedPriority !== null && (
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
          {selectedPriority === null ? (
            <div className="text-center py-6 text-gray-500">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Select a priority above to view insights</p>
              <p className="text-xs mt-1">Click on High, Medium, or Low to filter and display recommendations</p>
            </div>
          ) : filteredInsights.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No {selectedPriority} priority insights</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSelectedPriority('all')}
                className="mt-1"
              >
                Show all insights
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onShowDetail={() => setSelectedInsight(insight)}
                  onView={
                    insight.clientId
                      ? () => router.push(`/clients/${insight.clientId}?tab=financial`)
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {/* Show More / Show Less */}
          {filteredInsights.length > maxInsights && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>Show Less</>
                ) : (
                  <>
                    View All {filteredInsights.length} Insights
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedInsight && (
        <InsightDetailModal
          insight={selectedInsight}
          onClose={() => setSelectedInsight(null)}
          onViewClient={
            selectedInsight.clientId
              ? () => {
                  router.push(`/clients/${selectedInsight.clientId}?tab=financial`)
                  setSelectedInsight(null)
                }
              : undefined
          }
        />
      )}
    </>
  )
}

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, CheckCircle, ArrowRight, Users, TrendingUp, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { ClientReviewFlag, MarketConditions } from '@/services/FirmAnalyticsService'

interface MarketImpactPanelProps {
  marketConditions: MarketConditions
  clientsNeedingReview: ClientReviewFlag[]
  onViewClient?: (clientId: string) => void
}

export function MarketImpactPanel({
  marketConditions,
  clientsNeedingReview,
  onViewClient
}: MarketImpactPanelProps) {
  const router = useRouter()
  const highPriorityCount = clientsNeedingReview.filter(c => c.priority === 'high').length
  const mediumPriorityCount = clientsNeedingReview.filter(c => c.priority === 'medium').length
  const lowPriorityCount = clientsNeedingReview.filter(c => c.priority === 'low').length

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'medium': return <Clock className="h-4 w-4 text-amber-500" />
      case 'low': return <TrendingUp className="h-4 w-4 text-blue-500" />
    }
  }

  const getRiskProfileLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: 'Cautious',
      2: 'Conservative',
      3: 'Balanced',
      4: 'Growth',
      5: 'Aggressive'
    }
    return labels[level] || 'Unknown'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Clients Needing Review
            </CardTitle>
            <CardDescription>
              Based on current market conditions
            </CardDescription>
          </div>
          {clientsNeedingReview.length > 0 && (
            <div className="flex items-center gap-2">
              {highPriorityCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                  {highPriorityCount} High
                </span>
              )}
              {mediumPriorityCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  {mediumPriorityCount} Medium
                </span>
              )}
              {lowPriorityCount > 0 && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {lowPriorityCount} Low
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Market Context */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Market Context</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">FTSE Trend</p>
              <p className={`text-sm font-medium ${
                marketConditions.ftse100.changePercent > 0 ? 'text-green-600' :
                marketConditions.ftse100.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {marketConditions.ftse100.changePercent > 0 ? 'Positive' :
                 marketConditions.ftse100.changePercent < 0 ? 'Negative' : 'Neutral'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Rate Environment</p>
              <p className={`text-sm font-medium ${
                marketConditions.boeRate.value >= 5 ? 'text-green-600' :
                marketConditions.boeRate.value <= 2 ? 'text-amber-600' : 'text-gray-600'
              }`}>
                {marketConditions.boeRate.value >= 5 ? 'High Rates' :
                 marketConditions.boeRate.value <= 2 ? 'Low Rates' : 'Moderate'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Inflation</p>
              <p className={`text-sm font-medium ${
                marketConditions.inflation.value > 3 ? 'text-red-600' :
                marketConditions.inflation.value <= 2 ? 'text-green-600' : 'text-amber-600'
              }`}>
                {marketConditions.inflation.value > 3 ? 'Elevated' :
                 marketConditions.inflation.value <= 2 ? 'Contained' : 'Near Target'}
              </p>
            </div>
          </div>
        </div>

        {/* Client Review List */}
        {clientsNeedingReview.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {clientsNeedingReview.slice(0, 10).map((client, index) => (
              <div
                key={`${client.clientId}-${index}`}
                className={`p-3 rounded-lg border ${getPriorityColor(client.priority)} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getPriorityIcon(client.priority)}
                      <span className="font-medium text-gray-900 truncate">
                        {client.clientName}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-white/50 rounded-full">
                        {getRiskProfileLabel(client.riskProfile)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{client.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      AUM: {formatCurrency(client.aum)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onViewClient?.(client.clientId)
                      router.push(`/clients/${client.clientId}`)
                    }}
                    className="flex-shrink-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {clientsNeedingReview.length > 10 && (
              <p className="text-center text-sm text-gray-500 py-2">
                +{clientsNeedingReview.length - 10} more clients
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-gray-900">All Clients in Good Standing</p>
            <p className="text-sm text-gray-500 mt-1">
              Current market conditions do not require immediate client reviews
            </p>
          </div>
        )}

        {/* Quick Actions */}
        {clientsNeedingReview.length > 0 && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push('/clients')}>
              View All Clients
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/stress-testing')}>
              Run Stress Tests
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/monte-carlo')}>
              Monte Carlo Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MarketImpactPanel

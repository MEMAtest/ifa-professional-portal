'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  User,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Calculator,
  BarChart3,
  FileText,
  RefreshCw,
  Percent,
  PoundSterling,
  PieChart,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { FirmAnalyticsService, type ImpactDetails, type MarketConditions } from '@/services/FirmAnalyticsService'
import type { Client } from '@/types/client'
import type { ClientAUM } from '@/lib/financials/aumCalculator'

interface ClientMarketViewProps {
  clientId: string
  onClose?: () => void
}

interface ClientAnalytics {
  client: Client | null
  aum: ClientAUM | null
  marketImpact: {
    inflationImpact: string
    rateImpact: string
    equityImpact: string
    recommendations: string[]
  }
  detailedImpact: {
    rateDetails: ImpactDetails
    inflationDetails: ImpactDetails
    equityDetails: ImpactDetails
    portfolio: { equities: number; bonds: number; cash: number; total: number }
  } | null
  marketConditions: MarketConditions | null
}

const impactLevelColors = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    icon: 'text-red-500'
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-500'
  },
  low: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
    icon: 'text-green-500'
  }
}

export function ClientMarketView({ clientId, onClose }: ClientMarketViewProps) {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<'rate' | 'inflation' | 'equity' | null>(null)

  useEffect(() => {
    async function fetchClientAnalytics() {
      try {
        setLoading(true)
        setError(null)
        const data = await FirmAnalyticsService.getClientAnalytics(clientId)
        setAnalytics(data)
      } catch (err) {
        setError('Failed to load client analytics')
        console.error('Error fetching client analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    if (clientId) {
      fetchClientAnalytics()
    }
  }, [clientId])

  const getRiskProfileLabel = (level: number) => {
    const labels: Record<number, { label: string; color: string }> = {
      1: { label: 'Cautious', color: 'bg-green-100 text-green-800' },
      2: { label: 'Conservative', color: 'bg-lime-100 text-lime-800' },
      3: { label: 'Balanced', color: 'bg-amber-100 text-amber-800' },
      4: { label: 'Growth', color: 'bg-orange-100 text-orange-800' },
      5: { label: 'Aggressive', color: 'bg-red-100 text-red-800' }
    }
    return labels[level] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' }
  }

  const toggleSection = (section: 'rate' | 'inflation' | 'equity') => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
            <p className="text-gray-500">Loading client analytics...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !analytics?.client) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
            <p className="text-gray-900 font-medium">
              {error || 'Client not found'}
            </p>
            {onClose && (
              <Button onClick={onClose} variant="secondary" size="sm" className="mt-3">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const { client, aum, detailedImpact, marketConditions } = analytics
  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Unknown'
  const riskLevel = client.riskProfile?.attitudeToRisk || client.riskProfile?.assessmentScore || 3
  const riskInfo = getRiskProfileLabel(riskLevel)

  // Render a detailed impact section
  const renderImpactSection = (
    type: 'rate' | 'inflation' | 'equity',
    title: string,
    icon: React.ReactNode,
    details: ImpactDetails | undefined,
    currentValue?: string
  ) => {
    if (!details) return null

    const colors = impactLevelColors[details.level]
    const isExpanded = expandedSection === type

    return (
      <div className={`rounded-lg border-2 overflow-hidden ${colors.border}`}>
        <button
          onClick={() => toggleSection(type)}
          className={`w-full p-4 flex items-center justify-between ${colors.bg} hover:brightness-95 transition-all`}
        >
          <div className="flex items-center gap-3">
            <div className={colors.icon}>{icon}</div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900">{title}</h4>
              {currentValue && (
                <p className="text-sm text-gray-600">{currentValue}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${colors.badge}`}>
              {details.level} Impact
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 bg-white border-t space-y-4">
            {/* Exposure Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Exposure</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(details.exposure)}
                </p>
                <p className="text-xs text-gray-500">
                  ({details.exposurePercent.toFixed(1)}% of portfolio)
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Estimated Impact</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(details.estimatedImpact)}
                </p>
                <p className="text-xs text-gray-500">per year</p>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Analysis</p>
                  <p className="text-sm text-blue-800">{details.explanation}</p>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">Recommendation</p>
                  <p className="text-sm text-green-800">{details.recommendation}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{clientName}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskInfo.color}`}>
                  {riskInfo.label}
                </span>
                {aum && (
                  <span className="text-gray-500">
                    AUM: {formatCurrency(aum.aum)}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm">
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Current Market Conditions */}
        {marketConditions && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Market Conditions</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-500">BoE Rate</p>
                <p className="text-lg font-bold text-gray-900">{marketConditions.boeRate.value.toFixed(2)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Inflation (CPI)</p>
                <p className="text-lg font-bold text-gray-900">{marketConditions.inflation.value.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">FTSE 100</p>
                <p className={`text-lg font-bold ${marketConditions.ftse100.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {marketConditions.ftse100.changePercent >= 0 ? '+' : ''}{marketConditions.ftse100.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Breakdown */}
        {detailedImpact?.portfolio && detailedImpact.portfolio.total > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Portfolio Allocation
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-xs text-blue-600 mb-1">Equities</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(detailedImpact.portfolio.equities)}
                </p>
                <p className="text-xs text-gray-500">
                  {((detailedImpact.portfolio.equities / detailedImpact.portfolio.total) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-xs text-purple-600 mb-1">Bonds</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(detailedImpact.portfolio.bonds)}
                </p>
                <p className="text-xs text-gray-500">
                  {((detailedImpact.portfolio.bonds / detailedImpact.portfolio.total) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-xs text-green-600 mb-1">Cash</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(detailedImpact.portfolio.cash)}
                </p>
                <p className="text-xs text-gray-500">
                  {((detailedImpact.portfolio.cash / detailedImpact.portfolio.total) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Impact Analysis */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Market Impact Analysis
            <span className="text-xs font-normal text-gray-500">(click to expand)</span>
          </h3>
          <div className="space-y-3">
            {renderImpactSection(
              'rate',
              'Interest Rate Impact',
              <Percent className="h-5 w-5" />,
              detailedImpact?.rateDetails,
              marketConditions ? `Current BoE Rate: ${marketConditions.boeRate.value.toFixed(2)}%` : undefined
            )}
            {renderImpactSection(
              'inflation',
              'Inflation Impact',
              <TrendingUp className="h-5 w-5" />,
              detailedImpact?.inflationDetails,
              marketConditions ? `Current CPI: ${marketConditions.inflation.value.toFixed(1)}%` : undefined
            )}
            {renderImpactSection(
              'equity',
              'Equity Market Impact',
              <BarChart3 className="h-5 w-5" />,
              detailedImpact?.equityDetails,
              marketConditions ? `FTSE 100: ${marketConditions.ftse100.changePercent >= 0 ? '+' : ''}${marketConditions.ftse100.changePercent.toFixed(2)}%` : undefined
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/stress-testing?clientId=${clientId}`)}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Run Stress Test
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/monte-carlo?clientId=${clientId}`)}
            >
              <Calculator className="h-4 w-4 mr-1" />
              Monte Carlo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/cashflow?clientId=${clientId}`)}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Cash Flow
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/clients/${clientId}`)}
            >
              <FileText className="h-4 w-4 mr-1" />
              View Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ClientMarketView

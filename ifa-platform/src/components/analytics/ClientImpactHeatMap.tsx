'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  Percent,
  BarChart3,
  Users,
  AlertCircle,
  X,
  HelpCircle,
  Eye
} from 'lucide-react'

// Explanations for each impact type
const IMPACT_EXPLANATIONS = {
  rate: {
    title: 'Interest Rate Impact',
    description: 'Measures how sensitive a client\'s portfolio is to changes in the Bank of England base rate.',
    whatItMeasures: 'Bond holdings duration exposure. Clients with high bond allocations and longer durations are more sensitive.',
    highMeans: 'Portfolio could lose 5%+ if rates rise 1%. Needs review of fixed income strategy.',
    mediumMeans: 'Moderate sensitivity. Monitor but no immediate action needed.',
    lowMeans: 'Well-protected from rate changes or minimal bond exposure.'
  },
  inflation: {
    title: 'Inflation Impact',
    description: 'Measures how much purchasing power erosion affects a client\'s portfolio.',
    whatItMeasures: 'Cash and short-term fixed income holdings as a % of total portfolio.',
    highMeans: 'Large cash holdings (>30%) losing real value annually. Consider inflation-linked assets.',
    mediumMeans: 'Some cash drag but manageable. Ensure adequate emergency fund only.',
    lowMeans: 'Portfolio well-positioned with growth assets that can outpace inflation.'
  },
  equity: {
    title: 'Equity Market Impact',
    description: 'Measures portfolio sensitivity to stock market movements (FTSE 100, global equities).',
    whatItMeasures: 'Equity allocation % combined with client risk profile alignment.',
    highMeans: 'High equity exposure that may not match cautious risk profile. Review suitability.',
    mediumMeans: 'Equity allocation in line with expectations. Normal market participation.',
    lowMeans: 'Defensive positioning with limited equity exposure.'
  }
}

export interface ClientImpact {
  clientId: string
  clientName: string
  initials: string
  aum: number
  riskProfile: number
  rateImpact: 'high' | 'medium' | 'low'
  inflationImpact: 'high' | 'medium' | 'low'
  equityImpact: 'high' | 'medium' | 'low'
  rateDetails: ImpactDetails
  inflationDetails: ImpactDetails
  equityDetails: ImpactDetails
}

export interface ImpactDetails {
  level: 'high' | 'medium' | 'low'
  exposure: number
  exposurePercent: number
  estimatedImpact: number
  explanation: string
  recommendation: string
}

interface ClientImpactHeatMapProps {
  clients: ClientImpact[]
  onClientClick?: (clientId: string) => void
  selectedClientId?: string | null
}

type ImpactType = 'rate' | 'inflation' | 'equity'

const impactColors = {
  high: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' }
}

export function ClientImpactHeatMap({
  clients,
  onClientClick,
  selectedClientId
}: ClientImpactHeatMapProps) {
  const [activeImpactType, setActiveImpactType] = useState<ImpactType>('rate')
  const [hoveredClient, setHoveredClient] = useState<string | null>(null)

  // Get impact level for a client based on active type
  const getImpactLevel = (client: ClientImpact, type: ImpactType): 'high' | 'medium' | 'low' => {
    switch (type) {
      case 'rate':
        return client.rateImpact
      case 'inflation':
        return client.inflationImpact
      case 'equity':
        return client.equityImpact
    }
  }

  // Get impact details for a client based on active type
  const getImpactDetails = (client: ClientImpact, type: ImpactType): ImpactDetails => {
    switch (type) {
      case 'rate':
        return client.rateDetails
      case 'inflation':
        return client.inflationDetails
      case 'equity':
        return client.equityDetails
    }
  }

  // Count clients by impact level
  const impactCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 }
    clients.forEach(client => {
      const level = getImpactLevel(client, activeImpactType)
      counts[level]++
    })
    return counts
  }, [clients, activeImpactType])

  // Sort clients by impact level (high first)
  const sortedClients = useMemo(() => {
    const priority = { high: 0, medium: 1, low: 2 }
    return [...clients].sort((a, b) => {
      const levelA = getImpactLevel(a, activeImpactType)
      const levelB = getImpactLevel(b, activeImpactType)
      const priorityDiff = priority[levelA] - priority[levelB]
      if (priorityDiff !== 0) return priorityDiff
      return b.aum - a.aum // Then by AUM descending
    })
  }, [clients, activeImpactType])

  const getImpactTypeLabel = (type: ImpactType) => {
    switch (type) {
      case 'rate':
        return 'Interest Rate Impact'
      case 'inflation':
        return 'Inflation Impact'
      case 'equity':
        return 'Equity Market Impact'
    }
  }

  const getImpactTypeIcon = (type: ImpactType) => {
    switch (type) {
      case 'rate':
        return <Percent className="h-4 w-4" />
      case 'inflation':
        return <TrendingUp className="h-4 w-4" />
      case 'equity':
        return <BarChart3 className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-blue-600" />
            Client Impact Heat Map
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Impact Type Selector with Explanations */}
        <Tabs value={activeImpactType} onValueChange={(v) => setActiveImpactType(v as ImpactType)} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <Tooltip
              content={
                <div className="space-y-2">
                  <p className="font-bold">{IMPACT_EXPLANATIONS.rate.title}</p>
                  <p className="text-xs text-gray-300">{IMPACT_EXPLANATIONS.rate.description}</p>
                  <p className="text-xs text-gray-300"><strong>Measures:</strong> {IMPACT_EXPLANATIONS.rate.whatItMeasures}</p>
                </div>
              }
              position="bottom"
            >
              <TabsTrigger value="rate" className="flex items-center gap-2 text-xs">
                <Percent className="h-3 w-3" />
                Rate Impact
                <HelpCircle className="h-3 w-3 text-gray-400" />
              </TabsTrigger>
            </Tooltip>
            <Tooltip
              content={
                <div className="space-y-2">
                  <p className="font-bold">{IMPACT_EXPLANATIONS.inflation.title}</p>
                  <p className="text-xs text-gray-300">{IMPACT_EXPLANATIONS.inflation.description}</p>
                  <p className="text-xs text-gray-300"><strong>Measures:</strong> {IMPACT_EXPLANATIONS.inflation.whatItMeasures}</p>
                </div>
              }
              position="bottom"
            >
              <TabsTrigger value="inflation" className="flex items-center gap-2 text-xs">
                <TrendingUp className="h-3 w-3" />
                Inflation
                <HelpCircle className="h-3 w-3 text-gray-400" />
              </TabsTrigger>
            </Tooltip>
            <Tooltip
              content={
                <div className="space-y-2">
                  <p className="font-bold">{IMPACT_EXPLANATIONS.equity.title}</p>
                  <p className="text-xs text-gray-300">{IMPACT_EXPLANATIONS.equity.description}</p>
                  <p className="text-xs text-gray-300"><strong>Measures:</strong> {IMPACT_EXPLANATIONS.equity.whatItMeasures}</p>
                </div>
              }
              position="bottom"
            >
              <TabsTrigger value="equity" className="flex items-center gap-2 text-xs">
                <BarChart3 className="h-3 w-3" />
                Equity
                <HelpCircle className="h-3 w-3 text-gray-400" />
              </TabsTrigger>
            </Tooltip>
          </TabsList>
        </Tabs>

        {/* Current Impact Type Explanation */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">{IMPACT_EXPLANATIONS[activeImpactType].title}</p>
              <p className="text-blue-700 text-xs mt-1">{IMPACT_EXPLANATIONS[activeImpactType].whatItMeasures}</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-600">{IMPACT_EXPLANATIONS[activeImpactType].highMeans.split('.')[0]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-gray-600">{IMPACT_EXPLANATIONS[activeImpactType].mediumMeans.split('.')[0]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-600">{IMPACT_EXPLANATIONS[activeImpactType].lowMeans.split('.')[0]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heat Map Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 mb-4">
          {sortedClients.map(client => {
            const impactLevel = getImpactLevel(client, activeImpactType)
            const colors = impactColors[impactLevel]
            const isSelected = selectedClientId === client.clientId
            const isHovered = hoveredClient === client.clientId

            return (
              <div
                key={client.clientId}
                onClick={() => onClientClick?.(client.clientId)}
                onMouseEnter={() => setHoveredClient(client.clientId)}
                onMouseLeave={() => setHoveredClient(null)}
                className={`
                  relative p-3 rounded-lg border-2 cursor-pointer transition-all
                  ${colors.bg} ${colors.border}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  ${isHovered ? 'scale-105 shadow-lg z-10' : ''}
                  hover:shadow-md
                `}
              >
                {/* Client Initials */}
                <div className={`text-center font-bold ${colors.text}`}>
                  {client.initials}
                </div>

                {/* Impact Indicator */}
                <div className="flex justify-center mt-1">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                </div>

                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20 w-56">
                    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                      <p className="font-semibold mb-1">{client.clientName}</p>
                      <p className="text-gray-300">AUM: {formatCurrency(client.aum)}</p>
                      <p className="text-gray-300 capitalize">
                        {getImpactTypeLabel(activeImpactType)}: <span className={`font-medium ${
                          impactLevel === 'high' ? 'text-red-400' :
                          impactLevel === 'medium' ? 'text-amber-400' : 'text-green-400'
                        }`}>{impactLevel}</span>
                      </p>
                      <p className="text-gray-400 text-[10px] mt-1">
                        {impactLevel === 'high'
                          ? IMPACT_EXPLANATIONS[activeImpactType].highMeans.split('.')[0]
                          : impactLevel === 'medium'
                          ? IMPACT_EXPLANATIONS[activeImpactType].mediumMeans.split('.')[0]
                          : IMPACT_EXPLANATIONS[activeImpactType].lowMeans.split('.')[0]
                        }
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onClientClick?.(client.clientId)
                        }}
                        className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-medium transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        View Full Analysis
                      </button>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {clients.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No clients to display</p>
            </div>
          )}
        </div>

        {/* Legend and Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">Legend:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-600">High ({impactCounts.high})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-600">Medium ({impactCounts.medium})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600">Low ({impactCounts.low})</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {clients.length} clients total
          </div>
        </div>

        {/* High Impact Alert */}
        {impactCounts.high > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {impactCounts.high} client{impactCounts.high !== 1 ? 's' : ''} with high {activeImpactType} impact
              </p>
              <p className="text-xs text-red-600 mt-1">
                Click on red cells to review affected clients and see recommendations
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ClientImpactHeatMap

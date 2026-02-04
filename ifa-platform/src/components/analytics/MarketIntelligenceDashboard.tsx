'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  TrendingUp,
  Users,
  PoundSterling,
  Shield,
  RefreshCw,
  User,
  Grid3X3,
  Table2
} from 'lucide-react'
import { MarketConditionsWidget } from './MarketConditionsWidget'
import { AUMBreakdownChart } from './AUMBreakdownChart'
import { RiskDistributionChart } from './RiskDistributionChart'
import { MarketImpactPanel } from './MarketImpactPanel'
import { ClientMarketView } from './ClientMarketView'
import { ClientMarketViewModal } from './ClientMarketViewModal'
import { ClientImpactHeatMap, type ClientImpact } from './ClientImpactHeatMap'
import { ClientTableSelector } from './ClientTableSelector'
import { FirmAnalyticsService, type FirmAnalytics, type DetailedClientImpact } from '@/services/FirmAnalyticsService'
import clientLogger from '@/lib/logging/clientLogger'

interface MarketIntelligenceDashboardProps {
  initialClientId?: string
}

type ViewMode = 'heatmap' | 'table'

export function MarketIntelligenceDashboard({
  initialClientId
}: MarketIntelligenceDashboardProps) {
  const [analytics, setAnalytics] = useState<FirmAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null)
  const [clientImpacts, setClientImpacts] = useState<DetailedClientImpact[]>([])
  const [activeTab, setActiveTab] = useState(initialClientId ? 'client' : 'overview')
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap')
  const [activeImpactType, setActiveImpactType] = useState<'rate' | 'inflation' | 'equity'>('rate')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      setError(null)

      const [data, impacts] = await Promise.all([
        FirmAnalyticsService.getFirmAnalytics(),
        FirmAnalyticsService.calculateAllClientImpacts()
      ])

      setAnalytics(data)
      setClientImpacts(impacts)
    } catch (err) {
      setError('Failed to load analytics')
      clientLogger.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Transform DetailedClientImpact to ClientImpact for the heat map
  const heatMapClients: ClientImpact[] = clientImpacts.map(c => ({
    clientId: c.clientId,
    clientName: c.clientName,
    initials: c.initials,
    aum: c.aum,
    riskProfile: c.riskProfile,
    rateImpact: c.rateImpact,
    inflationImpact: c.inflationImpact,
    equityImpact: c.equityImpact,
    rateDetails: c.rateDetails,
    inflationDetails: c.inflationDetails,
    equityDetails: c.equityDetails
  }))

  // Handler for selecting a client - opens modal on impact tab, navigates on other tabs
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)
    // Don't switch tabs - modal will open in place on impact tab
  }

  // Handler specifically for navigating to client tab
  const handleViewClientInTab = (clientId: string) => {
    setSelectedClientId(clientId)
    setActiveTab('client')
  }

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-lg" />
            <div className="h-80 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !analytics) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchAnalytics} variant="secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Intelligence</h1>
          <p className="text-gray-600">
            Live market data and portfolio analytics across your client base
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="secondary" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Live Market Conditions - Always visible */}
      <MarketConditionsWidget />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Firm Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="impact" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Impact Analysis</span>
            <span className="sm:hidden">Impact</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <PoundSterling className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="client" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Individual Client</span>
            <span className="sm:hidden">Client</span>
          </TabsTrigger>
        </TabsList>

        {/* Firm Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            {analytics?.riskDistribution && (
              <RiskDistributionChart
                distribution={analytics.riskDistribution}
                onProfileClick={(profile) => {
                }}
              />
            )}

            {/* Clients Needing Review */}
            {analytics && (
              <MarketImpactPanel
                marketConditions={analytics.marketConditions}
                clientsNeedingReview={analytics.clientsNeedingReview}
                onViewClient={handleViewClientInTab}
              />
            )}
          </div>

          {/* Summary Stats */}
          {analytics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.firmAUM.clientCount}
                      </p>
                      <p className="text-sm text-gray-500">Total Clients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <PoundSterling className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.firmAUM.totalAUM >= 1000000
                          ? `£${(analytics.firmAUM.totalAUM / 1000000).toFixed(1)}M`
                          : `£${(analytics.firmAUM.totalAUM / 1000).toFixed(0)}K`}
                      </p>
                      <p className="text-sm text-gray-500">Total AUM</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Shield className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.clientsNeedingReview.length}
                      </p>
                      <p className="text-sm text-gray-500">Need Review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.firmAUM.averageAUM >= 1000000
                          ? `£${(analytics.firmAUM.averageAUM / 1000000).toFixed(1)}M`
                          : `£${(analytics.firmAUM.averageAUM / 1000).toFixed(0)}K`}
                      </p>
                      <p className="text-sm text-gray-500">Avg Portfolio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Impact Analysis Tab - NEW */}
        <TabsContent value="impact" className="space-y-6">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Client Impact Analysis</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 mr-2">View:</span>
              <Button
                variant={viewMode === 'heatmap' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('heatmap')}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Heat Map
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>
          </div>

          {/* Heat Map or Table View */}
          {viewMode === 'heatmap' ? (
            <ClientImpactHeatMap
              clients={heatMapClients}
              onClientClick={handleClientSelect}
              selectedClientId={selectedClientId}
            />
          ) : (
            <ClientTableSelector
              clients={heatMapClients}
              onClientSelect={handleClientSelect}
              selectedClientId={selectedClientId}
              impactType={activeImpactType}
            />
          )}

          {/* Client Analysis Modal - Opens when client is selected on Impact tab */}
          <ClientMarketViewModal
            clientId={selectedClientId}
            isOpen={!!selectedClientId && activeTab === 'impact'}
            onClose={() => setSelectedClientId(null)}
          />
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          {analytics && (
            <AUMBreakdownChart
              firmAUM={analytics.firmAUM}
              assetAllocation={analytics.assetAllocation}
              view="pie"
            />
          )}
        </TabsContent>

        {/* Individual Client Tab */}
        <TabsContent value="client" className="space-y-6">
          {/* Client Selector - Using new table selector */}
          <ClientTableSelector
            clients={heatMapClients}
            onClientSelect={setSelectedClientId}
            selectedClientId={selectedClientId}
            impactType={activeImpactType}
          />

          {/* Client View */}
          {selectedClientId ? (
            <ClientMarketView
              clientId={selectedClientId}
              onClose={() => setSelectedClientId(null)}
            />
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Select a client to view personalized market analysis</p>
                  <p className="text-sm mt-1">
                    See how current market conditions affect their specific portfolio
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MarketIntelligenceDashboard

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  TrendingUp,
  Users,
  PoundSterling,
  Briefcase,
  Landmark,
  Eye,
  BarChart3,
  Calculator,
  Wallet,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types/client'
import { calculateFirmAUM, type FirmAUM } from '@/lib/financials/aumCalculator'
import {
  segmentByAUMBands,
  calculateFirmFees,
  DEFAULT_FEE_SCHEDULE,
  getBandColor,
  getBandBarColor,
  type AUMBand,
  type FirmFeeProjection,
  type FeeSchedule
} from '@/lib/financials/feeCalculator'
import { InsightsPanel } from '@/components/clients/financials/InsightsPanel'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`
  }
  return formatCurrency(value)
}

export default function ClientFinancialsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [firmAUM, setFirmAUM] = useState<FirmAUM | null>(null)
  const [aumBands, setAumBands] = useState<AUMBand[]>([])
  const [feeProjection, setFeeProjection] = useState<FirmFeeProjection | null>(null)
  const [allClientsData, setAllClientsData] = useState<Client[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAllClients, setShowAllClients] = useState(false)
  const [feeSchedule, setFeeSchedule] = useState<FeeSchedule>(DEFAULT_FEE_SCHEDULE)

  useEffect(() => {
    async function fetchClients() {
      try {
        setLoading(true)

        const { data: clients, error: fetchError } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        // Transform database clients to Client type
        const transformedClients: Client[] = (clients || []).map((c: any) => ({
          id: c.id,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          advisorId: c.advisor_id,
          firmId: c.firm_id,
          clientRef: c.client_ref,
          personalDetails: c.personal_details || {},
          contactInfo: c.contact_info || {},
          financialProfile: c.financial_profile || {},
          vulnerabilityAssessment: c.vulnerability_assessment || {},
          riskProfile: c.risk_profile || {},
          status: c.status || 'active',
          notes: c.notes
        }))

        const aum = calculateFirmAUM(transformedClients)
        setFirmAUM(aum)
        setAllClientsData(transformedClients)

        // Calculate AUM bands and fee projections
        const clientsForFees = aum.byClient.map(c => ({
          clientId: c.clientId,
          clientName: c.clientName,
          aum: c.aum
        }))

        const bands = segmentByAUMBands(clientsForFees, feeSchedule)
        setAumBands(bands)

        const fees = calculateFirmFees(clientsForFees, feeSchedule)
        setFeeProjection(fees)
      } catch (err) {
        console.error('Error fetching clients:', err)
        setError('Failed to load financial data')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [feeSchedule])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const allClients = firmAUM?.byClient || []
  const displayClients = showAllClients ? allClients : allClients.slice(0, 10)

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Financials</h1>
        <p className="text-sm text-gray-500">
          Firm-wide assets under management, client segmentation, and revenue projections
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total AUM</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">
                  {formatCompact(firmAUM?.totalAUM || 0)}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Across {firmAUM?.clientCount || 0} clients
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Projected Annual Revenue</p>
                <p className="text-3xl font-bold text-green-700 mt-1">
                  {formatCompact(feeProjection?.totalAnnualOngoingFees || 0)}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  @ {feeSchedule.ongoingFeePercent}% ongoing fee
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-lg">
                <Wallet className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Average AUM</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">
                  {formatCompact(firmAUM?.averageAUM || 0)}
                </p>
                <p className="text-xs text-purple-500 mt-1">Per client</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">
                  {formatCompact(feeProjection?.totalMonthlyOngoingFees || 0)}
                </p>
                <p className="text-xs text-amber-500 mt-1">
                  Avg {formatCompact(feeProjection?.averageRevenuePerClient ? feeProjection.averageRevenuePerClient / 12 : 0)}/client
                </p>
              </div>
              <div className="p-3 bg-amber-200 rounded-lg">
                <Calculator className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AUM Segmentation by Bands */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            AUM Segmentation
          </CardTitle>
          <CardDescription>
            Client distribution by assets under management bands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {aumBands.map((band, index) => (
              <div
                key={band.label}
                className={`p-4 rounded-lg border-2 ${getBandColor(index)} transition-all hover:scale-105`}
              >
                <p className="text-sm font-semibold">{band.label}</p>
                <p className="text-2xl font-bold mt-1">{band.clientCount}</p>
                <p className="text-xs mt-1">clients</p>
                <div className="mt-3 pt-3 border-t border-current/20">
                  <p className="text-sm font-medium">{formatCompact(band.totalAUM)}</p>
                  <p className="text-xs opacity-75">{band.percentageOfAUM.toFixed(1)}% of AUM</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs opacity-75">
                    Projected: {formatCompact(band.projectedRevenue)}/yr
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Visual AUM Distribution Bar */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-600 mb-2">AUM Distribution</p>
            <div className="h-8 flex rounded-lg overflow-hidden">
              {aumBands.map((band, index) => (
                band.percentageOfAUM > 0 && (
                  <div
                    key={band.label}
                    className={`${getBandBarColor(index)} flex items-center justify-center transition-all`}
                    style={{ width: `${band.percentageOfAUM}%` }}
                    title={`${band.label}: ${band.percentageOfAUM.toFixed(1)}%`}
                  >
                    {band.percentageOfAUM > 10 && (
                      <span className="text-white text-xs font-medium">
                        {band.percentageOfAUM.toFixed(0)}%
                      </span>
                    )}
                  </div>
                )
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {aumBands.map((band, index) => (
                <div key={band.label} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${getBandBarColor(index)}`}></div>
                  <span className="text-xs text-gray-500">{band.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Revenue Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            Fee Revenue Calculator
          </CardTitle>
          <CardDescription>
            Projected fee income based on current AUM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fee Schedule Inputs */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Fee Schedule</h4>
              <div>
                <label className="text-sm text-gray-600">Initial Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={feeSchedule.initialFeePercent}
                  onChange={(e) => setFeeSchedule(prev => ({
                    ...prev,
                    initialFeePercent: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Ongoing Fee (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={feeSchedule.ongoingFeePercent}
                  onChange={(e) => setFeeSchedule(prev => ({
                    ...prev,
                    ongoingFeePercent: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Platform Fee (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  value={feeSchedule.platformFeePercent}
                  onChange={(e) => setFeeSchedule(prev => ({
                    ...prev,
                    platformFeePercent: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Revenue Summary */}
            <div className="md:col-span-2">
              <h4 className="font-medium text-gray-700 mb-4">Revenue Projections</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Annual Ongoing Revenue</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(feeProjection?.totalAnnualOngoingFees || 0)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Monthly Ongoing Revenue</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(feeProjection?.totalMonthlyOngoingFees || 0)}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600">Platform Fees (Annual)</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(feeProjection?.totalPlatformFees || 0)}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-600">Avg Revenue per Client</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {formatCurrency(feeProjection?.averageRevenuePerClient || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client AUM Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Client AUM Rankings
          </CardTitle>
          <CardDescription>
            {showAllClients ? 'All clients' : 'Top 10 clients'} by assets under management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allClients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <PoundSterling className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No client financial data available</p>
              <p className="text-sm mt-1">Add financial profiles to your clients to see AUM data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-3">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Client</div>
                <div className="col-span-2 text-right">Investments</div>
                <div className="col-span-2 text-right">Pensions</div>
                <div className="col-span-2 text-right">Total AUM</div>
                <div className="col-span-1 text-right">Revenue</div>
                <div className="col-span-1"></div>
              </div>

              {/* Table Rows */}
              {displayClients.map((client, index) => {
                const clientFee = client.aum * (feeSchedule.ongoingFeePercent / 100)
                return (
                  <div
                    key={client.clientId}
                    className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded transition-colors"
                  >
                    <div className="col-span-1">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium text-gray-900 truncate">{client.clientName}</p>
                      <p className="text-xs text-gray-500">
                        {client.breakdown.breakdown.length} asset categories
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Briefcase className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">{formatCurrency(client.breakdown.investments)}</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Landmark className="h-3 w-3 text-purple-500" />
                        <span className="text-sm">{formatCurrency(client.breakdown.pensions)}</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-semibold text-lg">{formatCompact(client.aum)}</span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-sm text-green-600">{formatCompact(clientFee)}</span>
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/clients/${client.clientId}?tab=financial`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {/* Show More/Less Button */}
              {allClients.length > 10 && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllClients(!showAllClients)}
                    className="gap-2"
                  >
                    {showAllClients ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Top 10 Only
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show All {allClients.length} Clients
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AUM Distribution */}
      {firmAUM && firmAUM.totalAUM > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4 text-blue-600" />
                Investments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.investments, 0))}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {((firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.investments, 0) / firmAUM.totalAUM) * 100).toFixed(1)}% of total AUM
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4 text-purple-600" />
                Pensions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.pensions, 0))}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {((firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.pensions, 0) / firmAUM.totalAUM) * 100).toFixed(1)}% of total AUM
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PoundSterling className="h-4 w-4 text-green-600" />
                Liquid Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.liquidAssets, 0))}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {((firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.liquidAssets, 0) / firmAUM.totalAUM) * 100).toFixed(1)}% of total AUM
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actionable Insights */}
      {allClientsData.length > 0 && (
        <InsightsPanel clients={allClientsData} maxInsights={10} showSummary={true} />
      )}
    </div>
  )
}

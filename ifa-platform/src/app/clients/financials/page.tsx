'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  TrendingUp,
  Users,
  PoundSterling,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Landmark,
  Shield,
  Eye
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types/client'
import { calculateFirmAUM, type FirmAUM, type ClientAUM } from '@/lib/financials/aumCalculator'

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
  const [error, setError] = useState<string | null>(null)

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
      } catch (err) {
        console.error('Error fetching clients:', err)
        setError('Failed to load financial data')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

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

  const topClients = firmAUM?.byClient.slice(0, 10) || []

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Financials</h1>
        <p className="text-sm text-gray-500">
          Firm-wide assets under management and client financial overview
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
                <p className="text-sm font-medium text-green-600">Average AUM</p>
                <p className="text-3xl font-bold text-green-700 mt-1">
                  {formatCompact(firmAUM?.averageAUM || 0)}
                </p>
                <p className="text-xs text-green-500 mt-1">Per client</p>
              </div>
              <div className="p-3 bg-green-200 rounded-lg">
                <PoundSterling className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Clients</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">
                  {firmAUM?.clientCount || 0}
                </p>
                <p className="text-xs text-purple-500 mt-1">With financial data</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Top Client AUM</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">
                  {formatCompact(topClients[0]?.aum || 0)}
                </p>
                <p className="text-xs text-orange-500 mt-1 truncate">
                  {topClients[0]?.clientName || 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-lg">
                <Briefcase className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client AUM Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Client AUM Rankings
          </CardTitle>
          <CardDescription>
            Top clients by assets under management
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
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
                <div className="col-span-4">Client</div>
                <div className="col-span-2 text-right">Investments</div>
                <div className="col-span-2 text-right">Pensions</div>
                <div className="col-span-2 text-right">Total AUM</div>
                <div className="col-span-1"></div>
              </div>

              {/* Table Rows */}
              {topClients.map((client, index) => (
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
                  <div className="col-span-4">
                    <p className="font-medium text-gray-900">{client.clientName}</p>
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
                    <span className="font-semibold text-lg">{formatCurrency(client.aum)}</span>
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
              ))}
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
    </div>
  )
}

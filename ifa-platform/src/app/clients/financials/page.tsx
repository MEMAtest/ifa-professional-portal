'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PieChart as PieChartIcon,
  ExternalLink,
  X,
  Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types/client'
import { calculateFirmAUM, type FirmAUM, type ClientAUM } from '@/lib/financials/aumCalculator'
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
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

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

type SortField = 'name' | 'investments' | 'pensions' | 'aum' | 'revenue'
type SortOrder = 'asc' | 'desc'

const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444']

export default function ClientFinancialsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [firmAUM, setFirmAUM] = useState<FirmAUM | null>(null)
  const [aumBands, setAumBands] = useState<AUMBand[]>([])
  const [feeProjection, setFeeProjection] = useState<FirmFeeProjection | null>(null)
  const [allClientsData, setAllClientsData] = useState<Client[]>([])
  const [error, setError] = useState<string | null>(null)
  const [feeSchedule, setFeeSchedule] = useState<FeeSchedule>(DEFAULT_FEE_SCHEDULE)

  // Table sorting and pagination state
  const [sortField, setSortField] = useState<SortField>('aum')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Hover preview state
  const [hoveredClient, setHoveredClient] = useState<ClientAUM | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Refs for scrolling
  const aumDistributionRef = useRef<HTMLDivElement>(null)
  const feeCalculatorRef = useRef<HTMLDivElement>(null)
  const clientTableRef = useRef<HTMLDivElement>(null)

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

  // Sorted and paginated clients
  const sortedClients = useMemo(() => {
    if (!firmAUM) return []

    const clients = [...firmAUM.byClient]

    clients.sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1
      switch (sortField) {
        case 'name':
          return a.clientName.localeCompare(b.clientName) * multiplier
        case 'investments':
          return (a.breakdown.investments - b.breakdown.investments) * multiplier
        case 'pensions':
          return (a.breakdown.pensions - b.breakdown.pensions) * multiplier
        case 'aum':
          return (a.aum - b.aum) * multiplier
        case 'revenue':
          return (a.aum - b.aum) * multiplier // Revenue is proportional to AUM
        default:
          return 0
      }
    })

    return clients
  }, [firmAUM, sortField, sortOrder])

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedClients.slice(start, start + pageSize)
  }, [sortedClients, currentPage, pageSize])

  const totalPages = Math.ceil(sortedClients.length / pageSize)

  // Chart data
  const aumDistributionData = useMemo(() => {
    if (!firmAUM) return []

    const totalInvestments = firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.investments, 0)
    const totalPensions = firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.pensions, 0)
    const totalLiquid = firmAUM.byClient.reduce((sum, c) => sum + c.breakdown.liquidAssets, 0)

    return [
      { name: 'Investments', value: totalInvestments, color: '#3B82F6' },
      { name: 'Pensions', value: totalPensions, color: '#8B5CF6' },
      { name: 'Liquid Assets', value: totalLiquid, color: '#22C55E' }
    ].filter(d => d.value > 0)
  }, [firmAUM])

  const topClientsChartData = useMemo(() => {
    if (!firmAUM) return []

    return firmAUM.byClient
      .slice(0, 10)
      .map(c => ({
        name: c.clientName.length > 15 ? c.clientName.substring(0, 15) + '...' : c.clientName,
        fullName: c.clientName,
        aum: c.aum,
        revenue: c.aum * (feeSchedule.ongoingFeePercent / 100)
      }))
  }, [firmAUM, feeSchedule])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  // Scroll handlers for clickable widgets
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Hover preview handlers
  const handleRowHover = (client: ClientAUM, event: React.MouseEvent<HTMLTableRowElement>) => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Capture position immediately (before timeout)
    const rect = event.currentTarget.getBoundingClientRect()
    const modalWidth = 320 // w-80 = 320px
    const modalHeight = 380
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Determine if modal should appear on left or right of the row
    let x: number
    if (rect.right + modalWidth + 20 > viewportWidth) {
      // Not enough space on right, show on left
      x = Math.max(10, rect.left - modalWidth - 10)
    } else {
      // Show on right
      x = rect.right + 10
    }

    // Ensure modal doesn't go below viewport
    const y = Math.min(rect.top, viewportHeight - modalHeight - 20)

    const position = { x, y: Math.max(10, y) }

    // Set a small delay before showing preview
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverPosition(position)
      setHoveredClient(client)
    }, 200) // 200ms delay
  }

  const handleRowLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHoveredClient(null)
  }

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

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Financials</h1>
        <p className="text-sm text-gray-500">
          Firm-wide assets under management, client segmentation, and revenue projections
        </p>
      </div>

      {/* Summary Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => scrollToSection(aumDistributionRef)}
        >
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
            <p className="text-xs text-blue-600 mt-3">Click to view distribution</p>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => scrollToSection(feeCalculatorRef)}
        >
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
            <p className="text-xs text-green-600 mt-3">Click to view calculator</p>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => scrollToSection(clientTableRef)}
        >
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
            <p className="text-xs text-purple-600 mt-3">Click to view clients</p>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => scrollToSection(feeCalculatorRef)}
        >
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
            <p className="text-xs text-amber-600 mt-3">Click to view details</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" ref={aumDistributionRef}>
        {/* AUM Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-600" />
              AUM Distribution
            </CardTitle>
            <CardDescription>
              Asset allocation breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {aumDistributionData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={aumDistributionData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={85}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#666', strokeWidth: 1 }}
                    >
                      {aumDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Clients Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Top 10 Clients by AUM
            </CardTitle>
            <CardDescription>
              Your highest value clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topClientsChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClientsChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCompact(value)} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => {
                        const client = topClientsChartData.find(c => c.name === label)
                        return client?.fullName || label
                      }}
                    />
                    <Bar dataKey="aum" fill="#8B5CF6" radius={[0, 4, 4, 0]} name="AUM" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
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
      <Card ref={feeCalculatorRef}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                Fee Revenue Calculator
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  Projection Tool
                </span>
              </CardTitle>
              <CardDescription className="mt-1">
                Plan and project your fee income based on current assets under management. Adjust the fee schedule below to model different scenarios.
              </CardDescription>
            </div>
            <div className="group relative">
              <Info className="h-5 w-5 text-gray-400 cursor-help" />
              <div className="absolute right-0 top-6 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <p className="font-medium mb-1">About this tool</p>
                <p>This calculator helps you project potential fee revenue based on your current client AUM. Adjust the fee percentages to model different pricing structures and see how it impacts your revenue.</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Fee Schedule Inputs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-700">Fee Schedule</h4>
                <span className="text-xs text-gray-400">(Adjust to model scenarios)</span>
              </div>
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
              <div className="flex items-center gap-2 mb-4">
                <h4 className="font-medium text-gray-700">Revenue Projections</h4>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Based on current AUM</span>
              </div>
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

      {/* Client AUM Table - Enhanced with sorting and pagination */}
      <Card ref={clientTableRef}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Client AUM Rankings
              </CardTitle>
              <CardDescription>
                All {sortedClients.length} clients by assets under management
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-2 py-1 border rounded-md text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedClients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <PoundSterling className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No client financial data available</p>
              <p className="text-sm mt-1">Add financial profiles to your clients to see AUM data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Scrollable Table Container */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                        #
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Client
                          {sortField === 'name' ? (
                            sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('investments')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Investments
                          {sortField === 'investments' ? (
                            sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('pensions')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Pensions
                          {sortField === 'pensions' ? (
                            sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('aum')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Total AUM
                          {sortField === 'aum' ? (
                            sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('revenue')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Revenue
                          {sortField === 'revenue' ? (
                            sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-16">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedClients.map((client, index) => {
                      const globalIndex = (currentPage - 1) * pageSize + index
                      const clientFee = client.aum * (feeSchedule.ongoingFeePercent / 100)
                      return (
                        <tr
                          key={client.clientId}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/clients/${client.clientId}?tab=financial`)}
                          onMouseEnter={(e) => handleRowHover(client, e)}
                          onMouseLeave={handleRowLeave}
                        >
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              globalIndex === 0 ? 'bg-yellow-100 text-yellow-700' :
                              globalIndex === 1 ? 'bg-gray-200 text-gray-700' :
                              globalIndex === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {globalIndex + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{client.clientName}</p>
                            <p className="text-xs text-gray-500">
                              {client.breakdown.breakdown.length} asset categories
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Briefcase className="h-3 w-3 text-blue-500" />
                              <span className="text-sm">{formatCurrency(client.breakdown.investments)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Landmark className="h-3 w-3 text-purple-500" />
                              <span className="text-sm">{formatCurrency(client.breakdown.pensions)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-lg">{formatCompact(client.aum)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm text-green-600">{formatCompact(clientFee)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/clients/${client.clientId}?tab=financial`)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedClients.length)} of {sortedClients.length} clients
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AUM Distribution Cards */}
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

      {/* Client Hover Preview Card */}
      {hoveredClient && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-80 pointer-events-auto"
          style={{
            top: hoverPosition.y,
            left: hoverPosition.x,
            maxHeight: '380px'
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          }}
          onMouseLeave={handleRowLeave}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{hoveredClient.clientName}</h3>
              <p className="text-xs text-gray-500">Client ID: {hoveredClient.clientId.slice(0, 8)}...</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setHoveredClient(null)
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Total AUM - Prominent */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-600 uppercase font-medium">Total Assets Under Management</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(hoveredClient.aum)}</p>
          </div>

          {/* Asset Breakdown with Mini Bar */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 uppercase font-medium mb-2">Asset Breakdown</p>
            <div className="space-y-1">
              {/* Investments */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600">Investments</span>
                </div>
                <span className="text-xs font-medium">{formatCompact(hoveredClient.breakdown.investments)}</span>
              </div>
              {/* Pensions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-xs text-gray-600">Pensions</span>
                </div>
                <span className="text-xs font-medium">{formatCompact(hoveredClient.breakdown.pensions)}</span>
              </div>
              {/* Liquid Assets */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600">Liquid Assets</span>
                </div>
                <span className="text-xs font-medium">{formatCompact(hoveredClient.breakdown.liquidAssets)}</span>
              </div>
            </div>
            {/* Mini Progress Bar */}
            <div className="mt-2 h-2 flex rounded-full overflow-hidden bg-gray-100">
              {hoveredClient.aum > 0 && (
                <>
                  <div
                    className="bg-blue-500"
                    style={{ width: `${(hoveredClient.breakdown.investments / hoveredClient.aum) * 100}%` }}
                  />
                  <div
                    className="bg-purple-500"
                    style={{ width: `${(hoveredClient.breakdown.pensions / hoveredClient.aum) * 100}%` }}
                  />
                  <div
                    className="bg-green-500"
                    style={{ width: `${(hoveredClient.breakdown.liquidAssets / hoveredClient.aum) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Projected Revenue */}
          <div className="bg-green-50 rounded-lg p-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-700">Projected Annual Revenue</span>
              <span className="text-sm font-bold text-green-700">
                {formatCurrency(hoveredClient.aum * (feeSchedule.ongoingFeePercent / 100))}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/clients/${hoveredClient.clientId}`)
                setHoveredClient(null)
              }}
            >
              <Eye className="h-3 w-3" />
              Profile
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/clients/${hoveredClient.clientId}?tab=financial`)
                setHoveredClient(null)
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Financial
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

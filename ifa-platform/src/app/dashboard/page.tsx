// File: src/app/dashboard/page.tsx - ENHANCED with Working Buttons + More Charts
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { MarketConditionsWidget } from '@/components/analytics/MarketConditionsWidget'
import { DashboardKpiCards } from '@/components/dashboard/DashboardKpiCards'
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions'
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator,
  UserPlus,
  Calendar,
  Shield,
  Target,
  MapPin
} from 'lucide-react'
import type { UpcomingEventsFilter } from '@/lib/dashboard/types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { RegionClientsModal } from '@/components/dashboard/RegionClientsModal'
import { useDashboardData } from '@/components/dashboard/hooks/useDashboardData'
import {
  getActivityIcon,
  getEventIcon,
  getPriorityColor,
  upcomingFilterDescription
} from '@/components/dashboard/utils'

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [upcomingEventsFilter, setUpcomingEventsFilter] = useState<UpcomingEventsFilter>('outstanding')
  const { stats, loading } = useDashboardData({
    upcomingEventsFilter,
    upcomingEventsLimit: 20
  })
  const [selectedRegion, setSelectedRegion] = useState<{
    region: string
    clients: Array<{ id: string; name: string; aum: number }>
    totalAUM: number
    color: string
  } | null>(null)
  const [timelineClientFilter, setTimelineClientFilter] = useState<string | null>(null)
  const [timelineDays, setTimelineDays] = useState<14 | 30 | 'all'>(30)

  // FIXED: Working button handlers
  const handleNewAssessment = () => {
    router.push('/assessments/suitability')
  }

  const handleAddClient = () => {
    router.push('/clients/new')
  }

  const handleGenerateReport = () => {
    router.push('/reports')
  }


  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your clients today.
          </p>
        </div>

        {/* FIXED: Working Quick Actions */}
        <DashboardQuickActions
          onNewAssessment={handleNewAssessment}
          onAddClient={handleAddClient}
          onGenerateReport={handleGenerateReport}
        />

        {/* Main KPI Cards */}
        <DashboardKpiCards stats={stats} formatCurrency={formatCurrency} />

        {/* Market Intelligence Snapshot */}
        <MarketConditionsWidget compact />

        {/* Weekly Activity Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Clients Onboarded This Week
              </CardTitle>
              <CardDescription>
                Daily client acquisition tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.weeklyStats.clientsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Assessments Completed
              </CardTitle>
              <CardDescription>
                Daily assessment completion rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.weeklyStats.assessmentsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Documents Generated
              </CardTitle>
              <CardDescription>
                Daily document creation activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.weeklyStats.documentsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-orange-600" />
                Monte Carlo Simulations
              </CardTitle>
              <CardDescription>
                Daily projection analysis runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.weeklyStats.monteCarloChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Additional Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Client Risk Distribution
              </CardTitle>
              <CardDescription>
                Portfolio risk profile breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.clientDistribution.riskProfile}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {stats.clientDistribution.riskProfile.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AUM Growth Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                AUM Growth Trend
              </CardTitle>
              <CardDescription>
                6-month assets under management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats.performance.aumGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`
                      if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`
                      return `£${value}`
                    }}
                    width={70}
                  />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'AUM']} />
                  <Area
                    type="monotone"
                    dataKey="aum"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Portfolio Size Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Portfolio Size Distribution
              </CardTitle>
              <CardDescription>
                Client portfolio value ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.clientDistribution.portfolioSizes} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="range" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`${value} clients`, 'Count']} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Client Location Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Client Distribution by Region
            </CardTitle>
            <CardDescription>
              Geographic spread of your client base across the UK
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* UK Region Visualization - Clickable Cards */}
              <div className="space-y-4">
                {/* Visual Region Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const regionConfig = [
                      { name: 'Scotland', color: '#06b6d4', bgColor: '#06b6d420' },
                      { name: 'North', color: '#8b5cf6', bgColor: '#8b5cf620' },
                      { name: 'Midlands', color: '#3b82f6', bgColor: '#3b82f620' },
                      { name: 'Wales', color: '#ec4899', bgColor: '#ec489920' },
                      { name: 'London', color: '#ef4444', bgColor: '#ef444420' },
                      { name: 'South East', color: '#f97316', bgColor: '#f9731620' },
                      { name: 'South West', color: '#22c55e', bgColor: '#22c55e20', colSpan: true },
                      { name: 'Other', color: '#94a3b8', bgColor: '#94a3b820', colSpan: true }
                    ]

                    return regionConfig.map(config => {
                      const regionData = stats.clientDistribution.regionDistribution.find(r => r.region === config.name)
                      const count = regionData?.count || 0
                      const hasClients = count > 0

                      // Skip "Other" if no clients
                      if (config.name === 'Other' && !hasClients) return null

                      return (
                        <div
                          key={config.name}
                          onClick={() => {
                            if (regionData && hasClients) {
                              setSelectedRegion({
                                region: config.name,
                                clients: regionData.clients,
                                totalAUM: regionData.aum,
                                color: config.color
                              })
                            }
                          }}
                          className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${config.colSpan ? 'col-span-2' : ''} ${hasClients ? 'hover:scale-[1.02]' : 'opacity-60'}`}
                          style={{
                            backgroundColor: hasClients ? config.bgColor : '#f1f5f9',
                            borderColor: hasClients ? config.color : '#e2e8f0'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                            <span className="font-semibold text-sm">{config.name === 'Other' ? 'Other Regions' : config.name}</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{count}</p>
                          <p className="text-xs text-gray-500">{hasClients ? 'clients - click to view' : 'clients'}</p>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Region Stats */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Regional Breakdown</h4>
                {stats.clientDistribution.regionDistribution.length > 0 ? (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
                    {stats.clientDistribution.regionDistribution.map((region) => (
                      <div
                        key={region.region}
                        onClick={() => setSelectedRegion({
                          region: region.region,
                          clients: region.clients,
                          totalAUM: region.aum,
                          color: region.color
                        })}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:scale-[1.01] transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{ backgroundColor: region.color }}
                          />
                          <div>
                            <p className="font-medium text-sm">{region.region}</p>
                            <p className="text-xs text-gray-500">{region.count} client{region.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(region.aum)}</p>
                          <p className="text-xs text-gray-500">AUM</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No location data available</p>
                    <p className="text-xs mt-1">Add addresses to client profiles to see distribution</p>
                  </div>
                )}

                {/* Summary */}
                {stats.clientDistribution.regionDistribution.length > 0 && (
                  <div className="pt-3 border-t mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Regions</span>
                      <span className="font-medium">{stats.clientDistribution.regionDistribution.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Most Clients</span>
                      <span className="font-medium">{stats.clientDistribution.regionDistribution[0]?.region || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total AUM</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(stats.clientDistribution.regionDistribution.reduce((sum, r) => sum + r.aum, 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Activity Timeline
                  </CardTitle>
                  <CardDescription>
                    {timelineClientFilter
                      ? `Activities for ${stats.recentActivity.find(a => a.clientId === timelineClientFilter)?.clientName || 'selected client'}`
                      : `Latest updates across your client portfolio`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {/* Client Filter Dropdown */}
                  <select
                    value={timelineClientFilter || ''}
                    onChange={(e) => setTimelineClientFilter(e.target.value || null)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Clients</option>
                    {/* Get unique clients from activities */}
                    {Array.from(new Set(stats.recentActivity.filter(a => a.clientId).map(a => JSON.stringify({ id: a.clientId, name: a.clientName }))))
                      .map(str => JSON.parse(str))
                      .map((client: { id: string; name: string }) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                  </select>
                  {/* Days Toggle */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setTimelineDays(14)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        timelineDays === 14
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      14 days
                    </button>
                    <button
                      onClick={() => setTimelineDays(30)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        timelineDays === 30
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      30 days
                    </button>
                    <button
                      onClick={() => setTimelineDays('all')}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        timelineDays === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Apply filters
                const filteredActivities = stats.recentActivity.filter(activity => {
                  // Skip date filtering if "all" is selected
                  let withinDateRange = true
                  if (timelineDays !== 'all') {
                    const cutoffDate = new Date()
                    cutoffDate.setDate(cutoffDate.getDate() - timelineDays)
                    const activityDate = new Date(activity.timestamp)
                    withinDateRange = activityDate >= cutoffDate
                  }
                  const matchesClient = !timelineClientFilter || activity.clientId === timelineClientFilter
                  return withinDateRange && matchesClient
                })

                return filteredActivities.length > 0 ? (
                <div className="relative pl-8">
                  {/* Vertical timeline line - positioned through dots */}
                  <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-blue-400 via-purple-400 to-gray-300" />

                  {/* Timeline items */}
                  {filteredActivities.slice(0, 8).map((activity, index) => {
                    // Determine activity URL based on type and clientId
                    let activityUrl = '/clients'
                    const isMonteCarloOrStressTest = activity.type === 'monte_carlo_run' ||
                      activity.description?.toLowerCase().includes('stress test') ||
                      activity.description?.toLowerCase().includes('monte carlo')
                    const isCashFlow = activity.description?.toLowerCase().includes('cash flow')

                    if (isMonteCarloOrStressTest) {
                      // Monte Carlo & Stress Test activities go to relevant page with clientId
                      const isStressTest = activity.description?.toLowerCase().includes('stress test')
                      if (activity.clientId) {
                        activityUrl = isStressTest
                          ? `/stress-testing?clientId=${activity.clientId}`
                          : `/monte-carlo?clientId=${activity.clientId}`
                      } else {
                        activityUrl = isStressTest ? '/stress-testing' : '/monte-carlo'
                      }
                    } else if (isCashFlow) {
                      // Cash flow activities go to cashflow page with clientId
                      activityUrl = activity.clientId
                        ? `/cashflow?clientId=${activity.clientId}`
                        : '/cashflow'
                    } else if (activity.clientId) {
                      // Other activities with clientId go to client detail page
                      activityUrl = `/clients/${activity.clientId}`
                    }

                    // Get time ago
                    const timestamp = new Date(activity.timestamp)
                    const now = new Date()
                    const diffMs = now.getTime() - timestamp.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    const diffHours = Math.floor(diffMs / 3600000)
                    const diffDays = Math.floor(diffMs / 86400000)

                    let timeAgo = ''
                    if (diffMins < 60) timeAgo = `${diffMins}m ago`
                    else if (diffHours < 24) timeAgo = `${diffHours}h ago`
                    else if (diffDays === 1) timeAgo = 'Yesterday'
                    else if (diffDays < 7) timeAgo = `${diffDays}d ago`
                    else timeAgo = timestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

                    // Activity type colors
                    const dotColors: Record<string, string> = {
                      client_added: '#3b82f6',
                      assessment_completed: '#22c55e',
                      document_signed: '#a855f7',
                      monte_carlo_run: '#f97316',
                      review_due: '#ef4444'
                    }

                    const dotColor = dotColors[activity.type] || '#9ca3af'

                    return (
                      <Link
                        key={activity.id}
                        href={activityUrl}
                        className="block relative mb-6 last:mb-0 group"
                      >
                        {/* Timeline dot - centered on the line */}
                        <div
                          className="absolute -left-8 top-3 w-6 h-6 rounded-full flex items-center justify-center z-10"
                          style={{ backgroundColor: dotColor }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        </div>

                        {/* Content */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all ml-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors flex-shrink-0">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                  {activity.clientName}
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                              {timeAgo}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}

                  {/* End dot */}
                  <div className="relative">
                    <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400 italic ml-2 pt-1">End of recent activity</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No activity {timelineDays === 'all' ? 'recorded yet' : `in the last ${timelineDays} days`}</p>
                  <p className="text-sm mt-1">
                    {timelineClientFilter
                      ? 'Try selecting a different client or time range'
                      : timelineDays !== 'all'
                        ? 'Try selecting "All" to see older activity'
                        : 'Activity will appear here as you work with clients'}
                  </p>
                </div>
              )
              })()}
            </CardContent>
          </Card>

          {/* NEW: Upcoming Events & Summary */}
          <div className="space-y-6">
            {/* This Week's Summary */}
            <Card>
              <CardHeader>
                <CardTitle>This Week's Summary</CardTitle>
                <CardDescription>
                  Key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New Clients</span>
                    <span className="font-medium">{stats.thisWeek.clientsOnboarded}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Assessments</span>
                    <span className="font-medium">{stats.thisWeek.assessmentsCompleted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Documents</span>
                    <span className="font-medium">{stats.thisWeek.documentsGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Simulations</span>
                    <span className="font-medium">{stats.thisWeek.monteCarloRuns}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Compliance Score</span>
                      <span className="font-bold text-green-600">{stats.complianceScore}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NEW: Upcoming Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Upcoming Reviews
                  </CardTitle>
                  <select
                    value={upcomingEventsFilter}
                    onChange={(e) => setUpcomingEventsFilter(e.target.value as typeof upcomingEventsFilter)}
                    className="border rounded-md px-2 py-1 text-xs text-gray-700 bg-white"
                  >
                    <option value="outstanding">Outstanding</option>
                    <option value="overdue">Overdue</option>
                    <option value="due_7">Next 7 days</option>
                    <option value="due_30">Next 30 days</option>
                  </select>
                </div>
                <CardDescription>
                  {upcomingFilterDescription[upcomingEventsFilter]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.upcomingEvents.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-auto pr-1">
                    {stats.upcomingEvents.map((event) => {
                      const eventUrl = '/reviews'
                      return (
                        <Link
                          key={event.id}
                          href={eventUrl}
                          className={`block p-3 rounded-lg border ${getPriorityColor(event.priority)} hover:shadow-md transition-shadow cursor-pointer`}
                        >
                          <div className="flex items-start gap-2">
                            {getEventIcon(event.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{event.clientName}</p>
                              <p className="text-xs text-gray-600">{event.description}</p>
                              <p className="text-xs mt-1">
                                {new Date(event.date).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(event.priority)}`}>
                              {event.priority}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500">
                    No reviews in this window yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Region Clients Modal */}
      <RegionClientsModal
        isOpen={!!selectedRegion}
        onClose={() => setSelectedRegion(null)}
        region={selectedRegion?.region || ''}
        clients={selectedRegion?.clients || []}
        totalAUM={selectedRegion?.totalAUM || 0}
        color={selectedRegion?.color || '#94a3b8'}
      />
    </Layout>
  )
}

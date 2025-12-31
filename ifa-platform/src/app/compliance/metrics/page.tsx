// app/compliance/metrics/page.tsx
// ================================================================
// COMPLIANCE METRICS DASHBOARD
// Comprehensive metrics across all compliance areas with drill-downs
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Users,
  FileText,
  AlertCircle,
  Scale,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'

type SectionStatus = 'good' | 'watch' | 'attention' | 'critical'
type SectionTrend = 'improving' | 'stable' | 'declining'

// Types
interface ComplianceMetrics {
  summary: {
    complianceScore: number
    complianceScoreTrend: number
    qaPassRate: number
    qaPassRateTrend: number
    openIssues: number
    openIssuesTrend: number
    overdueReviews: number
    highRiskClients: number
  }
  qaReviews: {
    total: number
    pending: number
    approved: number
    rejected: number
    escalated: number
    passRate: number
    byRiskRating: { low: number; medium: number; high: number; critical: number }
  }
  complaints: {
    total: number
    open: number
    investigating: number
    resolved: number
    escalated: number
    fcaReportable: number
    byCategory: Record<string, number>
    totalRedress: number
  }
  breaches: {
    total: number
    open: number
    investigating: number
    remediated: number
    closed: number
    bySeverity: { minor: number; moderate: number; serious: number; critical: number }
    fcaNotified: number
    affectedClients: number
  }
  vulnerability: {
    activeClients: number
    byType: { health: number; life_events: number; resilience: number; capability: number }
    bySeverity: { low: number; medium: number; high: number }
    overdueReviews: number
  }
  aml: {
    totalClients: number
    verified: number
    pending: number
    failed: number
    expired: number
    byRiskRating: { low: number; medium: number; high: number; edd: number }
    pepCount: number
    overdueReviews: number
  }
  consumerDuty: {
    assessed: number
    fullyCompliant: number
    mostlyCompliant: number
    needsAttention: number
    nonCompliant: number
    byOutcome: {
      products_services: { compliant: number; partial: number; non: number }
      price_value: { compliant: number; partial: number; non: number }
      consumer_understanding: { compliant: number; partial: number; non: number }
      consumer_support: { compliant: number; partial: number; non: number }
    }
  }
  trends: {
    complianceScore: Array<{ month: string; score: number }>
    reviewActivity: Array<{ month: string; completed: number; due: number }>
    issueVolume: Array<{ month: string; complaints: number; breaches: number }>
  }
}

// Score Card Component
function ScoreCard({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  onClick,
  colorClass = 'text-blue-600',
  bgClass = 'bg-blue-50'
}: {
  title: string
  value: string | number
  trend?: number
  trendLabel?: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  colorClass?: string
  bgClass?: string
}) {
  const getTrendIcon = () => {
    if (trend === undefined) return null
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-600" />
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-600" />
    return <Minus className="h-3 w-3 text-gray-400" />
  }

  const getTrendColor = () => {
    if (trend === undefined) return ''
    if (trend > 0) return 'text-green-600'
    if (trend < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${bgClass}`}>
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{trend > 0 ? '+' : ''}{trend}{trendLabel || '%'}</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Section Breakdown Row
function SectionRow({
  name,
  status,
  score,
  issues,
  trend,
  onClick,
  icon: Icon
}: {
  name: string
  status: SectionStatus
  score: number
  issues: number
  trend: SectionTrend
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
}) {
  const StatusIcon = SECTION_STATUS_CONFIG[status].icon
  const TrendIcon = SECTION_TREND_CONFIG[trend].icon

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-900">{name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${SECTION_STATUS_CONFIG[status].bg} ${SECTION_STATUS_CONFIG[status].text}`}>
          <StatusIcon className="h-3 w-3" />
          {SECTION_STATUS_CONFIG[status].label}
        </span>
      </td>
      <td className="px-4 py-3 text-center font-medium">{score}%</td>
      <td className="px-4 py-3 text-center">{issues}</td>
      <td className="px-4 py-3">
        <div className={`flex items-center gap-1 ${SECTION_TREND_CONFIG[trend].color}`}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm">{SECTION_TREND_CONFIG[trend].label}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </td>
    </tr>
  )
}

// Color constants
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  gray: '#6B7280'
}

const SECTION_STATUS_CONFIG: Record<SectionStatus, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  good: { label: 'Good', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  watch: { label: 'Watch', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
  attention: { label: 'Attention', bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertCircle },
  critical: { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle }
}

const SECTION_TREND_CONFIG: Record<SectionTrend, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  improving: { label: 'Improving', icon: TrendingUp, color: 'text-green-600' },
  stable: { label: 'Stable', icon: Minus, color: 'text-gray-500' },
  declining: { label: 'Attention', icon: TrendingDown, color: 'text-red-600' }
}

const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
const RISK_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444']

export default function ComplianceMetricsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/compliance/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const data = await response.json()
      if (data.success) {
        setMetrics(data.metrics)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Error fetching compliance metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Drill-down navigation handlers
  const navigateToQA = (filter?: string) => {
    const params = filter ? `?tab=qa&filter=${filter}` : '?tab=qa'
    router.push(`/compliance${params}`)
  }

  const navigateToRegisters = (sub?: string, filter?: string) => {
    let params = '?tab=registers'
    if (sub) params += `&sub=${sub}`
    if (filter) params += `&filter=${filter}`
    router.push(`/compliance${params}`)
  }

  const navigateToAML = (filter?: string) => {
    const params = filter ? `?tab=aml&filter=${filter}` : '?tab=aml'
    router.push(`/compliance${params}`)
  }

  const navigateToConsumerDuty = (outcome?: string) => {
    const params = outcome ? `?tab=consumer-duty&outcome=${outcome}` : '?tab=consumer-duty'
    router.push(`/compliance${params}`)
  }

  // Prepare chart data
  const riskDistributionData = metrics ? [
    { name: 'Low', value: metrics.aml.byRiskRating.low, fill: RISK_COLORS[0] },
    { name: 'Medium', value: metrics.aml.byRiskRating.medium, fill: RISK_COLORS[1] },
    { name: 'High', value: metrics.aml.byRiskRating.high, fill: RISK_COLORS[2] },
    { name: 'EDD', value: metrics.aml.byRiskRating.edd, fill: RISK_COLORS[3] }
  ] : []

  const consumerDutyRadarData = metrics ? [
    {
      outcome: 'Products & Services',
      score: Math.round((metrics.consumerDuty.byOutcome.products_services.compliant /
        (metrics.consumerDuty.byOutcome.products_services.compliant +
         metrics.consumerDuty.byOutcome.products_services.partial +
         metrics.consumerDuty.byOutcome.products_services.non || 1)) * 100)
    },
    {
      outcome: 'Price & Value',
      score: Math.round((metrics.consumerDuty.byOutcome.price_value.compliant /
        (metrics.consumerDuty.byOutcome.price_value.compliant +
         metrics.consumerDuty.byOutcome.price_value.partial +
         metrics.consumerDuty.byOutcome.price_value.non || 1)) * 100)
    },
    {
      outcome: 'Understanding',
      score: Math.round((metrics.consumerDuty.byOutcome.consumer_understanding.compliant /
        (metrics.consumerDuty.byOutcome.consumer_understanding.compliant +
         metrics.consumerDuty.byOutcome.consumer_understanding.partial +
         metrics.consumerDuty.byOutcome.consumer_understanding.non || 1)) * 100)
    },
    {
      outcome: 'Support',
      score: Math.round((metrics.consumerDuty.byOutcome.consumer_support.compliant /
        (metrics.consumerDuty.byOutcome.consumer_support.compliant +
         metrics.consumerDuty.byOutcome.consumer_support.partial +
         metrics.consumerDuty.byOutcome.consumer_support.non || 1)) * 100)
    }
  ] : []

  const issuesByCategoryData = metrics ? [
    { category: 'Service', complaints: metrics.complaints.byCategory.service || 0, breaches: 0 },
    { category: 'Advice', complaints: metrics.complaints.byCategory.advice || 0, breaches: 0 },
    { category: 'Fees', complaints: metrics.complaints.byCategory.fees || 0, breaches: 0 },
    { category: 'Comms', complaints: metrics.complaints.byCategory.communication || 0, breaches: 0 },
    { category: 'Regulatory', complaints: 0, breaches: metrics.breaches.bySeverity.serious + metrics.breaches.bySeverity.critical }
  ] : []

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading compliance metrics...</p>
        </div>
      </div>
    )
  }

  // Determine section statuses based on metrics
  const getSectionStatus = (score: number): 'good' | 'watch' | 'attention' | 'critical' => {
    if (score >= 85) return 'good'
    if (score >= 70) return 'watch'
    if (score >= 50) return 'attention'
    return 'critical'
  }

  const getTrend = (trend: number): 'improving' | 'stable' | 'declining' => {
    if (trend > 0) return 'improving'
    if (trend < 0) return 'declining'
    return 'stable'
  }

  const sectionRows: Array<{
    name: string
    icon: React.ComponentType<{ className?: string }>
    status: SectionStatus
    score: number
    issues: number
    trend: SectionTrend
    onClick: () => void
  }> = metrics ? [
    {
      name: 'QA & File Reviews',
      icon: FileText,
      status: getSectionStatus(metrics.qaReviews.passRate),
      score: metrics.qaReviews.passRate,
      issues: metrics.qaReviews.pending + metrics.qaReviews.rejected,
      trend: getTrend(metrics.summary.qaPassRateTrend),
      onClick: () => navigateToQA()
    },
    {
      name: 'Complaints',
      icon: AlertCircle,
      status: metrics.complaints.open > 3 ? 'watch' : 'good',
      score: Math.round((metrics.complaints.resolved / (metrics.complaints.total || 1)) * 100),
      issues: metrics.complaints.open + metrics.complaints.investigating,
      trend: metrics.complaints.open > 3 ? 'declining' : 'stable',
      onClick: () => navigateToRegisters('complaints')
    },
    {
      name: 'Breaches',
      icon: AlertTriangle,
      status: metrics.breaches.open > 0 ? 'attention' : 'good',
      score: Math.round(((metrics.breaches.remediated + metrics.breaches.closed) / (metrics.breaches.total || 1)) * 100),
      issues: metrics.breaches.open + metrics.breaches.investigating,
      trend: metrics.breaches.open > 0 ? 'declining' : 'improving',
      onClick: () => navigateToRegisters('breaches')
    },
    {
      name: 'Vulnerability',
      icon: Users,
      status: metrics.vulnerability.overdueReviews > 0 ? 'watch' : 'good',
      score: Math.round(((metrics.vulnerability.activeClients - metrics.vulnerability.overdueReviews) / (metrics.vulnerability.activeClients || 1)) * 100),
      issues: metrics.vulnerability.overdueReviews,
      trend: metrics.vulnerability.overdueReviews > 2 ? 'declining' : 'stable',
      onClick: () => navigateToRegisters('vulnerability')
    },
    {
      name: 'AML/CTF',
      icon: Shield,
      status: getSectionStatus(Math.round((metrics.aml.verified / (metrics.aml.totalClients || 1)) * 100)),
      score: Math.round((metrics.aml.verified / (metrics.aml.totalClients || 1)) * 100),
      issues: metrics.aml.pending + metrics.aml.expired + metrics.aml.overdueReviews,
      trend: metrics.aml.overdueReviews > 5 ? 'declining' : 'stable',
      onClick: () => navigateToAML()
    },
    {
      name: 'Consumer Duty',
      icon: Scale,
      status: getSectionStatus(Math.round((metrics.consumerDuty.fullyCompliant / (metrics.consumerDuty.assessed || 1)) * 100)),
      score: Math.round((metrics.consumerDuty.fullyCompliant / (metrics.consumerDuty.assessed || 1)) * 100),
      issues: metrics.consumerDuty.needsAttention + metrics.consumerDuty.nonCompliant,
      trend: 'improving',
      onClick: () => navigateToConsumerDuty()
    }
  ] : []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Compliance Metrics Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Comprehensive compliance overview across all areas
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={fetchMetrics}
            variant="outline"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {metrics && (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <ScoreCard
                title="Compliance Score"
                value={`${metrics.summary.complianceScore}%`}
                trend={metrics.summary.complianceScoreTrend}
                icon={Shield}
                colorClass="text-blue-600"
                bgClass="bg-blue-50"
                onClick={() => router.push('/compliance')}
              />
              <ScoreCard
                title="QA Pass Rate"
                value={`${metrics.summary.qaPassRate}%`}
                trend={metrics.summary.qaPassRateTrend}
                icon={CheckCircle}
                colorClass="text-green-600"
                bgClass="bg-green-50"
                onClick={() => navigateToQA()}
              />
              <ScoreCard
                title="Open Issues"
                value={metrics.summary.openIssues}
                trend={metrics.summary.openIssuesTrend}
                trendLabel=""
                icon={AlertTriangle}
                colorClass="text-orange-600"
                bgClass="bg-orange-50"
                onClick={() => navigateToRegisters()}
              />
              <ScoreCard
                title="Overdue Reviews"
                value={metrics.summary.overdueReviews}
                icon={Clock}
                colorClass="text-red-600"
                bgClass="bg-red-50"
                onClick={() => navigateToQA('overdue')}
              />
              <ScoreCard
                title="High Risk Clients"
                value={metrics.summary.highRiskClients}
                icon={Users}
                colorClass="text-purple-600"
                bgClass="bg-purple-50"
                onClick={() => navigateToAML('high-risk')}
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Compliance Score Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Compliance Score Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.trends.complianceScore}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          dot={{ fill: COLORS.primary, strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Client Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(data) => navigateToAML(data.name.toLowerCase())}
                          style={{ cursor: 'pointer' }}
                        >
                          {riskDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Issues by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Issues by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={issuesByCategoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                        <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={80} />
                        <Tooltip />
                        <Bar dataKey="complaints" name="Complaints" fill={COLORS.warning} stackId="a" />
                        <Bar dataKey="breaches" name="Breaches" fill={COLORS.danger} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Consumer Duty Radar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Consumer Duty Outcomes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={consumerDutyRadarData}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="outcome" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar
                          name="Compliance %"
                          dataKey="score"
                          stroke={COLORS.primary}
                          fill={COLORS.primary}
                          fillOpacity={0.3}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Review Activity Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base font-medium">Review Activity (12 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.trends.reviewActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        name="Completed"
                        stroke={COLORS.success}
                        fill={COLORS.success}
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="due"
                        name="Due"
                        stroke={COLORS.gray}
                        fill={COLORS.gray}
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Section Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Section Breakdown</CardTitle>
                <p className="text-sm text-gray-500">Click any row to drill down into details</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:hidden">
                  {sectionRows.map((row) => {
                    const StatusIcon = SECTION_STATUS_CONFIG[row.status].icon
                    const TrendIcon = SECTION_TREND_CONFIG[row.trend].icon
                    return (
                      <button
                        key={row.name}
                        type="button"
                        onClick={row.onClick}
                        className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-gray-100 p-2">
                              <row.icon className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{row.name}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${SECTION_STATUS_CONFIG[row.status].bg} ${SECTION_STATUS_CONFIG[row.status].text}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {SECTION_STATUS_CONFIG[row.status].label}
                                </span>
                                <span className="text-gray-500">{row.issues} issues</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-[11px] uppercase text-gray-400">Score</p>
                            <p className="text-sm font-semibold text-gray-900">{row.score}%</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase text-gray-400">Issues</p>
                            <p className="text-sm font-semibold text-gray-900">{row.issues}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase text-gray-400">Trend</p>
                            <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${SECTION_TREND_CONFIG[row.trend].color}`}>
                              <TrendIcon className="h-3.5 w-3.5" />
                              {SECTION_TREND_CONFIG[row.trend].label}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Area</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Issues</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trend</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sectionRows.map((row) => (
                        <SectionRow key={row.name} {...row} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

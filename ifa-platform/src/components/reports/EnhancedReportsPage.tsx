'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useDocuments, useDocumentAnalytics, useAssessmentMetrics, useClientStatistics } from '@/lib/hooks/useDocuments'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DocumentError } from '@/types/document'  // ✅ FIXED: Proper import for error checking
import {
  FileTextIcon,
  TrendingUpIcon,
  DownloadIcon,
  CalendarIcon,
  BarChart3Icon,
  PieChartIcon,
  UserIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  FilterIcon,
  RefreshCwIcon,
  FileSpreadsheetIcon,
  PrinterIcon,
  ShareIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  Target,
  Shield,
  TrendingDownIcon,
  ClipboardCheckIcon
} from 'lucide-react'
import clientLogger from '@/lib/logging/clientLogger'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar
} from 'recharts'

// ===================================================================
// ENHANCED INTERFACES & TYPES
// ===================================================================

interface ReportDateRange {
  label: string
  value: string
  days: number
}

const DATE_RANGES: ReportDateRange[] = [
  { label: 'Last 7 days', value: '7', days: 7 },
  { label: 'Last 30 days', value: '30', days: 30 },
  { label: 'Last 90 days', value: '90', days: 90 },
  { label: 'Last 6 months', value: '180', days: 180 },
  { label: 'Last year', value: '365', days: 365 },
]

interface ExportFormat {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  label: string
  icon: React.ComponentType<any>
}

interface MetricTrend {
  current: number
  previous: number
  change: number
  changePercent: number
  direction: 'up' | 'down' | 'neutral'
}

interface EnhancedAnalytics {
  totalDocuments: number
  pendingSignatures: number
  completedSignatures: number
  complianceScore: number
  documentsThisMonth: number
  recentActivity?: Array<{
    id: string
    user_name: string
    action: string
    document_title: string
    created_at: string
  }>
  trends?: {
    documents: MetricTrend
    signatures: MetricTrend
    compliance: MetricTrend
  }
}

// ===================================================================
// ENHANCED REPORTS PAGE COMPONENT
// ===================================================================

export default function EnhancedReportsPage() {
  // State Management
  const [dateRange, setDateRange] = useState<string>('30')
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat['format']>('csv')
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [refreshInterval, setRefreshInterval] = useState<number>(30000) // 30 seconds
  const [showTrends, setShowTrends] = useState<boolean>(true)
  const [documentDateFilter, setDocumentDateFilter] = useState<string>('all')
  
  // Hooks with proper error handling
  const { analytics, loading: analyticsLoading, error: analyticsError, refresh: refreshAnalytics } = useDocumentAnalytics()
  const { documents, loading: documentsLoading, error: documentsError, refresh: refreshDocuments } = useDocuments()
  const { metrics: assessmentMetrics, loading: assessmentLoading } = useAssessmentMetrics()
  const { stats: clientStats, loading: clientStatsLoading } = useClientStatistics()

  // No sample data: only real data will render; charts will show empty states if no data

  // ===================================================================
  // CONSTANTS & CONFIGURATION
  // ===================================================================

  const EXPORT_FORMATS: ExportFormat[] = [
    { format: 'csv', label: 'CSV', icon: FileSpreadsheetIcon },
    { format: 'excel', label: 'Excel', icon: FileSpreadsheetIcon },
    { format: 'pdf', label: 'PDF', icon: PrinterIcon },
    { format: 'json', label: 'JSON', icon: FileTextIcon },
  ]


  // ===================================================================
  // AUTO-REFRESH FUNCTIONALITY
  // ===================================================================

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined

    if (autoRefresh) {
      interval = setInterval(() => {
        refreshAnalytics()
        refreshDocuments()
      }, refreshInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, refreshAnalytics, refreshDocuments])

  // ===================================================================
  // ENHANCED DOCUMENT METRICS CALCULATION
  // ===================================================================

  const documentMetrics = useMemo(() => {
    if (!documents || documents.length === 0) {
      return {
        byCategory: [],
        byStatus: [],
        byClient: [],
        recentUploads: [],
        complianceBreakdown: [],
        riskAnalysis: [],
        documentTurnover: 0
      }
    }

    // Enhanced categorization with better typing - prefer doc.type, then category name
    const byCategory = documents.reduce((acc: Record<string, number>, doc: any) => {
      // Try multiple sources for category: type field, document_categories join, category object
      const category = doc.type ||
        doc.document_categories?.name ||
        doc.category?.name ||
        'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    const byStatus = documents.reduce((acc: Record<string, number>, doc: any) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1
      return acc
    }, {})

    const byClient = documents.reduce((acc: Record<string, number>, doc: any) => {
      const client = doc.client_name || 'No Client Assigned'
      acc[client] = (acc[client] || 0) + 1
      return acc
    }, {})

    // Enhanced time-based analysis
    const now = new Date()
    const timeRanges = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      monthStart: new Date(now.getFullYear(), now.getMonth(), 1), // Start of current month
    }

    const recentUploads = documents.filter((doc: any) =>
      new Date(doc.created_at) > timeRanges.week
    )

    // Filter documents to this month for consistent metrics
    const documentsThisMonth = documents.filter((doc: any) =>
      new Date(doc.created_at) >= timeRanges.monthStart
    )

    // Compliance analysis with risk assessment
    const complianceBreakdown = documents.reduce((acc: Record<string, number>, doc: any) => {
      acc[doc.compliance_status || 'unknown'] = (acc[doc.compliance_status || 'unknown'] || 0) + 1
      return acc
    }, {})

    // Risk analysis based on document types and compliance - THIS MONTH ONLY
    const riskAnalysis = documentsThisMonth.reduce((acc: Record<string, { count: number; risk: 'low' | 'medium' | 'high' }>, doc: any) => {
      const docType = doc.type || 'unknown'
      const riskLevel = doc.compliance_status === 'non_compliant' ? 'high' :
                       doc.compliance_status === 'pending' ? 'medium' : 'low'

      if (!acc[docType]) {
        acc[docType] = { count: 0, risk: 'low' }
      }
      acc[docType].count += 1

      // Escalate risk level if any document in category is high risk
      if (riskLevel === 'high' || (riskLevel === 'medium' && acc[docType].risk === 'low')) {
        acc[docType].risk = riskLevel
      }

      return acc
    }, {})

    return {
      byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count: Number(count) })),
      byStatus: Object.entries(byStatus).map(([name, count]) => ({ name, count: Number(count) })),
      byClient: Object.entries(byClient).map(([name, count]) => ({ name, count: Number(count) })),
      recentUploads,
      complianceBreakdown: Object.entries(complianceBreakdown).map(([name, count]) => ({ name, count: Number(count) })),
      riskAnalysis: Object.entries(riskAnalysis).map(([name, data]) => ({ name, ...data })),
      documentTurnover: recentUploads.length
    }
  }, [documents])

  // ===================================================================
  // RISK SCORE CALCULATION
  // ===================================================================

  const calculateRiskScore = useCallback((): number => {
    const metrics = documentMetrics
    const nonCompliantDocs = metrics.complianceBreakdown.find(item => item.name === 'non_compliant')?.count || 0
    const totalDocs = documents?.length || 1
    const complianceRate = ((totalDocs - nonCompliantDocs) / totalDocs) * 100
    return Math.max(0, Math.round(complianceRate))
  }, [documentMetrics, documents])

  // ===================================================================
  // ENHANCED EXPORT FUNCTIONALITY
  // ===================================================================

  const exportReport = useCallback(async () => {
    const generateCSVReport = (data: any): string => {
      const headers = ['Metric', 'Value', 'Category', 'Change', 'Risk Level']
      const rows = [
        ['Total Documents', data.summary.totalDocuments, 'Overview', '', 'Low'],
        ['Pending Signatures', data.summary.pendingSignatures, 'Overview', '', 'Medium'],
        ['Completed Signatures', data.summary.completedSignatures, 'Overview', '', 'Low'],
        ['Compliance Score', `${data.summary.complianceScore}%`, 'Overview', '', data.summary.complianceScore < 70 ? 'High' : 'Low'],
        ['Risk Score', `${data.summary.riskScore}%`, 'Risk', '', data.summary.riskScore < 80 ? 'High' : 'Low'],
        ['Documents This Month', data.summary.documentsThisMonth, 'Overview', '', 'Low'],
        ['', '', '', '', ''], // Empty row
        ['Document Categories', '', 'Breakdown', '', ''],
        ...data.documentMetrics.byCategory.map((item: any) => [item.name, item.count, 'Category', '', 'Low']),
        ['', '', '', '', ''], // Empty row
        ['Document Status', '', 'Breakdown', '', ''],
        ...data.documentMetrics.byStatus.map((item: any) => [item.name, item.count, 'Status', '', 'Low']),
        ['', '', '', '', ''], // Empty row
        ['Risk Analysis', '', 'Risk Assessment', '', ''],
        ...data.documentMetrics.riskAnalysis.map((item: any) => [item.name, item.count, 'Risk', '', item.risk]),
      ]
      
      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    const generateExcelReport = (data: any): string => {
      // Simplified Excel format (would need proper library for full functionality)
      return generateCSVReport(data)
    }

    const generatePDFReport = (data: any): string => {
      // Simplified PDF generation (would need proper library for full functionality)
      return `Document Report - ${data.generatedAt}\n\n${JSON.stringify(data, null, 2)}`
    }

    setIsExporting(true)
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        dateRange: DATE_RANGES.find(range => range.value === dateRange)?.label || dateRange,
        reportType: 'Document Reports',
        analytics: analytics as EnhancedAnalytics,
        documentMetrics,
        totalDocuments: documents?.length || 0,
        summary: {
          totalDocuments: analytics?.totalDocuments || 0,
          pendingSignatures: analytics?.pendingSignatures || 0,
          completedSignatures: analytics?.completedSignatures || 0,
          complianceScore: analytics?.complianceScore || 0,
          documentsThisMonth: analytics?.documentsThisMonth || 0,
          riskScore: calculateRiskScore(),
        }
      }

      let content: string
      let filename: string
      let mimeType: string

      switch (exportFormat) {
        case 'csv':
          content = generateCSVReport(reportData)
          filename = `document-report-${new Date().toISOString().split('T')[0]}.csv`
          mimeType = 'text/csv'
          break
        case 'excel':
          content = generateExcelReport(reportData)
          filename = `document-report-${new Date().toISOString().split('T')[0]}.xlsx`
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case 'json':
          content = JSON.stringify(reportData, null, 2)
          filename = `document-report-${new Date().toISOString().split('T')[0]}.json`
          mimeType = 'application/json'
          break
        case 'pdf':
          content = generatePDFReport(reportData)
          filename = `document-report-${new Date().toISOString().split('T')[0]}.pdf`
          mimeType = 'application/pdf'
          break
        default:
          throw new Error('Unsupported export format')
      }

      // Enhanced download with progress tracking
      const blob = new Blob([content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
      
      // Show success message
      
    } catch (error) {
      clientLogger.error('Export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }, [exportFormat, dateRange, analytics, documentMetrics, documents, calculateRiskScore])

  // ===================================================================
  // CHART DATA HELPERS
  // ===================================================================

  // Chart data helpers
  const statusChartData = useMemo(() => {
    return (documentMetrics.byStatus || []).map((item) => ({
      name: item.name,
      value: Number(item.count) || 0
    }))
  }, [documentMetrics.byStatus])

  const complianceChartData = useMemo(() => {
    return (documentMetrics.complianceBreakdown || []).map((item) => ({
      name: item.name,
      value: Number(item.count) || 0
    }))
  }, [documentMetrics.complianceBreakdown])

  // Filtered documents for drill-down table based on date filter
  const filteredDocuments = useMemo(() => {
    if (!documents || documents.length === 0) return []

    const now = new Date()
    if (documentDateFilter === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return documents.filter((doc: any) => new Date(doc.created_at) >= monthStart)
    } else if (documentDateFilter === 'week') {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return documents.filter((doc: any) => new Date(doc.created_at) >= weekStart)
    }
    return documents
  }, [documents, documentDateFilter])

  const categoryChartData = useMemo(() => {
    return (documentMetrics.byCategory || []).map((item) => ({
      name: item.name,
      value: Number(item.count) || 0
    }))
  }, [documentMetrics.byCategory])

  const chartColors = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'reviewed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getComplianceColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskColor = (risk: 'low' | 'medium' | 'high'): string => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-GB').format(num)
  }

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`
  }

  // ===================================================================
  // ERROR HANDLING WITH PROPER TYPE CHECKING
  // ===================================================================

  const hasAuthError = (error: DocumentError | string | null): boolean => {
    if (!error) return false
    if (typeof error === 'string') return error.includes('Authentication')
    return error.message?.includes('Authentication') || error.code === 'AUTH_ERROR'
  }

  const getErrorMessage = (error: DocumentError | string | null): string => {
    if (!error) return ''
    if (typeof error === 'string') return error
    return error.message || 'An unknown error occurred'
  }

  // ===================================================================
  // LOADING STATE
  // ===================================================================

  if (analyticsLoading || documentsLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Reports</h1>
              <p className="text-gray-600 mt-1">Loading analytics and insights...</p>
            </div>
          </div>
          <div className="animate-pulse space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  // ===================================================================
  // ERROR STATE HANDLING
  // ===================================================================

  const analyticsAuthError = hasAuthError(analyticsError)
  const documentsAuthError = hasAuthError(documentsError)

  if (analyticsAuthError || documentsAuthError) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Document Reports</h1>
          </div>
          <Card className="p-6 border-amber-200 bg-amber-50">
            <div className="flex items-center">
              <AlertTriangleIcon className="h-5 w-5 text-amber-600 mr-2" />
              <div>
                <p className="text-amber-800 font-medium">Initializing document system...</p>
                <p className="text-amber-700 text-sm mt-1">Please refresh the page in a moment.</p>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    )
  }

  // ===================================================================
  // MAIN COMPONENT RENDER
  // ===================================================================

  return (
    <Layout>
      <div className="space-y-6">
        {/* Enhanced Header with Controls */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Reports</h1>
            <p className="text-gray-600 mt-1">Advanced analytics and insights for your document management</p>
            {autoRefresh && (
              <div className="flex items-center mt-2 text-sm text-green-600">
                <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                Auto-refreshing every {refreshInterval / 1000}s
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {DATE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>

            {/* Export Controls */}
            <div className="flex items-center space-x-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat['format'])}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {EXPORT_FORMATS.map((format) => (
                  <option key={format.format} value={format.format}>
                    {format.label}
                  </option>
                ))}
              </select>
              
              <Button 
                onClick={exportReport}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>

            {/* Auto-refresh Toggle */}
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {(analyticsError && !analyticsAuthError) && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center">
              <AlertTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700">Analytics Error: {getErrorMessage(analyticsError)}</p>
            </div>
          </Card>
        )}

        {(documentsError && !documentsAuthError) && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center">
              <AlertTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700">Documents Error: {getErrorMessage(documentsError)}</p>
            </div>
          </Card>
        )}

        {/* Enhanced Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {/* Total Documents */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <FileTextIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics?.totalDocuments || 0)}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                    +{analytics?.documentsThisMonth || 0} this month
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Pending Signatures */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Pending Signatures</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics?.pendingSignatures || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Completed Signatures */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Completed Signatures</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics?.completedSignatures || 0)}</p>
                  <p className="text-xs text-green-600 mt-1">Ready for processing</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Clients with Documents */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100">
                  <UsersIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Clients with Documents</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics?.clientMetrics?.activeClients || 0} / {clientStats?.totalClients || 0}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {clientStats?.totalClients
                      ? Math.round(((analytics?.clientMetrics?.activeClients || 0) / clientStats.totalClients) * 100)
                      : 0}% coverage
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Assessments Completed */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-indigo-100">
                  <ClipboardCheckIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Assessments Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(assessmentMetrics?.assessmentStats?.totalAssessments || 0)}
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">
                    ATR: {assessmentMetrics?.assessmentStats?.byType?.atr || 0} |
                    CFL: {assessmentMetrics?.assessmentStats?.byType?.cfl || 0} |
                    Persona: {assessmentMetrics?.assessmentStats?.byType?.persona || 0}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Assessment Coverage */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-teal-100">
                  <Target className="h-6 w-6 text-teal-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Assessment Coverage</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assessmentMetrics?.clientCoverage?.percentage || 0}%
                  </p>
                  <p className="text-xs text-teal-600 mt-1">
                    {assessmentMetrics?.clientCoverage?.assessed || 0} of {assessmentMetrics?.clientCoverage?.total || 0} clients assessed
                  </p>
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* Enhanced Charts Section - Visual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documents by Category - PIE CHART */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Documents by Category</h3>
              <Badge className="bg-blue-100 text-blue-800">
                {documentMetrics.byCategory.reduce((sum, cat) => sum + cat.count, 0)} Total
              </Badge>
            </div>
            {categoryChartData.length > 0 ? (
              <div className="flex items-center">
                <div className="w-1/2">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => [value, 'Documents']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2">
                  {categoryChartData.slice(0, 5).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        <span className="text-gray-600 truncate max-w-[100px]">{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <PieChartIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No category data available</p>
              </div>
            )}
          </Card>

          {/* Document Status - BAR CHART */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Document Status Distribution</h3>
              <Badge className="bg-green-100 text-green-800">
                {statusChartData.reduce((sum, s) => sum + s.value, 0)} Total
              </Badge>
            </div>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={80}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [value, 'Documents']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <BarChart3Icon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No status data available</p>
              </div>
            )}
          </Card>
        </div>

        {/* Signatures Row */}
        <div className="grid grid-cols-1 gap-6">
          {/* Signature Funnel */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Signature Pipeline</h3>
              <Badge className="bg-purple-100 text-purple-800">
                {(analytics?.pendingSignatures || 0) + (analytics?.completedSignatures || 0)} Total
              </Badge>
            </div>
            <div className="space-y-4">
              {/* Signature Funnel Visualization */}
              <div className="relative">
                {/* Pending Signatures */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Pending Signatures</span>
                    <span className="font-semibold text-yellow-600">{analytics?.pendingSignatures || 0}</span>
                  </div>
                  <div className="h-8 bg-yellow-100 rounded-lg relative overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                      style={{
                        width: `${Math.max(10, ((analytics?.pendingSignatures || 0) / Math.max(1, (analytics?.pendingSignatures || 0) + (analytics?.completedSignatures || 0))) * 100)}%`
                      }}
                    >
                      {analytics?.pendingSignatures || 0}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center my-2">
                  <ArrowDownIcon className="h-5 w-5 text-gray-400" />
                </div>

                {/* Completed Signatures */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Completed Signatures</span>
                    <span className="font-semibold text-green-600">{analytics?.completedSignatures || 0}</span>
                  </div>
                  <div className="h-8 bg-green-100 rounded-lg relative overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                      style={{
                        width: `${Math.max(10, ((analytics?.completedSignatures || 0) / Math.max(1, (analytics?.pendingSignatures || 0) + (analytics?.completedSignatures || 0))) * 100)}%`
                      }}
                    >
                      {analytics?.completedSignatures || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className={`text-lg font-bold ${
                    ((analytics?.completedSignatures || 0) / Math.max(1, (analytics?.pendingSignatures || 0) + (analytics?.completedSignatures || 0))) * 100 >= 50
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}>
                    {formatPercentage(
                      ((analytics?.completedSignatures || 0) / Math.max(1, (analytics?.pendingSignatures || 0) + (analytics?.completedSignatures || 0))) * 100
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Document Activity Trends - LINE CHART (Real Data) */}
        {(analytics as any)?.dailyTrends && (analytics as any).dailyTrends.some((d: any) => d.documents > 0) && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Document Activity Trends</h3>
              <Badge className="bg-indigo-100 text-indigo-800">Last 7 Days</Badge>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={(analytics as any)?.dailyTrends || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorDocuments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: number) => [value, 'Documents']}
                />
                <Area
                  type="monotone"
                  dataKey="documents"
                  name="Documents Created"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorDocuments)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Client-Centric Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documents by Client - Horizontal Bar Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Documents by Client</h3>
              <Badge className="bg-purple-100 text-purple-800">
                {documentMetrics.byClient.length} Clients
              </Badge>
            </div>
            {documentMetrics.byClient.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={documentMetrics.byClient.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(value: number) => [value, 'Documents']}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No client document data available</p>
              </div>
            )}
          </Card>

          {/* Assessment Coverage by Type - Stacked Bar */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assessment Coverage by Type</h3>
              <Badge className="bg-indigo-100 text-indigo-800">
                {assessmentMetrics?.clientCoverage?.assessed || 0} Assessed
              </Badge>
            </div>
            {assessmentMetrics?.assessmentStats?.byType ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'ATR', count: assessmentMetrics.assessmentStats.byType.atr || 0, fill: '#10b981' },
                    { name: 'CFL', count: assessmentMetrics.assessmentStats.byType.cfl || 0, fill: '#3b82f6' },
                    { name: 'Persona', count: assessmentMetrics.assessmentStats.byType.persona || 0, fill: '#8b5cf6' },
                    { name: 'Suitability', count: assessmentMetrics.assessmentStats.byType.suitability || 0, fill: '#f59e0b' },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(value: number) => [value, 'Assessments']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {[
                      { name: 'ATR', fill: '#10b981' },
                      { name: 'CFL', fill: '#3b82f6' },
                      { name: 'Persona', fill: '#8b5cf6' },
                      { name: 'Suitability', fill: '#f59e0b' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <ClipboardCheckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No assessment data available</p>
              </div>
            )}
          </Card>
        </div>

        {/* Risk Analysis Section - Only show if has data */}
        {documentMetrics.riskAnalysis.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Risk Analysis by Document Type</h3>
                <p className="text-sm text-gray-500">
                  {documentMetrics.riskAnalysis.reduce((sum, item) => sum + item.count, 0)} documents this month
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">This Month</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documentMetrics.riskAnalysis.slice(0, 6).map((item) => (
                <div key={item.name} className={`p-4 rounded-lg border ${getRiskColor(item.risk)}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium capitalize">{item.name.replace(/_/g, ' ')}</h4>
                    <Badge className={getRiskColor(item.risk).replace('text-', 'bg-').replace('bg-', 'text-').replace('-600', '-800')}>
                      {item.risk.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold mt-2">{item.count}</p>
                  <p className="text-xs mt-1">documents</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Document Drill-Down Table - ALL documents with filtering */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Document Drill-Down</h3>
              <p className="text-sm text-gray-500">
                Showing {filteredDocuments.length} of {documents?.length || 0} documents
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={documentDateFilter}
                onChange={(e) => setDocumentDateFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="month">This Month</option>
                <option value="week">This Week</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => refreshDocuments()}>
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-96 overflow-y-auto">
              {filteredDocuments.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700">Document</th>
                      <th className="text-left p-3 font-medium text-gray-700">Client</th>
                      <th className="text-left p-3 font-medium text-gray-700">Type</th>
                      <th className="text-left p-3 font-medium text-gray-700">Status</th>
                      <th className="text-left p-3 font-medium text-gray-700">Created</th>
                      <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDocuments.map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileTextIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate max-w-[200px]">
                              {doc.name || doc.title || 'Untitled Document'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          {doc.client_id ? (
                            <a
                              href={`/clients/${doc.client_id}`}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <UserIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">
                                {doc.client_name || doc.clients?.personal_details?.firstName
                                  ? `${doc.clients?.personal_details?.firstName || ''} ${doc.clients?.personal_details?.lastName || ''}`.trim()
                                  : doc.clients?.client_ref || 'View Client'}
                              </span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400">
                              <UserIcon className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">No Client</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-gray-600 capitalize">
                            {(doc.type || doc.document_categories?.name || doc.category?.name || 'Uncategorized').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge className={
                            doc.status === 'active' || doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                            doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            doc.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {doc.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/documents/${doc.id}`, '_blank')}
                            className="text-gray-500 hover:text-blue-600"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <FileTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No documents found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {documentDateFilter !== 'all'
                      ? 'Try adjusting the date filter'
                      : 'Documents will appear here once created'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Enhanced Activity & Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Button variant="outline" size="sm" onClick={() => {refreshAnalytics(); refreshDocuments()}}>
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                analytics.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                  <div key={activity.id || index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FileTextIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user_name}</span> {activity.action}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{activity.document_title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleDateString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </Card>

          {/* Top Clients */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Clients</h3>
              <span className="text-xs text-gray-500">By document count</span>
            </div>
            <div className="space-y-3">
              {documentMetrics.byClient.length > 0 ? (
                documentMetrics.byClient.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                        <UserIcon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {item.name.length > 20 ? `${item.name.substring(0, 20)}...` : item.name}
                        </span>
                        <p className="text-xs text-gray-500">#{index + 1} client</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{formatNumber(item.count)}</span>
                      <p className="text-xs text-gray-500">docs</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No client data available</p>
                </div>
              )}
            </div>
          </Card>

          {/* Weekly Activity Stats - Real Data */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Summary</h3>
              <Badge className="bg-green-100 text-green-800">Real Data</Badge>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Documents This Week</span>
                  <span className="text-sm font-bold text-gray-900">
                    {analytics?.documentsThisWeek || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Documents Today</span>
                  <span className="text-sm font-bold text-gray-900">
                    {analytics?.documentsToday || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Created today</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recent Uploads</span>
                  <span className="text-sm font-bold text-gray-900">
                    {documentMetrics.documentTurnover}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Documents this week</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Monthly Comparison Stats */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Performance Summary</h3>
            <Badge className="bg-indigo-100 text-indigo-800">This Month vs Last Month</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Documents This Month */}
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-3">
                <FileTextIcon className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{analytics?.documentsThisMonth || 0}</p>
              <p className="text-sm text-blue-600 mt-1">Documents This Month</p>
              <div className="flex items-center justify-center mt-2 text-xs">
                {(analytics?.documentsThisMonth || 0) >= (analytics?.trends?.documents?.previous || 0) ? (
                  <span className="text-green-600 flex items-center">
                    <ArrowUpIcon className="h-3 w-3 mr-1" />
                    {Math.abs((analytics?.trends?.documents?.changePercent || 0)).toFixed(1)}% vs last month
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <ArrowDownIcon className="h-3 w-3 mr-1" />
                    {Math.abs((analytics?.trends?.documents?.changePercent || 0)).toFixed(1)}% vs last month
                  </span>
                )}
              </div>
            </div>

            {/* Total Clients */}
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500 rounded-full mb-3">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-purple-700">{analytics?.clientMetrics?.totalClients || 0}</p>
              <p className="text-sm text-purple-600 mt-1">Total Clients</p>
              <div className="flex items-center justify-center mt-2 text-xs">
                <span className="text-purple-600">{analytics?.clientMetrics?.activeClients || 0} active</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

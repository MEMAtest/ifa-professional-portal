// app/reports/page.tsx
// ENHANCED: Real analytics integration with export functionality

'use client'

import { useState, useMemo } from 'react'
import { useDocumentAnalytics, useDocuments } from '@/hooks/useDocuments'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  FileTextIcon, 
  TrendingUpIcon, 
  DownloadIcon,
  CalendarIcon,
  BarChart3Icon,
  PieChartIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  FilterIcon
} from 'lucide-react'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('30') // days
  const [reportType, setReportType] = useState('overview')
  const [isExporting, setIsExporting] = useState(false)
  
  const { analytics, loading: analyticsLoading, error: analyticsError } = useDocumentAnalytics()
  const { documents, loading: documentsLoading } = useDocuments()

  // Calculate additional metrics from documents
  const documentMetrics = useMemo(() => {
    if (!documents || documents.length === 0) {
      return {
        byCategory: [],
        byStatus: [],
        byClient: [],
        recentUploads: [],
        complianceBreakdown: []
      }
    }

    // Group by category
    const byCategory = documents.reduce((acc: Record<string, number>, doc: any) => {
      const category = doc.category?.name || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    // Group by status
    const byStatus = documents.reduce((acc: Record<string, number>, doc: any) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1
      return acc
    }, {})

    // Group by client
    const byClient = documents.reduce((acc: Record<string, number>, doc: any) => {
      const client = doc.client_name || 'No Client Assigned'
      acc[client] = (acc[client] || 0) + 1
      return acc
    }, {})

    // Recent uploads (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentUploads = documents.filter((doc: any) => 
      new Date(doc.created_at) > sevenDaysAgo
    )

    // Compliance breakdown
    const complianceBreakdown = documents.reduce((acc: Record<string, number>, doc: any) => {
      acc[doc.compliance_status] = (acc[doc.compliance_status] || 0) + 1
      return acc
    }, {})

    return {
      byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count })),
      byStatus: Object.entries(byStatus).map(([name, count]) => ({ name, count })),
      byClient: Object.entries(byClient).map(([name, count]) => ({ name, count })),
      recentUploads,
      complianceBreakdown: Object.entries(complianceBreakdown).map(([name, count]) => ({ name, count }))
    }
  }, [documents])

  const exportReport = async () => {
    setIsExporting(true)
    try {
      // Prepare report data
      const reportData = {
        generatedAt: new Date().toISOString(),
        dateRange,
        analytics,
        documentMetrics,
        totalDocuments: documents?.length || 0,
        summary: {
          totalDocuments: analytics?.totalDocuments || 0,
          pendingSignatures: analytics?.pendingSignatures || 0,
          completedSignatures: analytics?.completedSignatures || 0,
          complianceScore: analytics?.complianceScore || 0,
          documentsThisMonth: analytics?.documentsThisMonth || 0
        }
      }

      // Create CSV export
      const csvContent = generateCSVReport(reportData)
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `document-report-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const generateCSVReport = (data: any) => {
    const headers = ['Metric', 'Value', 'Category']
    const rows = [
      ['Total Documents', data.summary.totalDocuments, 'Overview'],
      ['Pending Signatures', data.summary.pendingSignatures, 'Overview'],
      ['Completed Signatures', data.summary.completedSignatures, 'Overview'],
      ['Compliance Score', `${data.summary.complianceScore}%`, 'Overview'],
      ['Documents This Month', data.summary.documentsThisMonth, 'Overview'],
      ['', '', ''], // Empty row
      ['Document Categories', '', 'Breakdown'],
      ...data.documentMetrics.byCategory.map((item: any) => [item.name, item.count, 'Category']),
      ['', '', ''], // Empty row
      ['Document Status', '', 'Breakdown'],
      ...data.documentMetrics.byStatus.map((item: any) => [item.name, item.count, 'Status']),
      ['', '', ''], // Empty row
      ['Client Distribution', '', 'Breakdown'],
      ...data.documentMetrics.byClient.slice(0, 10).map((item: any) => [item.name, item.count, 'Client'])
    ]
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'reviewed':
        return 'bg-green-100 text-green-800'
      case 'active':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (analyticsLoading || documentsLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Document Reports</h1>
          </div>
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Reports</h1>
            <p className="text-gray-600 mt-1">Analytics and insights for your document management</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <Button 
              onClick={exportReport}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700"
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Report'}
            </Button>
          </div>
        </div>

        {/* Error State */}
        {analyticsError && (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center">
              <AlertTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700">{analyticsError}</p>
            </div>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <FileTextIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalDocuments || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  +{analytics?.documentsThisMonth || 0} this month
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pending Signatures</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.pendingSignatures || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Awaiting response
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Completed Signatures</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.completedSignatures || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  Ready for processing
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <TrendingUpIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Compliance Score</p>
                <p className={`text-2xl font-bold ${getComplianceColor(analytics?.complianceScore || 0)}`}>
                  {analytics?.complianceScore || 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Review completion rate
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Categories */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Documents by Category</h3>
              <PieChartIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {documentMetrics.byCategory.slice(0, 5).map((item, index) => {
                const total = documentMetrics.byCategory.reduce((sum, cat) => sum + cat.count, 0)
                const percentage = total > 0 ? Math.round((Number(item.count) / total) * 100) : 0
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 bg-blue-${(index + 1) * 100}`}></div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">{Number(item.count)}</span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Document Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Document Status</h3>
              <BarChart3Icon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {documentMetrics.byStatus.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className={getStatusColor(item.name)}>
                      {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{Number(item.count)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Activity & Top Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {analytics?.recentActivity?.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileTextIcon className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user_name}</span> {activity.action} document
                    </p>
                    <p className="text-sm text-gray-600 truncate">{activity.document_title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </Card>

          {/* Top Clients */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Clients by Documents</h3>
            <div className="space-y-3">
              {documentMetrics.byClient.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      <UserIcon className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700 truncate">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{Number(item.count)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Compliance Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Status Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documentMetrics.complianceBreakdown.map((item) => (
              <div key={item.name} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{Number(item.count)}</p>
                <p className="text-sm text-gray-600 capitalize">{item.name}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  )
}
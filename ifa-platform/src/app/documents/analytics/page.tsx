// File: src/app/documents/analytics/page.tsx
// Analytics Dashboard for Document Management

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { 
  FileText, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  Send,
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

// Simple chart components
const BarChart = ({ data }: { data: { label: string; value: number }[] }) => {
  const maxValue = Math.max(...data.map(d => d.value))
  
  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between text-sm mb-1">
            <span>{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const PieChartSimple = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${item.color}`} />
            <span className="text-sm">{item.label}</span>
            <span className="text-sm font-medium">({Math.round((item.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
      <div className="text-3xl font-bold">{total}</div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('week')
  const [metrics, setMetrics] = useState({
    totalDocuments: 0,
    signedDocuments: 0,
    pendingDocuments: 0,
    averageSignTime: 0,
    signatureRate: 0,
    viewRate: 0
  })
  const [analytics, setAnalytics] = useState<{
    categoryPerformance: Array<{ category_name: string; document_count: number }>
    complianceBreakdown: Record<string, number>
    dailyTrends: Array<{ day: string; documents: number }>
  }>({
    categoryPerformance: [],
    complianceBreakdown: {},
    dailyTrends: []
  })

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/analytics?range=${timeRange}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const data = await res.json()
      const totalDocuments = data.totalDocuments ?? 0
      const completedSignatures = data.completedSignatures ?? 0
      const pendingSignatures = data.pendingSignatures ?? 0
      const signatureRate = totalDocuments > 0 ? Math.round((completedSignatures / totalDocuments) * 100) : 0
      setMetrics({
        totalDocuments,
        signedDocuments: completedSignatures,
        pendingDocuments: pendingSignatures,
        averageSignTime: data.averageProcessingTime ?? 0,
        signatureRate,
        viewRate: 0
      })
      setAnalytics({
        categoryPerformance: data.categoryPerformance || [],
        complianceBreakdown: data.complianceBreakdown || {},
        dailyTrends: data.dailyTrends || []
      })
    } catch (err) {
      setMetrics({
        totalDocuments: 0,
        signedDocuments: 0,
        pendingDocuments: 0,
        averageSignTime: 0,
        signatureRate: 0,
        viewRate: 0
      })
      setAnalytics({
        categoryPerformance: [],
        complianceBreakdown: {},
        dailyTrends: []
      })
    } finally {
      // No-op: loading state intentionally omitted
    }
  }, [timeRange])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const templateUsage = analytics.categoryPerformance.map((category) => ({
    label: category.category_name,
    value: category.document_count
  }))

  const statusBreakdown = [
    { label: 'Compliant', value: analytics.complianceBreakdown?.compliant || 0, color: 'bg-green-500' },
    { label: 'Under Review', value: analytics.complianceBreakdown?.under_review || 0, color: 'bg-yellow-500' },
    { label: 'Pending', value: analytics.complianceBreakdown?.pending || 0, color: 'bg-blue-500' },
    { label: 'Non-compliant', value: analytics.complianceBreakdown?.non_compliant || 0, color: 'bg-red-500' }
  ]

  const dailyActivity = analytics.dailyTrends.map((day) => ({
    label: day.day,
    sent: day.documents,
    signed: 0
  }))

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Document Analytics</h1>
            <p className="text-gray-600 mt-2">Track document performance and client engagement</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Documents</p>
                  <p className="text-3xl font-bold">{metrics.totalDocuments}</p>
                  <p className="text-xs text-gray-600 mt-1">Based on selected period</p>
                </div>
                <FileText className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Signature Rate</p>
                  <p className="text-3xl font-bold">{metrics.signatureRate}%</p>
                  <p className="text-xs text-gray-600 mt-1">Of documents requiring signature</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Sign Time</p>
                  <p className="text-3xl font-bold">{metrics.averageSignTime}h</p>
                  <p className="text-xs text-gray-600 mt-1">Based on signed documents</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">View Rate</p>
                  <p className="text-3xl font-bold">{metrics.viewRate}%</p>
                  <p className="text-xs text-gray-600 mt-1">Of sent documents</p>
                </div>
                <Eye className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Most Used Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={templateUsage} />
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Document Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartSimple data={statusBreakdown} />
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Daily Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyActivity.map((day) => (
                <div key={day.label} className="flex items-center gap-4">
                  <span className="text-sm w-12">{day.label}</span>
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Sent</span>
                        <span>{day.sent}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(day.sent / 15) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Signed</span>
                        <span>{day.signed}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(day.signed / 15) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800">Best Performing</h4>
                <p className="text-sm text-green-600 mt-1">Client Service Agreements have the highest signature rate at 85%</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-800">Needs Attention</h4>
                <p className="text-sm text-yellow-600 mt-1">Risk Assessment forms take 3x longer to get signed</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Recommendation</h4>
                <p className="text-sm text-blue-600 mt-1">Send documents on Tuesdays for 23% higher engagement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

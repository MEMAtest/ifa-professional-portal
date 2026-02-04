// components/clients/ActivityTab.tsx
// ================================================================
// Unified Activity Timeline for Client Hub
// Shows all client interactions, assessments, documents, reviews
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  Shield,
  DollarSign,
  Calendar,
  TrendingUp,
  Upload,
  Download,
  Edit,
  Eye,
  Star,
  AlertOctagon,
  UserCheck,
  Filter,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import clientLogger from '@/lib/logging/clientLogger'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ActivityItem {
  id: string
  type: 'assessment' | 'document' | 'review' | 'complaint' | 'vulnerability' | 'profile_update' | 'communication' | 'fee_change' | 'risk_change'
  title: string
  description: string
  timestamp: string
  user?: string
  metadata?: Record<string, unknown>
  status?: 'completed' | 'pending' | 'failed'
  priority?: 'high' | 'medium' | 'low'
}

interface Props {
  clientId: string
  clientName?: string
}

export default function ActivityTab({ clientId, clientName }: Props) {
  const supabase = createClient()

  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [daysFilter, setDaysFilter] = useState<14 | 30 | 'all'>(30)

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true)
      const allActivities: ActivityItem[] = []

      // Helper function to safely query a table (handles missing tables gracefully)
      const safeQuery = async <T,>(
        tableName: string,
        query: () => Promise<{ data: T[] | null; error: any }>
      ): Promise<T[]> => {
        try {
          const { data, error } = await query()
          if (error) {
            // 406 = Not Acceptable (often table doesn't exist), 42P01 = undefined table
            if (error.code === '42P01' || error.message?.includes('does not exist') || error.status === 406) {
              console.warn(`Table ${tableName} not available:`, error.message)
              return []
            }
            clientLogger.error(`Error querying ${tableName}:`, error)
            return []
          }
          return data || []
        } catch (err) {
          console.warn(`Failed to query ${tableName}:`, err)
          return []
        }
      }

      // 1. Load assessments
      const assessments = await safeQuery('assessments', () =>
        supabase
          .from('assessments')
          .select('id, assessment_type, status, created_at, updated_at, completed_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      )

      assessments.forEach((a: any) => {
        allActivities.push({
          id: `assessment-${a.id}`,
          type: 'assessment',
          title: `${formatAssessmentType(a.assessment_type)} Assessment`,
          description: a.status === 'completed'
            ? `Assessment completed successfully`
            : `Assessment ${a.status}`,
          timestamp: a.completed_at || a.updated_at || a.created_at,
          status: a.status === 'completed' ? 'completed' : 'pending',
          metadata: { assessmentType: a.assessment_type }
        })
      })

      // 2. Load documents
      const documents = await safeQuery('documents', () =>
        supabase
          .from('documents')
          .select('id, name, status, document_type, created_at, updated_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      )

      documents.forEach((d: any) => {
        allActivities.push({
          id: `document-${d.id}`,
          type: 'document',
          title: d.name || 'Document',
          description: getDocumentDescription(d.status, d.document_type),
          timestamp: d.updated_at || d.created_at,
          status: d.status === 'signed' ? 'completed' : d.status === 'rejected' ? 'failed' : 'pending',
          metadata: { documentType: d.document_type, documentStatus: d.status }
        })
      })

      // 3. Load file reviews (compliance)
      const reviews = await safeQuery('file_reviews', () =>
        supabase
          .from('file_reviews')
          .select('id, review_type, status, findings, risk_rating, created_at, completed_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      )

      reviews.forEach((r: any) => {
        allActivities.push({
          id: `review-${r.id}`,
          type: 'review',
          title: `${formatReviewType(r.review_type)} Review`,
          description: r.status === 'approved'
            ? 'Review passed - all checks complete'
            : r.status === 'rejected'
            ? `Review failed: ${r.findings?.substring(0, 50)}...`
            : `Review ${r.status}`,
          timestamp: r.completed_at || r.created_at,
          status: r.status === 'approved' ? 'completed' : r.status === 'rejected' ? 'failed' : 'pending',
          priority: r.risk_rating === 'high' || r.risk_rating === 'critical' ? 'high' : 'medium',
          metadata: { reviewType: r.review_type, riskRating: r.risk_rating }
        })
      })

      // 4. Load complaints
      const complaints = await safeQuery('complaint_register', () =>
        supabase
          .from('complaint_register')
          .select('id, reference_number, category, status, description, created_at, resolution_date')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      )

      complaints.forEach((c: any) => {
        allActivities.push({
          id: `complaint-${c.id}`,
          type: 'complaint',
          title: `Complaint ${c.reference_number}`,
          description: c.description?.substring(0, 80) + (c.description?.length > 80 ? '...' : ''),
          timestamp: c.resolution_date || c.created_at,
          status: c.status === 'resolved' || c.status === 'closed' ? 'completed' : 'pending',
          priority: 'high',
          metadata: { category: c.category, complaintStatus: c.status }
        })
      })

      // 5. Load vulnerability records
      const vulnerabilities = await safeQuery('vulnerability_register', () =>
        supabase
          .from('vulnerability_register')
          .select('id, vulnerability_type, severity, status, description, created_at, updated_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      )

      vulnerabilities.forEach((v: any) => {
        allActivities.push({
          id: `vulnerability-${v.id}`,
          type: 'vulnerability',
          title: `Vulnerability Assessment: ${formatVulnerabilityType(v.vulnerability_type)}`,
          description: v.description || `${v.severity} severity - ${v.status}`,
          timestamp: v.updated_at || v.created_at,
          status: v.status === 'resolved' ? 'completed' : 'pending',
          priority: v.severity === 'high' ? 'high' : v.severity === 'medium' ? 'medium' : 'low',
          metadata: { vulnerabilityType: v.vulnerability_type, severity: v.severity }
        })
      })

      // 6. Load client services/PROD records (may not exist yet - handle gracefully)
      const services = await safeQuery('client_services', () =>
        supabase
          .from('client_services')
          .select('id, services_selected, platform_selected, created_at, updated_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      )

      services.forEach((s: any) => {
        const serviceList = Array.isArray(s.services_selected) ? s.services_selected : []
        allActivities.push({
          id: `service-${s.id}`,
          type: 'profile_update',
          title: 'Service Selection Updated',
          description: serviceList.length > 0
            ? `Services: ${serviceList.slice(0, 3).join(', ')}${serviceList.length > 3 ? '...' : ''}`
            : 'Service selection recorded',
          timestamp: s.updated_at || s.created_at,
          status: 'completed',
          metadata: { platform: s.platform_selected }
        })
      })

      // 7. Load client reviews (lifecycle reviews)
      const clientReviews = await safeQuery('client_reviews', () =>
        supabase
          .from('client_reviews')
          .select('id, review_type, status, due_date, completed_date, review_summary, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      )

      clientReviews.forEach((cr: any) => {
        allActivities.push({
          id: `client-review-${cr.id}`,
          type: 'review',
          title: `${cr.review_type?.charAt(0).toUpperCase() + cr.review_type?.slice(1)} Review`,
          description: cr.review_summary || (cr.status === 'completed' ? 'Review completed' : `Due: ${new Date(cr.due_date).toLocaleDateString('en-GB')}`),
          timestamp: cr.completed_date || cr.created_at,
          status: cr.status === 'completed' ? 'completed' : 'pending',
          metadata: { reviewType: cr.review_type }
        })
      })

      // 8. Load profile updates (activity log)
      const profileUpdates = await safeQuery('activity_log', () =>
        supabase
          .from('activity_log')
          .select('id, action, type, date, user_name, metadata')
          .eq('client_id', clientId)
          .eq('type', 'profile_update')
          .order('date', { ascending: false })
      )

      profileUpdates.forEach((entry: any) => {
        allActivities.push({
          id: `activity-${entry.id}`,
          type: 'profile_update',
          title: 'Profile Updated',
          description: entry.action || 'Client profile updated',
          timestamp: entry.date || new Date().toISOString(),
          status: 'completed',
          user: entry.user_name || undefined,
          metadata: entry.metadata || {}
        })
      })

      // 9. Load communications
      const communications = await safeQuery('communications', () =>
        supabase
          .from('communications')
          .select('id, type, subject, content, status, date, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      )

      communications.forEach((comm: any) => {
        allActivities.push({
          id: `comm-${comm.id}`,
          type: 'communication',
          title: comm.subject || `${comm.type?.charAt(0).toUpperCase() + comm.type?.slice(1)} Communication`,
          description: comm.content?.substring(0, 80) + (comm.content?.length > 80 ? '...' : '') || '',
          timestamp: comm.date || comm.created_at,
          status: comm.status === 'completed' ? 'completed' : 'pending',
          metadata: { communicationType: comm.type }
        })
      })

      // Sort all activities by timestamp (newest first)
      allActivities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setActivities(allActivities)
    } catch (error) {
      clientLogger.error('Error loading activities:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [supabase, clientId])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const formatAssessmentType = (type: string): string => {
    const types: Record<string, string> = {
      'atr': 'Attitude to Risk',
      'cfl': 'Capacity for Loss',
      'suitability': 'Suitability',
      'persona': 'Investor Persona',
      'kyc': 'KYC'
    }
    return types[type] || type
  }

  const formatReviewType = (type: string): string => {
    const types: Record<string, string> = {
      'new_business': 'New Business',
      'annual_review': 'Annual',
      'complaint': 'Complaint',
      'ad_hoc': 'Ad-hoc'
    }
    return types[type] || type
  }

  const formatVulnerabilityType = (type: string): string => {
    const types: Record<string, string> = {
      'health': 'Health',
      'life_events': 'Life Events',
      'resilience': 'Resilience',
      'capability': 'Capability'
    }
    return types[type] || type
  }

  const getDocumentDescription = (status: string, type: string): string => {
    const statusText = {
      'draft': 'Document created',
      'pending_signature': 'Awaiting signature',
      'signed': 'Document signed',
      'rejected': 'Document rejected',
      'expired': 'Document expired'
    }[status] || status

    return `${statusText}${type ? ` (${type})` : ''}`
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    const icons = {
      assessment: FileText,
      document: Upload,
      review: Eye,
      complaint: AlertOctagon,
      vulnerability: Shield,
      profile_update: Edit,
      communication: MessageSquare,
      fee_change: DollarSign,
      risk_change: TrendingUp
    }
    return icons[type] || Activity
  }

  const getActivityColor = (type: ActivityItem['type'], status?: string) => {
    if (status === 'failed') return 'bg-red-100 text-red-600'
    if (status === 'pending') return 'bg-yellow-100 text-yellow-600'

    const colors: Record<string, string> = {
      assessment: 'bg-blue-100 text-blue-600',
      document: 'bg-purple-100 text-purple-600',
      review: 'bg-green-100 text-green-600',
      complaint: 'bg-red-100 text-red-600',
      vulnerability: 'bg-orange-100 text-orange-600',
      profile_update: 'bg-gray-100 text-gray-600',
      communication: 'bg-indigo-100 text-indigo-600',
      fee_change: 'bg-emerald-100 text-emerald-600',
      risk_change: 'bg-cyan-100 text-cyan-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const filteredActivities = activities.filter(a => {
    // Type filter
    if (filter !== 'all' && a.type !== filter) return false

    // Days filter
    if (daysFilter !== 'all') {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysFilter)
      const activityDate = new Date(a.timestamp)
      if (activityDate < cutoffDate) return false
    }

    return true
  })

  // Calculate monthly activity data for the chart
  const getMonthlyActivityData = () => {
    const now = new Date()
    const monthlyData: Array<{
      month: string
      assessments: number
      documents: number
      reviews: number
      communications: number
      total: number
    }> = []

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthName = monthDate.toLocaleDateString('en-GB', { month: 'short' })

      const monthActivities = activities.filter(a => {
        const actDate = new Date(a.timestamp)
        return actDate >= monthDate && actDate <= monthEnd
      })

      monthlyData.push({
        month: monthName,
        assessments: monthActivities.filter(a => a.type === 'assessment').length,
        documents: monthActivities.filter(a => a.type === 'document').length,
        reviews: monthActivities.filter(a => a.type === 'review').length,
        communications: monthActivities.filter(a => a.type === 'communication').length,
        total: monthActivities.length
      })
    }

    return monthlyData
  }

  const monthlyActivityData = getMonthlyActivityData()

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'assessment', label: 'Assessments' },
    { value: 'document', label: 'Documents' },
    { value: 'review', label: 'Reviews' },
    { value: 'complaint', label: 'Complaints' },
    { value: 'vulnerability', label: 'Vulnerability' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Activity Timeline</h3>
          <p className="text-sm text-gray-500">
            {filteredActivities.length} of {activities.length} activities
            {daysFilter !== 'all' && ` in last ${daysFilter} days`}
          </p>
        </div>
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          {/* Days Filter Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setDaysFilter(14)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                daysFilter === 14
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              14 days
            </button>
            <button
              onClick={() => setDaysFilter(30)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                daysFilter === 30
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setDaysFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                daysFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
          </div>
          {/* Type Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={loadActivities}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activities.filter(a => a.type === 'assessment').length}
                </p>
                <p className="text-xs text-gray-500">Assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Upload className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activities.filter(a => a.type === 'document').length}
                </p>
                <p className="text-xs text-gray-500">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activities.filter(a => a.type === 'review').length}
                </p>
                <p className="text-xs text-gray-500">Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertOctagon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activities.filter(a => a.type === 'complaint').length}
                </p>
                <p className="text-xs text-gray-500">Complaints</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activities.filter(a => a.type === 'vulnerability').length}
                </p>
                <p className="text-xs text-gray-500">Vulnerabilities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Activity Over Time</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No activity data to display yet</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyActivityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Activity"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="assessments"
                    name="Assessments"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="documents"
                    name="Documents"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reviews"
                    name="Reviews"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No activity recorded</p>
              <p className="text-gray-400 mt-1">
                {filter !== 'all' ? 'Try changing the filter' : 'Activity will appear here as you work with this client'}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-6">
                {filteredActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type)
                  const colorClass = getActivityColor(activity.type, activity.status)
                  const isProfileUpdate = activity.type === 'profile_update'
                  const activityContent = (
                    <div className={`p-4 rounded-lg border ${
                      activity.priority === 'high' ? 'border-red-200 bg-red-50' :
                      activity.status === 'pending' ? 'border-yellow-200 bg-yellow-50' :
                      'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{activity.title}</h4>
                            {activity.status && (
                              <Badge
                                variant={
                                  activity.status === 'completed' ? 'default' :
                                  activity.status === 'failed' ? 'destructive' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {activity.status}
                              </Badge>
                            )}
                            {activity.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">High Priority</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          {isProfileUpdate && (
                            <p className="text-xs text-blue-600 mt-2">View client profile</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</p>
                          {activity.user && (
                            <p className="text-xs text-gray-400 mt-1">{activity.user}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )

                  return (
                    <div key={activity.id} className="relative pl-12">
                      {/* Timeline dot */}
                      <div className={`absolute left-2 w-7 h-7 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      {isProfileUpdate ? (
                        <Link href={`/clients/${clientId}/edit`} className="block hover:shadow-sm transition-shadow">
                          {activityContent}
                        </Link>
                      ) : (
                        activityContent
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

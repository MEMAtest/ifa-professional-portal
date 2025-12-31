// app/reviews/page.tsx
// CLIENT REVIEWS DASHBOARD - Widget-based layout with Charts
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Plus,
  Search,
  FileText,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

// Types
interface ClientReview {
  id: string
  client_id: string | null
  client_name: string
  client_ref: string
  review_type: string
  due_date: string
  completed_date?: string | null
  review_summary: string
  changes_made: any
  recommendations: any
  next_review_date?: string | null
  status: string
  created_by: string
  completed_by?: string | null
  created_at: string | null
  updated_at: string | null
}

interface Client {
  id: string
  client_ref: string
  personal_details: {
    firstName: string
    lastName: string
    title?: string
  }
  contact_info: {
    email: string
    phone: string
  }
}

interface NewReviewFormData {
  client_id: string
  review_type: string
  due_date: string
  review_summary: string
  next_review_date: string
}

export default function ReviewsDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // State
  const [reviews, setReviews] = useState<ClientReview[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showAllOutstanding, setShowAllOutstanding] = useState(false)

  // New review form
  const [newReview, setNewReview] = useState<NewReviewFormData>({
    client_id: '',
    review_type: 'annual',
    due_date: '',
    review_summary: '',
    next_review_date: ''
  })

  const loadReviews = useCallback(async () => {
    const { data: reviewData, error } = await supabase
      .from('client_reviews')
      .select(`
        *,
        clients(
          id,
          client_ref,
          personal_details,
          contact_info
        )
      `)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error loading reviews:', error)
      return
    }

    const reviewRecords: ClientReview[] = (reviewData || []).map((review: any) => {
      const personalDetails = (review.clients?.personal_details || {}) as any
      const clientName = `${personalDetails.firstName || ''} ${personalDetails.lastName || ''}`.trim() || 'Unknown Client'
      return {
        id: review.id,
        client_id: review.client_id,
        client_name: review.review_type === 'prod_policy' ? 'Firm PROD Review' : clientName,
        client_ref: review.clients?.client_ref || '',
        review_type: review.review_type || 'annual',
        due_date: review.due_date,
        completed_date: review.completed_date,
        review_summary: review.review_summary || '',
        changes_made: review.changes_made || {},
        recommendations: review.recommendations || {},
        next_review_date: review.next_review_date,
        status: review.status || 'scheduled',
        created_by: review.created_by,
        completed_by: review.completed_by,
        created_at: review.created_at,
        updated_at: review.updated_at
      }
    })

    const isValidFirmId = (value?: string | null) => {
      if (!value) return false
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    }

    const { data: authData } = await supabase.auth.getUser()
    const authUser = authData?.user
    let resolvedFirmId =
      (authUser?.user_metadata?.firm_id as string | undefined) ||
      (authUser?.user_metadata?.firmId as string | undefined) ||
      null

    if (!isValidFirmId(resolvedFirmId) && authUser?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', authUser.id)
        .maybeSingle()
      resolvedFirmId = profile?.firm_id || null
    }

    if (isValidFirmId(resolvedFirmId)) {
      const { data: firmData } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', resolvedFirmId)
        .maybeSingle()

      const reviewTask = (firmData?.settings as any)?.services_prod?.reviewTask
      const summary = (firmData?.settings as any)?.services_prod?.prodPolicy || 'Firm PROD review scheduled.'

      if (reviewTask?.due_date) {
        reviewRecords.unshift({
          id: `firm-prod-${reviewTask.version || 'current'}`,
          client_id: null,
          client_name: 'Firm PROD Review',
          client_ref: 'FIRM',
          review_type: 'prod_policy',
          due_date: reviewTask.due_date,
          completed_date: null,
          review_summary: summary,
          changes_made: {},
          recommendations: {},
          next_review_date: null,
          status: reviewTask.status || 'scheduled',
          created_by: user?.id || '',
          completed_by: null,
          created_at: reviewTask.created_at || new Date().toISOString(),
          updated_at: reviewTask.updated_at || new Date().toISOString()
        })
      }
    }

    setReviews(reviewRecords)
  }, [supabase, user])

  const loadClients = useCallback(async () => {
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('id, client_ref, personal_details, contact_info')
      .order('personal_details->firstName')

    if (error) {
      console.error('Error loading clients:', error)
      return
    }

    setClients((clientData || []) as any)
  }, [supabase])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      await loadClients()
      await loadReviews()
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [loadClients, loadReviews])

  useEffect(() => {
    if (user) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleScheduleReview = async () => {
    try {
      if (!newReview.client_id || !newReview.due_date) {
        toast({
          title: 'Error',
          description: 'Please select a client and due date',
          variant: 'destructive'
        })
        return
      }

      const reviewData = {
        client_id: newReview.client_id,
        review_type: newReview.review_type,
        due_date: newReview.due_date,
        review_summary: newReview.review_summary || `${newReview.review_type} review scheduled`,
        next_review_date: newReview.next_review_date || null,
        status: 'scheduled',
        created_by: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('client_reviews')
        .insert([reviewData] as any)

      if (error) {
        throw new Error(`Failed to schedule review: ${error.message}`)
      }

      toast({
        title: 'Success',
        description: 'Review scheduled successfully'
      })

      setShowScheduleModal(false)
      setNewReview({
        client_id: '',
        review_type: 'annual',
        due_date: '',
        review_summary: '',
        next_review_date: ''
      })
      loadReviews()

    } catch (error) {
      console.error('Error scheduling review:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule review',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const isOverdue = (dueDateString: string, status: string): boolean => {
    return new Date(dueDateString) < new Date() && status !== 'completed'
  }

  const getDaysUntilDue = (dueDateString: string): number => {
    const due = new Date(dueDateString)
    const now = new Date()
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getReviewTypeLabel = (reviewType: string) => {
    if (reviewType === 'prod_policy') return 'PROD Review'
    if (reviewType === 'ad_hoc') return 'Ad Hoc'
    return reviewType.replace('_', ' ').toUpperCase()
  }

  // Categorize reviews
  const now = useMemo(() => new Date(), [])
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const overdueReviews = reviews.filter(r => isOverdue(r.due_date, r.status))
  const dueThisMonth = reviews.filter(r => {
    const dueDate = new Date(r.due_date)
    return dueDate <= endOfMonth && dueDate >= now && r.status !== 'completed'
  })
  const upcomingReviews = reviews.filter(r => {
    const dueDate = new Date(r.due_date)
    return dueDate > endOfMonth && dueDate <= next30Days && r.status !== 'completed'
  })
  const recentCompletions = reviews
    .filter(r => r.status === 'completed' && r.completed_date)
    .sort((a, b) => new Date(b.completed_date!).getTime() - new Date(a.completed_date!).getTime())
    .slice(0, 5)

  const outstandingReviews = [...overdueReviews, ...dueThisMonth, ...upcomingReviews]
    .sort((a, b) => {
      // Overdue first, then by due date
      const aOverdue = isOverdue(a.due_date, a.status)
      const bOverdue = isOverdue(b.due_date, b.status)
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

  // Chart Data - Memoized for performance
  const chartData = useMemo(() => {
    // Status Distribution for Pie Chart
    const statusDistribution = [
      { name: 'Completed', value: reviews.filter(r => r.status === 'completed').length, color: '#10B981' },
      { name: 'Overdue', value: overdueReviews.length, color: '#EF4444' },
      { name: 'Due Soon', value: dueThisMonth.length, color: '#F59E0B' },
      { name: 'Scheduled', value: reviews.filter(r => r.status === 'scheduled' && !isOverdue(r.due_date, r.status)).length, color: '#3B82F6' }
    ].filter(item => item.value > 0)

    // Review Types for Bar Chart
    const reviewTypeData = [
      { type: 'Annual', count: reviews.filter(r => r.review_type === 'annual').length, pending: reviews.filter(r => r.review_type === 'annual' && r.status !== 'completed').length },
      { type: 'Periodic', count: reviews.filter(r => r.review_type === 'periodic').length, pending: reviews.filter(r => r.review_type === 'periodic' && r.status !== 'completed').length },
      { type: 'Regulatory', count: reviews.filter(r => r.review_type === 'regulatory').length, pending: reviews.filter(r => r.review_type === 'regulatory' && r.status !== 'completed').length },
      { type: 'Ad Hoc', count: reviews.filter(r => r.review_type === 'ad_hoc').length, pending: reviews.filter(r => r.review_type === 'ad_hoc' && r.status !== 'completed').length },
      { type: 'PROD', count: reviews.filter(r => r.review_type === 'prod_policy').length, pending: reviews.filter(r => r.review_type === 'prod_policy' && r.status !== 'completed').length }
    ]

    // Monthly Trend (last 6 months)
    const monthlyTrend: Array<{ month: string; completed: number; scheduled: number }> = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthName = monthDate.toLocaleDateString('en-GB', { month: 'short' })

      const completed = reviews.filter(r => {
        if (!r.completed_date) return false
        const completedDate = new Date(r.completed_date)
        return completedDate >= monthDate && completedDate <= monthEnd
      }).length

      const scheduled = reviews.filter(r => {
        const dueDate = new Date(r.due_date)
        return dueDate >= monthDate && dueDate <= monthEnd
      }).length

      monthlyTrend.push({ month: monthName, completed, scheduled })
    }

    return { statusDistribution, reviewTypeData, monthlyTrend }
  }, [reviews, overdueReviews, dueThisMonth, now])

  // Colors for pie chart
  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6']

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Reviews Dashboard</h1>
            <p className="text-gray-600">Track and manage periodic client reviews</p>
          </div>
          <Button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Review
          </Button>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Overdue Widget */}
        <Card className={`${overdueReviews.length > 0 ? 'border-red-300 bg-red-50' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className={`text-4xl font-bold ${overdueReviews.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {overdueReviews.length}
                </p>
                {overdueReviews.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">Action Required</p>
                )}
              </div>
              <div className={`p-4 rounded-full ${overdueReviews.length > 0 ? 'bg-red-200' : 'bg-gray-100'}`}>
                <AlertTriangle className={`h-8 w-8 ${overdueReviews.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Due This Month Widget */}
        <Card className={`${dueThisMonth.length > 0 ? 'border-orange-300 bg-orange-50' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Due This Month</p>
                <p className={`text-4xl font-bold ${dueThisMonth.length > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {dueThisMonth.length}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date().toLocaleDateString('en-GB', { month: 'long' })}
                </p>
              </div>
              <div className={`p-4 rounded-full ${dueThisMonth.length > 0 ? 'bg-orange-200' : 'bg-gray-100'}`}>
                <Clock className={`h-8 w-8 ${dueThisMonth.length > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming (30 Days) Widget */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming (30 Days)</p>
                <p className="text-4xl font-bold text-blue-600">{upcomingReviews.length}</p>
                <p className="text-sm text-gray-500 mt-1">Scheduled ahead</p>
              </div>
              <div className="p-4 rounded-full bg-blue-100">
                <CalendarDays className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Review Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} reviews`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-gray-400">
                No review data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Types Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              By Review Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData.reviewTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 12 }} width={70} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'count' ? 'Total' : 'Pending'
                  ]}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Total" />
                <Bar dataKey="pending" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              6-Month Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData.monthlyTrend}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="scheduled"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorScheduled)"
                  name="Scheduled"
                />
                <Legend verticalAlign="bottom" height={36} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outstanding Reviews - 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Outstanding Reviews
                </CardTitle>
                {outstandingReviews.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllOutstanding(!showAllOutstanding)}
                  >
                    {showAllOutstanding ? 'Show Less' : `View All (${outstandingReviews.length})`}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {outstandingReviews.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">All caught up!</p>
                  <p className="text-gray-500">No outstanding reviews at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(showAllOutstanding ? outstandingReviews : outstandingReviews.slice(0, 5)).map((review) => {
                    const reviewOverdue = isOverdue(review.due_date, review.status)
                    const daysUntilDue = getDaysUntilDue(review.due_date)

                    return (
                      <div
                        key={review.id}
                        className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                          reviewOverdue
                            ? 'bg-red-50 border-2 border-red-300 hover:bg-red-100'
                            : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          if (review.client_id) {
                            router.push(`/clients/${review.client_id}?tab=reviews`)
                          } else {
                            router.push('/settings?tab=services')
                          }
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${reviewOverdue ? 'bg-red-200' : 'bg-blue-100'}`}>
                            {reviewOverdue ? (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            ) : (
                              <Calendar className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`font-medium ${reviewOverdue ? 'text-red-800' : 'text-gray-900'}`}>
                                {review.client_name}
                              </h4>
                              <span className="text-sm text-gray-500">({review.client_ref})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getReviewTypeLabel(review.review_type)}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Due: {formatDate(review.due_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {reviewOverdue ? (
                            <Badge variant="destructive">
                              {Math.abs(daysUntilDue)} days overdue
                            </Badge>
                          ) : daysUntilDue <= 7 ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              {daysUntilDue} days
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {daysUntilDue} days
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Recent Completions & Quick Stats */}
        <div className="space-y-6">
          {/* Recent Completions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Recent Completions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentCompletions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No completed reviews yet</p>
              ) : (
                <div className="space-y-3">
                  {recentCompletions.map((review) => (
                    <div
                      key={review.id}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => {
                        if (review.client_id) {
                          router.push(`/clients/${review.client_id}?tab=reviews`)
                        } else {
                          router.push('/settings?tab=services')
                        }
                      }}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{review.client_name}</p>
                        <p className="text-sm text-green-600">
                          {formatDate(review.completed_date!)}
                        </p>
                      </div>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Reviews</span>
                  <span className="font-semibold">{reviews.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completed This Year</span>
                  <span className="font-semibold text-green-600">
                    {reviews.filter(r => {
                      if (!r.completed_date) return false
                      return new Date(r.completed_date).getFullYear() === new Date().getFullYear()
                    }).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Clients</span>
                  <span className="font-semibold">{clients.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold">
                    {reviews.length > 0
                      ? Math.round((reviews.filter(r => r.status === 'completed').length / reviews.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Types Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>By Review Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['annual', 'periodic', 'regulatory', 'ad_hoc'].map(type => {
                  const count = reviews.filter(r => r.review_type === type && r.status !== 'completed').length
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-gray-600 capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant={count > 0 ? 'secondary' : 'outline'}>{count}</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Review Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Schedule New Review</h3>
              <Button variant="ghost" onClick={() => setShowScheduleModal(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  value={newReview.client_id}
                  onChange={(e) => setNewReview({ ...newReview, client_id: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.personal_details.firstName} {client.personal_details.lastName} ({client.client_ref})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Type
                  </label>
                  <select
                    value={newReview.review_type}
                    onChange={(e) => setNewReview({ ...newReview, review_type: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="annual">Annual Review</option>
                    <option value="periodic">Periodic Review</option>
                    <option value="regulatory">Regulatory Review</option>
                    <option value="ad_hoc">Ad Hoc Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={newReview.due_date}
                    onChange={(e) => setNewReview({ ...newReview, due_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Summary
                </label>
                <textarea
                  value={newReview.review_summary}
                  onChange={(e) => setNewReview({ ...newReview, review_summary: e.target.value })}
                  placeholder="Brief description of review scope and objectives..."
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Review Date
                </label>
                <input
                  type="date"
                  value={newReview.next_review_date}
                  onChange={(e) => setNewReview({ ...newReview, next_review_date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleScheduleReview}>
                Schedule Review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

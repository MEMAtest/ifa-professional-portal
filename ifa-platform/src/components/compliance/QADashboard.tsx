// components/compliance/QADashboard.tsx
// ================================================================
// QA & File Reviews Dashboard - Four-Eyes Check workflow
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Plus,
  Search,
  Filter,
  ChevronRight,
  User,
  Calendar,
  FileText,
  MoreVertical,
  X,
  TrendingUp,
  BarChart3,
  LayoutGrid,
  List
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import FileReviewModal from './FileReviewModal'
import { WorkflowBoard, WORKFLOW_CONFIGS } from './workflow'
import type { WorkflowItem } from './workflow'

// Types
interface Profile {
  id: string
  first_name: string
  last_name: string
  role?: string
}

interface FileReview {
  id: string
  firm_id: string
  client_id: string
  adviser_id: string | null
  reviewer_id: string | null
  review_type: 'new_business' | 'annual_review' | 'complaint' | 'ad_hoc'
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated'
  checklist: Record<string, boolean>
  findings: string | null
  risk_rating: 'low' | 'medium' | 'high' | 'critical' | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Maker/Checker workflow fields
  adviser_submitted_at: string | null
  reviewer_started_at: string | null
  reviewer_completed_at: string | null
  adviser_name: string | null
  reviewer_name: string | null
  clients?: {
    id: string
    client_ref: string
    personal_details: {
      firstName: string
      lastName: string
      title?: string
    }
  }
  adviser?: Profile
  reviewer?: Profile
}

interface Props {
  onStatsChange?: () => void
  initialFilter?: FilterTab | string
  riskFilter?: string
}

type FilterTab = 'pending' | 'my-reviews' | 'completed' | 'all' | 'overdue'

export default function QADashboard({ onStatsChange, initialFilter, riskFilter }: Props) {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  // State
  const [reviews, setReviews] = useState<FileReview[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>((initialFilter as FilterTab) || 'pending')
  const [activeRiskFilter, setActiveRiskFilter] = useState<string | null>(riskFilter || null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReview, setSelectedReview] = useState<FileReview | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'workflow'>('table')

  // Drill down modal state
  const [drillDownData, setDrillDownData] = useState<{
    isOpen: boolean
    title: string
    reviews: FileReview[]
  }>({ isOpen: false, title: '', reviews: [] })

  // Open drill down modal
  const openDrillDown = (title: string, filterFn: (r: FileReview) => boolean) => {
    const filteredReviews = reviews.filter(filterFn)
    setDrillDownData({ isOpen: true, title, reviews: filteredReviews })
  }

  // Load reviews
  const loadReviews = useCallback(async () => {
    try {
      setLoading(true)

      // First, fetch all profiles for manual joining
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')

      const profilesMap = new Map<string, Profile>()
      profilesData?.forEach((p: Profile) => profilesMap.set(p.id, p))

      // Fetch clients for manual joining
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, client_ref, personal_details')

      const clientsMap = new Map<string, any>()
      clientsData?.forEach((c: any) => clientsMap.set(c.id, c))

      // Now fetch reviews without foreign key joins
      let query = supabase
        .from('file_reviews')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (activeFilter === 'pending') {
        query = query.eq('status', 'pending')
      } else if (activeFilter === 'completed') {
        query = query.in('status', ['approved', 'rejected'])
      } else if (activeFilter === 'overdue') {
        // Filter for overdue: not completed and due_date in the past
        query = query.in('status', ['pending', 'in_progress'])
        query = query.lt('due_date', new Date().toISOString())
      }
      // 'my-reviews' and 'all' show all reviews (would filter by reviewer_id in production)

      // Apply risk filter if provided
      if (activeRiskFilter) {
        query = query.eq('risk_rating', activeRiskFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading reviews:', error)
        // Handle case where table doesn't exist
        setReviews([])
        return
      }

      // Manual join with clients and profiles
      const reviewsWithRelations = (data || []).map((review: any) => ({
        ...review,
        clients: review.client_id ? clientsMap.get(review.client_id) : undefined,
        adviser: review.adviser_id ? profilesMap.get(review.adviser_id) : undefined,
        reviewer: review.reviewer_id ? profilesMap.get(review.reviewer_id) : undefined
      }))

      setReviews(reviewsWithRelations)
    } catch (error) {
      console.error('Error loading reviews:', error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [supabase, activeFilter, activeRiskFilter])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  useEffect(() => {
    if (!selectedReview) return
    const refreshed = reviews.find((review) => review.id === selectedReview.id)
    if (refreshed) {
      setSelectedReview(refreshed)
    }
  }, [reviews, selectedReview])

  const getClientName = (review: FileReview): string => {
    if (!review.clients?.personal_details) return 'Unknown Client'
    const { firstName, lastName, title } = review.clients.personal_details
    return `${title ? title + ' ' : ''}${firstName || ''} ${lastName || ''}`.trim() ||
           review.clients.client_ref || 'Unknown Client'
  }

  const getProfileName = (profile: Profile | null | undefined): string => {
    if (!profile) return 'Not Assigned'
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
  }

  // Filter reviews by search term
  const filteredReviews = reviews.filter(review => {
    if (!searchTerm) return true
    const clientName = getClientName(review)
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           review.review_type.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const mapRiskToPriority = (risk: FileReview['risk_rating']) => {
    if (risk === 'critical') return 'urgent'
    if (risk === 'high') return 'high'
    if (risk === 'medium') return 'medium'
    return 'low'
  }

  const workflowItems: WorkflowItem[] = filteredReviews.map((review) => ({
    id: review.id,
    sourceType: 'file_review',
    sourceId: review.id,
    title: getClientName(review),
    subtitle: review.review_type.replace('_', ' '),
    status: review.status,
    priority: mapRiskToPriority(review.risk_rating),
    ownerId: review.reviewer_id,
    ownerName: getProfileName(review.reviewer),
    commentCount: 0,
    dueDate: review.due_date || undefined,
    clientId: review.client_id,
  }))

  const handleWorkflowStatusChange = async (item: WorkflowItem, status: string) => {
    try {
      const updatePayload: Record<string, any> = { status }
      if (['approved', 'rejected'].includes(status)) {
        updatePayload.completed_at = new Date().toISOString()
      }
      if (['pending', 'in_progress'].includes(status)) {
        updatePayload.completed_at = null
      }
      const { error } = await supabase
        .from('file_reviews')
        .update(updatePayload)
        .eq('id', item.id)
      if (error) throw error
      await loadReviews()
      onStatsChange?.()
    } catch (error) {
      console.error('Error updating review status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update review status',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status: FileReview['status']) => {
    const config = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      in_progress: { variant: 'default' as const, label: 'In Progress', icon: Eye },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      escalated: { variant: 'destructive' as const, label: 'Escalated', icon: AlertTriangle }
    }
    const { variant, label, icon: Icon } = config[status]
    return (
      <Badge variant={variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </Badge>
    )
  }

  const getReviewTypeBadge = (type: FileReview['review_type']) => {
    const labels = {
      new_business: 'New Business',
      annual_review: 'Annual Review',
      complaint: 'Complaint',
      ad_hoc: 'Ad Hoc'
    }
    return (
      <Badge variant="outline" className="text-xs">
        {labels[type]}
      </Badge>
    )
  }

  const getRiskBadge = (risk: FileReview['risk_rating']) => {
    if (!risk) return null
    const config = {
      low: { color: 'bg-green-100 text-green-700', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-700', label: 'High' },
      critical: { color: 'bg-red-100 text-red-700', label: 'Critical' }
    }
    const { color, label } = config[risk]
    return <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{label}</span>
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const handleReviewAction = async (reviewId: string, action: 'approve' | 'reject' | 'escalate', reviewerDisplayName?: string) => {
    try {
      const statusMap = {
        approve: 'approved',
        reject: 'rejected',
        escalate: 'escalated'
      }

      const now = new Date().toISOString()
      const updateData: Record<string, any> = {
        status: statusMap[action],
        completed_at: action !== 'escalate' ? now : null,
        // Maker/Checker workflow: Record reviewer completion
        reviewer_completed_at: now,
        reviewer_name: reviewerDisplayName || 'Current User' // TODO: Get from auth context
      }

      // If this is the first action on a pending review, also mark reviewer_started_at
      const review = reviews.find(r => r.id === reviewId)
      if (review && !review.reviewer_started_at) {
        updateData.reviewer_started_at = now
      }

      const { error } = await supabase
        .from('file_reviews')
        .update(updateData)
        .eq('id', reviewId)

      if (error) throw error

      toast({
        title: 'Review Updated',
        description: `Review has been ${statusMap[action]}`
      })

      loadReviews()
      onStatsChange?.()
      setShowReviewModal(false)
    } catch (error) {
      console.error('Error updating review:', error)
      toast({
        title: 'Error',
        description: 'Failed to update review',
        variant: 'destructive'
      })
    }
  }

  const handleViewReview = (review: FileReview) => {
    setSelectedReview(review)
    setShowReviewModal(true)
  }

  const filterTabs = [
    { key: 'pending' as FilterTab, label: 'Pending', count: reviews.filter(r => r.status === 'pending').length },
    { key: 'my-reviews' as FilterTab, label: 'My Reviews', count: reviews.length },
    { key: 'completed' as FilterTab, label: 'Completed', count: reviews.filter(r => ['approved', 'rejected'].includes(r.status)).length },
    { key: 'all' as FilterTab, label: 'All', count: reviews.length }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Calculate stats for widgets
  const stats = {
    pending: reviews.filter(r => r.status === 'pending').length,
    inProgress: reviews.filter(r => r.status === 'in_progress').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    escalated: reviews.filter(r => r.status === 'escalated').length,
    overdue: reviews.filter(r => r.due_date && new Date(r.due_date) < new Date() && !['approved', 'rejected'].includes(r.status)).length,
    highRisk: reviews.filter(r => r.risk_rating === 'high' || r.risk_rating === 'critical').length,
    completedThisMonth: reviews.filter(r => {
      if (!r.completed_at) return false
      const completed = new Date(r.completed_at)
      const now = new Date()
      return completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear()
    }).length
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards with Drill Down */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openDrillDown('Pending Reviews', r => r.status === 'pending')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openDrillDown('Approved Reviews', r => r.status === 'approved')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openDrillDown('Rejected Reviews', r => r.status === 'rejected')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
          onClick={() => openDrillDown('Overdue Reviews', r => r.due_date ? new Date(r.due_date) < new Date() && !['approved', 'rejected'].includes(r.status) : false)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-orange-600">{stats.overdue}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openDrillDown('In Progress Reviews', r => r.status === 'in_progress')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openDrillDown('Escalated Reviews', r => r.status === 'escalated')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Escalated</p>
                <p className="text-2xl font-bold text-purple-600">{stats.escalated}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <AlertTriangle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openDrillDown('High/Critical Risk Reviews', r => r.risk_rating === 'high' || r.risk_rating === 'critical')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High/Critical Risk</p>
                <p className="text-2xl font-bold text-red-600">{stats.highRisk}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <BarChart3 className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="mr-2 h-4 w-4" />
            Table
          </Button>
          <Button
            variant={viewMode === 'workflow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('workflow')}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Workflow
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeFilter === tab.key ? 'bg-blue-200' : 'bg-gray-200'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {viewMode === 'workflow' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClipboardCheck className="h-5 w-5" />
              <span>File Reviews Workflow</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowBoard
              columns={WORKFLOW_CONFIGS.file_review.stages}
              items={workflowItems}
              onItemClick={(item) => {
                const review = reviews.find((r) => r.id === item.id)
                if (review) handleViewReview(review)
              }}
              onStatusChange={handleWorkflowStatusChange}
              emptyMessage="No file reviews in this workflow"
            />
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {viewMode === 'table' && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClipboardCheck className="h-5 w-5" />
            <span>File Reviews</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No reviews found</p>
              <p className="text-gray-400 mt-1">
                {activeFilter === 'pending'
                  ? 'All file reviews have been completed'
                  : 'Create a new review to get started'}
              </p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Review
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleViewReview(review)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        review.status === 'pending' ? 'bg-yellow-100' :
                        review.status === 'approved' ? 'bg-green-100' :
                        review.status === 'rejected' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        <ClipboardCheck className={`h-5 w-5 ${
                          review.status === 'pending' ? 'text-yellow-600' :
                          review.status === 'approved' ? 'text-green-600' :
                          review.status === 'rejected' ? 'text-red-600' :
                          'text-gray-600'
                        }`} />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {getClientName(review)}
                          </h3>
                          {getReviewTypeBadge(review.review_type)}
                          {getRiskBadge(review.risk_rating)}
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center" title={review.adviser_submitted_at ? `Submitted: ${formatDate(review.adviser_submitted_at)}` : ''}>
                            <User className="h-3 w-3 mr-1" />
                            Adviser: {review.adviser_name || getProfileName(review.adviser)}
                            {review.adviser_submitted_at && (
                              <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
                            )}
                          </span>
                          <span className="flex items-center" title={review.reviewer_completed_at ? `Completed: ${formatDate(review.reviewer_completed_at)}` : ''}>
                            <Eye className="h-3 w-3 mr-1" />
                            Reviewer: {review.reviewer_name || getProfileName(review.reviewer)}
                            {review.reviewer_completed_at && (
                              <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Created: {formatDate(review.created_at)}
                          </span>
                          {review.due_date && (
                            <span className={`flex items-center ${
                              isOverdue(review.due_date) ? 'text-red-600 font-medium' : ''
                            }`}>
                              <Clock className="h-3 w-3 mr-1" />
                              Due: {formatDate(review.due_date)}
                              {isOverdue(review.due_date) && ' (Overdue)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {getStatusBadge(review.status)}
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Checklist Progress */}
                  {review.checklist && Object.keys(review.checklist).length > 0 && (
                    <div className="mt-3 ml-14">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${(Object.values(review.checklist).filter(Boolean).length / Object.keys(review.checklist).length) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Object.values(review.checklist).filter(Boolean).length}/{Object.keys(review.checklist).length} items
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      )}

      {/* Review Detail Modal */}
      {showReviewModal && selectedReview && (
        <FileReviewModal
          review={selectedReview}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedReview(null)
          }}
          onApprove={() => handleReviewAction(selectedReview.id, 'approve')}
          onReject={() => handleReviewAction(selectedReview.id, 'reject')}
          onEscalate={() => handleReviewAction(selectedReview.id, 'escalate')}
          onUpdate={loadReviews}
        />
      )}

      {/* Create Review Modal */}
      {showCreateModal && (
        <CreateReviewModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            loadReviews()
            onStatsChange?.()
          }}
        />
      )}

      {/* Drill Down Modal */}
      {drillDownData.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDrillDownData({ isOpen: false, title: '', reviews: [] })}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold">{drillDownData.title}</h3>
                <p className="text-sm text-gray-500">{drillDownData.reviews.length} review(s)</p>
              </div>
              <button
                onClick={() => setDrillDownData({ isOpen: false, title: '', reviews: [] })}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              {drillDownData.reviews.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Client</th>
                      <th className="text-left p-3 font-medium text-gray-600">Type</th>
                      <th className="text-left p-3 font-medium text-gray-600">Status</th>
                      <th className="text-left p-3 font-medium text-gray-600">Risk</th>
                      <th className="text-left p-3 font-medium text-gray-600">Due Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">Adviser</th>
                      <th className="text-center p-3 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {drillDownData.reviews.map((review) => {
                      const clientName = getClientName(review)
                      const reviewOverdue = isOverdue(review.due_date)

                      return (
                        <tr key={review.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setDrillDownData({ isOpen: false, title: '', reviews: [] })
                                router.push(`/clients/${review.client_id}`)
                              }}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {clientName}
                            </button>
                          </td>
                          <td className="p-3">
                            {getReviewTypeBadge(review.review_type)}
                          </td>
                          <td className="p-3">
                            {getStatusBadge(review.status)}
                          </td>
                          <td className="p-3">
                            {getRiskBadge(review.risk_rating)}
                          </td>
                          <td className="p-3">
                            {review.due_date ? (
                              <span className={`text-xs ${reviewOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                {formatDate(review.due_date)}
                                {reviewOverdue && ' (Overdue)'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Not set</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-xs text-gray-600">
                              {review.adviser_name || getProfileName(review.adviser)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDrillDownData({ isOpen: false, title: '', reviews: [] })
                                handleViewReview(review)
                              }}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No reviews found in this category.
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setDrillDownData({ isOpen: false, title: '', reviews: [] })}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Create Review Modal Component
function CreateReviewModal({
  onClose,
  onCreated
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [clients, setClients] = useState<any[]>([])
  const [advisers, setAdvisers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    adviser_id: '',
    reviewer_id: '',
    review_type: 'new_business' as FileReview['review_type'],
    due_date: '',
    risk_rating: 'low' as FileReview['risk_rating']
  })

  useEffect(() => {
    const loadData = async () => {
      // Load clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, client_ref, personal_details')
        .order('personal_details->firstName')
      setClients(clientsData || [])

      // Load advisers/reviewers from profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .order('first_name')
      setAdvisers(profilesData || [])

      setLoading(false)
    }
    loadData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.client_id) {
      toast({
        title: 'Error',
        description: 'Please select a client',
        variant: 'destructive'
      })
      return
    }

    if (!formData.adviser_id) {
      toast({
        title: 'Error',
        description: 'Please select the adviser whose work is being reviewed (Four-Eyes requirement)',
        variant: 'destructive'
      })
      return
    }

    if (!formData.reviewer_id) {
      toast({
        title: 'Error',
        description: 'Please select the reviewer conducting this QA (Four-Eyes requirement)',
        variant: 'destructive'
      })
      return
    }

    // Ensure adviser and reviewer are different people (Four-Eyes principle)
    if (formData.adviser_id === formData.reviewer_id) {
      toast({
        title: 'Four-Eyes Violation',
        description: 'The adviser and reviewer must be different people for Four-Eyes compliance',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      // Default checklist items
      const defaultChecklist = {
        'client_suitability': false,
        'risk_profile_current': false,
        'capacity_for_loss': false,
        'product_recommendations': false,
        'fees_disclosed': false,
        'documentation_complete': false,
        'aml_checks': false,
        'consumer_duty': false
      }

      // Get adviser name for workflow tracking
      const selectedAdviser = advisers.find(a => a.id === formData.adviser_id)
      const adviserDisplayName = selectedAdviser
        ? `${selectedAdviser.first_name || ''} ${selectedAdviser.last_name || ''}`.trim()
        : 'Unknown Adviser'

      const { error } = await supabase
        .from('file_reviews')
        .insert({
          client_id: formData.client_id,
          adviser_id: formData.adviser_id,
          reviewer_id: formData.reviewer_id,
          review_type: formData.review_type,
          due_date: formData.due_date || null,
          risk_rating: formData.risk_rating,
          checklist: defaultChecklist,
          status: 'pending',
          // Maker/Checker workflow: Record adviser submission
          adviser_submitted_at: new Date().toISOString(),
          adviser_name: adviserDisplayName
        })

      if (error) throw error

      toast({
        title: 'Review Created',
        description: 'New file review has been created successfully'
      })
      onCreated()
    } catch (error) {
      console.error('Error creating review:', error)
      toast({
        title: 'Error',
        description: 'Failed to create review',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getClientDisplayName = (client: any) => {
    const pd = client.personal_details || {}
    return `${pd.title || ''} ${pd.firstName || ''} ${pd.lastName || ''}`.trim() || client.client_ref
  }

  const getAdviserDisplayName = (adviser: Profile) => {
    const name = `${adviser.first_name || ''} ${adviser.last_name || ''}`.trim()
    return adviser.role ? `${name} (${adviser.role})` : name
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Create New File Review</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Four-Eyes Section Header */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Four-Eyes Compliance</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Both adviser and reviewer must be selected and must be different people
            </p>
          </div>

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client *
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
              disabled={loading}
            >
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {getClientDisplayName(client)}
                </option>
              ))}
            </select>
          </div>

          {/* Adviser Being Reviewed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                Adviser (Whose Work Is Being Reviewed) *
              </span>
            </label>
            <select
              value={formData.adviser_id}
              onChange={(e) => setFormData({ ...formData, adviser_id: e.target.value })}
              className={`w-full border rounded-lg p-2 text-sm ${
                formData.adviser_id && formData.adviser_id === formData.reviewer_id
                  ? 'border-red-300 bg-red-50'
                  : ''
              }`}
              disabled={loading}
            >
              <option value="">Select adviser...</option>
              {advisers.map(adviser => (
                <option key={adviser.id} value={adviser.id}>
                  {getAdviserDisplayName(adviser)}
                </option>
              ))}
            </select>
          </div>

          {/* Reviewer Conducting QA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center">
                <Eye className="h-3 w-3 mr-1" />
                Reviewer (Conducting QA Review) *
              </span>
            </label>
            <select
              value={formData.reviewer_id}
              onChange={(e) => setFormData({ ...formData, reviewer_id: e.target.value })}
              className={`w-full border rounded-lg p-2 text-sm ${
                formData.reviewer_id && formData.adviser_id === formData.reviewer_id
                  ? 'border-red-300 bg-red-50'
                  : ''
              }`}
              disabled={loading}
            >
              <option value="">Select reviewer...</option>
              {advisers
                .filter(a => a.id !== formData.adviser_id) // Filter out selected adviser
                .map(adviser => (
                  <option key={adviser.id} value={adviser.id}>
                    {getAdviserDisplayName(adviser)}
                  </option>
                ))}
            </select>
            {formData.adviser_id && formData.adviser_id === formData.reviewer_id && (
              <p className="text-xs text-red-600 mt-1">
                Reviewer must be different from adviser for Four-Eyes compliance
              </p>
            )}
          </div>

          {/* Review Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review Type *
            </label>
            <select
              value={formData.review_type}
              onChange={(e) => setFormData({ ...formData, review_type: e.target.value as any })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="new_business">New Business</option>
              <option value="annual_review">Annual Review</option>
              <option value="complaint">Complaint Review</option>
              <option value="ad_hoc">Ad Hoc Review</option>
            </select>
          </div>

          {/* Risk Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Risk Rating
            </label>
            <select
              value={formData.risk_rating || 'low'}
              onChange={(e) => setFormData({ ...formData, risk_rating: e.target.value as any })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

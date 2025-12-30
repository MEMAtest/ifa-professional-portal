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
  MoreVertical
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import FileReviewModal from './FileReviewModal'

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

  // Filter reviews by search term
  const filteredReviews = reviews.filter(review => {
    if (!searchTerm) return true
    const clientName = getClientName(review)
    return clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           review.review_type.toLowerCase().includes(searchTerm.toLowerCase())
  })

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

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
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

        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Review
        </Button>
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

      {/* Reviews List */}
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

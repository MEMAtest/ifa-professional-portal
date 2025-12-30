// components/compliance/FileReviewModal.tsx
// ================================================================
// File Review Detail Modal - Four-Eyes Check checklist and actions
// ================================================================

'use client'

import React, { useState } from 'react'
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  FileText,
  Save,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'

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
}

interface Props {
  review: FileReview
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onEscalate: () => void
  onUpdate: () => void
}

// Default checklist items with labels
const CHECKLIST_ITEMS = {
  client_suitability: 'Client suitability confirmed',
  risk_profile_current: 'Risk profile documented and current',
  capacity_for_loss: 'Capacity for Loss assessed',
  product_recommendations: 'Product recommendations appropriate',
  fees_disclosed: 'Fees disclosed and agreed',
  documentation_complete: 'Documentation complete',
  aml_checks: 'Anti-Money Laundering checks done',
  consumer_duty: 'Consumer Duty considerations documented'
}

export default function FileReviewModal({
  review,
  onClose,
  onApprove,
  onReject,
  onEscalate,
  onUpdate
}: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    review.checklist || Object.fromEntries(Object.keys(CHECKLIST_ITEMS).map(k => [k, false]))
  )
  const [findings, setFindings] = useState(review.findings || '')
  const [riskRating, setRiskRating] = useState(review.risk_rating || 'low')
  const [saving, setSaving] = useState(false)
  const [showConfirmAction, setShowConfirmAction] = useState<'approve' | 'reject' | 'escalate' | null>(null)

  const getClientName = (): string => {
    if (!review.clients?.personal_details) return 'Unknown Client'
    const { firstName, lastName, title } = review.clients.personal_details
    return `${title ? title + ' ' : ''}${firstName || ''} ${lastName || ''}`.trim() ||
           review.clients.client_ref || 'Unknown Client'
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const getReviewTypeLabel = (type: FileReview['review_type']): string => {
    const labels = {
      new_business: 'New Business',
      annual_review: 'Annual Review',
      complaint: 'Complaint Review',
      ad_hoc: 'Ad Hoc Review'
    }
    return labels[type]
  }

  const checklistProgress = Object.values(checklist).filter(Boolean).length
  const totalChecklistItems = Object.keys(checklist).length
  const allItemsChecked = checklistProgress === totalChecklistItems

  const handleChecklistChange = (key: string, checked: boolean) => {
    setChecklist(prev => ({ ...prev, [key]: checked }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('file_reviews')
        .update({
          checklist,
          findings,
          risk_rating: riskRating,
          status: review.status === 'pending' ? 'in_progress' : review.status
        })
        .eq('id', review.id)

      if (error) throw error

      toast({
        title: 'Saved',
        description: 'Review progress has been saved'
      })
      onUpdate()
    } catch (error) {
      console.error('Error saving review:', error)
      toast({
        title: 'Error',
        description: 'Failed to save review',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAction = (action: 'approve' | 'reject' | 'escalate') => {
    if (action === 'approve' && !allItemsChecked) {
      toast({
        title: 'Cannot Approve',
        description: 'Please complete all checklist items before approving',
        variant: 'destructive'
      })
      return
    }
    setShowConfirmAction(action)
  }

  const confirmAction = () => {
    if (showConfirmAction === 'approve') onApprove()
    else if (showConfirmAction === 'reject') onReject()
    else if (showConfirmAction === 'escalate') onEscalate()
    setShowConfirmAction(null)
  }

  const getRiskColor = (risk: string) => {
    const colors = {
      low: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    }
    return colors[risk as keyof typeof colors] || colors.low
  }

  const canTakeAction = review.status === 'pending' || review.status === 'in_progress'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold">File Review</h2>
              <Badge variant={
                review.status === 'approved' ? 'default' :
                review.status === 'rejected' ? 'destructive' :
                review.status === 'escalated' ? 'destructive' :
                'secondary'
              }>
                {review.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">{getClientName()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Review Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Review Type</p>
              <p className="font-medium">{getReviewTypeLabel(review.review_type)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Created</p>
              <p className="font-medium text-sm">{formatDate(review.created_at)}</p>
            </div>
            <div className={`p-3 rounded-lg ${
              isOverdue(review.due_date) ? 'bg-red-50' : 'bg-gray-50'
            }`}>
              <p className="text-xs text-gray-500 uppercase">Due Date</p>
              <p className={`font-medium text-sm ${
                isOverdue(review.due_date) ? 'text-red-600' : ''
              }`}>
                {formatDate(review.due_date)}
                {isOverdue(review.due_date) && ' (Overdue)'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Risk Rating</p>
              <select
                value={riskRating || 'low'}
                onChange={(e) => setRiskRating(e.target.value as any)}
                disabled={!canTakeAction}
                className={`font-medium text-sm border-0 bg-transparent p-0 ${getRiskColor(riskRating || 'low')}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Four-Eyes Check Workflow Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Four-Eyes Check Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1: Adviser (Maker) */}
              <div className={`p-3 rounded-lg border-2 ${
                review.adviser_submitted_at
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Step 1: Adviser (Maker)</span>
                  {review.adviser_submitted_at && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="font-medium text-sm">{review.adviser_name || 'Not assigned'}</p>
                {review.adviser_submitted_at ? (
                  <p className="text-xs text-green-600 mt-1">
                    Submitted: {formatDate(review.adviser_submitted_at)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Pending submission</p>
                )}
              </div>

              {/* Step 2: Reviewer (Checker) */}
              <div className={`p-3 rounded-lg border-2 ${
                review.reviewer_completed_at
                  ? 'border-green-300 bg-green-50'
                  : review.reviewer_started_at
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Step 2: Reviewer (Checker)</span>
                  {review.reviewer_completed_at ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : review.reviewer_started_at ? (
                    <Clock className="h-4 w-4 text-blue-600" />
                  ) : null}
                </div>
                <p className="font-medium text-sm">{review.reviewer_name || 'Not assigned'}</p>
                {review.reviewer_completed_at ? (
                  <p className="text-xs text-green-600 mt-1">
                    Completed: {formatDate(review.reviewer_completed_at)}
                  </p>
                ) : review.reviewer_started_at ? (
                  <p className="text-xs text-blue-600 mt-1">
                    In Progress since: {formatDate(review.reviewer_started_at)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
                )}
              </div>
            </div>
          </div>

          {/* Checklist Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Review Checklist</h3>
              <span className="text-sm text-gray-500">
                {checklistProgress}/{totalChecklistItems} completed
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all ${
                  allItemsChecked ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(checklistProgress / totalChecklistItems) * 100}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
              {Object.entries(CHECKLIST_ITEMS).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    checklist[key] ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
                  } ${!canTakeAction ? 'cursor-not-allowed opacity-75' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checklist[key] || false}
                    onChange={(e) => handleChecklistChange(key, e.target.checked)}
                    disabled={!canTakeAction}
                    className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className={`ml-3 ${checklist[key] ? 'text-green-700' : 'text-gray-700'}`}>
                    {label}
                  </span>
                  {checklist[key] && (
                    <Check className="ml-auto h-5 w-5 text-green-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div>
            <label className="block font-medium mb-2">Findings & Notes</label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              disabled={!canTakeAction}
              placeholder="Document any findings, observations, or recommendations..."
              className="w-full border rounded-lg p-3 min-h-[120px] text-sm"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50">
          {canTakeAction ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Progress'}
              </Button>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => handleAction('escalate')}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAction('reject')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleAction('approve')}
                  disabled={!allItemsChecked}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-500">
                {review.status === 'approved' && <CheckCircle className="h-5 w-5 text-green-600" />}
                {review.status === 'rejected' && <XCircle className="h-5 w-5 text-red-600" />}
                {review.status === 'escalated' && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                <span>
                  This review has been {review.status}
                  {review.completed_at && ` on ${formatDate(review.completed_at)}`}
                </span>
              </div>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirmAction && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-semibold mb-2">
                {showConfirmAction === 'approve' && 'Approve Review?'}
                {showConfirmAction === 'reject' && 'Reject Review?'}
                {showConfirmAction === 'escalate' && 'Escalate Review?'}
              </h3>
              <p className="text-gray-600 mb-4">
                {showConfirmAction === 'approve' && 'This will mark the file review as approved. The client file has passed the Four-Eyes Check.'}
                {showConfirmAction === 'reject' && 'This will mark the file review as rejected. The adviser will need to address the findings.'}
                {showConfirmAction === 'escalate' && 'This will escalate the review to a senior reviewer for additional oversight.'}
              </p>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowConfirmAction(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmAction}
                  className={
                    showConfirmAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    showConfirmAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-orange-600 hover:bg-orange-700'
                  }
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

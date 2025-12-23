// src/components/qa/SuitabilityQA.tsx
// ===================================================================
// SUITABILITY QA CHECKLIST & APPROVAL WORKFLOW
// FCA-compliant quality assurance for suitability reports
// ===================================================================

'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  FileText,
  Shield,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

// ===================================================================
// TYPES
// ===================================================================

interface QACheckItem {
  id: string
  category: string
  description: string
  fcaReference?: string
  required: boolean
  status: 'pending' | 'pass' | 'fail' | 'na'
  comment?: string
}

interface QAReview {
  id: string
  reportId: string
  reportType: 'suitability' | 'atr' | 'cfl' | 'portfolio'
  clientName: string
  adviserName: string
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_required'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  checkItems: QACheckItem[]
  overallComment?: string
}

interface SuitabilityQAProps {
  reportId: string
  reportData: any
  onApprove?: (review: QAReview) => void
  onReject?: (review: QAReview, reason: string) => void
  onRequestChanges?: (review: QAReview, changes: string[]) => void
  isReviewer?: boolean
}

// ===================================================================
// DEFAULT CHECKLIST ITEMS
// ===================================================================

const defaultCheckItems: Omit<QACheckItem, 'status' | 'comment'>[] = [
  // Client Information
  {
    id: 'ci-1',
    category: 'Client Information',
    description: 'Client personal details are complete and accurate',
    required: true
  },
  {
    id: 'ci-2',
    category: 'Client Information',
    description: 'Contact information is verified and up-to-date',
    required: true
  },
  {
    id: 'ci-3',
    category: 'Client Information',
    description: 'Financial circumstances have been fully documented',
    fcaReference: 'COBS 9.2.1R',
    required: true
  },

  // Risk Assessment
  {
    id: 'ra-1',
    category: 'Risk Assessment',
    description: 'Attitude to Risk has been properly assessed using approved questionnaire',
    fcaReference: 'COBS 9.2.2R',
    required: true
  },
  {
    id: 'ra-2',
    category: 'Risk Assessment',
    description: 'Capacity for Loss has been separately assessed',
    fcaReference: 'COBS 9.2.2R',
    required: true
  },
  {
    id: 'ra-3',
    category: 'Risk Assessment',
    description: 'Where ATR and CFL differ, CFL has been given appropriate weight',
    fcaReference: 'COBS 9.2.2R',
    required: true
  },
  {
    id: 'ra-4',
    category: 'Risk Assessment',
    description: 'Client\'s investment experience and knowledge documented',
    fcaReference: 'COBS 9.2.2R(1)',
    required: true
  },

  // Vulnerability
  {
    id: 'va-1',
    category: 'Vulnerability Assessment',
    description: 'Vulnerability assessment has been conducted',
    fcaReference: 'FG21/1',
    required: true
  },
  {
    id: 'va-2',
    category: 'Vulnerability Assessment',
    description: 'If vulnerable, appropriate accommodations documented',
    fcaReference: 'Consumer Duty',
    required: false
  },

  // Suitability
  {
    id: 'su-1',
    category: 'Suitability',
    description: 'Recommendation clearly aligns with client\'s stated objectives',
    fcaReference: 'COBS 9.2.1R(1)',
    required: true
  },
  {
    id: 'su-2',
    category: 'Suitability',
    description: 'Client can financially bear any investment losses',
    fcaReference: 'COBS 9.2.1R(2)',
    required: true
  },
  {
    id: 'su-3',
    category: 'Suitability',
    description: 'Client has necessary knowledge and experience',
    fcaReference: 'COBS 9.2.1R(3)',
    required: true
  },
  {
    id: 'su-4',
    category: 'Suitability',
    description: 'Alternative options considered and documented',
    fcaReference: 'COBS 9.4.7R',
    required: true
  },

  // Product Selection
  {
    id: 'ps-1',
    category: 'Product Selection',
    description: 'Recommended products are suitable for client\'s risk profile',
    required: true
  },
  {
    id: 'ps-2',
    category: 'Product Selection',
    description: 'Product selection justified with clear rationale',
    fcaReference: 'COBS 9.4.7R',
    required: true
  },
  {
    id: 'ps-3',
    category: 'Product Selection',
    description: 'Charges are appropriate and represent fair value',
    fcaReference: 'Consumer Duty - Price & Value',
    required: true
  },

  // Disclosure
  {
    id: 'di-1',
    category: 'Disclosure',
    description: 'All relevant risks and disadvantages clearly explained',
    fcaReference: 'COBS 9.4.7R(3)',
    required: true
  },
  {
    id: 'di-2',
    category: 'Disclosure',
    description: 'Costs and charges fully disclosed as per MiFID II',
    fcaReference: 'COBS 6.1ZA',
    required: true
  },
  {
    id: 'di-3',
    category: 'Disclosure',
    description: 'Ongoing service terms clearly explained',
    required: true
  },

  // Consumer Duty
  {
    id: 'cd-1',
    category: 'Consumer Duty',
    description: 'Report demonstrates product delivers good outcomes for client',
    fcaReference: 'Consumer Duty - Products & Services',
    required: true
  },
  {
    id: 'cd-2',
    category: 'Consumer Duty',
    description: 'Communication is clear and understandable',
    fcaReference: 'Consumer Duty - Consumer Understanding',
    required: true
  },
  {
    id: 'cd-3',
    category: 'Consumer Duty',
    description: 'Client support needs have been considered',
    fcaReference: 'Consumer Duty - Consumer Support',
    required: true
  }
]

// ===================================================================
// COMPONENT
// ===================================================================

export const SuitabilityQA: React.FC<SuitabilityQAProps> = ({
  reportId,
  reportData,
  onApprove,
  onReject,
  onRequestChanges,
  isReviewer = false
}) => {
  const [checkItems, setCheckItems] = useState<QACheckItem[]>(
    defaultCheckItems.map(item => ({ ...item, status: 'pending' }))
  )
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Client Information': true,
    'Risk Assessment': true,
    'Vulnerability Assessment': true,
    'Suitability': true,
    'Product Selection': true,
    'Disclosure': true,
    'Consumer Duty': true
  })
  const [overallComment, setOverallComment] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Group items by category
  const groupedItems = checkItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, QACheckItem[]>)

  // Calculate statistics
  const stats = {
    total: checkItems.length,
    passed: checkItems.filter(i => i.status === 'pass').length,
    failed: checkItems.filter(i => i.status === 'fail').length,
    pending: checkItems.filter(i => i.status === 'pending').length,
    na: checkItems.filter(i => i.status === 'na').length
  }

  const passRate = stats.total > 0 ? Math.round((stats.passed / (stats.total - stats.na)) * 100) : 0
  const canApprove = stats.failed === 0 && stats.pending === 0

  // Handlers
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const updateItemStatus = (itemId: string, status: QACheckItem['status']) => {
    setCheckItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, status } : item))
    )
  }

  const updateItemComment = (itemId: string, comment: string) => {
    setCheckItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, comment } : item))
    )
  }

  const handleApprove = () => {
    const review: QAReview = {
      id: `qa-${Date.now()}`,
      reportId,
      reportType: 'suitability',
      clientName: reportData?.client?.personalDetails?.firstName || 'Unknown',
      adviserName: reportData?.adviser?.name || 'Unknown',
      status: 'approved',
      submittedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      checkItems,
      overallComment
    }
    onApprove?.(review)
  }

  const handleReject = () => {
    const review: QAReview = {
      id: `qa-${Date.now()}`,
      reportId,
      reportType: 'suitability',
      clientName: reportData?.client?.personalDetails?.firstName || 'Unknown',
      adviserName: reportData?.adviser?.name || 'Unknown',
      status: 'rejected',
      submittedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      checkItems,
      overallComment: rejectReason
    }
    onReject?.(review, rejectReason)
    setShowRejectModal(false)
  }

  const handleRequestChanges = () => {
    const failedItems = checkItems
      .filter(i => i.status === 'fail')
      .map(i => i.comment || i.description)
    onRequestChanges?.(
      {
        id: `qa-${Date.now()}`,
        reportId,
        reportType: 'suitability',
        clientName: reportData?.client?.personalDetails?.firstName || 'Unknown',
        adviserName: reportData?.adviser?.name || 'Unknown',
        status: 'changes_required',
        submittedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        checkItems,
        overallComment
      },
      failedItems
    )
  }

  const getStatusIcon = (status: QACheckItem['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'na':
        return <span className="text-gray-400 text-sm">N/A</span>
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getCategoryStatus = (items: QACheckItem[]) => {
    const passed = items.filter(i => i.status === 'pass' || i.status === 'na').length
    const failed = items.filter(i => i.status === 'fail').length
    const pending = items.filter(i => i.status === 'pending').length

    if (failed > 0) return 'fail'
    if (pending > 0) return 'pending'
    return 'pass'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Suitability Report QA Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{passRate}%</p>
                <p className="text-xs text-gray-500">Pass Rate</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {stats.passed} Passed
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  {stats.failed} Failed
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {stats.pending} Pending
                </span>
              </div>
            </div>

            {isReviewer && (
              <div className="flex items-center gap-2">
                {stats.failed > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleRequestChanges}
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    Request Changes ({stats.failed})
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(true)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={!canApprove}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}
          </div>

          {!canApprove && isReviewer && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {stats.pending > 0
                    ? `${stats.pending} items still require review`
                    : `${stats.failed} items failed - please request changes or reject`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist Categories */}
      {Object.entries(groupedItems).map(([category, items]) => {
        const categoryStatus = getCategoryStatus(items)
        const isExpanded = expandedCategories[category]

        return (
          <Card key={category}>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <CardTitle className="text-base">{category}</CardTitle>
                  <Badge
                    variant={
                      categoryStatus === 'pass'
                        ? 'default'
                        : categoryStatus === 'fail'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {items.filter(i => i.status === 'pass' || i.status === 'na').length}/{items.length}
                  </Badge>
                </div>
                {categoryStatus === 'pass' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {categoryStatus === 'fail' && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        item.status === 'fail'
                          ? 'bg-red-50 border-red-200'
                          : item.status === 'pass'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.description}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          {item.fcaReference && (
                            <p className="text-xs text-blue-600 mt-1">
                              Ref: {item.fcaReference}
                            </p>
                          )}
                        </div>

                        {isReviewer ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateItemStatus(item.id, 'pass')}
                              className={`p-1.5 rounded ${
                                item.status === 'pass'
                                  ? 'bg-green-200'
                                  : 'hover:bg-green-100'
                              }`}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => updateItemStatus(item.id, 'fail')}
                              className={`p-1.5 rounded ${
                                item.status === 'fail'
                                  ? 'bg-red-200'
                                  : 'hover:bg-red-100'
                              }`}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </button>
                            {!item.required && (
                              <button
                                onClick={() => updateItemStatus(item.id, 'na')}
                                className={`px-2 py-1 rounded text-xs ${
                                  item.status === 'na'
                                    ? 'bg-gray-200'
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                N/A
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>{getStatusIcon(item.status)}</div>
                        )}
                      </div>

                      {(item.status === 'fail' || item.comment) && isReviewer && (
                        <div className="mt-2">
                          <textarea
                            placeholder="Add comment..."
                            value={item.comment || ''}
                            onChange={e => updateItemComment(item.id, e.target.value)}
                            className="w-full p-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
                            rows={2}
                          />
                        </div>
                      )}

                      {item.comment && !isReviewer && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <p className="text-xs text-gray-600">
                            <strong>Comment:</strong> {item.comment}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Overall Comment */}
      {isReviewer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Overall Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              placeholder="Add overall review comments..."
              value={overallComment}
              onChange={e => setOverallComment(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Reject Suitability Report</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this report:
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter rejection reason..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reject Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuitabilityQA

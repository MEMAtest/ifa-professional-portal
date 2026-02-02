'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Send,
  CheckCircle2,
  Clock,
  Eye,
  Play,
  XCircle,
  AlertCircle,
  Copy,
  RotateCcw,
  ExternalLink,
  ClipboardList
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface AssessmentShare {
  id: string
  token: string
  assessment_type: 'atr' | 'cfl' | 'investor_persona'
  status: 'pending' | 'viewed' | 'started' | 'completed' | 'expired' | 'revoked'
  created_at: string
  expires_at: string
  completed_at: string | null
  client_email: string
  custom_message: string | null
}

interface CompletedAssessment {
  completed: boolean
  date?: string
  score?: number
  rating?: string
  type?: string
}

interface AssessmentsData {
  shares: AssessmentShare[]
  completedAssessments: {
    atr: CompletedAssessment
    cfl: CompletedAssessment
    investorPersona: CompletedAssessment
  }
}

interface ClientAssessmentsTabProps {
  clientId: string
  clientName: string
  clientEmail: string
  onSendAssessment: () => void
}

const ASSESSMENT_LABELS: Record<string, string> = {
  atr: 'Attitude to Risk (ATR)',
  cfl: 'Capacity for Loss (CFL)',
  investor_persona: 'Investor Persona'
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  pending: { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Pending' },
  viewed: { icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Viewed' },
  started: { icon: Play, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Completed' },
  expired: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Expired' },
  revoked: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Revoked' }
}

const formatDateTime = (value: string) =>
  formatDate(value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

export function ClientAssessmentsTab({
  clientId,
  clientName,
  clientEmail,
  onSendAssessment
}: ClientAssessmentsTabProps) {
  const [data, setData] = useState<AssessmentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/assessments`)
      if (!response.ok) throw new Error('Failed to fetch assessments')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching assessments:', error)
      toast.error('Failed to load assessments')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/client/assessment/${token}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleRevoke = async (shareId: string) => {
    try {
      setActionLoading(shareId)
      const response = await fetch(`/api/clients/${clientId}/assessments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, action: 'revoke' })
      })
      if (!response.ok) throw new Error('Failed to revoke')
      toast.success('Assessment link revoked')
      fetchAssessments()
    } catch {
      toast.error('Failed to revoke assessment')
    } finally {
      setActionLoading(null)
    }
  }

  const handleViewResults = (assessmentType: string) => {
    // Navigate to results page
    window.location.href = `/assessments/${assessmentType}/results/${clientId}`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const { shares = [], completedAssessments } = data || {}

  return (
    <div className="space-y-6">
      {/* Header with Send Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Client Questionnaires</h2>
          <p className="text-sm text-gray-500">Send risk and suitability questionnaires to {clientName} for completion</p>
        </div>
        <Button onClick={onSendAssessment} className="gap-2">
          <Send className="h-4 w-4" />
          Send Questionnaire
        </Button>
      </div>

      {/* Assessment Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ATR Card */}
        <Card className={completedAssessments?.atr?.completed ? 'border-green-200 bg-green-50/50' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Attitude to Risk</CardTitle>
              {completedAssessments?.atr?.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {completedAssessments?.atr?.completed ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-xs text-gray-500">
                  {completedAssessments.atr.date && formatDate(completedAssessments.atr.date)}
                </p>
                {completedAssessments.atr.rating && (
                  <Badge variant="outline" className="mt-1">
                    {completedAssessments.atr.rating}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not completed</p>
            )}
          </CardContent>
        </Card>

        {/* CFL Card */}
        <Card className={completedAssessments?.cfl?.completed ? 'border-green-200 bg-green-50/50' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Capacity for Loss</CardTitle>
              {completedAssessments?.cfl?.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {completedAssessments?.cfl?.completed ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-xs text-gray-500">
                  {completedAssessments.cfl.date && formatDate(completedAssessments.cfl.date)}
                </p>
                {completedAssessments.cfl.rating && (
                  <Badge variant="outline" className="mt-1">
                    {completedAssessments.cfl.rating}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not completed</p>
            )}
          </CardContent>
        </Card>

        {/* Investor Persona Card */}
        <Card className={completedAssessments?.investorPersona?.completed ? 'border-green-200 bg-green-50/50' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Investor Persona</CardTitle>
              {completedAssessments?.investorPersona?.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {completedAssessments?.investorPersona?.completed ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-700">Completed</p>
                <p className="text-xs text-gray-500">
                  {completedAssessments.investorPersona.date && formatDate(completedAssessments.investorPersona.date)}
                </p>
                {completedAssessments.investorPersona.type && (
                  <Badge variant="outline" className="mt-1">
                    {completedAssessments.investorPersona.type}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not completed</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sent Questionnaires History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Sent Questionnaires
          </CardTitle>
          <CardDescription>
            History of questionnaires sent to this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shares.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Send className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No questionnaires sent yet</p>
              <p className="text-sm">Click &quot;Send Questionnaire&quot; to get started</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {shares.map((share) => {
                  const statusConfig = STATUS_CONFIG[share.status]
                  const StatusIcon = statusConfig.icon
                  const isActive = !['completed', 'expired', 'revoked'].includes(share.status)

                  return (
                    <div key={share.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {ASSESSMENT_LABELS[share.assessment_type] || share.assessment_type}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Sent {formatDateTime(share.created_at)}</p>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-600">
                        Sent to: {share.client_email || '—'}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        Sent: {formatDateTime(share.created_at)}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        Expires: {share.status === 'completed' ? '-' : formatDate(share.expires_at)}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {share.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResults(share.assessment_type)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        {isActive && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyLink(share.token)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevoke(share.id)}
                              disabled={actionLoading === share.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {['expired', 'revoked'].includes(share.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onSendAssessment}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Resend
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Sent</th>
                      <th className="pb-3 font-medium">Sent To</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Expires</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shares.map((share) => {
                      const statusConfig = STATUS_CONFIG[share.status]
                      const StatusIcon = statusConfig.icon
                      const isActive = !['completed', 'expired', 'revoked'].includes(share.status)

                      return (
                        <tr key={share.id} className="text-sm">
                          <td className="py-3">
                            <span className="font-medium">
                              {ASSESSMENT_LABELS[share.assessment_type] || share.assessment_type}
                            </span>
                          </td>
                          <td className="py-3 text-gray-600">
                            {formatDateTime(share.created_at)}
                          </td>
                          <td className="py-3 text-gray-600">
                            {share.client_email || '—'}
                          </td>
                          <td className="py-3">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </div>
                          </td>
                          <td className="py-3 text-gray-600">
                            {share.status === 'completed' ? (
                              <span className="text-green-600">-</span>
                            ) : (
                              formatDate(share.expires_at)
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex justify-end gap-1">
                              {share.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewResults(share.assessment_type)}
                                  className="h-8 px-2"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}
                              {isActive && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopyLink(share.token)}
                                    className="h-8 px-2"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevoke(share.id)}
                                    disabled={actionLoading === share.id}
                                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {['expired', 'revoked'].includes(share.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={onSendAssessment}
                                  className="h-8 px-2"
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Resend
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

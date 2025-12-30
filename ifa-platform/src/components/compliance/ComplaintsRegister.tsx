// components/compliance/ComplaintsRegister.tsx
// ================================================================
// Complaints Register - FCA-compliant complaints logging
// Enhanced with investigation tracking, timeline, and workflow
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  MessageSquareWarning,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Calendar,
  User,
  DollarSign,
  ExternalLink,
  X,
  FileText,
  ArrowRight,
  Timer,
  AlertOctagon,
  TrendingUp,
  Mail,
  Phone,
  MessageSquare,
  UserCircle,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'

interface Complaint {
  id: string
  firm_id: string
  client_id: string | null
  reference_number: string
  complaint_date: string
  received_via: 'email' | 'phone' | 'letter' | 'in_person' | 'other'
  category: 'service' | 'advice' | 'product' | 'fees' | 'communication' | 'other'
  description: string
  root_cause: string | null
  status: 'open' | 'investigating' | 'resolved' | 'escalated' | 'closed'
  resolution: string | null
  resolution_date: string | null
  redress_amount: number
  lessons_learned: string | null
  fca_reportable: boolean
  created_by: string | null
  created_at: string
  updated_at: string
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
  onStatsChange?: () => void
}

export default function ComplaintsRegister({ onStatsChange }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)

  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('complaint_register')
        .select(`
          *,
          clients (
            id,
            client_ref,
            personal_details
          )
        `)
        .order('complaint_date', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading complaints:', error)
        setComplaints([])
        return
      }

      setComplaints(data || [])
    } catch (error) {
      console.error('Error loading complaints:', error)
      setComplaints([])
    } finally {
      setLoading(false)
    }
  }, [supabase, statusFilter])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  const filteredComplaints = complaints.filter(complaint => {
    if (!searchTerm) return true
    const clientName = getClientName(complaint)
    return (
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const getClientName = (complaint: Complaint): string => {
    if (!complaint.clients?.personal_details) return 'Unknown Client'
    const { firstName, lastName, title } = complaint.clients.personal_details
    return `${title ? title + ' ' : ''}${firstName || ''} ${lastName || ''}`.trim() ||
           complaint.clients.client_ref || 'Unknown Client'
  }

  const getStatusBadge = (status: Complaint['status']) => {
    const config = {
      open: { variant: 'destructive' as const, label: 'Open', icon: AlertTriangle },
      investigating: { variant: 'secondary' as const, label: 'Investigating', icon: Eye },
      resolved: { variant: 'default' as const, label: 'Resolved', icon: CheckCircle },
      escalated: { variant: 'destructive' as const, label: 'Escalated', icon: AlertTriangle },
      closed: { variant: 'outline' as const, label: 'Closed', icon: CheckCircle }
    }
    const { variant, label, icon: Icon } = config[status]
    return (
      <Badge variant={variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </Badge>
    )
  }

  const getCategoryLabel = (category: Complaint['category']): string => {
    const labels = {
      service: 'Service',
      advice: 'Advice',
      product: 'Product',
      fees: 'Fees',
      communication: 'Communication',
      other: 'Other'
    }
    return labels[category]
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  // Calculate days since complaint (FCA requires resolution within 8 weeks = 56 days)
  const getDaysSinceComplaint = (date: string): number => {
    const complaintDate = new Date(date)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - complaintDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const isApproachingDeadline = (complaint: Complaint): boolean => {
    if (complaint.status === 'resolved' || complaint.status === 'closed') return false
    const days = getDaysSinceComplaint(complaint.complaint_date)
    return days >= 42 && days < 56 // Warning after 6 weeks
  }

  const isOverdue = (complaint: Complaint): boolean => {
    if (complaint.status === 'resolved' || complaint.status === 'closed') return false
    return getDaysSinceComplaint(complaint.complaint_date) >= 56
  }

  const handleExportCSV = () => {
    const headers = ['Reference', 'Date', 'Client', 'Category', 'Status', 'Resolution Date', 'Redress', 'FCA Reportable']
    const rows = complaints.map(c => [
      c.reference_number,
      formatDate(c.complaint_date),
      getClientName(c),
      getCategoryLabel(c.category),
      c.status,
      formatDate(c.resolution_date),
      c.redress_amount.toString(),
      c.fca_reportable ? 'Yes' : 'No'
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `complaints_register_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Exported',
      description: 'Complaints register exported to CSV'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Calculate summary stats
  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'open').length,
    investigating: complaints.filter(c => c.status === 'investigating').length,
    escalated: complaints.filter(c => c.status === 'escalated').length,
    resolved: complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
    overdue: complaints.filter(c => isOverdue(c)).length,
    approachingDeadline: complaints.filter(c => isApproachingDeadline(c)).length,
    fcaReportable: complaints.filter(c => c.fca_reportable).length,
    totalRedress: complaints.reduce((sum, c) => sum + (c.redress_amount || 0), 0),
    avgResolutionDays: complaints.filter(c => c.resolution_date).length > 0
      ? Math.round(
          complaints
            .filter(c => c.resolution_date)
            .reduce((sum, c) => {
              const start = new Date(c.complaint_date)
              const end = new Date(c.resolution_date!)
              return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            }, 0) / complaints.filter(c => c.resolution_date).length
        )
      : 0
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={stats.overdue > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Open Cases</p>
                <p className="text-2xl font-bold">{stats.open + stats.investigating}</p>
              </div>
              <MessageSquareWarning className={`h-8 w-8 ${stats.overdue > 0 ? 'text-red-500' : 'text-orange-500'}`} />
            </div>
            {stats.overdue > 0 && (
              <p className="text-xs text-red-600 mt-1 font-medium">{stats.overdue} overdue!</p>
            )}
          </CardContent>
        </Card>

        <Card className={stats.escalated > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Escalated</p>
                <p className="text-2xl font-bold">{stats.escalated}</p>
              </div>
              <AlertOctagon className={`h-8 w-8 ${stats.escalated > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Avg Resolution</p>
                <p className="text-2xl font-bold">{stats.avgResolutionDays}d</p>
              </div>
              <Timer className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">FCA target: 56 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total Redress</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalRedress)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FCA Warning Banner */}
      {(stats.overdue > 0 || stats.approachingDeadline > 0) && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          stats.overdue > 0 ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'
        }`}>
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${stats.overdue > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
          <div>
            <p className={`font-medium ${stats.overdue > 0 ? 'text-red-800' : 'text-yellow-800'}`}>
              FCA Compliance Alert
            </p>
            <p className={`text-sm ${stats.overdue > 0 ? 'text-red-700' : 'text-yellow-700'}`}>
              {stats.overdue > 0 && `${stats.overdue} complaint(s) have exceeded the 8-week FCA deadline. `}
              {stats.approachingDeadline > 0 && `${stats.approachingDeadline} complaint(s) approaching deadline.`}
              {' '}Final response letters must be issued within 8 weeks of receipt.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search complaints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
          >
            <option value="all">All Status ({stats.total})</option>
            <option value="open">Open ({stats.open})</option>
            <option value="investigating">Investigating ({stats.investigating})</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated ({stats.escalated})</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Log Complaint
          </Button>
        </div>
      </div>

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquareWarning className="h-5 w-5" />
            <span>Complaints Register ({filteredComplaints.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredComplaints.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquareWarning className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No complaints found</p>
              <p className="text-gray-400 mt-1">
                {statusFilter !== 'all' ? 'Try changing the filter' : 'Log your first complaint to get started'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {filteredComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className={`rounded-lg border p-4 shadow-sm ${
                      isOverdue(complaint) ? 'border-red-200 bg-red-50/40' :
                      isApproachingDeadline(complaint) ? 'border-yellow-200 bg-yellow-50/40' :
                      'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-500 font-mono">{complaint.reference_number}</p>
                        <p className="text-sm font-semibold text-gray-900">{getClientName(complaint)}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(complaint.complaint_date)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedComplaint(complaint)}
                        className="shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{getCategoryLabel(complaint.category)}</Badge>
                      {getStatusBadge(complaint.status)}
                      {complaint.fca_reportable && (
                        <Badge variant="destructive" className="text-xs">FCA</Badge>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                      {complaint.description.length > 90
                        ? `${complaint.description.substring(0, 90)}...`
                        : complaint.description}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400 uppercase">Days Open</p>
                        {complaint.status === 'resolved' || complaint.status === 'closed' ? (
                          <p className="text-sm font-semibold text-green-600">-</p>
                        ) : (
                          <p className={`text-sm font-semibold ${
                            isOverdue(complaint) ? 'text-red-600' :
                            isApproachingDeadline(complaint) ? 'text-yellow-600' :
                            'text-gray-700'
                          }`}>
                            {getDaysSinceComplaint(complaint.complaint_date)}d
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-400 uppercase">Redress</p>
                        <p className={`text-sm font-semibold ${
                          complaint.redress_amount > 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {complaint.redress_amount > 0 ? formatCurrency(complaint.redress_amount) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium">Reference</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Client</th>
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Summary</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Days Open</th>
                      <th className="text-left p-3 font-medium">Redress</th>
                      <th className="text-left p-3 font-medium">FCA</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredComplaints.map((complaint) => (
                      <tr
                        key={complaint.id}
                        className={`hover:bg-gray-50 ${
                          isOverdue(complaint) ? 'bg-red-50' :
                          isApproachingDeadline(complaint) ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="p-3">
                          <span className="font-mono text-xs">{complaint.reference_number || '-'}</span>
                        </td>
                        <td className="p-3">{formatDate(complaint.complaint_date)}</td>
                        <td className="p-3">
                          <span className="font-medium">{getClientName(complaint)}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{getCategoryLabel(complaint.category)}</Badge>
                        </td>
                        <td className="p-3 max-w-[200px]">
                          <span className="text-gray-600 text-xs" title={complaint.description}>
                            {complaint.description.length > 50
                              ? `${complaint.description.substring(0, 50)}...`
                              : complaint.description}
                          </span>
                        </td>
                        <td className="p-3">{getStatusBadge(complaint.status)}</td>
                        <td className="p-3">
                          {complaint.status === 'resolved' || complaint.status === 'closed' ? (
                            <span className="text-green-600">-</span>
                          ) : (
                            <span className={
                              isOverdue(complaint) ? 'text-red-600 font-bold' :
                              isApproachingDeadline(complaint) ? 'text-yellow-600 font-medium' :
                              'text-gray-600'
                            }>
                              {getDaysSinceComplaint(complaint.complaint_date)}d
                              {isOverdue(complaint) && ' (Overdue!)'}
                              {isApproachingDeadline(complaint) && !isOverdue(complaint) && ' (Due soon)'}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {complaint.redress_amount > 0 ? (
                            <span className="text-red-600">{formatCurrency(complaint.redress_amount)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {complaint.fca_reportable ? (
                            <Badge variant="destructive" className="text-xs">Yes</Badge>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedComplaint(complaint)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <ComplaintFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false)
            loadComplaints()
            onStatsChange?.()
          }}
        />
      )}

      {/* View/Edit Modal */}
      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onSaved={() => {
            setSelectedComplaint(null)
            loadComplaints()
            onStatsChange?.()
          }}
        />
      )}
    </div>
  )
}

// Complaint Form Modal
function ComplaintFormModal({
  onClose,
  onSaved
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    complaint_date: new Date().toISOString().split('T')[0],
    received_via: 'email' as Complaint['received_via'],
    category: 'service' as Complaint['category'],
    description: '',
    fca_reportable: false
  })

  useEffect(() => {
    const loadClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, client_ref, personal_details')
        .order('personal_details->firstName')
      setClients(data || [])
      setLoading(false)
    }
    loadClients()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description) {
      toast({
        title: 'Error',
        description: 'Please enter a description',
        variant: 'destructive'
      })
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('complaint_register')
        .insert({
          client_id: formData.client_id || null,
          complaint_date: formData.complaint_date,
          received_via: formData.received_via,
          category: formData.category,
          description: formData.description,
          fca_reportable: formData.fca_reportable,
          status: 'open'
        })

      if (error) throw error

      toast({
        title: 'Complaint Logged',
        description: 'New complaint has been recorded'
      })
      onSaved()
    } catch (error) {
      console.error('Error creating complaint:', error)
      toast({
        title: 'Error',
        description: 'Failed to log complaint',
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Log New Complaint</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client (Optional)
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
              disabled={loading}
            >
              <option value="">No client linked</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {getClientDisplayName(client)}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complaint Date *
            </label>
            <input
              type="date"
              value={formData.complaint_date}
              onChange={(e) => setFormData({ ...formData, complaint_date: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
              required
            />
          </div>

          {/* Received Via */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Received Via *
            </label>
            <select
              value={formData.received_via}
              onChange={(e) => setFormData({ ...formData, received_via: e.target.value as any })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="letter">Letter</option>
              <option value="in_person">In Person</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="service">Service</option>
              <option value="advice">Advice</option>
              <option value="product">Product</option>
              <option value="fees">Fees</option>
              <option value="communication">Communication</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the complaint..."
              className="w-full border rounded-lg p-2 text-sm min-h-[100px]"
              required
            />
          </div>

          {/* FCA Reportable */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="fca_reportable"
              checked={formData.fca_reportable}
              onChange={(e) => setFormData({ ...formData, fca_reportable: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="fca_reportable" className="text-sm text-gray-700">
              FCA Reportable Complaint
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Log Complaint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Complaint Detail Modal - Enhanced with timeline and workflow
function ComplaintDetailModal({
  complaint,
  onClose,
  onSaved
}: {
  complaint: Complaint
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    status: complaint.status,
    root_cause: complaint.root_cause || '',
    resolution: complaint.resolution || '',
    resolution_date: complaint.resolution_date || '',
    redress_amount: complaint.redress_amount || 0,
    lessons_learned: complaint.lessons_learned || '',
    fca_reportable: complaint.fca_reportable
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'actions'>('details')

  const getClientName = (): string => {
    if (!complaint.clients?.personal_details) return 'Unknown Client'
    const { firstName, lastName, title } = complaint.clients.personal_details
    return `${title ? title + ' ' : ''}${firstName || ''} ${lastName || ''}`.trim() ||
           complaint.clients.client_ref || 'Unknown Client'
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Calculate timeline milestones
  const complaintDate = new Date(complaint.complaint_date)
  const acknowledgeDeadline = new Date(complaintDate.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days
  const fourWeekDeadline = new Date(complaintDate.getTime() + 28 * 24 * 60 * 60 * 1000) // 4 weeks
  const finalResponseDeadline = new Date(complaintDate.getTime() + 56 * 24 * 60 * 60 * 1000) // 8 weeks
  const today = new Date()
  const daysSinceComplaint = Math.ceil((today.getTime() - complaintDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, 56 - daysSinceComplaint)
  const isOpen = complaint.status !== 'resolved' && complaint.status !== 'closed'

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('complaint_register')
        .update({
          status: formData.status,
          root_cause: formData.root_cause || null,
          resolution: formData.resolution || null,
          resolution_date: formData.resolution_date || null,
          redress_amount: formData.redress_amount,
          lessons_learned: formData.lessons_learned || null,
          fca_reportable: formData.fca_reportable
        })
        .eq('id', complaint.id)

      if (error) throw error

      toast({
        title: 'Updated',
        description: 'Complaint has been updated'
      })
      onSaved()
    } catch (error) {
      console.error('Error updating complaint:', error)
      toast({
        title: 'Error',
        description: 'Failed to update complaint',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const getReceivedViaIcon = () => {
    const icons = {
      email: Mail,
      phone: Phone,
      letter: FileText,
      in_person: UserCircle,
      other: MessageSquare
    }
    const Icon = icons[complaint.received_via] || MessageSquare
    return <Icon className="h-4 w-4" />
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-semibold">Complaint Details</h2>
                {complaint.fca_reportable && (
                  <Badge variant="destructive">FCA Reportable</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 font-mono mt-1">{complaint.reference_number}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Bar */}
          {isOpen && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Day {daysSinceComplaint} of 56</span>
                <span className={daysRemaining <= 14 ? 'text-red-600 font-medium' : ''}>
                  {daysRemaining} days remaining
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    daysSinceComplaint >= 56 ? 'bg-red-500' :
                    daysSinceComplaint >= 42 ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, (daysSinceComplaint / 56) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex space-x-6">
            {['details', 'timeline', 'actions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`py-3 px-1 border-b-2 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Client</p>
                  <p className="font-medium">{getClientName()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Date Received</p>
                  <p className="font-medium">{formatDate(complaint.complaint_date)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Category</p>
                  <p className="font-medium capitalize">{complaint.category}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg flex items-center space-x-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Received Via</p>
                    <p className="font-medium capitalize flex items-center space-x-1">
                      {getReceivedViaIcon()}
                      <span>{complaint.received_via.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Description</label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">{complaint.description}</div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Complaint['status'] })}
                  className="w-full border rounded-lg p-2 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Root Cause */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Root Cause Analysis
                  <span className="text-gray-400 font-normal ml-1">(Required for closure)</span>
                </label>
                <textarea
                  value={formData.root_cause}
                  onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                  placeholder="What was the underlying cause of this complaint?"
                  className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
                />
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution / Final Response
                  <span className="text-gray-400 font-normal ml-1">(Required for closure)</span>
                </label>
                <textarea
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  placeholder="How was this complaint resolved? Include details of the final response sent to the client."
                  className="w-full border rounded-lg p-2 text-sm min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Resolution Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Date</label>
                  <input
                    type="date"
                    value={formData.resolution_date}
                    onChange={(e) => setFormData({ ...formData, resolution_date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>

                {/* Redress Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Redress Amount (£)</label>
                  <input
                    type="number"
                    value={formData.redress_amount}
                    onChange={(e) => setFormData({ ...formData, redress_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg p-2 text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Lessons Learned */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lessons Learned
                  <span className="text-gray-400 font-normal ml-1">(What changes will be made?)</span>
                </label>
                <textarea
                  value={formData.lessons_learned}
                  onChange={(e) => setFormData({ ...formData, lessons_learned: e.target.value })}
                  placeholder="What process improvements or training will be implemented to prevent similar complaints?"
                  className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
                />
              </div>

              {/* FCA Reportable */}
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <input
                  type="checkbox"
                  id="fca_reportable_edit"
                  checked={formData.fca_reportable}
                  onChange={(e) => setFormData({ ...formData, fca_reportable: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="fca_reportable_edit" className="text-sm text-gray-700">
                  <span className="font-medium">FCA Reportable Complaint</span>
                  <span className="text-gray-500 block text-xs">Check if this complaint must be reported to the FCA</span>
                </label>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="border-l-2 border-gray-200 ml-3 space-y-6">
                {/* Complaint Received */}
                <div className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600"></div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium text-blue-900">Complaint Received</p>
                    <p className="text-sm text-blue-700">{formatDate(complaint.complaint_date)}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Via {complaint.received_via.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Acknowledge Deadline */}
                <div className="relative pl-6">
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${
                    today > acknowledgeDeadline ? 'bg-green-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`p-3 rounded-lg ${
                    today > acknowledgeDeadline ? 'bg-green-50' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Acknowledgement Deadline</p>
                    <p className="text-sm text-gray-600">{formatDate(acknowledgeDeadline.toISOString())}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Written acknowledgement must be sent within 5 business days
                    </p>
                  </div>
                </div>

                {/* 4-Week Update */}
                <div className="relative pl-6">
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${
                    today > fourWeekDeadline ? (complaint.status !== 'open' ? 'bg-green-600' : 'bg-yellow-500') : 'bg-gray-300'
                  }`}></div>
                  <div className={`p-3 rounded-lg ${
                    today > fourWeekDeadline && complaint.status === 'open' ? 'bg-yellow-50' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">4-Week Progress Update</p>
                    <p className="text-sm text-gray-600">{formatDate(fourWeekDeadline.toISOString())}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      If not resolved, update client on progress and expected resolution date
                    </p>
                  </div>
                </div>

                {/* Final Response Deadline */}
                <div className="relative pl-6">
                  <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${
                    complaint.status === 'resolved' || complaint.status === 'closed' ? 'bg-green-600' :
                    today > finalResponseDeadline ? 'bg-red-600' : 'bg-gray-300'
                  }`}></div>
                  <div className={`p-3 rounded-lg ${
                    !isOpen ? 'bg-green-50' :
                    today > finalResponseDeadline ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Final Response Deadline (8 weeks)</p>
                    <p className="text-sm text-gray-600">{formatDate(finalResponseDeadline.toISOString())}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isOpen ? (
                        today > finalResponseDeadline
                          ? 'OVERDUE: Final response must be issued immediately'
                          : 'Final written response must be issued within 8 weeks'
                      ) : (
                        `Resolved on ${formatDate(complaint.resolution_date)}`
                      )}
                    </p>
                  </div>
                </div>

                {/* Resolution (if resolved) */}
                {!isOpen && (
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-600"></div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="font-medium text-green-900">Complaint Resolved</p>
                      <p className="text-sm text-green-700">{formatDate(complaint.resolution_date)}</p>
                      {complaint.redress_amount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Redress paid: £{complaint.redress_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setFormData({ ...formData, status: 'investigating' })
                      setActiveTab('details')
                    }}
                    className="p-3 border rounded-lg hover:bg-white text-left"
                    disabled={!isOpen}
                  >
                    <Eye className="h-5 w-5 text-blue-600 mb-1" />
                    <p className="font-medium text-sm">Start Investigation</p>
                    <p className="text-xs text-gray-500">Mark as investigating</p>
                  </button>

                  <button
                    onClick={() => {
                      setFormData({ ...formData, status: 'escalated' })
                      setActiveTab('details')
                    }}
                    className="p-3 border rounded-lg hover:bg-white text-left"
                    disabled={!isOpen}
                  >
                    <AlertOctagon className="h-5 w-5 text-yellow-600 mb-1" />
                    <p className="font-medium text-sm">Escalate</p>
                    <p className="text-xs text-gray-500">Escalate to senior management</p>
                  </button>

                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        status: 'resolved',
                        resolution_date: new Date().toISOString().split('T')[0]
                      })
                      setActiveTab('details')
                    }}
                    className="p-3 border rounded-lg hover:bg-white text-left"
                    disabled={!isOpen}
                  >
                    <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
                    <p className="font-medium text-sm">Mark Resolved</p>
                    <p className="text-xs text-gray-500">Complete with final response</p>
                  </button>

                  <button
                    onClick={() => {
                      setFormData({ ...formData, fca_reportable: true })
                      setActiveTab('details')
                    }}
                    className="p-3 border rounded-lg hover:bg-white text-left"
                  >
                    <AlertTriangle className="h-5 w-5 text-red-600 mb-1" />
                    <p className="font-medium text-sm">Flag for FCA</p>
                    <p className="text-xs text-gray-500">Mark as reportable</p>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">FCA Requirements Checklist</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" readOnly checked={daysSinceComplaint >= 0} />
                    <span>Written acknowledgement sent within 5 business days</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" readOnly checked={daysSinceComplaint > 28 && complaint.status !== 'open'} />
                    <span>4-week holding response sent (if not resolved)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" readOnly checked={!!formData.root_cause} />
                    <span>Root cause identified</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" readOnly checked={!!formData.resolution} />
                    <span>Resolution documented</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" readOnly checked={!!formData.lessons_learned} />
                    <span>Lessons learned recorded</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" readOnly checked={!isOpen} />
                    <span>Final response issued within 8 weeks</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

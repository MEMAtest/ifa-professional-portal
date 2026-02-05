// components/compliance/BreachesRegister.tsx
// ================================================================
// Breaches Register - Regulatory breach logging and tracking
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertOctagon,
  Plus,
  Search,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  X,
  Users,
  Calendar,
  Shield,
  LayoutGrid,
  List
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'
import { WorkflowBoard, StatusPipeline, CommentThread, OwnerPicker, WORKFLOW_CONFIGS } from './workflow'
import type { WorkflowItem } from './workflow'
import { CreateTaskModal } from '@/modules/tasks/components/CreateTaskModal'
import { useCreateTask, useSourceTasks } from '@/modules/tasks/hooks/useTasks'

interface Breach {
  id: string
  firm_id: string
  reference_number: string
  breach_date: string
  discovered_date: string
  category: 'regulatory' | 'procedural' | 'data' | 'financial' | 'conduct' | 'other'
  severity: 'minor' | 'moderate' | 'serious' | 'critical'
  description: string
  root_cause: string | null
  affected_clients: number
  status: 'open' | 'investigating' | 'remediated' | 'closed'
  assigned_to: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  remediation_actions: string | null
  remediation_date: string | null
  fca_notified: boolean
  fca_notification_date: string | null
  lessons_learned: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Linked clients from junction table
  breach_affected_clients?: BreachAffectedClient[]
  assigned_user?: {
    id: string
    full_name?: string | null
    first_name?: string | null
    last_name?: string | null
    avatar_url: string | null
  }
}

interface BreachAffectedClient {
  id: string
  breach_id: string
  client_id: string
  impact_description: string | null
  notified: boolean
  notified_date: string | null
  remediation_status: 'pending' | 'in_progress' | 'completed'
  notes: string | null
  clients?: {
    id: string
    personal_details: {
      firstName?: string
      lastName?: string
    }
    client_ref?: string
  }
}

interface ClientOption {
  id: string
  name: string
  client_ref: string
}

interface Props {
  onStatsChange?: () => void
}

export default function BreachesRegister({ onStatsChange }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [breaches, setBreaches] = useState<Breach[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'workflow'>('table')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBreach, setSelectedBreach] = useState<Breach | null>(null)

  const loadBreaches = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('breach_register')
        .select(`
          *,
          breach_affected_clients(
            id,
            client_id,
            impact_description,
            notified,
            notified_date,
            remediation_status,
            notes,
            clients(id, personal_details, client_ref)
          ),
          assigned_user:assigned_to (
            id,
            full_name,
            avatar_url
          )
        `)
        .order('breach_date', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        // If junction table doesn't exist yet, fall back to basic query
        if (error.message?.includes('breach_affected_clients')) {
          const { data: basicData } = await supabase
            .from('breach_register')
            .select('*')
            .order('breach_date', { ascending: false })
          setBreaches(basicData || [])
          return
        }
        clientLogger.error('Error loading breaches:', error)
        setBreaches([])
        return
      }

      setBreaches(data || [])
    } catch (error) {
      clientLogger.error('Error loading breaches:', error)
      setBreaches([])
    } finally {
      setLoading(false)
    }
  }, [supabase, statusFilter])

  useEffect(() => {
    loadBreaches()
  }, [loadBreaches])

  const filteredBreaches = breaches.filter(breach => {
    if (!searchTerm) return true
    return (
      breach.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      breach.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      breach.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const getOwnerName = (breach: Breach): string => {
    const owner = breach.assigned_user
    if (!owner) return 'Unassigned'
    return (
      owner.full_name ||
      `${owner.first_name || ''} ${owner.last_name || ''}`.trim()
    ) || 'Unassigned'
  }

  const getBreachDueDate = (breach: Breach): string => {
    const base = breach.remediation_date || breach.discovered_date || breach.breach_date
    return new Date(base).toISOString()
  }

  const workflowItems: WorkflowItem[] = filteredBreaches.map((breach) => ({
    id: breach.id,
    sourceType: 'breach',
    sourceId: breach.id,
    title: breach.reference_number || 'Breach',
    subtitle: breach.description ? breach.description.slice(0, 50) + (breach.description.length > 50 ? '…' : '') : '',
    status: breach.status,
    priority: breach.priority || 'medium',
    ownerId: breach.assigned_to || null,
    ownerName: getOwnerName(breach),
    commentCount: 0,
    dueDate: getBreachDueDate(breach),
  }))

  const handleWorkflowStatusChange = async (item: WorkflowItem, status: string) => {
    try {
      const { error } = await supabase
        .from('breach_register')
        .update({ status })
        .eq('id', item.id)
      if (error) throw error
      await loadBreaches()
      onStatsChange?.()
    } catch (error) {
      clientLogger.error('Error updating breach status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update breach status',
        variant: 'destructive'
      })
    }
  }

  const getSeverityBadge = (severity: Breach['severity']) => {
    const config = {
      minor: { color: 'bg-green-100 text-green-700', label: 'Minor' },
      moderate: { color: 'bg-yellow-100 text-yellow-700', label: 'Moderate' },
      serious: { color: 'bg-orange-100 text-orange-700', label: 'Serious' },
      critical: { color: 'bg-red-100 text-red-700', label: 'Critical' }
    }
    const { color, label } = config[severity]
    return <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{label}</span>
  }

  const getStatusBadge = (status: Breach['status']) => {
    const config = {
      open: { variant: 'destructive' as const, label: 'Open', icon: AlertTriangle },
      investigating: { variant: 'secondary' as const, label: 'Investigating', icon: Eye },
      remediated: { variant: 'default' as const, label: 'Remediated', icon: CheckCircle },
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

  const getCategoryLabel = (category: Breach['category']): string => {
    const labels = {
      regulatory: 'Regulatory',
      procedural: 'Procedural',
      data: 'Data',
      financial: 'Financial',
      conduct: 'Conduct',
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

  const handleExportCSV = () => {
    const headers = ['Reference', 'Breach Date', 'Discovered', 'Category', 'Severity', 'Affected Clients', 'Status', 'FCA Notified']
    const rows = breaches.map(b => [
      b.reference_number,
      formatDate(b.breach_date),
      formatDate(b.discovered_date),
      getCategoryLabel(b.category),
      b.severity,
      b.affected_clients.toString(),
      b.status,
      b.fca_notified ? 'Yes' : 'No'
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `breaches_register_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Exported',
      description: 'Breaches register exported to CSV'
    })
  }

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search breaches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="remediated">Remediated</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Log Breach
          </Button>
        </div>
      </div>

      {viewMode === 'workflow' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertOctagon className="h-5 w-5" />
              <span>Breaches Workflow ({filteredBreaches.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowBoard
              columns={WORKFLOW_CONFIGS.breach.stages}
              items={workflowItems}
              onItemClick={(item) => {
                const breach = breaches.find((b) => b.id === item.id)
                if (breach) setSelectedBreach(breach)
              }}
              onStatusChange={handleWorkflowStatusChange}
              emptyMessage="No breaches in this workflow"
            />
          </CardContent>
        </Card>
      )}

      {/* Breaches Table */}
      {viewMode === 'table' && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertOctagon className="h-5 w-5" />
            <span>Breaches Register ({filteredBreaches.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBreaches.length === 0 ? (
            <div className="text-center py-12">
              <AlertOctagon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No breaches found</p>
              <p className="text-gray-400 mt-1">
                {statusFilter !== 'all' ? 'Try changing the filter' : 'No breaches have been recorded'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {filteredBreaches.map((breach) => (
                  <div
                    key={breach.id}
                    className={`rounded-lg border p-4 shadow-sm ${
                      breach.severity === 'critical' ? 'border-red-200 bg-red-50/40' :
                      breach.severity === 'serious' ? 'border-orange-200 bg-orange-50/40' :
                      'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-500 font-mono">{breach.reference_number}</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(breach.breach_date)}</p>
                        <p className="text-xs text-gray-500 mt-1">{getCategoryLabel(breach.category)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBreach(breach)}
                        className="shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {getSeverityBadge(breach.severity)}
                      {getStatusBadge(breach.status)}
                      {breach.fca_notified && (
                        <Badge variant="default" className="text-xs">FCA Notified</Badge>
                      )}
                      {!breach.fca_notified && (breach.severity === 'serious' || breach.severity === 'critical') && (
                        <Badge variant="destructive" className="text-xs">FCA Required</Badge>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400 uppercase">Affected</p>
                        <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                          <Users className="h-4 w-4 text-gray-400" />
                          {breach.breach_affected_clients?.length || breach.affected_clients || 0}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400 uppercase">FCA</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {breach.fca_notified ? 'Notified' : breach.severity === 'serious' || breach.severity === 'critical' ? 'Required' : 'No'}
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
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-left p-3 font-medium">Severity</th>
                      <th className="text-left p-3 font-medium">Affected</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">FCA</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBreaches.map((breach) => (
                      <tr
                        key={breach.id}
                        className={`hover:bg-gray-50 ${
                          breach.severity === 'critical' ? 'bg-red-50' :
                          breach.severity === 'serious' ? 'bg-orange-50' : ''
                        }`}
                      >
                        <td className="p-3">
                          <span className="font-mono text-xs">{breach.reference_number}</span>
                        </td>
                        <td className="p-3">{formatDate(breach.breach_date)}</td>
                        <td className="p-3">
                          <Badge variant="outline">{getCategoryLabel(breach.category)}</Badge>
                        </td>
                        <td className="p-3">{getSeverityBadge(breach.severity)}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>
                              {breach.breach_affected_clients?.length || breach.affected_clients || 0}
                            </span>
                            {breach.breach_affected_clients && breach.breach_affected_clients.length > 0 && (
                              <span className="text-xs text-blue-600 ml-1">(linked)</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(breach.status)}</td>
                        <td className="p-3">
                          {breach.fca_notified ? (
                            <Badge variant="default" className="text-xs">Notified</Badge>
                          ) : breach.severity === 'serious' || breach.severity === 'critical' ? (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBreach(breach)}
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
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <BreachFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false)
            loadBreaches()
            onStatsChange?.()
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedBreach && (
        <BreachDetailModal
          breach={selectedBreach}
          onClose={() => setSelectedBreach(null)}
          onSaved={() => {
            setSelectedBreach(null)
            loadBreaches()
            onStatsChange?.()
          }}
        />
      )}
    </div>
  )
}

// Breach Form Modal
function BreachFormModal({
  onClose,
  onSaved
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    assigned_to: '',
    priority: 'medium' as Breach['priority'],
    breach_date: new Date().toISOString().split('T')[0],
    discovered_date: new Date().toISOString().split('T')[0],
    category: 'procedural' as Breach['category'],
    severity: 'minor' as Breach['severity'],
    description: '',
    affected_clients: 0
  })

  // Load clients for selection
  useEffect(() => {
    const loadClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, personal_details, client_ref')
        .order('personal_details->lastName', { ascending: true })

      if (data) {
        setClients(data.map((c: { id: string; personal_details?: { firstName?: string; lastName?: string }; client_ref?: string }) => ({
          id: c.id,
          name: `${c.personal_details?.firstName || ''} ${c.personal_details?.lastName || ''}`.trim() || 'Unknown',
          client_ref: c.client_ref || ''
        })))
      }
    }
    loadClients()
  }, [supabase])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    c.client_ref.toLowerCase().includes(clientSearchTerm.toLowerCase())
  )

  const toggleClient = (clientId: string) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

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
      // Create breach with count from selected clients or manual input
      const { data: breach, error } = await supabase
        .from('breach_register')
        .insert({
          assigned_to: formData.assigned_to || null,
          priority: formData.priority,
          breach_date: formData.breach_date,
          discovered_date: formData.discovered_date,
          category: formData.category,
          severity: formData.severity,
          description: formData.description,
          affected_clients: selectedClientIds.length || formData.affected_clients,
          status: 'open'
        })
        .select()
        .single()

      if (error) throw error

      // Link selected clients if any
      if (breach && selectedClientIds.length > 0) {
        const clientLinks = selectedClientIds.map(clientId => ({
          breach_id: breach.id,
          client_id: clientId,
          remediation_status: 'pending'
        }))

        const { error: linkError } = await supabase
          .from('breach_affected_clients')
          .insert(clientLinks)

        if (linkError) {
          console.warn('Could not link clients (table may not exist yet):', linkError)
        }
      }

      toast({
        title: 'Breach Logged',
        description: `New breach has been recorded${selectedClientIds.length > 0 ? ` with ${selectedClientIds.length} linked clients` : ''}`
      })
      onSaved()
    } catch (error) {
      clientLogger.error('Error creating breach:', error)
      toast({
        title: 'Error',
        description: 'Failed to log breach',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Log New Breach</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breach Date *</label>
              <input
                type="date"
                value={formData.breach_date}
                onChange={(e) => setFormData({ ...formData, breach_date: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discovered Date *</label>
              <input
                type="date"
                value={formData.discovered_date}
                onChange={(e) => setFormData({ ...formData, discovered_date: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <OwnerPicker
                value={formData.assigned_to || null}
                onChange={(value) => setFormData({ ...formData, assigned_to: value || '' })}
                compact
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Breach['priority'] })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="regulatory">Regulatory</option>
                <option value="procedural">Procedural</option>
                <option value="data">Data</option>
                <option value="financial">Financial</option>
                <option value="conduct">Conduct</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="serious">Serious</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Affected Clients Selection */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Affected Clients
              {selectedClientIds.length > 0 && (
                <span className="ml-2 text-blue-600">({selectedClientIds.length} selected)</span>
              )}
            </label>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* Selected clients pills */}
            {selectedClientIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedClientIds.map(id => {
                  const client = clients.find(c => c.id === id)
                  return client ? (
                    <span
                      key={id}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {client.name}
                      <button
                        type="button"
                        onClick={() => toggleClient(id)}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}

            {/* Client list */}
            <div className="max-h-32 overflow-y-auto border rounded bg-white">
              {filteredClients.slice(0, 20).map(client => (
                <label
                  key={client.id}
                  className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer text-sm ${
                    selectedClientIds.includes(client.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedClientIds.includes(client.id)}
                    onChange={() => toggleClient(client.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 mr-2"
                  />
                  <span className="flex-1">{client.name}</span>
                  <span className="text-xs text-gray-400">{client.client_ref}</span>
                </label>
              ))}
              {filteredClients.length === 0 && (
                <p className="p-2 text-sm text-gray-500">No clients found</p>
              )}
              {filteredClients.length > 20 && (
                <p className="p-2 text-xs text-gray-400 text-center">
                  Showing first 20 results. Refine your search.
                </p>
              )}
            </div>

            {/* Fallback manual count */}
            {selectedClientIds.length === 0 && (
              <div className="mt-2">
                <label className="text-xs text-gray-500">Or enter count manually:</label>
                <input
                  type="number"
                  value={formData.affected_clients}
                  onChange={(e) => setFormData({ ...formData, affected_clients: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                  min="0"
                  placeholder="Number of affected clients"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the breach..."
              className="w-full border rounded-lg p-2 text-sm min-h-[100px]"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Log Breach'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Breach Detail Modal
function BreachDetailModal({
  breach,
  onClose,
  onSaved
}: {
  breach: Breach
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [showTaskModal, setShowTaskModal] = useState(false)
  const createTask = useCreateTask()
  const { data: linkedTasks } = useSourceTasks('breach', breach.id)

  const [formData, setFormData] = useState({
    status: breach.status,
    assigned_to: breach.assigned_to || '',
    priority: breach.priority || 'medium',
    root_cause: breach.root_cause || '',
    remediation_actions: breach.remediation_actions || '',
    remediation_date: breach.remediation_date || '',
    fca_notified: breach.fca_notified,
    fca_notification_date: breach.fca_notification_date || '',
    lessons_learned: breach.lessons_learned || ''
  })
  const [saving, setSaving] = useState(false)

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('breach_register')
        .update({
          status: formData.status,
          assigned_to: formData.assigned_to || null,
          priority: formData.priority,
          root_cause: formData.root_cause || null,
          remediation_actions: formData.remediation_actions || null,
          remediation_date: formData.remediation_date || null,
          fca_notified: formData.fca_notified,
          fca_notification_date: formData.fca_notification_date || null,
          lessons_learned: formData.lessons_learned || null
        })
        .eq('id', breach.id)

      if (error) throw error

      toast({
        title: 'Updated',
        description: 'Breach has been updated'
      })
      onSaved()
    } catch (error) {
      clientLogger.error('Error updating breach:', error)
      toast({
        title: 'Error',
        description: 'Failed to update breach',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTask = async (input: any) => {
    await createTask.mutateAsync({
      ...input,
      sourceType: 'breach',
      sourceId: breach.id,
      assignedTo: formData.assigned_to || input.assignedTo,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Breach Details</h2>
            <p className="text-sm text-gray-500 font-mono">{breach.reference_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <StatusPipeline stages={WORKFLOW_CONFIGS.breach.stages} currentStage={formData.status} />
        </div>

        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Breach Date</p>
              <p className="font-medium">{formatDate(breach.breach_date)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Discovered</p>
              <p className="font-medium">{formatDate(breach.discovered_date)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Category</p>
              <p className="font-medium capitalize">{breach.category}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Severity</p>
              <p className="font-medium capitalize">{breach.severity}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">{breach.description}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="remediated">Remediated</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affected Clients</label>
              <div className="border rounded-lg p-2 text-sm bg-gray-50">
                {breach.breach_affected_clients?.length || breach.affected_clients}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <OwnerPicker
                value={formData.assigned_to || null}
                onChange={(value) => setFormData({ ...formData, assigned_to: value || '' })}
                compact
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Breach['priority'] })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Linked Clients Section */}
          {breach.breach_affected_clients && breach.breach_affected_clients.length > 0 && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Linked Clients ({breach.breach_affected_clients.length})</span>
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {breach.breach_affected_clients.map((link) => {
                  const clientName = link.clients
                    ? `${link.clients.personal_details?.firstName || ''} ${link.clients.personal_details?.lastName || ''}`.trim()
                    : 'Unknown Client'
                  return (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <div>
                        <span className="font-medium text-sm">{clientName}</span>
                        {link.clients?.client_ref && (
                          <span className="text-xs text-gray-500 ml-2">({link.clients.client_ref})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {link.notified ? (
                          <Badge variant="default" className="text-xs">Notified</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Not Notified</Badge>
                        )}
                        <Badge
                          variant={
                            link.remediation_status === 'completed' ? 'default' :
                            link.remediation_status === 'in_progress' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {link.remediation_status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause</label>
            <textarea
              value={formData.root_cause}
              onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
              placeholder="What was the underlying cause?"
              className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remediation Actions</label>
            <textarea
              value={formData.remediation_actions}
              onChange={(e) => setFormData({ ...formData, remediation_actions: e.target.value })}
              placeholder="What actions were taken to remediate?"
              className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remediation Date</label>
            <input
              type="date"
              value={formData.remediation_date}
              onChange={(e) => setFormData({ ...formData, remediation_date: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>

          {/* FCA Notification */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-medium">FCA Notification</span>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.fca_notified}
                  onChange={(e) => setFormData({ ...formData, fca_notified: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">FCA has been notified</span>
              </label>
            </div>
            {formData.fca_notified && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notification Date</label>
                <input
                  type="date"
                  value={formData.fca_notification_date}
                  onChange={(e) => setFormData({ ...formData, fca_notification_date: e.target.value })}
                  className="border rounded-lg p-2 text-sm"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lessons Learned</label>
            <textarea
              value={formData.lessons_learned}
              onChange={(e) => setFormData({ ...formData, lessons_learned: e.target.value })}
              placeholder="What can be improved?"
              className="w-full border rounded-lg p-2 text-sm min-h-[80px]"
            />
          </div>

          {/* Linked Tasks */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Linked Tasks</div>
              <Button size="sm" onClick={() => setShowTaskModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {linkedTasks?.tasks?.length ? (
                linkedTasks.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.status.replace('_', ' ')}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {task.priority}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
                  No linked tasks yet
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <CommentThread sourceType="breach" sourceId={breach.id} />
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <CreateTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        onSubmit={handleCreateTask}
        defaultAssigneeId={formData.assigned_to || undefined}
      />
    </div>
  )
}

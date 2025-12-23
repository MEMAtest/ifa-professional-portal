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
  Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'

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
  remediation_actions: string | null
  remediation_date: string | null
  fca_notified: boolean
  fca_notification_date: string | null
  lessons_learned: string | null
  created_by: string | null
  created_at: string
  updated_at: string
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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBreach, setSelectedBreach] = useState<Breach | null>(null)

  const loadBreaches = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('breach_register')
        .select('*')
        .order('breach_date', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading breaches:', error)
        setBreaches([])
        return
      }

      setBreaches(data || [])
    } catch (error) {
      console.error('Error loading breaches:', error)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search breaches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="remediated">Remediated</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Breach
          </Button>
        </div>
      </div>

      {/* Breaches Table */}
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
            <div className="overflow-x-auto">
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
                          <span>{breach.affected_clients}</span>
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
          )}
        </CardContent>
      </Card>

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
  const [formData, setFormData] = useState({
    breach_date: new Date().toISOString().split('T')[0],
    discovered_date: new Date().toISOString().split('T')[0],
    category: 'procedural' as Breach['category'],
    severity: 'minor' as Breach['severity'],
    description: '',
    affected_clients: 0
  })

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
        .from('breach_register')
        .insert({
          breach_date: formData.breach_date,
          discovered_date: formData.discovered_date,
          category: formData.category,
          severity: formData.severity,
          description: formData.description,
          affected_clients: formData.affected_clients,
          status: 'open'
        })

      if (error) throw error

      toast({
        title: 'Breach Logged',
        description: 'New breach has been recorded'
      })
      onSaved()
    } catch (error) {
      console.error('Error creating breach:', error)
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Affected Clients</label>
            <input
              type="number"
              value={formData.affected_clients}
              onChange={(e) => setFormData({ ...formData, affected_clients: parseInt(e.target.value) || 0 })}
              className="w-full border rounded-lg p-2 text-sm"
              min="0"
            />
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

  const [formData, setFormData] = useState({
    status: breach.status,
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
      console.error('Error updating breach:', error)
      toast({
        title: 'Error',
        description: 'Failed to update breach',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
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
              <div className="border rounded-lg p-2 text-sm bg-gray-50">{breach.affected_clients}</div>
            </div>
          </div>

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
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

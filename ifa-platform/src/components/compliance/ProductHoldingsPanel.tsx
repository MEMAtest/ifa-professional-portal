// components/compliance/ProductHoldingsPanel.tsx
// ================================================================
// Product Holdings Panel - Manage client product holdings per service
// ================================================================

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  Building2,
  Calendar,
  DollarSign,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'

interface ProductHolding {
  id: string
  client_id: string
  firm_id?: string
  service_id: string
  product_name: string
  product_provider?: string
  product_type?: string
  product_reference?: string
  current_value?: number
  purchase_value?: number
  last_valued_date?: string
  status: 'active' | 'transferred' | 'encashed' | 'matured'
  acquisition_date?: string
  notes?: string
}

interface ServiceOption {
  id: string
  label: string
}

interface Props {
  clientId: string
  services?: ServiceOption[]
  onUpdate?: () => void
}

const PRODUCT_TYPES = [
  'SIPP',
  'ISA',
  'GIA',
  'Workplace Pension',
  'Final Salary Pension',
  'Annuity',
  'Investment Bond',
  'Offshore Bond',
  'Trust',
  'VCT',
  'EIS',
  'SEIS',
  'Other'
]

const DEFAULT_SERVICES: ServiceOption[] = [
  { id: 'retirement_planning', label: 'Retirement Planning' },
  { id: 'investment_management', label: 'Investment Management' },
  { id: 'protection', label: 'Protection' },
  { id: 'mortgage_advice', label: 'Mortgage Advice' },
  { id: 'estate_planning', label: 'Estate Planning' },
  { id: 'tax_planning', label: 'Tax Planning' }
]

export default function ProductHoldingsPanel({ clientId, services = DEFAULT_SERVICES, onUpdate }: Props) {
  const { toast } = useToast()
  const [holdings, setHoldings] = useState<ProductHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingHolding, setEditingHolding] = useState<ProductHolding | null>(null)

  const loadHoldings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/holdings`)
      const data = await response.json()
      if (data.success) {
        setHoldings(data.holdings || [])
      }
    } catch (error) {
      clientLogger.error('Error loading holdings:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (clientId) {
      loadHoldings()
    }
  }, [clientId, loadHoldings])

  const handleDelete = async (holdingId: string) => {
    if (!confirm('Are you sure you want to delete this holding?')) return

    try {
      const response = await fetch(`/api/clients/${clientId}/holdings?holdingId=${holdingId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: 'Deleted', description: 'Product holding removed' })
        loadHoldings()
        onUpdate?.()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete holding',
        variant: 'destructive'
      })
    }
  }

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-'
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(value)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-700', label: 'Active' },
      transferred: { color: 'bg-blue-100 text-blue-700', label: 'Transferred' },
      encashed: { color: 'bg-gray-100 text-gray-700', label: 'Encashed' },
      matured: { color: 'bg-purple-100 text-purple-700', label: 'Matured' }
    }
    const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-700', label: status }
    return <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{label}</span>
  }

  // Group holdings by service
  const holdingsByService = holdings.reduce((acc, holding) => {
    const serviceId = holding.service_id
    if (!acc[serviceId]) acc[serviceId] = []
    acc[serviceId].push(holding)
    return acc
  }, {} as Record<string, ProductHolding[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Holdings ({holdings.length})
        </h3>
        <Button size="sm" onClick={() => { setEditingHolding(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Holding
        </Button>
      </div>

      {holdings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No product holdings recorded</p>
            <p className="text-gray-400 text-sm mt-1">Add holdings to track actual products per service</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {services.map(service => {
            const serviceHoldings = holdingsByService[service.id] || []
            if (serviceHoldings.length === 0) return null

            return (
              <Card key={service.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">{service.label}</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="divide-y">
                    {serviceHoldings.map(holding => (
                      <div key={holding.id} className="py-3 flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{holding.product_name}</span>
                            {getStatusBadge(holding.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {holding.product_provider && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {holding.product_provider}
                              </span>
                            )}
                            {holding.product_type && (
                              <Badge variant="outline" className="text-xs">{holding.product_type}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {holding.current_value !== undefined && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(holding.current_value)}
                              </span>
                            )}
                            {holding.last_valued_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Valued: {formatDate(holding.last_valued_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingHolding(holding); setShowForm(true) }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(holding.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <HoldingFormModal
          clientId={clientId}
          holding={editingHolding}
          services={services}
          onClose={() => { setShowForm(false); setEditingHolding(null) }}
          onSaved={() => {
            setShowForm(false)
            setEditingHolding(null)
            loadHoldings()
            onUpdate?.()
          }}
        />
      )}
    </div>
  )
}

// Holding Form Modal
function HoldingFormModal({
  clientId,
  holding,
  services,
  onClose,
  onSaved
}: {
  clientId: string
  holding: ProductHolding | null
  services: ServiceOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    service_id: holding?.service_id || services[0]?.id || '',
    product_name: holding?.product_name || '',
    product_provider: holding?.product_provider || '',
    product_type: holding?.product_type || '',
    product_reference: holding?.product_reference || '',
    current_value: holding?.current_value?.toString() || '',
    purchase_value: holding?.purchase_value?.toString() || '',
    last_valued_date: holding?.last_valued_date || '',
    acquisition_date: holding?.acquisition_date || '',
    status: holding?.status || 'active',
    notes: holding?.notes || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.product_name || !formData.service_id) {
      toast({
        title: 'Error',
        description: 'Product name and service are required',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        id: holding?.id,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        purchase_value: formData.purchase_value ? parseFloat(formData.purchase_value) : null
      }

      const response = await fetch(`/api/clients/${clientId}/holdings`, {
        method: holding ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: holding ? 'Updated' : 'Added',
          description: `Product holding ${holding ? 'updated' : 'added'} successfully`
        })
        onSaved()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${holding ? 'update' : 'add'} holding`,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {holding ? 'Edit Product Holding' : 'Add Product Holding'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service *</label>
            <select
              value={formData.service_id}
              onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
              required
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder="e.g., Vanguard LifeStrategy 60%"
              className="w-full border rounded-lg p-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <input
                type="text"
                value={formData.product_provider}
                onChange={(e) => setFormData({ ...formData, product_provider: e.target.value })}
                placeholder="e.g., Vanguard"
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              >
                <option value="">Select type...</option>
                {PRODUCT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.product_reference}
              onChange={(e) => setFormData({ ...formData, product_reference: e.target.value })}
              placeholder="Provider reference"
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Value (£)</label>
              <input
                type="number"
                step="0.01"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                placeholder="0.00"
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Value (£)</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_value}
                onChange={(e) => setFormData({ ...formData, purchase_value: e.target.value })}
                placeholder="0.00"
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Valued</label>
              <input
                type="date"
                value={formData.last_valued_date}
                onChange={(e) => setFormData({ ...formData, last_valued_date: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
              <input
                type="date"
                value={formData.acquisition_date}
                onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full border rounded-lg p-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="transferred">Transferred</option>
              <option value="encashed">Encashed</option>
              <option value="matured">Matured</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="w-full border rounded-lg p-2 text-sm min-h-[60px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : holding ? 'Update Holding' : 'Add Holding'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

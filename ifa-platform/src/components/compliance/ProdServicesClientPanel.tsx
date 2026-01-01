'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Search, RefreshCw, CheckCircle, AlertTriangle, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog'
import { useToast } from '@/hooks/use-toast'
import ServiceSelection from '@/components/clients/ServiceSelection'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

type CompletionStatus = 'complete' | 'partial' | 'none'

interface ProdClientSummary {
  clientId: string
  clientName: string
  clientRef?: string
  status: string
  firmId?: string | null
  updatedAt?: string | null
  servicesSelected: string[]
  servicesUpdatedAt?: string | null
  checksCompleted: number
  checksTotal: number
  completionStatus: CompletionStatus
}

interface ServicesCatalogEntry {
  id: string
  label: string
}

interface ApiResponse {
  success: boolean
  clients: ProdClientSummary[]
  servicesCatalog: ServicesCatalogEntry[]
}

const completionBadge = (status: CompletionStatus) => {
  if (status === 'complete') return { label: 'Complete', className: 'bg-green-100 text-green-700' }
  if (status === 'partial') return { label: 'In progress', className: 'bg-amber-100 text-amber-700' }
  return { label: 'Not started', className: 'bg-gray-100 text-gray-600' }
}

export function ProdServicesClientPanel() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [clients, setClients] = useState<ProdClientSummary[]>([])
  const [servicesCatalog, setServicesCatalog] = useState<ServicesCatalogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<CompletionStatus | 'all'>('all')
  const [clientStatus, setClientStatus] = useState<'active' | 'prospect' | 'inactive' | 'archived' | 'all'>('active')
  const [selectedClient, setSelectedClient] = useState<ProdClientSummary | null>(null)

  const fetchClients = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams()
      if (clientStatus !== 'all') {
        params.set('status', clientStatus)
      }
      const response = await fetch(`/api/compliance/prod-services/clients${params.toString() ? `?${params}` : ''}`)
      const result: ApiResponse = await response.json()
      if (!result.success) {
        throw new Error('Failed to load client services')
      }
      setClients(result.clients || [])
      setServicesCatalog(result.servicesCatalog || [])
    } catch (error) {
      console.error('Failed to fetch PROD clients', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [clientStatus])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const serviceLabelMap = useMemo(() => {
    return new Map(servicesCatalog.map((service) => [service.id, service.label]))
  }, [servicesCatalog])

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const searchValue = searchTerm.toLowerCase()
      const nameValue = client.clientName.toLowerCase()
      const refValue = client.clientRef?.toLowerCase() || ''
      const matchesSearch = nameValue.includes(searchValue) || refValue.includes(searchValue)
      const matchesStatus = statusFilter === 'all' || client.completionStatus === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [clients, searchTerm, statusFilter])

  const summaryStats = useMemo(() => {
    const totalClients = clients.length
    const clientsWithServices = clients.filter((client) => client.servicesSelected.length > 0).length
    const totalChecks = clients.reduce((sum, client) => sum + client.checksTotal, 0)
    const completedChecks = clients.reduce((sum, client) => sum + client.checksCompleted, 0)
    const outstandingChecks = Math.max(totalChecks - completedChecks, 0)

    return {
      totalClients,
      clientsWithServices,
      totalChecks,
      completedChecks,
      outstandingChecks
    }
  }, [clients])

  const completionStatusData = useMemo(() => {
    const counts = {
      complete: 0,
      partial: 0,
      none: 0
    }
    clients.forEach((client) => {
      counts[client.completionStatus] += 1
    })
    return [
      { name: 'Complete', value: counts.complete, color: '#22c55e' },
      { name: 'In progress', value: counts.partial, color: '#f59e0b' },
      { name: 'Not started', value: counts.none, color: '#94a3b8' }
    ].filter((entry) => entry.value > 0)
  }, [clients])

  const coveragePipelineData = useMemo(() => {
    const clientsComplete = clients.filter((client) => client.completionStatus === 'complete').length
    return [
      { name: 'Clients tracked', count: summaryStats.totalClients },
      { name: 'Services selected', count: summaryStats.clientsWithServices },
      { name: 'Checks complete', count: clientsComplete }
    ]
  }, [clients, summaryStats.clientsWithServices, summaryStats.totalClients])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Client Target Market Checks</h2>
          <p className="text-sm text-gray-600">
            Track which active clients have services selected and whether target market checks are complete.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchClients(true)}
          disabled={refreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Clients tracked</p>
                <p className="text-xl font-semibold">{summaryStats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Services selected</p>
                <p className="text-xl font-semibold">{summaryStats.clientsWithServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50">
                <CheckCircle className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Checks completed</p>
                <p className="text-xl font-semibold">{summaryStats.completedChecks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Checks outstanding</p>
                <p className="text-xl font-semibold">{summaryStats.outstandingChecks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryStats.totalClients === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                No active clients to assess yet.
              </div>
            ) : (
              <div className="h-[220px] sm:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coveragePipelineData} margin={{ left: 20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [`${value} clients`, 'Clients']} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target market completion</CardTitle>
          </CardHeader>
          <CardContent>
            {completionStatusData.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                No completion data yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-[220px] sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={completionStatusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {completionStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} clients`, 'Clients']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                  {completionStatusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span>{entry.name}</span>
                      </div>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Client coverage</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client name or ref"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={clientStatus}
              onChange={(event) => setClientStatus(event.target.value as typeof clientStatus)}
              className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active clients (incl. review due + missing status)</option>
              <option value="prospect">Prospects</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
              <option value="all">All client statuses</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as CompletionStatus | 'all')}
              className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All check statuses</option>
              <option value="complete">Complete</option>
              <option value="partial">In progress</option>
              <option value="none">Not started</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading client coverage...</div>
          ) : filteredClients.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No matching clients found.</div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => {
                const badge = completionBadge(client.completionStatus)
                const serviceLabels = client.servicesSelected.map((id) => serviceLabelMap.get(id) || id)
                return (
                  <div
                    key={client.clientId}
                    className="border rounded-lg p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-900">{client.clientName}</p>
                        <Badge variant="secondary">{client.status}</Badge>
                        <span className={`text-xs px-2 py-1 rounded-full ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                        {client.clientRef && <span>Ref: {client.clientRef}</span>}
                        <span>{client.servicesSelected.length} services</span>
                        <span>{client.checksCompleted}/{client.checksTotal} checks complete</span>
                        {client.servicesUpdatedAt && (
                          <span>Updated {new Date(client.servicesUpdatedAt).toLocaleDateString('en-GB')}</span>
                        )}
                      </div>
                      {serviceLabels.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {serviceLabels.slice(0, 4).map((label) => (
                            <span key={label} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              {label}
                            </span>
                          ))}
                          {serviceLabels.length > 4 && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              +{serviceLabels.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedClient(client)}
                      className="w-full sm:w-auto"
                    >
                      {client.completionStatus === 'none' ? 'Start assessment' : 'Review'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedClient ? `Service Selection · ${selectedClient.clientName}` : 'Service Selection'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedClient && (
              <ServiceSelection
                clientId={selectedClient.clientId}
                firmId={selectedClient.firmId || undefined}
                onSaved={() => {
                  toast({ title: 'Saved', description: 'Client service selection updated.' })
                  fetchClients(true)
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// components/compliance/ConsumerDutyDashboard.tsx
// ================================================================
// Consumer Duty Dashboard Component
// FCA Consumer Duty compliance tracking with dropdown-based assessments
// ================================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Heart,
  Shield,
  MessageSquare,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Download,
  Eye,
  Users,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Info,
  HelpCircle,
  FileText,
  Lightbulb,
  ClipboardList
} from 'lucide-react'
import ConsumerDutyWizard from './ConsumerDutyWizard'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface Props {
  onStatsChange?: () => void
}

// Consumer Duty Status per client
interface ConsumerDutyStatus {
  id: string
  client_id: string
  // Products & Services outcome
  products_services_status: string
  products_services_evidence: string | null
  products_services_last_review: string | null
  // Price & Value outcome
  price_value_status: string
  price_value_evidence: string | null
  price_value_last_review: string | null
  // Consumer Understanding outcome
  consumer_understanding_status: string
  consumer_understanding_evidence: string | null
  consumer_understanding_last_review: string | null
  // Consumer Support outcome
  consumer_support_status: string
  consumer_support_evidence: string | null
  consumer_support_last_review: string | null
  // Overall
  overall_status: string
  next_review_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  clients?: {
    id: string
    personal_details: {
      firstName?: string
      lastName?: string
    }
    client_ref?: string
  }
}

// Dropdown options for Consumer Duty outcomes
const STATUS_OPTIONS = [
  { value: 'not_assessed', label: 'Not Assessed', color: 'gray' },
  { value: 'compliant', label: 'Compliant', color: 'green' },
  { value: 'partially_compliant', label: 'Partially Compliant', color: 'yellow' },
  { value: 'non_compliant', label: 'Non-Compliant', color: 'red' },
  { value: 'under_review', label: 'Under Review', color: 'blue' }
]

const OVERALL_STATUS_OPTIONS = [
  { value: 'not_assessed', label: 'Not Assessed', color: 'gray' },
  { value: 'fully_compliant', label: 'Fully Compliant', color: 'green' },
  { value: 'mostly_compliant', label: 'Mostly Compliant', color: 'yellow' },
  { value: 'needs_attention', label: 'Needs Attention', color: 'orange' },
  { value: 'non_compliant', label: 'Non-Compliant', color: 'red' }
]

// Chart colors
const CHART_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#6b7280']

// The four Consumer Duty outcomes
const CONSUMER_DUTY_OUTCOMES = [
  {
    key: 'products_services',
    title: 'Products & Services',
    description: 'Products and services are designed to meet customer needs and do not cause foreseeable harm',
    icon: Target,
    color: 'blue'
  },
  {
    key: 'price_value',
    title: 'Price & Value',
    description: 'Products and services provide fair value relative to price paid',
    icon: TrendingUp,
    color: 'green'
  },
  {
    key: 'consumer_understanding',
    title: 'Consumer Understanding',
    description: 'Communications enable customers to make effective, timely, and informed decisions',
    icon: MessageSquare,
    color: 'purple'
  },
  {
    key: 'consumer_support',
    title: 'Consumer Support',
    description: 'Customers receive support that meets their needs throughout the product lifecycle',
    icon: Heart,
    color: 'pink'
  }
]

export default function ConsumerDutyDashboard({ onStatsChange }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  // State
  const [records, setRecords] = useState<ConsumerDutyStatus[]>([])
  const [allClients, setAllClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeView, setActiveView] = useState<'overview' | 'clients' | 'charts'>('clients')
  const [selectedClient, setSelectedClient] = useState<ConsumerDutyStatus | null>(null)
  const [wizardClient, setWizardClient] = useState<{ id: string; name: string } | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalClients: 0,
    fullyCompliant: 0,
    needsAttention: 0,
    notAssessed: 0,
    overdueReviews: 0
  })

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Stable toast ref to avoid dependency issues
  const toastRef = useRef(toast)
  toastRef.current = toast

  // Calculate stats from records
  const calculateStats = useCallback((cdData: ConsumerDutyStatus[]) => {
    const now = new Date()
    const fullyCompliant = cdData.filter(r => r.overall_status === 'fully_compliant').length
    const needsAttention = cdData.filter(r =>
      r.overall_status === 'needs_attention' || r.overall_status === 'non_compliant'
    ).length
    const notAssessed = cdData.filter(r => r.overall_status === 'not_assessed').length
    const overdueReviews = cdData.filter(r => {
      if (!r.next_review_date) return false
      return new Date(r.next_review_date) < now
    }).length

    return {
      totalClients: cdData.length,
      fullyCompliant,
      needsAttention,
      notAssessed,
      overdueReviews
    }
  }, [])

  // Load data with abort signal support
  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)

      // Fetch all clients with abort signal
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, personal_details, client_ref')
        .abortSignal(signal)
        .order('created_at', { ascending: false })

      // Check if aborted before continuing
      if (signal?.aborted || !isMountedRef.current) return

      if (clientsError) throw clientsError

      // Fetch Consumer Duty records - handle case where table doesn't exist
      let cdData: ConsumerDutyStatus[] = []
      try {
        const { data, error: cdError } = await supabase
          .from('consumer_duty_status')
          .select('*')
          .abortSignal(signal)
          .order('updated_at', { ascending: false })

        // Check if aborted
        if (signal?.aborted || !isMountedRef.current) return

        if (cdError) {
          console.log('Consumer Duty table not available:', cdError.message)
          setTableExists(false)
        } else {
          setTableExists(true)
          // Manually join with clients data
          cdData = (data || []).map((record: any) => {
            const client = clients?.find((c: any) => c.id === record.client_id)
            return {
              ...record,
              clients: client ? {
                id: client.id,
                personal_details: client.personal_details,
                client_ref: client.client_ref
              } : undefined
            }
          })
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        console.log('Consumer Duty query failed:', e)
        setTableExists(false)
      }

      // Only update state if still mounted
      if (!isMountedRef.current) return

      setAllClients(clients || [])
      setRecords(cdData || [])
      setStats(calculateStats(cdData || []))
    } catch (error) {
      // Ignore abort errors
      if ((error as Error).name === 'AbortError') return
      if (!isMountedRef.current) return

      console.error('Error loading Consumer Duty data:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to load Consumer Duty data',
        variant: 'destructive'
      })
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [supabase, calculateStats])

  // Effect with cleanup to prevent memory leaks and race conditions
  useEffect(() => {
    isMountedRef.current = true
    const abortController = new AbortController()

    loadData(abortController.signal)

    return () => {
      isMountedRef.current = false
      abortController.abort()
    }
  }, [loadData])

  // Create record for client
  const createRecordForClient = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('consumer_duty_status')
        .insert({
          client_id: clientId,
          products_services_status: 'not_assessed',
          price_value_status: 'not_assessed',
          consumer_understanding_status: 'not_assessed',
          consumer_support_status: 'not_assessed',
          overall_status: 'not_assessed'
        })
        .select()
        .single()

      if (error) throw error

      // Add new record to local state with client info
      const client = allClients.find(c => c.id === clientId)
      const newRecord: ConsumerDutyStatus = {
        ...data,
        clients: client ? {
          id: client.id,
          personal_details: client.personal_details,
          client_ref: client.client_ref
        } : undefined
      }

      setRecords(prev => {
        const updated = [...prev, newRecord]
        setStats(calculateStats(updated))
        return updated
      })

      toastRef.current({
        title: 'Created',
        description: 'Consumer Duty record created for client'
      })

      return newRecord
    } catch (error) {
      console.error('Error creating Consumer Duty record:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to create record. Has the table been set up?',
        variant: 'destructive'
      })
      return null
    }
  }

  // Update a field - updates local state immediately without full reload
  // Handles both real records and "virtual" records (auto-creates if needed)
  const updateField = async (recordId: string, field: string, value: string) => {
    try {
      // Check if this is a virtual record (client without Consumer Duty record yet)
      const isVirtual = recordId.startsWith('virtual-')
      const clientId = isVirtual ? recordId.replace('virtual-', '') : null

      // If virtual, create the record first
      if (isVirtual && clientId) {
        const newRecord = await createRecordForClient(clientId)
        if (!newRecord) {
          throw new Error('Failed to create Consumer Duty record')
        }
        // Now update the newly created record
        recordId = newRecord.id
      }

      const updatedAt = new Date().toISOString()

      const { error } = await supabase
        .from('consumer_duty_status')
        .update({
          [field]: value,
          updated_at: updatedAt
        })
        .eq('id', recordId)

      if (error) throw error

      // Update local state immediately - no full reload needed
      setRecords(prev => {
        const updated = prev.map(r =>
          r.id === recordId
            ? { ...r, [field]: value, updated_at: updatedAt }
            : r
        )
        // Recalculate stats with updated records
        setStats(calculateStats(updated))
        return updated
      })

      toastRef.current({
        title: 'Updated',
        description: `${field.replace(/_/g, ' ')} updated successfully`
      })

      onStatsChange?.()
    } catch (error) {
      console.error('Error updating field:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to update field',
        variant: 'destructive'
      })
    }
  }

  // Calculate overall status based on four outcomes
  const calculateOverallStatus = (record: ConsumerDutyStatus): string => {
    const statuses = [
      record.products_services_status,
      record.price_value_status,
      record.consumer_understanding_status,
      record.consumer_support_status
    ]

    const hasNonCompliant = statuses.some(s => s === 'non_compliant')
    const hasPartiallyCompliant = statuses.some(s => s === 'partially_compliant')
    const allCompliant = statuses.every(s => s === 'compliant')
    const allNotAssessed = statuses.every(s => s === 'not_assessed')

    if (allNotAssessed) return 'not_assessed'
    if (hasNonCompliant) return 'non_compliant'
    if (allCompliant) return 'fully_compliant'
    if (hasPartiallyCompliant) return 'needs_attention'
    return 'mostly_compliant'
  }

  // Get client name
  const getClientName = (record: ConsumerDutyStatus): string => {
    const pd = record.clients?.personal_details
    if (!pd) return record.clients?.client_ref || 'Unknown Client'
    return `${pd.firstName || ''} ${pd.lastName || ''}`.trim() || record.clients?.client_ref || 'Unknown'
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const option = [...STATUS_OPTIONS, ...OVERALL_STATUS_OPTIONS].find(o => o.value === status)
    if (!option) return <Badge variant="secondary">Unknown</Badge>

    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700',
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700',
      blue: 'bg-blue-100 text-blue-700'
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClasses[option.color as keyof typeof colorClasses]}`}>
        {option.label}
      </span>
    )
  }

  // Create merged list of ALL clients with their Consumer Duty status
  // Clients without records get default values displayed
  const allClientsWithStatus = allClients.map(client => {
    const existingRecord = records.find(r => r.client_id === client.id)
    if (existingRecord) {
      return existingRecord
    }
    // Return a virtual record with default values for clients without records
    return {
      id: `virtual-${client.id}`,
      client_id: client.id,
      products_services_status: 'not_assessed',
      products_services_evidence: null,
      products_services_last_review: null,
      price_value_status: 'not_assessed',
      price_value_evidence: null,
      price_value_last_review: null,
      consumer_understanding_status: 'not_assessed',
      consumer_understanding_evidence: null,
      consumer_understanding_last_review: null,
      consumer_support_status: 'not_assessed',
      consumer_support_evidence: null,
      consumer_support_last_review: null,
      overall_status: 'not_assessed',
      next_review_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      clients: {
        id: client.id,
        personal_details: client.personal_details,
        client_ref: client.client_ref
      },
      _isVirtual: true
    } as ConsumerDutyStatus & { _isVirtual?: boolean }
  })

  // Filter records based on search and status filter
  const filteredRecords = allClientsWithStatus.filter(r => {
    const matchesSearch = !searchTerm ||
      getClientName(r).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || r.overall_status === filterStatus
    return matchesSearch && matchesFilter
  })

  // Count of clients without saved records (for info display)
  const clientsWithoutRecordCount = allClients.filter(
    client => !records.some(r => r.client_id === client.id)
  ).length

  // Chart data
  const overallStatusData = OVERALL_STATUS_OPTIONS.map((opt, idx) => ({
    name: opt.label,
    value: records.filter(r => r.overall_status === opt.value).length,
    color: CHART_COLORS[idx] || '#6b7280'
  })).filter(d => d.value > 0)

  const outcomeComplianceData = CONSUMER_DUTY_OUTCOMES.map(outcome => {
    const field = `${outcome.key}_status` as keyof ConsumerDutyStatus
    return {
      name: outcome.title.split(' ')[0],
      compliant: records.filter(r => r[field] === 'compliant').length,
      partial: records.filter(r => r[field] === 'partially_compliant').length,
      nonCompliant: records.filter(r => r[field] === 'non_compliant').length,
      notAssessed: records.filter(r => r[field] === 'not_assessed').length
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show setup message if table doesn't exist
  if (!tableExists) {
    return (
      <div className="space-y-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800">Consumer Duty Table Setup Required</h3>
                <p className="text-yellow-700 mt-1">
                  The Consumer Duty tracking table needs to be created in your database. Please run the following migration in your Supabase dashboard:
                </p>
                <div className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code className="text-xs whitespace-pre">
{`-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS consumer_duty_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,

  -- Products & Services Outcome
  products_services_status TEXT DEFAULT 'not_assessed',
  products_services_evidence TEXT,
  products_services_last_review DATE,

  -- Price & Value Outcome
  price_value_status TEXT DEFAULT 'not_assessed',
  price_value_evidence TEXT,
  price_value_last_review DATE,

  -- Consumer Understanding Outcome
  consumer_understanding_status TEXT DEFAULT 'not_assessed',
  consumer_understanding_evidence TEXT,
  consumer_understanding_last_review DATE,

  -- Consumer Support Outcome
  consumer_support_status TEXT DEFAULT 'not_assessed',
  consumer_support_evidence TEXT,
  consumer_support_last_review DATE,

  -- Overall
  overall_status TEXT DEFAULT 'not_assessed',
  next_review_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE consumer_duty_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all" ON consumer_duty_status FOR ALL USING (true);`}
                  </code>
                </div>
                <p className="text-sm text-yellow-600 mt-3">
                  After running the migration, refresh this page to start using Consumer Duty tracking.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consumer Duty Overview Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600" />
              <span>About Consumer Duty</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              The FCA Consumer Duty requires firms to act to deliver good outcomes for retail customers across four key areas:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONSUMER_DUTY_OUTCOMES.map(outcome => {
                const Icon = outcome.icon
                return (
                  <div key={outcome.key} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium">{outcome.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{outcome.description}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('all')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Total Assessed</p>
                <p className="text-lg font-bold">{stats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('fully_compliant')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Fully Compliant</p>
                <p className="text-lg font-bold text-green-600">{stats.fullyCompliant}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('needs_attention')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Needs Attention</p>
                <p className="text-lg font-bold text-orange-600">{stats.needsAttention}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('not_assessed')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <HelpCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Not Assessed</p>
                <p className="text-lg font-bold">{stats.notAssessed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Overdue Reviews</p>
                <p className="text-lg font-bold text-red-600">{stats.overdueReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            {OVERALL_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-3 py-2 text-sm ${activeView === 'overview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('clients')}
              className={`px-3 py-2 text-sm ${activeView === 'clients' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Clients
            </button>
            <button
              onClick={() => setActiveView('charts')}
              className={`px-3 py-2 text-sm ${activeView === 'charts' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Charts
            </button>
          </div>
        </div>

        <Button variant="outline" onClick={() => {}}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overview View - Four Outcomes */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CONSUMER_DUTY_OUTCOMES.map(outcome => {
            const Icon = outcome.icon
            const field = `${outcome.key}_status` as keyof ConsumerDutyStatus
            const compliantCount = records.filter(r => r[field] === 'compliant').length
            const totalCount = records.filter(r => r[field] !== 'not_assessed').length

            return (
              <Card key={outcome.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg bg-${outcome.color}-100`}>
                        <Icon className={`h-5 w-5 text-${outcome.color}-600`} />
                      </div>
                      <span className="text-base">{outcome.title}</span>
                    </div>
                    <span className="text-sm font-normal text-gray-500">
                      {compliantCount}/{totalCount} compliant
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{outcome.description}</p>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${totalCount > 0 ? (compliantCount / totalCount) * 100 : 0}%` }}
                    />
                  </div>

                  {/* Status breakdown */}
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.filter(o => o.value !== 'not_assessed').map(status => {
                      const count = records.filter(r => r[field] === status.value).length
                      if (count === 0) return null
                      return (
                        <span
                          key={status.value}
                          className={`px-2 py-1 rounded text-xs ${
                            status.color === 'green' ? 'bg-green-100 text-green-700' :
                            status.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                            status.color === 'red' ? 'bg-red-100 text-red-700' :
                            status.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {status.label}: {count}
                        </span>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Clients View */}
      {activeView === 'clients' && (
        <>
          {/* Info banner when there are clients without saved records */}
          {clientsWithoutRecordCount > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Info className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">{clientsWithoutRecordCount} client(s)</span> showing default values.
                      Changes will automatically save and create their Consumer Duty record.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Consumer Duty Assessment ({filteredRecords.length} clients)</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No clients found</p>
                  <p className="text-gray-400 mt-1">
                    Add clients to start tracking Consumer Duty compliance
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Client</th>
                        <th className="text-left p-3 font-medium">Products & Services</th>
                        <th className="text-left p-3 font-medium">Price & Value</th>
                        <th className="text-left p-3 font-medium">Understanding</th>
                        <th className="text-left p-3 font-medium">Support</th>
                        <th className="text-left p-3 font-medium">Overall</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredRecords.map(record => {
                        const isVirtual = record.id.startsWith('virtual-')
                        return (
                          <tr key={record.id} className={`hover:bg-gray-50 ${isVirtual ? 'bg-gray-50/50' : ''}`}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getClientName(record)}</span>
                                {isVirtual && (
                                  <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <select
                                value={record.products_services_status}
                                onChange={(e) => updateField(record.id, 'products_services_status', e.target.value)}
                                className={`text-xs border rounded px-2 py-1 ${
                                  record.products_services_status === 'compliant' ? 'bg-green-50 border-green-200 text-green-700' :
                                  record.products_services_status === 'non_compliant' ? 'bg-red-50 border-red-200 text-red-700' :
                                  record.products_services_status === 'partially_compliant' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                  record.products_services_status === 'under_review' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <select
                                value={record.price_value_status}
                                onChange={(e) => updateField(record.id, 'price_value_status', e.target.value)}
                                className={`text-xs border rounded px-2 py-1 ${
                                  record.price_value_status === 'compliant' ? 'bg-green-50 border-green-200 text-green-700' :
                                  record.price_value_status === 'non_compliant' ? 'bg-red-50 border-red-200 text-red-700' :
                                  record.price_value_status === 'partially_compliant' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                  record.price_value_status === 'under_review' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <select
                                value={record.consumer_understanding_status}
                                onChange={(e) => updateField(record.id, 'consumer_understanding_status', e.target.value)}
                                className={`text-xs border rounded px-2 py-1 ${
                                  record.consumer_understanding_status === 'compliant' ? 'bg-green-50 border-green-200 text-green-700' :
                                  record.consumer_understanding_status === 'non_compliant' ? 'bg-red-50 border-red-200 text-red-700' :
                                  record.consumer_understanding_status === 'partially_compliant' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                  record.consumer_understanding_status === 'under_review' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <select
                                value={record.consumer_support_status}
                                onChange={(e) => updateField(record.id, 'consumer_support_status', e.target.value)}
                                className={`text-xs border rounded px-2 py-1 ${
                                  record.consumer_support_status === 'compliant' ? 'bg-green-50 border-green-200 text-green-700' :
                                  record.consumer_support_status === 'non_compliant' ? 'bg-red-50 border-red-200 text-red-700' :
                                  record.consumer_support_status === 'partially_compliant' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                  record.consumer_support_status === 'under_review' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">{getStatusBadge(record.overall_status)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Quick View"
                                  onClick={async () => {
                                    // For virtual records, create the record first before opening modal
                                    if (isVirtual) {
                                      const clientId = record.id.replace('virtual-', '')
                                      const newRecord = await createRecordForClient(clientId)
                                      if (newRecord) {
                                        setSelectedClient(newRecord)
                                      }
                                    } else {
                                      setSelectedClient(record)
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Full Assessment"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => {
                                    const clientId = isVirtual ? record.id.replace('virtual-', '') : record.client_id
                                    setWizardClient({
                                      id: clientId,
                                      name: getClientName(record)
                                    })
                                  }}
                                >
                                  <ClipboardList className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Charts View */}
      {activeView === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Overall Compliance Status</CardTitle>
            </CardHeader>
            <CardContent>
              {overallStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={overallStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {overallStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-400">
                  No data to display
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outcome Compliance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Compliance by Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={outcomeComplianceData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="compliant" stackId="a" fill="#22c55e" name="Compliant" />
                  <Bar dataKey="partial" stackId="a" fill="#eab308" name="Partial" />
                  <Bar dataKey="nonCompliant" stackId="a" fill="#ef4444" name="Non-Compliant" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Consumer Duty Assessment</h2>
                <p className="text-sm text-gray-500">{getClientName(selectedClient)}</p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {CONSUMER_DUTY_OUTCOMES.map(outcome => {
                const Icon = outcome.icon
                const statusField = `${outcome.key}_status` as keyof ConsumerDutyStatus
                const evidenceField = `${outcome.key}_evidence` as keyof ConsumerDutyStatus

                return (
                  <div key={outcome.key} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <h3 className="font-medium">{outcome.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{outcome.description}</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={selectedClient[statusField] as string}
                          onChange={(e) => updateField(selectedClient.id, statusField, e.target.value)}
                          className="w-full border rounded-lg p-2 text-sm"
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Evidence</label>
                        <input
                          type="text"
                          value={(selectedClient[evidenceField] as string) || ''}
                          onChange={(e) => updateField(selectedClient.id, evidenceField, e.target.value)}
                          placeholder="Document reference..."
                          className="w-full border rounded-lg p-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-3">Overall Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Overall Compliance</label>
                    <select
                      value={selectedClient.overall_status}
                      onChange={(e) => updateField(selectedClient.id, 'overall_status', e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm"
                    >
                      {OVERALL_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Review Date</label>
                    <input
                      type="date"
                      value={selectedClient.next_review_date || ''}
                      onChange={(e) => updateField(selectedClient.id, 'next_review_date', e.target.value)}
                      className="w-full border rounded-lg p-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setWizardClient({
                    id: selectedClient.client_id,
                    name: getClientName(selectedClient)
                  })
                  setSelectedClient(null)
                }}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Full Assessment
              </Button>
              <Button onClick={() => setSelectedClient(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Consumer Duty Assessment Wizard */}
      {wizardClient && (
        <ConsumerDutyWizard
          clientId={wizardClient.id}
          clientName={wizardClient.name}
          onComplete={async (data) => {
            try {
              const response = await fetch('/api/compliance/consumer-duty/assess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  clientId: wizardClient.id,
                  answers: data.answers,
                  scores: data.scores,
                  overallScore: data.overallScore,
                  overallStatus: data.overallStatus,
                  isDraft: false
                })
              })

              if (!response.ok) throw new Error('Failed to save assessment')

              toast({
                title: 'Assessment Complete',
                description: 'Consumer Duty assessment has been saved'
              })

              setWizardClient(null)
              // Reload data to show updated statuses
              loadData()
              onStatsChange?.()
            } catch (error) {
              toast({
                title: 'Error',
                description: 'Failed to save assessment',
                variant: 'destructive'
              })
            }
          }}
          onSaveDraft={async (answers) => {
            try {
              const response = await fetch('/api/compliance/consumer-duty/assess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  clientId: wizardClient.id,
                  answers,
                  isDraft: true
                })
              })

              if (!response.ok) throw new Error('Failed to save draft')
            } catch (error) {
              throw error
            }
          }}
          onClose={() => setWizardClient(null)}
        />
      )}
    </div>
  )
}

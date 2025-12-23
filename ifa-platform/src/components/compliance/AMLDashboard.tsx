// components/compliance/AMLDashboard.tsx
// ================================================================
// AML/CTF Dashboard Component
// Dropdown-based AML status tracking with charts
// ================================================================

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Download,
  Filter,
  Eye,
  Edit2,
  Save,
  X,
  Users,
  AlertCircle,
  BarChart3,
  PieChart,
  RefreshCw,
  ChevronDown,
  Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface Props {
  onStatsChange?: () => void
}

// Types
interface AMLClientStatus {
  id: string
  client_id: string
  firm_id: string | null
  id_verification: string
  pep_status: string
  sanctions_status: string
  source_of_wealth: string
  source_of_funds: string
  risk_rating: string
  review_frequency: string
  next_review_date: string | null
  last_review_date: string | null
  edd_notes: string | null
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

// Dropdown options
const ID_VERIFICATION_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'gray' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'verified', label: 'Verified', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'orange' }
]

const PEP_STATUS_OPTIONS = [
  { value: 'not_checked', label: 'Not Checked', color: 'gray' },
  { value: 'not_pep', label: 'Not PEP', color: 'green' },
  { value: 'pep_low_risk', label: 'PEP - Low Risk', color: 'yellow' },
  { value: 'pep_high_risk', label: 'PEP - High Risk', color: 'red' },
  { value: 'rca', label: 'RCA', color: 'orange' }
]

const SANCTIONS_OPTIONS = [
  { value: 'not_checked', label: 'Not Checked', color: 'gray' },
  { value: 'clear', label: 'Clear', color: 'green' },
  { value: 'potential_match', label: 'Potential Match', color: 'orange' },
  { value: 'confirmed_match', label: 'Confirmed Match', color: 'red' }
]

const SOW_SOF_OPTIONS = [
  { value: 'not_documented', label: 'Not Documented', color: 'gray' },
  { value: 'documented', label: 'Documented', color: 'blue' },
  { value: 'verified', label: 'Verified', color: 'green' },
  { value: 'concerns_raised', label: 'Concerns Raised', color: 'red' }
]

const RISK_RATING_OPTIONS = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'enhanced_due_diligence', label: 'Enhanced DD', color: 'red' }
]

const REVIEW_FREQUENCY_OPTIONS = [
  { value: 'annually', label: 'Annually' },
  { value: 'six_months', label: '6 Months' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' }
]

// Chart colors
const CHART_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444']

export default function AMLDashboard({ onStatsChange }: Props) {
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  // State
  const [amlRecords, setAmlRecords] = useState<AMLClientStatus[]>([])
  const [allClients, setAllClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<AMLClientStatus>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [activeView, setActiveView] = useState<'table' | 'charts'>('table')

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pendingReview: 0,
    highRisk: 0,
    overdueReviews: 0,
    completedThisMonth: 0
  })

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  // Load data with abort signal support
  // Stable toast ref to avoid dependency issues
  const toastRef = useRef(toast)
  toastRef.current = toast

  // Calculate stats from records
  const calculateStats = useCallback((records: AMLClientStatus[], clientCount: number) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const overdueCount = records.filter(r => {
      if (!r.next_review_date) return false
      return new Date(r.next_review_date) < now
    }).length

    const highRiskCount = records.filter(r =>
      r.risk_rating === 'high' || r.risk_rating === 'enhanced_due_diligence'
    ).length

    const pendingCount = records.filter(r =>
      r.id_verification === 'not_started' ||
      r.id_verification === 'pending' ||
      r.pep_status === 'not_checked' ||
      r.sanctions_status === 'not_checked'
    ).length

    const completedThisMonth = records.filter(r => {
      if (!r.last_review_date) return false
      return new Date(r.last_review_date) >= startOfMonth
    }).length

    return {
      total: clientCount,
      pendingReview: pendingCount,
      highRisk: highRiskCount,
      overdueReviews: overdueCount,
      completedThisMonth
    }
  }, [])

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

      // Fetch AML records - handle case where table doesn't exist
      let amlData: AMLClientStatus[] = []
      try {
        const { data, error: amlError } = await supabase
          .from('aml_client_status')
          .select('*')
          .abortSignal(signal)
          .order('updated_at', { ascending: false })

        // Check if aborted
        if (signal?.aborted || !isMountedRef.current) return

        if (amlError) {
          // Table doesn't exist or other error - will use empty array
          console.log('AML table not available:', amlError.message)
          setTableExists(false)
        } else {
          setTableExists(true)
          // Manually join with clients data
          amlData = (data || []).map((record: any) => {
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
        console.log('AML query failed:', e)
        setTableExists(false)
      }

      // Only update state if still mounted
      if (!isMountedRef.current) return

      setAllClients(clients || [])
      setAmlRecords(amlData || [])
      setStats(calculateStats(amlData || [], clients?.length || 0))

    } catch (error) {
      // Ignore abort errors
      if ((error as Error).name === 'AbortError') return
      if (!isMountedRef.current) return

      console.error('Error loading AML data:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to load AML data',
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

  // Get or create AML record for a client
  const getOrCreateAMLRecord = async (clientId: string) => {
    const existing = amlRecords.find(r => r.client_id === clientId)
    if (existing) return existing

    try {
      const { data, error } = await supabase
        .from('aml_client_status')
        .insert({
          client_id: clientId,
          id_verification: 'not_started',
          pep_status: 'not_checked',
          sanctions_status: 'not_checked',
          source_of_wealth: 'not_documented',
          source_of_funds: 'not_documented',
          risk_rating: 'low',
          review_frequency: 'annually'
        })
        .select()
        .single()

      if (error) throw error

      // Add new record to local state with client info
      const client = allClients.find(c => c.id === clientId)
      const newRecord: AMLClientStatus = {
        ...data,
        clients: client ? {
          id: client.id,
          personal_details: client.personal_details,
          client_ref: client.client_ref
        } : undefined
      }

      setAmlRecords(prev => {
        const updated = [...prev, newRecord]
        setStats(calculateStats(updated, allClients.length))
        return updated
      })

      return newRecord
    } catch (error) {
      console.error('Error creating AML record:', error)
      return null
    }
  }

  // Update field - updates local state immediately without full reload
  // Handles both real records and "virtual" records (auto-creates if needed)
  const updateField = async (recordId: string, field: string, value: string) => {
    try {
      // Check if this is a virtual record (client without AML record yet)
      const isVirtual = recordId.startsWith('virtual-')
      const clientId = isVirtual ? recordId.replace('virtual-', '') : null

      // If virtual, create the AML record first
      if (isVirtual && clientId) {
        const newRecord = await getOrCreateAMLRecord(clientId)
        if (!newRecord) {
          throw new Error('Failed to create AML record')
        }
        // Now update the newly created record
        recordId = newRecord.id
      }

      const record = amlRecords.find(r => r.id === recordId)
      const oldValue = record ? (record as any)[field] : null

      // Calculate next review date based on frequency
      let nextReviewDate: string | null = null
      let lastReviewDate: string | null = null
      if (field === 'review_frequency') {
        const now = new Date()
        switch (value) {
          case 'monthly': nextReviewDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split('T')[0]; break
          case 'quarterly': nextReviewDate = new Date(now.setMonth(now.getMonth() + 3)).toISOString().split('T')[0]; break
          case 'six_months': nextReviewDate = new Date(now.setMonth(now.getMonth() + 6)).toISOString().split('T')[0]; break
          case 'annually': nextReviewDate = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString().split('T')[0]; break
        }
        lastReviewDate = new Date().toISOString().split('T')[0]
      }

      const updatedAt = new Date().toISOString()
      const updateData: any = {
        [field]: value,
        updated_at: updatedAt
      }

      if (nextReviewDate) {
        updateData.next_review_date = nextReviewDate
        updateData.last_review_date = lastReviewDate
      }

      const { error } = await supabase
        .from('aml_client_status')
        .update(updateData)
        .eq('id', recordId)

      if (error) throw error

      // Log to history (fire and forget - don't await)
      supabase
        .from('aml_check_history')
        .insert({
          aml_client_status_id: recordId,
          field_changed: field,
          old_value: oldValue,
          new_value: value
        })
        .then(() => {})
        .catch((e: any) => console.log('History log failed:', e))

      // Update local state immediately - no full reload needed
      setAmlRecords(prev => {
        const updated = prev.map(r =>
          r.id === recordId
            ? {
                ...r,
                [field]: value,
                updated_at: updatedAt,
                ...(nextReviewDate ? { next_review_date: nextReviewDate, last_review_date: lastReviewDate } : {})
              }
            : r
        )
        // Recalculate stats with updated records
        setStats(calculateStats(updated, allClients.length))
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

  // Get badge color
  const getBadgeColor = (value: string, options: { value: string; color: string }[]) => {
    const option = options.find(o => o.value === value)
    if (!option) return 'secondary'
    switch (option.color) {
      case 'green': return 'default'
      case 'red': return 'destructive'
      case 'yellow': return 'secondary'
      case 'orange': return 'secondary'
      default: return 'outline'
    }
  }

  // Dropdown component
  const StatusDropdown = ({
    recordId,
    field,
    value,
    options
  }: {
    recordId: string
    field: string
    value: string
    options: { value: string; label: string; color?: string }[]
  }) => {
    const currentOption = options.find(o => o.value === value)

    return (
      <select
        value={value}
        onChange={(e) => updateField(recordId, field, e.target.value)}
        className={`text-xs border rounded px-2 py-1 cursor-pointer focus:ring-2 focus:ring-blue-500 ${
          currentOption?.color === 'green' ? 'bg-green-50 border-green-200 text-green-700' :
          currentOption?.color === 'red' ? 'bg-red-50 border-red-200 text-red-700' :
          currentOption?.color === 'yellow' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
          currentOption?.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-700' :
          'bg-gray-50 border-gray-200 text-gray-700'
        }`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  // Chart data
  const riskDistribution = RISK_RATING_OPTIONS.map(opt => ({
    name: opt.label,
    value: amlRecords.filter(r => r.risk_rating === opt.value).length,
    color: opt.color === 'green' ? '#22c55e' :
           opt.color === 'yellow' ? '#eab308' :
           opt.color === 'orange' ? '#f97316' : '#ef4444'
  })).filter(d => d.value > 0)

  const checkStatusData = [
    {
      name: 'ID Verification',
      verified: amlRecords.filter(r => r.id_verification === 'verified').length,
      pending: amlRecords.filter(r => r.id_verification === 'pending').length,
      notStarted: amlRecords.filter(r => r.id_verification === 'not_started').length
    },
    {
      name: 'PEP Status',
      verified: amlRecords.filter(r => r.pep_status === 'not_pep').length,
      pending: amlRecords.filter(r => ['pep_low_risk', 'pep_high_risk', 'rca'].includes(r.pep_status)).length,
      notStarted: amlRecords.filter(r => r.pep_status === 'not_checked').length
    },
    {
      name: 'Sanctions',
      verified: amlRecords.filter(r => r.sanctions_status === 'clear').length,
      pending: amlRecords.filter(r => ['potential_match', 'confirmed_match'].includes(r.sanctions_status)).length,
      notStarted: amlRecords.filter(r => r.sanctions_status === 'not_checked').length
    },
    {
      name: 'Source of Wealth',
      verified: amlRecords.filter(r => r.source_of_wealth === 'verified').length,
      pending: amlRecords.filter(r => r.source_of_wealth === 'documented').length,
      notStarted: amlRecords.filter(r => r.source_of_wealth === 'not_documented').length
    },
    {
      name: 'Source of Funds',
      verified: amlRecords.filter(r => r.source_of_funds === 'verified').length,
      pending: amlRecords.filter(r => r.source_of_funds === 'documented').length,
      notStarted: amlRecords.filter(r => r.source_of_funds === 'not_documented').length
    }
  ]

  // Create merged list of ALL clients with their AML status
  // Clients without AML records get default values displayed
  const allClientsWithAML = allClients.map(client => {
    const existingRecord = amlRecords.find(r => r.client_id === client.id)
    if (existingRecord) {
      return existingRecord
    }
    // Return a virtual record with default values for clients without AML records
    return {
      id: `virtual-${client.id}`, // Prefix to identify as virtual
      client_id: client.id,
      firm_id: null,
      id_verification: 'not_started',
      pep_status: 'not_checked',
      sanctions_status: 'not_checked',
      source_of_wealth: 'not_documented',
      source_of_funds: 'not_documented',
      risk_rating: 'low',
      review_frequency: 'annually',
      next_review_date: null,
      last_review_date: null,
      edd_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      clients: {
        id: client.id,
        personal_details: client.personal_details,
        client_ref: client.client_ref
      },
      _isVirtual: true // Flag to indicate this is a virtual record
    } as AMLClientStatus & { _isVirtual?: boolean }
  })

  // Filter records based on search and risk filter
  const filteredRecords = allClientsWithAML.filter(record => {
    const clientName = record.clients
      ? `${record.clients.personal_details?.firstName || ''} ${record.clients.personal_details?.lastName || ''}`.toLowerCase()
      : ''
    const matchesSearch = searchTerm === '' || clientName.includes(searchTerm.toLowerCase())
    const matchesFilter = filterRisk === 'all' || record.risk_rating === filterRisk
    return matchesSearch && matchesFilter
  })

  // Count of clients without AML records (for stats)
  const clientsWithoutAMLCount = allClients.filter(
    client => !amlRecords.some(r => r.client_id === client.id)
  ).length

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
                <h3 className="text-lg font-semibold text-yellow-800">AML/CTF Table Setup Required</h3>
                <p className="text-yellow-700 mt-1">
                  The AML/CTF tracking table needs to be created in your database. Please run the following migration in your Supabase dashboard:
                </p>
                <div className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code className="text-xs whitespace-pre">
{`-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS aml_client_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  id_verification TEXT DEFAULT 'not_started',
  pep_status TEXT DEFAULT 'not_checked',
  sanctions_status TEXT DEFAULT 'not_checked',
  source_of_wealth TEXT DEFAULT 'not_documented',
  source_of_funds TEXT DEFAULT 'not_documented',
  risk_rating TEXT DEFAULT 'low',
  review_frequency TEXT DEFAULT 'annually',
  next_review_date DATE,
  last_review_date DATE,
  edd_notes TEXT,
  last_updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE aml_client_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all" ON aml_client_status FOR ALL USING (true);`}
                  </code>
                </div>
                <p className="text-sm text-yellow-600 mt-3">
                  After running the migration, refresh this page to start using AML/CTF tracking.
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

        {/* Still show clients that could be tracked */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Clients Available for AML Tracking ({allClients.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-sm mb-4">
              Once the table is set up, you'll be able to track AML/CTF status for these clients:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {allClients.slice(0, 8).map(client => (
                <div key={client.id} className="p-2 bg-gray-50 rounded text-sm">
                  {client.personal_details?.firstName} {client.personal_details?.lastName}
                </div>
              ))}
              {allClients.length > 8 && (
                <div className="p-2 bg-gray-100 rounded text-sm text-gray-500">
                  +{allClients.length - 8} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterRisk('all')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView('table')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pendingReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterRisk('high')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">High Risk Clients</p>
                <p className="text-2xl font-bold">{stats.highRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue Reviews</p>
                <p className="text-2xl font-bold">{stats.overdueReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setActiveView('table')}
              className={`px-4 py-2 text-sm font-medium ${
                activeView === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Register
            </button>
            <button
              onClick={() => setActiveView('charts')}
              className={`px-4 py-2 text-sm font-medium ${
                activeView === 'charts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Charts
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64"
            />
          </div>

          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Risk Levels</option>
            {RISK_RATING_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Charts View */}
      {activeView === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {riskDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check Status Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Check Status by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={checkStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="verified" name="Verified/Clear" fill="#22c55e" stackId="a" />
                  <Bar dataKey="pending" name="Pending/Flagged" fill="#eab308" stackId="a" />
                  <Bar dataKey="notStarted" name="Not Started" fill="#94a3b8" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table View */}
      {activeView === 'table' && (
        <>
          {/* Info banner when there are clients without saved AML records */}
          {clientsWithoutAMLCount > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Info className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">{clientsWithoutAMLCount} client(s)</span> showing default values.
                      Changes will automatically save and create their AML record.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AML Register Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AML/CTF Client Register</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Client</th>
                      <th className="text-left p-3 font-medium text-gray-600">ID Verification</th>
                      <th className="text-left p-3 font-medium text-gray-600">PEP Status</th>
                      <th className="text-left p-3 font-medium text-gray-600">Sanctions</th>
                      <th className="text-left p-3 font-medium text-gray-600">SOW</th>
                      <th className="text-left p-3 font-medium text-gray-600">SOF</th>
                      <th className="text-left p-3 font-medium text-gray-600">Risk Rating</th>
                      <th className="text-left p-3 font-medium text-gray-600">Next Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">
                          No clients found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map(record => {
                        const isVirtual = record.id.startsWith('virtual-')
                        const isOverdue = record.next_review_date && new Date(record.next_review_date) < new Date()
                        const isHighRisk = record.risk_rating === 'high' || record.risk_rating === 'enhanced_due_diligence'

                        return (
                          <tr
                            key={record.id}
                            className={`hover:bg-gray-50 ${isHighRisk ? 'bg-red-50' : ''} ${isVirtual ? 'bg-gray-50/50' : ''}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => router.push(`/clients/${record.client_id}`)}
                                  className="font-medium text-blue-600 hover:underline"
                                >
                                  {record.clients?.personal_details?.firstName || 'Unknown'}{' '}
                                  {record.clients?.personal_details?.lastName || ''}
                                </button>
                                {isVirtual && (
                                  <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                                    New
                                  </Badge>
                                )}
                                {isHighRisk && (
                                  <Badge variant="destructive" className="text-xs">
                                    High Risk
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <StatusDropdown
                                recordId={record.id}
                                field="id_verification"
                                value={record.id_verification}
                                options={ID_VERIFICATION_OPTIONS}
                              />
                            </td>
                            <td className="p-3">
                              <StatusDropdown
                                recordId={record.id}
                                field="pep_status"
                                value={record.pep_status}
                                options={PEP_STATUS_OPTIONS}
                              />
                            </td>
                            <td className="p-3">
                              <StatusDropdown
                                recordId={record.id}
                                field="sanctions_status"
                                value={record.sanctions_status}
                                options={SANCTIONS_OPTIONS}
                              />
                            </td>
                            <td className="p-3">
                              <StatusDropdown
                                recordId={record.id}
                                field="source_of_wealth"
                                value={record.source_of_wealth}
                                options={SOW_SOF_OPTIONS}
                              />
                            </td>
                            <td className="p-3">
                              <StatusDropdown
                                recordId={record.id}
                                field="source_of_funds"
                                value={record.source_of_funds}
                                options={SOW_SOF_OPTIONS}
                              />
                            </td>
                            <td className="p-3">
                              <StatusDropdown
                                recordId={record.id}
                                field="risk_rating"
                                value={record.risk_rating}
                                options={RISK_RATING_OPTIONS}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <select
                                  value={record.review_frequency}
                                  onChange={(e) => updateField(record.id, 'review_frequency', e.target.value)}
                                  className="text-xs border rounded px-2 py-1"
                                >
                                  {REVIEW_FREQUENCY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* EDD Info Banner */}
      {stats.highRisk > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Enhanced Due Diligence Required</p>
                <p className="text-sm text-red-600 mt-1">
                  {stats.highRisk} client(s) require Enhanced Due Diligence. Ensure additional
                  documentation is collected and reviewed at increased frequency (minimum 6-monthly).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

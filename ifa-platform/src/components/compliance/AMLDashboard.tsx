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
  Info,
  PlayCircle,
  Calendar,
  LayoutGrid
} from 'lucide-react'
import AMLRiskWizard from './AMLRiskWizard'
import { createClient } from '@/lib/supabase/client'
import { createAMLReviewReminder, getAMLSettings } from '@/lib/calendar/amlReminders'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'
import { useRouter } from 'next/navigation'
import { WorkflowBoard, WORKFLOW_CONFIGS } from './workflow'
import type { WorkflowItem } from './workflow'
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
  const [activeView, setActiveView] = useState<'table' | 'charts' | 'workflow'>('table')

  // Risk Assessment Wizard state
  const [showWizard, setShowWizard] = useState(false)
  const [selectedClientForWizard, setSelectedClientForWizard] = useState<{
    id: string
    name: string
    recordId: string
  } | null>(null)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pendingReview: 0,
    highRisk: 0,
    overdueReviews: 0,
    completedThisMonth: 0,
    // Risk breakdown stats
    lowRiskCount: 0,
    mediumRiskCount: 0,
    highRiskCount: 0,
    nextLowReview: null as string | null,
    nextMediumReview: null as string | null,
    nextHighReview: null as string | null
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

    // Risk breakdown counts
    const lowRiskCount = records.filter(r => r.risk_rating === 'low').length
    const mediumRiskCount = records.filter(r => r.risk_rating === 'medium').length
    const highRiskBreakdown = records.filter(r =>
      r.risk_rating === 'high' || r.risk_rating === 'enhanced_due_diligence'
    ).length

    // Find next review dates for each risk level
    const getNextReviewForRisk = (riskLevels: string[]) => {
      const recordsWithReview = records.filter(r =>
        riskLevels.includes(r.risk_rating) && r.next_review_date
      )
      if (recordsWithReview.length === 0) return null
      const sorted = recordsWithReview.sort((a, b) =>
        new Date(a.next_review_date!).getTime() - new Date(b.next_review_date!).getTime()
      )
      return sorted[0]?.next_review_date || null
    }

    return {
      total: clientCount,
      pendingReview: pendingCount,
      highRisk: highRiskCount,
      overdueReviews: overdueCount,
      completedThisMonth,
      // Risk breakdown
      lowRiskCount,
      mediumRiskCount,
      highRiskCount: highRiskBreakdown,
      nextLowReview: getNextReviewForRisk(['low']),
      nextMediumReview: getNextReviewForRisk(['medium']),
      nextHighReview: getNextReviewForRisk(['high', 'enhanced_due_diligence'])
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

      clientLogger.error('Error loading AML data:', error)
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
      clientLogger.error('Error creating AML record:', error)
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
      clientLogger.error('Error updating field:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to update field',
        variant: 'destructive'
      })
    }
  }

  // Handle wizard completion - save risk assessment results
  const handleWizardComplete = async (result: {
    riskRating: 'low' | 'medium' | 'high'
    nextReviewDate: string
    lastReviewDate: string
    assessmentDetails: {
      idVerification: string
      jurisdiction: string
      pepStatus: string
      sanctions: string
      sourceOfWealth: string
      sourceOfFunds: string
      natureOfBusiness: string
      totalScore: number
    }
  }) => {
    if (!selectedClientForWizard) return

    try {
      const recordId = selectedClientForWizard.recordId
      const isVirtual = recordId.startsWith('virtual-')

      // If virtual, create record first
      let actualRecordId = recordId
      if (isVirtual) {
        const clientId = recordId.replace('virtual-', '')
        const newRecord = await getOrCreateAMLRecord(clientId)
        if (!newRecord) {
          throw new Error('Failed to create AML record')
        }
        actualRecordId = newRecord.id
      }

      // Map wizard answers to database field values
      const mapIdVerification = (label: string) => {
        if (label === 'Verified') return 'verified'
        if (label === 'Pending') return 'pending'
        return 'not_started'
      }

      const mapPepStatus = (label: string) => {
        if (label === 'Is a PEP') return 'pep_high_risk'
        if (label === 'Related to PEP') return 'pep_low_risk'
        return 'not_pep'
      }

      const mapSanctions = (label: string) => {
        if (label === 'Confirmed Match') return 'confirmed_match'
        if (label === 'Potential Match') return 'potential_match'
        return 'clear'
      }

      const mapSourceVerification = (label: string) => {
        if (label === 'Verified') return 'verified'
        if (label === 'Partially Verified') return 'partially_verified'
        return 'not_verified'
      }

      // Update the record with assessment results
      const updateData = {
        risk_rating: result.riskRating,
        next_review_date: result.nextReviewDate,
        last_review_date: result.lastReviewDate,
        // Map assessment answers to database fields
        id_verification: mapIdVerification(result.assessmentDetails.idVerification),
        pep_status: mapPepStatus(result.assessmentDetails.pepStatus),
        sanctions_status: mapSanctions(result.assessmentDetails.sanctions),
        source_of_wealth: mapSourceVerification(result.assessmentDetails.sourceOfWealth),
        source_of_funds: mapSourceVerification(result.assessmentDetails.sourceOfFunds),
        edd_notes: `Risk Assessment completed on ${result.lastReviewDate}. ` +
                   `Score: ${result.assessmentDetails.totalScore}/14. ` +
                   `Jurisdiction: ${result.assessmentDetails.jurisdiction}. ` +
                   `Business: ${result.assessmentDetails.natureOfBusiness}.`,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('aml_client_status')
        .update(updateData)
        .eq('id', actualRecordId)

      if (error) throw error

      // Update local state
      setAmlRecords(prev => {
        const updated = prev.map(r =>
          r.id === actualRecordId ? { ...r, ...updateData } : r
        )
        setStats(calculateStats(updated, allClients.length))
        return updated
      })

      // Create calendar reminder for the AML review
      try {
        const amlSettings = await getAMLSettings(supabase)
        await createAMLReviewReminder(supabase, {
          clientId: selectedClientForWizard.id,
          clientName: selectedClientForWizard.name,
          riskRating: result.riskRating,
          nextReviewDate: result.nextReviewDate,
          reminderDaysBefore: amlSettings.reminderDaysBefore
        })
      } catch (calendarError) {
        console.warn('Failed to create calendar reminder:', calendarError)
        // Don't fail the whole operation if calendar reminder fails
      }

      toastRef.current({
        title: 'Assessment Saved',
        description: `${selectedClientForWizard.name} assessed as ${result.riskRating.toUpperCase()} risk. Next review: ${result.nextReviewDate}. Calendar reminder created.`
      })

      onStatsChange?.()
    } catch (error) {
      clientLogger.error('Error saving assessment:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to save assessment',
        variant: 'destructive'
      })
    } finally {
      setShowWizard(false)
      setSelectedClientForWizard(null)
    }
  }

  // Open wizard for a client
  const openWizardForClient = (record: AMLClientStatus) => {
    const clientName = `${record.clients?.personal_details?.firstName || 'Unknown'} ${record.clients?.personal_details?.lastName || ''}`.trim()
    setSelectedClientForWizard({
      id: record.client_id,
      name: clientName,
      recordId: record.id
    })
    setShowWizard(true)
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
        className={`text-xs border rounded px-2 py-1 w-full cursor-pointer focus:ring-2 focus:ring-blue-500 ${
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

  // Drill down state
  const [drillDownData, setDrillDownData] = useState<{
    isOpen: boolean
    title: string
    clients: AMLClientStatus[]
  }>({ isOpen: false, title: '', clients: [] })

  // Open drill down modal
  const openDrillDown = (title: string, filterFn: (r: AMLClientStatus) => boolean) => {
    const filteredClients = amlRecords.filter(filterFn)
    setDrillDownData({ isOpen: true, title, clients: filteredClients })
  }

  // Chart data
  const riskDistribution = RISK_RATING_OPTIONS.map(opt => ({
    name: opt.label,
    value: amlRecords.filter(r => r.risk_rating === opt.value).length,
    color: opt.color === 'green' ? '#22c55e' :
           opt.color === 'yellow' ? '#eab308' :
           opt.color === 'orange' ? '#f97316' : '#ef4444',
    riskLevel: opt.value
  })).filter(d => d.value > 0)

  // Compliance score calculation (percentage of fully verified clients)
  const complianceScore = amlRecords.length > 0 ? Math.round(
    (amlRecords.filter(r =>
      r.id_verification === 'verified' &&
      (r.pep_status === 'not_pep' || r.pep_status === 'not_checked') &&
      r.sanctions_status === 'clear' &&
      r.source_of_wealth === 'verified' &&
      r.source_of_funds === 'verified'
    ).length / amlRecords.length) * 100
  ) : 0

  // Verification funnel data
  const verificationFunnel = [
    { stage: 'ID Verified', count: amlRecords.filter(r => r.id_verification === 'verified').length, color: '#3b82f6' },
    { stage: 'SOW Verified', count: amlRecords.filter(r => r.source_of_wealth === 'verified').length, color: '#6366f1' },
    { stage: 'SOF Verified', count: amlRecords.filter(r => r.source_of_funds === 'verified').length, color: '#8b5cf6' },
    { stage: 'Fully Compliant', count: amlRecords.filter(r =>
      r.id_verification === 'verified' &&
      r.sanctions_status === 'clear' &&
      r.source_of_wealth === 'verified' &&
      r.source_of_funds === 'verified'
    ).length, color: '#22c55e' }
  ]

  // Review timeline data (next 6 months)
  const reviewTimelineData = (() => {
    const months: { month: string; low: number; medium: number; high: number }[] = []
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
      const monthName = monthDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })

      months.push({
        month: monthName,
        low: amlRecords.filter(r => {
          if (!r.next_review_date) return false
          const reviewDate = new Date(r.next_review_date)
          return reviewDate >= monthDate && reviewDate <= monthEnd && r.risk_rating === 'low'
        }).length,
        medium: amlRecords.filter(r => {
          if (!r.next_review_date) return false
          const reviewDate = new Date(r.next_review_date)
          return reviewDate >= monthDate && reviewDate <= monthEnd && r.risk_rating === 'medium'
        }).length,
        high: amlRecords.filter(r => {
          if (!r.next_review_date) return false
          const reviewDate = new Date(r.next_review_date)
          return reviewDate >= monthDate && reviewDate <= monthEnd && (r.risk_rating === 'high' || r.risk_rating === 'enhanced_due_diligence')
        }).length
      })
    }
    return months
  })()

  // PEP and Sanctions breakdown
  const pepSanctionsData = [
    { category: 'Clear', pep: amlRecords.filter(r => r.pep_status === 'not_pep').length, sanctions: amlRecords.filter(r => r.sanctions_status === 'clear').length },
    { category: 'Flagged', pep: amlRecords.filter(r => ['pep_low_risk', 'pep_high_risk', 'rca'].includes(r.pep_status)).length, sanctions: amlRecords.filter(r => ['potential_match', 'confirmed_match'].includes(r.sanctions_status)).length },
    { category: 'Not Checked', pep: amlRecords.filter(r => r.pep_status === 'not_checked').length, sanctions: amlRecords.filter(r => r.sanctions_status === 'not_checked').length }
  ]

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

  const mapRiskToPriority = (risk: AMLClientStatus['risk_rating']) => {
    if (risk === 'enhanced_due_diligence') return 'urgent'
    if (risk === 'high') return 'high'
    if (risk === 'medium') return 'medium'
    return 'low'
  }

  const workflowItems: WorkflowItem[] = filteredRecords.map((record: any) => {
    const clientName = record.clients
      ? `${record.clients.personal_details?.firstName || ''} ${record.clients.personal_details?.lastName || ''}`.trim()
      : 'Client'
    return {
      id: record.id,
      sourceType: 'aml_check',
      sourceId: record.id,
      title: clientName || record.clients?.client_ref || 'Client',
      subtitle: record.clients?.client_ref || '',
      status: record.id_verification,
      priority: mapRiskToPriority(record.risk_rating),
      ownerId: null,
      ownerName: 'Adviser',
      commentCount: 0,
      dueDate: record.next_review_date || undefined,
      clientId: record.client_id,
      metadata: { isVirtual: record._isVirtual },
    }
  })

  const handleWorkflowStatusChange = async (item: WorkflowItem, status: string) => {
    const record = filteredRecords.find((r: any) => r.id === item.id)
    if ((record as any)?._isVirtual) {
      toast({
        title: 'AML record required',
        description: 'Create an AML record for this client before updating status.',
        variant: 'destructive'
      })
      return
    }

    try {
      const { error } = await supabase
        .from('aml_client_status')
        .update({ id_verification: status, updated_at: new Date().toISOString() })
        .eq('id', item.id)
      if (error) throw error
      await loadData()
      onStatsChange?.()
    } catch (error) {
      clientLogger.error('Error updating AML status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update AML status',
        variant: 'destructive'
      })
    }
  }

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
              Once the table is set up, you&apos;ll be able to track AML/CTF status for these clients:
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
      {/* Stats Cards - Top Row */}
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

      {/* Risk Breakdown Cards - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500" onClick={() => setFilterRisk('low')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Risk</p>
                <p className="text-2xl font-bold text-green-600">{stats.lowRiskCount}</p>
                {stats.nextLowReview && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Next: {stats.nextLowReview}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-yellow-500" onClick={() => setFilterRisk('medium')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.mediumRiskCount}</p>
                {stats.nextMediumReview && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Next: {stats.nextMediumReview}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-red-500" onClick={() => setFilterRisk('high')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-red-600">{stats.highRiskCount}</p>
                {stats.nextHighReview && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Next: {stats.nextHighReview}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
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
            <button
              onClick={() => setActiveView('workflow')}
              className={`px-4 py-2 text-sm font-medium ${
                activeView === 'workflow'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="h-4 w-4 inline mr-2" />
              Workflow
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
        <div className="space-y-6">
          {/* Top Row - Compliance Score + Risk Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Compliance Score Gauge */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openDrillDown('Fully Compliant Clients', r =>
              r.id_verification === 'verified' &&
              r.sanctions_status === 'clear' &&
              r.source_of_wealth === 'verified' &&
              r.source_of_funds === 'verified'
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>AML Compliance Score</span>
                  <Badge variant="outline" className="text-xs">Click to drill down</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                      <circle
                        cx="64" cy="64" r="56" fill="none"
                        stroke={complianceScore >= 80 ? '#22c55e' : complianceScore >= 50 ? '#eab308' : '#ef4444'}
                        strokeWidth="12"
                        strokeDasharray={`${complianceScore * 3.52} 352`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">{complianceScore}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Fully Verified Clients</p>
                </div>
              </CardContent>
            </Card>

            {/* Risk Distribution Donut */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Client Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {riskDistribution.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <div className="h-48 w-48 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={riskDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                            onClick={(data) => openDrillDown(`${data.name} Risk Clients`, r => r.risk_rating === data.riskLevel)}
                            style={{ cursor: 'pointer' }}
                          >
                            {riskDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {riskDistribution.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => openDrillDown(`${item.name} Risk Clients`, r => r.risk_rating === item.riskLevel)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{item.value}</span>
                            <span className="text-xs text-gray-500">
                              ({Math.round((item.value / amlRecords.length) * 100)}%)
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-500">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Second Row - Verification Funnel + Review Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Verification Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Verification Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verificationFunnel.map((stage, idx) => {
                    const percentage = amlRecords.length > 0 ? Math.round((stage.count / amlRecords.length) * 100) : 0
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          const filters: Record<string, (r: AMLClientStatus) => boolean> = {
                            'ID Verified': r => r.id_verification === 'verified',
                            'SOW Verified': r => r.source_of_wealth === 'verified',
                            'SOF Verified': r => r.source_of_funds === 'verified',
                            'Fully Compliant': r => r.id_verification === 'verified' && r.sanctions_status === 'clear' && r.source_of_wealth === 'verified' && r.source_of_funds === 'verified'
                          }
                          openDrillDown(stage.stage, filters[stage.stage])
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{stage.stage}</span>
                          <span className="text-sm text-gray-600">{stage.count} ({percentage}%)</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: stage.color }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Review Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Upcoming Reviews (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reviewTimelineData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="low" name="Low Risk" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="medium" name="Medium Risk" fill="#eab308" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="high" name="High Risk" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Third Row - PEP/Sanctions Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PEP & Sanctions Comparison */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">PEP & Sanctions Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pepSanctionsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="pep" name="PEP Status" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="sanctions" name="Sanctions" fill="#f97316" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openDrillDown('Overdue Reviews', r => r.next_review_date ? new Date(r.next_review_date) < new Date() : false)}
                    className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-left"
                  >
                    <p className="text-2xl font-bold text-red-600">{stats.overdueReviews}</p>
                    <p className="text-xs text-red-700">Overdue Reviews</p>
                  </button>
                  <button
                    onClick={() => openDrillDown('High Risk Clients', r => r.risk_rating === 'high' || r.risk_rating === 'enhanced_due_diligence')}
                    className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
                  >
                    <p className="text-2xl font-bold text-orange-600">{stats.highRisk}</p>
                    <p className="text-xs text-orange-700">High Risk Clients</p>
                  </button>
                  <button
                    onClick={() => openDrillDown('Pending Verification', r => r.id_verification === 'pending' || r.id_verification === 'not_started')}
                    className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors text-left"
                  >
                    <p className="text-2xl font-bold text-yellow-600">
                      {amlRecords.filter(r => r.id_verification === 'pending' || r.id_verification === 'not_started').length}
                    </p>
                    <p className="text-xs text-yellow-700">Pending ID Verification</p>
                  </button>
                  <button
                    onClick={() => openDrillDown('PEP Flagged', r => ['pep_low_risk', 'pep_high_risk', 'rca'].includes(r.pep_status))}
                    className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
                  >
                    <p className="text-2xl font-bold text-purple-600">
                      {amlRecords.filter(r => ['pep_low_risk', 'pep_high_risk', 'rca'].includes(r.pep_status)).length}
                    </p>
                    <p className="text-xs text-purple-700">PEP Flagged</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeView === 'workflow' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>AML Workflow ({filteredRecords.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowBoard
              columns={WORKFLOW_CONFIGS.aml_check.stages}
              items={workflowItems}
              onItemClick={(item) => {
                const record = filteredRecords.find((r: any) => r.id === item.id)
                if (record) openWizardForClient(record)
              }}
              onStatusChange={handleWorkflowStatusChange}
              emptyMessage="No AML items in this workflow"
            />
          </CardContent>
        </Card>
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
              {filteredRecords.length > 0 ? (
                <>
                  <div className="space-y-3 p-4 sm:hidden">
                    {filteredRecords.map(record => {
                      const isVirtual = record.id.startsWith('virtual-')
                      const isOverdue = record.next_review_date && new Date(record.next_review_date) < new Date()
                      const isHighRisk = record.risk_rating === 'high' || record.risk_rating === 'enhanced_due_diligence'
                      const clientName = `${record.clients?.personal_details?.firstName || 'Unknown'} ${record.clients?.personal_details?.lastName || ''}`.trim()

                      return (
                        <div key={record.id} className={`rounded-lg border p-4 shadow-sm ${isHighRisk ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-white'} ${isVirtual ? 'bg-gray-50/70' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <button
                                onClick={() => router.push(`/clients/${record.client_id}`)}
                                className="text-sm font-semibold text-blue-600 hover:underline"
                              >
                                {clientName}
                              </button>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
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
                            </div>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">ID Verification</p>
                              <StatusDropdown
                                recordId={record.id}
                                field="id_verification"
                                value={record.id_verification}
                                options={ID_VERIFICATION_OPTIONS}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">PEP Status</p>
                              <StatusDropdown
                                recordId={record.id}
                                field="pep_status"
                                value={record.pep_status}
                                options={PEP_STATUS_OPTIONS}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Sanctions</p>
                              <StatusDropdown
                                recordId={record.id}
                                field="sanctions_status"
                                value={record.sanctions_status}
                                options={SANCTIONS_OPTIONS}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Source of Wealth</p>
                              <StatusDropdown
                                recordId={record.id}
                                field="source_of_wealth"
                                value={record.source_of_wealth}
                                options={SOW_SOF_OPTIONS}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Source of Funds</p>
                              <StatusDropdown
                                recordId={record.id}
                                field="source_of_funds"
                                value={record.source_of_funds}
                                options={SOW_SOF_OPTIONS}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Risk Rating</p>
                              <StatusDropdown
                                recordId={record.id}
                                field="risk_rating"
                                value={record.risk_rating}
                                options={RISK_RATING_OPTIONS}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Review Frequency</p>
                              <select
                                value={record.review_frequency}
                                onChange={(e) => updateField(record.id, 'review_frequency', e.target.value)}
                                className="text-xs border rounded px-2 py-1 w-full"
                              >
                                {REVIEW_FREQUENCY_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Start Assessment Button */}
                          <div className="mt-4 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openWizardForClient(record)}
                              className="w-full text-xs"
                            >
                              <PlayCircle className="h-3 w-3 mr-2" />
                              Start Risk Assessment
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="hidden overflow-x-auto sm:block">
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
                          <th className="text-center p-3 font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredRecords.map(record => {
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
                              <td className="p-3 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openWizardForClient(record)}
                                  className="text-xs"
                                >
                                  <PlayCircle className="h-3 w-3 mr-1" />
                                  Assess
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No clients found matching your criteria.
                </div>
              )}
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

      {/* AML Risk Assessment Wizard Modal */}
      {showWizard && selectedClientForWizard && (
        <AMLRiskWizard
          clientId={selectedClientForWizard.id}
          clientName={selectedClientForWizard.name}
          onComplete={handleWizardComplete}
          onCancel={() => {
            setShowWizard(false)
            setSelectedClientForWizard(null)
          }}
        />
      )}

      {/* Drill Down Modal */}
      {drillDownData.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDrillDownData({ isOpen: false, title: '', clients: [] })}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold">{drillDownData.title}</h3>
                <p className="text-sm text-gray-500">{drillDownData.clients.length} client(s)</p>
              </div>
              <button
                onClick={() => setDrillDownData({ isOpen: false, title: '', clients: [] })}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              {drillDownData.clients.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-600">Client</th>
                      <th className="text-left p-3 font-medium text-gray-600">Risk Rating</th>
                      <th className="text-left p-3 font-medium text-gray-600">ID Verification</th>
                      <th className="text-left p-3 font-medium text-gray-600">PEP</th>
                      <th className="text-left p-3 font-medium text-gray-600">Sanctions</th>
                      <th className="text-left p-3 font-medium text-gray-600">Next Review</th>
                      <th className="text-center p-3 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {drillDownData.clients.map((client) => {
                      const clientName = `${client.clients?.personal_details?.firstName || 'Unknown'} ${client.clients?.personal_details?.lastName || ''}`.trim()
                      const isOverdue = client.next_review_date && new Date(client.next_review_date) < new Date()
                      const riskOpt = RISK_RATING_OPTIONS.find(o => o.value === client.risk_rating)
                      const idOpt = ID_VERIFICATION_OPTIONS.find(o => o.value === client.id_verification)
                      const pepOpt = PEP_STATUS_OPTIONS.find(o => o.value === client.pep_status)
                      const sanctOpt = SANCTIONS_OPTIONS.find(o => o.value === client.sanctions_status)

                      return (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setDrillDownData({ isOpen: false, title: '', clients: [] })
                                router.push(`/clients/${client.client_id}`)
                              }}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {clientName}
                            </button>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={riskOpt?.color === 'green' ? 'default' : riskOpt?.color === 'red' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {riskOpt?.label || client.risk_rating}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded ${
                              idOpt?.color === 'green' ? 'bg-green-100 text-green-700' :
                              idOpt?.color === 'red' ? 'bg-red-100 text-red-700' :
                              idOpt?.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {idOpt?.label || client.id_verification}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded ${
                              pepOpt?.color === 'green' ? 'bg-green-100 text-green-700' :
                              pepOpt?.color === 'red' ? 'bg-red-100 text-red-700' :
                              pepOpt?.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {pepOpt?.label || client.pep_status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-1 rounded ${
                              sanctOpt?.color === 'green' ? 'bg-green-100 text-green-700' :
                              sanctOpt?.color === 'red' ? 'bg-red-100 text-red-700' :
                              sanctOpt?.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {sanctOpt?.label || client.sanctions_status}
                            </span>
                          </td>
                          <td className="p-3">
                            {client.next_review_date ? (
                              <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                {new Date(client.next_review_date).toLocaleDateString('en-GB')}
                                {isOverdue && ' (Overdue)'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Not set</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDrillDownData({ isOpen: false, title: '', clients: [] })
                                openWizardForClient(client)
                              }}
                              className="text-xs"
                            >
                              <PlayCircle className="h-3 w-3 mr-1" />
                              Assess
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No clients found in this category.
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setDrillDownData({ isOpen: false, title: '', clients: [] })}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

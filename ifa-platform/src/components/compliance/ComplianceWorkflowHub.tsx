'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  WorkflowBoard,
  WorkflowDetailPanel,
  WorkflowSearchBar,
  WORKFLOW_CONFIGS,
  SECTION_BADGES
} from './workflow'
import type { WorkflowItem, WorkflowSourceType } from './workflow'

type HubStatus = 'needs_action' | 'in_progress' | 'under_review' | 'resolved'

const HUB_COLUMNS = [
  { id: 'needs_action', label: 'Needs Action', color: '#ef4444' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'under_review', label: 'Under Review', color: '#3b82f6' },
  { id: 'resolved', label: 'Resolved', color: '#22c55e' },
]

const HUB_STATUS_OPTIONS = [
  { value: 'all', label: 'All Stages' },
  { value: 'needs_action', label: 'Needs Action' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
]

const HUB_STATUS_TO_SOURCE: Record<WorkflowSourceType, Record<HubStatus, string>> = {
  complaint: {
    needs_action: 'open',
    in_progress: 'investigating',
    under_review: 'escalated',
    resolved: 'resolved',
  },
  breach: {
    needs_action: 'open',
    in_progress: 'investigating',
    under_review: 'remediated',
    resolved: 'closed',
  },
  vulnerability: {
    needs_action: 'active',
    in_progress: 'monitoring',
    under_review: 'monitoring',
    resolved: 'resolved',
  },
  file_review: {
    needs_action: 'pending',
    in_progress: 'in_progress',
    under_review: 'escalated',
    resolved: 'approved',
  },
  aml_check: {
    needs_action: 'not_started',
    in_progress: 'pending',
    under_review: 'pending',
    resolved: 'verified',
  },
  consumer_duty: {
    needs_action: 'needs_attention',
    in_progress: 'mostly_compliant',
    under_review: 'non_compliant',
    resolved: 'fully_compliant',
  },
  risk_assessment: {
    needs_action: 'overdue',
    in_progress: 'current',
    under_review: 'due_soon',
    resolved: 'recent',
  },
}

const STATUS_FIELD: Record<WorkflowSourceType, string | null> = {
  complaint: 'status',
  breach: 'status',
  vulnerability: 'status',
  file_review: 'status',
  aml_check: 'id_verification',
  consumer_duty: 'overall_status',
  risk_assessment: null,
}

const TABLE_BY_SOURCE: Record<WorkflowSourceType, string | null> = {
  complaint: 'complaint_register',
  breach: 'breach_register',
  vulnerability: 'vulnerability_register',
  file_review: 'file_reviews',
  aml_check: 'aml_client_status',
  consumer_duty: 'consumer_duty_status',
  risk_assessment: null,
}

const OWNER_FIELD: Record<WorkflowSourceType, string | null> = {
  complaint: 'assigned_to',
  breach: 'assigned_to',
  vulnerability: 'assigned_to',
  file_review: 'reviewer_id',
  aml_check: null,
  consumer_duty: null,
  risk_assessment: null,
}

const PRIORITY_FIELD: Record<WorkflowSourceType, string | null> = {
  complaint: 'priority',
  breach: 'priority',
  vulnerability: 'priority',
  file_review: null,
  aml_check: null,
  consumer_duty: null,
  risk_assessment: null,
}

const SECTION_OPTIONS = [
  { value: 'all', label: 'All Sections' },
  ...Object.entries(SECTION_BADGES).map(([key, value]) => ({
    value: key,
    label: value.label
  }))
]

export default function ComplianceWorkflowHub() {
  const supabase = createClient()
  const { toast } = useToast()
  const toastRef = useRef(toast)
  const didLoadRef = useRef(false)
  const [items, setItems] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedItem, setSelectedItem] = useState<WorkflowItem | null>(null)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const mapToHubStatus = useCallback((sourceType: WorkflowSourceType, rawStatus: string): HubStatus => {
    switch (sourceType) {
      case 'complaint':
        if (rawStatus === 'open') return 'needs_action'
        if (rawStatus === 'investigating') return 'in_progress'
        if (rawStatus === 'escalated') return 'under_review'
        return 'resolved'
      case 'breach':
        if (rawStatus === 'open') return 'needs_action'
        if (rawStatus === 'investigating') return 'in_progress'
        if (rawStatus === 'remediated') return 'under_review'
        return 'resolved'
      case 'file_review':
        if (rawStatus === 'pending') return 'needs_action'
        if (rawStatus === 'in_progress') return 'in_progress'
        if (rawStatus === 'escalated') return 'under_review'
        return 'resolved'
      case 'aml_check':
        if (rawStatus === 'verified') return 'resolved'
        if (rawStatus === 'pending') return 'in_progress'
        return 'needs_action'
      case 'consumer_duty':
        if (rawStatus === 'fully_compliant') return 'resolved'
        if (rawStatus === 'mostly_compliant') return 'under_review'
        if (rawStatus === 'needs_attention' || rawStatus === 'non_compliant') return 'needs_action'
        return 'needs_action'
      case 'vulnerability':
        if (rawStatus === 'resolved') return 'resolved'
        if (rawStatus === 'monitoring') return 'in_progress'
        return 'needs_action'
      case 'risk_assessment':
        if (rawStatus === 'recent') return 'resolved'
        if (rawStatus === 'current') return 'in_progress'
        if (rawStatus === 'due_soon') return 'under_review'
        return 'needs_action'
      default:
        return 'needs_action'
    }
  }, [])

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/compliance/workflow')
      if (!response.ok) {
        throw new Error('Failed to load workflow items')
      }
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      clientLogger.error('Workflow hub load error:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to load workflow hub data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    loadItems()
  }, [loadItems])

  const mappedItems = useMemo(() => {
    return items.map((item) => {
      const badge = SECTION_BADGES[item.sourceType]
      const hubStatus = mapToHubStatus(item.sourceType, item.status)
      return {
        ...item,
        sourceStatus: item.status,
        hubStatus,
        status: hubStatus,
        sectionLabel: badge?.label,
        sectionColor: badge?.className,
      }
    })
  }, [items, mapToHubStatus])

  const filteredItems = useMemo(() => {
    return mappedItems.filter((item) => {
      if (sectionFilter !== 'all' && item.sourceType !== sectionFilter) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (!searchValue) return true
      const haystack = [
        item.title,
        item.subtitle,
        item.description,
        item.sectionLabel
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(searchValue.toLowerCase())
    })
  }, [mappedItems, sectionFilter, statusFilter, searchValue])

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    mappedItems.forEach((item) => {
      counts[item.sourceType] = (counts[item.sourceType] || 0) + 1
    })
    return counts
  }, [mappedItems])

  const detailItem = useMemo(() => {
    if (!selectedItem) return null
    const sourceStatus = selectedItem.sourceStatus || selectedItem.status
    return {
      ...selectedItem,
      status: sourceStatus,
    }
  }, [selectedItem])

  const detailStages = useMemo(() => {
    if (!selectedItem) return []
    return WORKFLOW_CONFIGS[selectedItem.sourceType]?.stages || []
  }, [selectedItem])

  const handleHubStatusChange = useCallback(async (item: WorkflowItem, nextHubStatus: string) => {
    const hubStatus = nextHubStatus as HubStatus
    const targetStatus = HUB_STATUS_TO_SOURCE[item.sourceType]?.[hubStatus]
    const table = TABLE_BY_SOURCE[item.sourceType]
    const field = STATUS_FIELD[item.sourceType]

    if (!table || !field || !targetStatus) {
      toastRef.current({
        title: 'Status update unavailable',
        description: 'This item cannot be updated from the hub view.',
        variant: 'destructive',
      })
      return
    }

    try {
      const { error } = await supabase
        .from(table)
        .update({ [field]: targetStatus })
        .eq('id', item.sourceId)
      if (error) throw error

      setItems((prev) =>
        prev.map((current) =>
          current.sourceType === item.sourceType && current.sourceId === item.sourceId
            ? { ...current, status: targetStatus }
            : current
        )
      )
    } catch (error) {
      clientLogger.error('Workflow hub status update error:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to update item status',
        variant: 'destructive',
      })
    }
  }, [supabase])

  const handleDetailUpdate = useCallback(async (updates: Partial<WorkflowItem>) => {
    if (!selectedItem) return
    const table = TABLE_BY_SOURCE[selectedItem.sourceType]
    if (!table) return

    const payload: Record<string, any> = {}
    const ownerField = OWNER_FIELD[selectedItem.sourceType]
    const priorityField = PRIORITY_FIELD[selectedItem.sourceType]
    const statusField = STATUS_FIELD[selectedItem.sourceType]

    if (ownerField && updates.ownerId !== undefined) {
      payload[ownerField] = updates.ownerId
    }

    if (priorityField && updates.priority !== undefined) {
      payload[priorityField] = updates.priority
    }

    if (updates.status !== undefined) {
      if (!statusField) {
        toastRef.current({
          title: 'Status update unavailable',
          description: 'This item cannot be updated from the hub view.',
          variant: 'destructive',
        })
        return
      }
      payload[statusField] = updates.status
    }

    if (!Object.keys(payload).length) return

    try {
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', selectedItem.sourceId)
      if (error) throw error

      setItems((prev) =>
        prev.map((current) =>
          current.sourceType === selectedItem.sourceType && current.sourceId === selectedItem.sourceId
            ? { ...current, ...('status' in updates ? { status: updates.status } : {}), ...(updates.ownerId !== undefined ? { ownerId: updates.ownerId } : {}), ...(updates.priority !== undefined ? { priority: updates.priority } : {}) }
            : current
        )
      )
      setSelectedItem((prev) => (prev ? { ...prev, ...updates } : prev))
      await loadItems()
    } catch (error) {
      clientLogger.error('Workflow hub update error:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to update workflow item',
        variant: 'destructive',
      })
    }
  }, [loadItems, selectedItem, supabase])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Workflow Hub</h2>
          <p className="text-sm text-gray-500">Unified view of compliance actions across registers</p>
        </div>
        <Button variant="outline" onClick={() => { loadItems(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {Object.entries(SECTION_BADGES).map(([key, value]) => (
          <Card
            key={key}
            role="button"
            className={`cursor-pointer transition ${sectionFilter === key ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setSectionFilter(sectionFilter === key ? 'all' : key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className={`rounded px-2 py-1 text-xs font-medium ${value.className}`}>{value.label}</span>
                <span className="text-lg font-semibold text-gray-900">{sectionCounts[key] || 0}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <WorkflowSearchBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={[
          { id: 'section', label: 'Section', value: sectionFilter, options: SECTION_OPTIONS },
          { id: 'status', label: 'Status', value: statusFilter, options: HUB_STATUS_OPTIONS },
        ]}
        onFilterChange={(id, value) => {
          if (id === 'section') setSectionFilter(value)
          if (id === 'status') setStatusFilter(value)
        }}
      />

      <div className="min-w-0">
        <WorkflowBoard
          columns={HUB_COLUMNS}
          items={filteredItems}
          isLoading={loading}
          onItemClick={(item) => setSelectedItem(item)}
          onSectionClick={(item) => setSectionFilter(item.sourceType)}
          onStatusChange={handleHubStatusChange}
          emptyMessage="No workflow items found"
        />
      </div>

      <WorkflowDetailPanel
        open={Boolean(detailItem)}
        item={detailItem}
        stages={detailStages}
        sourceType={detailItem?.sourceType || 'complaint'}
        onClose={() => setSelectedItem(null)}
        onUpdate={handleDetailUpdate}
      />
    </div>
  )
}

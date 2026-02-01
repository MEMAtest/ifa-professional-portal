'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  WorkflowBoard,
  WorkflowSearchBar,
  SECTION_BADGES
} from './workflow'
import type { WorkflowItem, WorkflowSourceType } from './workflow'

type HubStatus = 'needs_action' | 'in_progress' | 'under_review' | 'resolved'

interface ActivityItem {
  id: string
  action: string
  date: string
  type?: string
  user_name?: string | null
  clientName?: string | null
  clientRef?: string | null
}

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

const SECTION_OPTIONS = [
  { value: 'all', label: 'All Sections' },
  ...Object.entries(SECTION_BADGES).map(([key, value]) => ({
    value: key,
    label: value.label
  }))
]

function formatActivityTime(timestamp?: string | null) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export default function ComplianceWorkflowHub() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<WorkflowItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [myItemsOnly, setMyItemsOnly] = useState(false)

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
      console.error('Workflow hub load error:', error)
      toast({
        title: 'Error',
        description: 'Failed to load workflow hub data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadActivity = useCallback(async () => {
    try {
      setActivityLoading(true)
      const response = await fetch('/api/activity-log?recent=true&limit=12')
      if (!response.ok) {
        throw new Error('Failed to load activity')
      }
      const data = await response.json()
      const items = data?.activities || data?.data || data || []
      setActivity(items)
    } catch (error) {
      console.error('Workflow hub activity error:', error)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
    loadActivity()
  }, [loadItems, loadActivity])

  const mappedItems = useMemo(() => {
    return items.map((item) => {
      const badge = SECTION_BADGES[item.sourceType]
      return {
        ...item,
        status: mapToHubStatus(item.sourceType, item.status),
        sectionLabel: badge?.label,
        sectionColor: badge?.className,
      }
    })
  }, [items, mapToHubStatus])

  const filteredItems = useMemo(() => {
    return mappedItems.filter((item) => {
      if (sectionFilter !== 'all' && item.sourceType !== sectionFilter) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (myItemsOnly && user?.id && item.ownerId !== user.id) return false
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
  }, [mappedItems, sectionFilter, statusFilter, myItemsOnly, user?.id, searchValue])

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    mappedItems.forEach((item) => {
      counts[item.sourceType] = (counts[item.sourceType] || 0) + 1
    })
    return counts
  }, [mappedItems])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Workflow Hub</h2>
          <p className="text-sm text-gray-500">Unified view of compliance actions across registers</p>
        </div>
        <Button variant="outline" onClick={() => { loadItems(); loadActivity(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {Object.entries(SECTION_BADGES).map(([key, value]) => (
          <Card key={key}>
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
        myItemsOnly={myItemsOnly}
        onToggleMyItems={setMyItemsOnly}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WorkflowBoard
            columns={HUB_COLUMNS}
            items={filteredItems}
            isLoading={loading}
            emptyMessage="No workflow items found"
          />
        </div>
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-blue-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="text-sm text-gray-500">Loading activity...</div>
              ) : activity.length === 0 ? (
                <div className="text-sm text-gray-500">No recent activity.</div>
              ) : (
                <div className="space-y-4">
                  {activity.slice(0, 10).map((event) => (
                    <div key={event.id} className="border-b border-gray-100 pb-3 last:border-none last:pb-0">
                      <p className="text-sm text-gray-800">{event.action}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {event.clientName && (
                          <Badge variant="outline" className="text-xs">
                            {event.clientName}
                          </Badge>
                        )}
                        {event.user_name && <span>{event.user_name}</span>}
                        <span>{formatActivityTime(event.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

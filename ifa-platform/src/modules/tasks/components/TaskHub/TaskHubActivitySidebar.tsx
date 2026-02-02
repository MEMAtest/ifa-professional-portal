'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ActivityItem {
  id: string
  action: string
  date: string
  type?: string | null
  user_name?: string | null
  clientName?: string | null
}

function formatActivityTime(timestamp?: string | null) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function TaskHubActivitySidebar() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/activity-log?recent=true&limit=12')
        if (!response.ok) {
          throw new Error(`Activity fetch failed (${response.status})`)
        }
        const data = await response.json()
        const raw = data?.activities || data?.data || data || []
        const filtered = raw.filter((entry: ActivityItem) => {
          const type = (entry.type || '').toLowerCase()
          const action = (entry.action || '').toLowerCase()
          return type.includes('task') || action.includes('task')
        })
        if (active) setItems(filtered)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load activity')
          setItems([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-blue-500" />
          Task Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="text-sm text-gray-500">Loading activity...</div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">No recent activity</p>
            <p className="text-xs text-gray-400">Task activity will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.slice(0, 8).map((event) => (
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
  )
}

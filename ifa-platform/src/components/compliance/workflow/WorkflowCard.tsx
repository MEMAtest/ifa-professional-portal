'use client'

import React from 'react'
import { Calendar, MessageSquare, UserCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { WorkflowItem, WorkflowStage } from './types'

const PRIORITY_STYLES: Record<string, { border: string; badge: string; label: string }> = {
  urgent: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700', label: 'Urgent' },
  high: { border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700', label: 'High' },
  medium: { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700', label: 'Medium' },
  low: { border: 'border-l-gray-400', badge: 'bg-gray-100 text-gray-600', label: 'Low' },
}

interface WorkflowCardProps {
  item: WorkflowItem
  stages: WorkflowStage[]
  onClick?: (item: WorkflowItem) => void
  onStatusChange?: (item: WorkflowItem, status: string) => void
}

export default function WorkflowCard({ item, stages, onClick, onStatusChange }: WorkflowCardProps) {
  const priorityStyle = item.priority ? PRIORITY_STYLES[item.priority] : null
  const isOverdue = item.dueDate ? new Date(item.dueDate) < new Date() : false

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md ${
        priorityStyle ? `border-l-4 ${priorityStyle.border}` : ''
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.(item)
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-gray-900">{item.title}</p>
            {item.sectionLabel && item.sectionColor && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${item.sectionColor}`}>
                {item.sectionLabel}
              </span>
            )}
          </div>
          {item.subtitle && (
            <p className="text-xs text-gray-500">{item.subtitle}</p>
          )}
        </div>
        {priorityStyle && (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityStyle.badge}`}>
            {priorityStyle.label}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1">
          <UserCircle className="h-4 w-4 text-gray-400" />
          {item.ownerName || 'Unassigned'}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          {item.commentCount ?? 0}
        </span>
        {item.dueDate && (
          <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
            <Calendar className="h-4 w-4" />
            {new Date(item.dueDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        )}
      </div>

      {onStatusChange && (
        <div className="mt-3">
          <select
            value={item.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onStatusChange(item, e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

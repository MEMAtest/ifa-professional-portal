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
  onSectionClick?: (item: WorkflowItem) => void
  onStatusChange?: (item: WorkflowItem, status: string) => void
  onDragStart?: (item: WorkflowItem, event: React.DragEvent<HTMLDivElement>) => void
}

export default function WorkflowCard({
  item,
  stages,
  onClick,
  onSectionClick,
  onStatusChange,
  onDragStart,
}: WorkflowCardProps) {
  const priorityStyle = item.priority ? PRIORITY_STYLES[item.priority] : null
  const isOverdue = item.dueDate ? new Date(item.dueDate) < new Date() : false
  const isDraggable = Boolean(onDragStart)

  return (
    <div
      className={`${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md ${
        priorityStyle ? `border-l-4 ${priorityStyle.border}` : ''
      }`}
      role="button"
      tabIndex={0}
      aria-label={`${item.title}${item.subtitle ? ` - ${item.subtitle}` : ''}`}
      draggable={Boolean(onDragStart)}
      onDragStart={(event) => onDragStart?.(item, event)}
      onClick={() => onClick?.(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(item)
        }
      }}
    >
      <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>

      {(item.sectionLabel && item.sectionColor) || priorityStyle ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.sectionLabel && item.sectionColor && (
            <button
              type="button"
              className={`rounded px-2 py-0.5 text-xs font-medium ${item.sectionColor}`}
              onClick={(event) => {
                event.stopPropagation()
                onSectionClick?.(item)
              }}
            >
              {item.sectionLabel}
            </button>
          )}
          {priorityStyle && (
            <span
              className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium leading-none ${priorityStyle.badge}`}
            >
              {priorityStyle.label}
            </span>
          )}
        </div>
      ) : null}

      {item.subtitle && (
        <p className="mt-1 text-xs text-gray-500 line-clamp-1">{item.subtitle}</p>
      )}

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
        <div className="mt-3 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Move to</span>
          <select
            value={item.status}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
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

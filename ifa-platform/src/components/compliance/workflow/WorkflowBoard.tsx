'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import WorkflowCard from './WorkflowCard'
import type { WorkflowItem, WorkflowStage } from './types'

interface WorkflowBoardProps {
  columns: WorkflowStage[]
  items: WorkflowItem[]
  isLoading?: boolean
  onItemClick?: (item: WorkflowItem) => void
  onStatusChange?: (item: WorkflowItem, status: string) => void
  emptyMessage?: string
}

export default function WorkflowBoard({
  columns,
  items,
  isLoading,
  onItemClick,
  onStatusChange,
  emptyMessage = 'No items to display',
}: WorkflowBoardProps) {
  const itemsByStatus = columns.reduce<Record<string, WorkflowItem[]>>((acc, column) => {
    acc[column.id] = items.filter((item) => item.status === column.id)
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading workflow…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
      {columns.map((column) => {
        const columnItems = itemsByStatus[column.id] || []
        return (
          <div key={column.id} className="flex-1 min-w-0 md:min-w-[240px] max-w-full">
            <div
              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
              style={{ borderTop: `4px solid ${column.color}` }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">{column.label}</h3>
                <span className="text-xs text-gray-500">{columnItems.length}</span>
              </div>
              <div className="mt-3 space-y-3">
                {columnItems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-200 bg-white px-3 py-6 text-center text-xs text-gray-400">
                    Empty
                  </div>
                ) : (
                  columnItems.map((item) => (
                    <WorkflowCard
                      key={item.id}
                      item={item}
                      stages={columns}
                      onClick={onItemClick}
                      onStatusChange={onStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )
      })}

      {columns.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}

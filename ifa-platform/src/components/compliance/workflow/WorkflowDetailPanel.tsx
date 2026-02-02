'use client'

import React, { useEffect, useState } from 'react'
import { X, Plus, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import StatusPipeline from './StatusPipeline'
import OwnerPicker from './OwnerPicker'
import CommentThread from './CommentThread'
import type { WorkflowItem, WorkflowStage, WorkflowPriority, WorkflowSourceType } from './types'
import { CreateTaskModal } from '@/modules/tasks/components/CreateTaskModal'
import { useCreateTask, useSourceTasks } from '@/modules/tasks/hooks/useTasks'

interface WorkflowDetailPanelProps {
  open: boolean
  item: WorkflowItem | null
  stages: WorkflowStage[]
  sourceType: WorkflowSourceType
  onClose: () => void
  onUpdate?: (updates: Partial<WorkflowItem>) => Promise<void> | void
}

export default function WorkflowDetailPanel({
  open,
  item,
  stages,
  sourceType,
  onClose,
  onUpdate,
}: WorkflowDetailPanelProps) {
  const [showCreateTask, setShowCreateTask] = useState(false)
  const createTask = useCreateTask()
  const { data: linkedTasks } = useSourceTasks(item?.sourceType, item?.sourceId)

  const handleOwnerChange = async (value: string | null) => {
    await onUpdate?.({ ownerId: value })
  }

  const handlePriorityChange = async (value: WorkflowPriority | null) => {
    await onUpdate?.({ priority: value })
  }

  const handleStatusChange = async (value: string) => {
    await onUpdate?.({ status: value })
  }

  const handleCreateTask = async (input: any) => {
    if (!item) return
    await createTask.mutateAsync({
      ...input,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      clientId: item.clientId || input.clientId,
    })
  }

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40"
      onClick={() => {
        if (showCreateTask) return
        onClose()
      }}
    >
      <div
        className="my-6 max-h-[90vh] w-full sm:max-w-xl overflow-y-auto rounded-l-2xl bg-white p-4 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
            {item.subtitle && <p className="text-sm text-gray-500">{item.subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <StatusPipeline stages={stages} currentStage={item.status} />

          {stages.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-800">Status</div>
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="mt-2 w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-800">Owner</div>
            <div className="mt-2">
              <OwnerPicker value={item.ownerId || null} onChange={handleOwnerChange} compact />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Priority</div>
              {item.priority && (
                <Badge variant="secondary" className="capitalize">
                  {item.priority}
                </Badge>
              )}
            </div>
            <select
              value={item.priority || 'medium'}
              onChange={(e) => handlePriorityChange(e.target.value as WorkflowPriority)}
              className="mt-2 w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Linked Tasks</div>
              <Button size="sm" onClick={() => setShowCreateTask(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {linkedTasks?.tasks?.length ? (
                linkedTasks.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.status.replace('_', ' ')}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {task.priority}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-200 px-3 py-4 text-xs text-gray-400">
                  <ClipboardList className="h-4 w-4" />
                  No linked tasks yet
                </div>
              )}
            </div>
          </div>

          <CommentThread sourceType={sourceType} sourceId={item.sourceId} />
        </div>
      </div>

      <CreateTaskModal
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onSubmit={handleCreateTask}
        defaultClientId={item.clientId || undefined}
        defaultAssigneeId={item.ownerId || undefined}
      />
    </div>
  )
}

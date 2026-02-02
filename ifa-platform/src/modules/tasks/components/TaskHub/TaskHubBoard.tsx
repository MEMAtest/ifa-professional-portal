'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { TaskCard } from '@/modules/tasks/components/TaskCard'
import type { TaskWithDetails, TaskStatus } from '@/modules/tasks/types'

interface TaskHubBoardProps {
  tasks: TaskWithDetails[]
  isLoading?: boolean
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  onTaskClick?: (task: TaskWithDetails) => void
  onEditTask?: (task: TaskWithDetails) => void
  onDeleteTask?: (taskId: string, clientId?: string) => void
  onCompleteTask?: (taskId: string) => void
}

const COLUMNS: Array<{ id: TaskStatus; label: string; color: string }> = [
  { id: 'pending', label: 'Pending', color: '#9ca3af' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'completed', label: 'Completed', color: '#22c55e' },
  { id: 'cancelled', label: 'Cancelled', color: '#9ca3af' },
]

export default function TaskHubBoard({
  tasks,
  isLoading,
  onStatusChange,
  onTaskClick,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
}: TaskHubBoardProps) {
  const itemMap = React.useMemo(() => {
    const map = new Map<string, TaskWithDetails>()
    tasks.forEach((task) => map.set(task.id, task))
    return map
  }, [tasks])

  const tasksByStatus = React.useMemo(() => {
    return COLUMNS.reduce<Record<string, TaskWithDetails[]>>((acc, column) => {
      acc[column.id] = tasks.filter((task) => task.status === column.id)
      return acc
    }, {})
  }, [tasks])

  const handleDragStart = (task: TaskWithDetails, event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/x-task-id', task.id)
    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (status: TaskStatus, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!onStatusChange) return
    const id = event.dataTransfer.getData('application/x-task-id') || event.dataTransfer.getData('text/plain')
    if (!id) return
    const task = itemMap.get(id)
    if (!task || task.status === status) return
    onStatusChange(task.id, status)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading tasks…
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-4" role="region" aria-label="Task board">
      {COLUMNS.map((column) => {
        const columnTasks = tasksByStatus[column.id] || []
        return (
          <BoardColumn
            key={column.id}
            column={column}
            tasks={columnTasks}
            canDrop={Boolean(onStatusChange)}
            onDragOver={(event) => {
              if (!onStatusChange) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => handleDrop(column.id, event)}
            onDragStart={handleDragStart}
            onCompleteTask={onCompleteTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onStatusChange={onStatusChange}
            onTaskClick={onTaskClick}
          />
        )
      })}
    </div>
  )
}

interface BoardColumnProps {
  column: { id: TaskStatus; label: string; color: string }
  tasks: TaskWithDetails[]
  canDrop: boolean
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDragStart: (task: TaskWithDetails, event: React.DragEvent<HTMLDivElement>) => void
  onCompleteTask?: (taskId: string) => void
  onEditTask?: (task: TaskWithDetails) => void
  onDeleteTask?: (taskId: string, clientId?: string) => void
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  onTaskClick?: (task: TaskWithDetails) => void
}

const BoardColumn = React.memo(function BoardColumn({
  column,
  tasks,
  canDrop,
  onDragOver,
  onDrop,
  onDragStart,
  onCompleteTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onTaskClick,
}: BoardColumnProps) {
  return (
    <div
      className="min-w-0"
      onDragOver={onDragOver}
      onDrop={onDrop}
      role="group"
      aria-label={`${column.label} column, ${tasks.length} tasks`}
    >
      <div
        className="rounded-lg border border-gray-200 bg-gray-50 p-3"
        style={{ borderTop: `4px solid ${column.color}` }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{column.label}</h3>
          <span className="text-xs text-gray-500">{tasks.length}</span>
        </div>
        <div className="mt-3 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-white px-3 py-6 text-center text-xs text-gray-400">
              Empty
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                draggable={canDrop}
                onDragStart={(event) => onDragStart(task, event)}
                aria-roledescription="draggable task"
              >
                <TaskCard
                  task={task}
                  isCompact
                  onComplete={onCompleteTask}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onStatusChange={onStatusChange}
                  onClick={onTaskClick}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
})

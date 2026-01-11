'use client'

import { useState } from 'react'
import { Loader2, Plus, LayoutList, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TaskCard } from './TaskCard'
import type { TaskWithDetails, TaskListParams, TaskStatus, TaskType, TaskPriority } from '../types'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '../types'

type ViewMode = 'list' | 'board' | 'calendar'

interface TaskListProps {
  tasks: TaskWithDetails[]
  isLoading?: boolean
  totalCount?: number
  params: TaskListParams
  onParamsChange: (params: TaskListParams) => void
  onCreateTask?: () => void
  onEditTask?: (task: TaskWithDetails) => void
  onDeleteTask?: (taskId: string, clientId?: string) => void
  onCompleteTask?: (taskId: string) => void
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  onTaskClick?: (task: TaskWithDetails) => void
  showCreateButton?: boolean
  showFilters?: boolean
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
}

export function TaskList({
  tasks,
  isLoading,
  totalCount,
  params,
  onParamsChange,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
  onStatusChange,
  onTaskClick,
  showCreateButton = true,
  showFilters = true,
  viewMode = 'list',
  onViewModeChange,
}: TaskListProps) {
  const [searchValue, setSearchValue] = useState(params.search || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onParamsChange({ ...params, search: searchValue || undefined, page: 1 })
  }

  const handleFilterChange = (key: keyof TaskListParams, value: string | undefined) => {
    onParamsChange({ ...params, [key]: value === 'all' ? undefined : value, page: 1 })
  }

  const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']
  const types: TaskType[] = ['general', 'review', 'compliance', 'client_follow_up', 'deadline', 'meeting']
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

  // Group tasks by status for board view
  const tasksByStatus = statuses.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status)
    return acc
  }, {} as Record<TaskStatus, TaskWithDetails[]>)

  return (
    <div className="space-y-4">
      {/* Header */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <Input
              placeholder="Search tasks..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="max-w-sm"
            />
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={params.status as string || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={params.priority as string || 'all'}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All priorities</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {TASK_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={params.type as string || 'all'}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {TASK_TYPE_LABELS[type]}
                </option>
              ))}
            </select>

            {/* View Mode */}
            {onViewModeChange && (
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => onViewModeChange('list')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'board' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => onViewModeChange('board')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Create Button */}
            {showCreateButton && onCreateTask && (
              <Button onClick={onCreateTask}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-gray-100 p-3 mb-4">
            <CalendarIcon className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="font-medium">No tasks found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {params.search || params.status || params.type || params.priority
              ? 'Try adjusting your filters'
              : 'Create your first task to get started'}
          </p>
          {showCreateButton && onCreateTask && !params.search && (
            <Button onClick={onCreateTask} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>
      )}

      {/* List View */}
      {!isLoading && tasks.length > 0 && viewMode === 'list' && (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onCompleteTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onStatusChange={onStatusChange}
              onClick={onTaskClick}
            />
          ))}
        </div>
      )}

      {/* Board View */}
      {!isLoading && tasks.length > 0 && viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['pending', 'in_progress', 'completed', 'cancelled'] as TaskStatus[]).map((status) => (
            <div key={status} className="bg-gray-50 rounded-lg p-3">
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                {TASK_STATUS_LABELS[status]}
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                  {tasksByStatus[status]?.length || 0}
                </span>
              </h3>
              <div className="space-y-2">
                {tasksByStatus[status]?.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isCompact
                    onComplete={onCompleteTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onStatusChange={onStatusChange}
                    onClick={onTaskClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Info */}
      {!isLoading && totalCount !== undefined && totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
          <span>
            Showing {tasks.length} of {totalCount} tasks
          </span>
          {totalCount > (params.perPage || 20) && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={(params.page || 1) <= 1}
                onClick={() => onParamsChange({ ...params, page: (params.page || 1) - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(params.page || 1) * (params.perPage || 20) >= totalCount}
                onClick={() => onParamsChange({ ...params, page: (params.page || 1) + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

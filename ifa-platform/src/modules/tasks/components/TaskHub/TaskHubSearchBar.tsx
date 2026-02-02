'use client'

import { Search, Filter, LayoutGrid, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { TaskPriority, TaskStatus, TaskType } from '@/modules/tasks/types'
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_SOURCE_LABELS } from '@/modules/tasks/types'

interface TaskHubSearchBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  status: string
  priority: string
  type: string
  source: string
  onFilterChange: (next: Partial<Record<'status' | 'priority' | 'type' | 'source', string>>) => void
  viewMode: 'list' | 'board'
  onViewModeChange: (mode: 'list' | 'board') => void
  myTasksOnly: boolean
  onToggleMyTasks: (value: boolean) => void
}

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const TYPES: TaskType[] = ['general', 'review', 'compliance', 'client_follow_up', 'deadline', 'meeting']
const SOURCES = Object.keys(TASK_SOURCE_LABELS)

export default function TaskHubSearchBar({
  searchValue,
  onSearchChange,
  status,
  priority,
  type,
  source,
  onFilterChange,
  viewMode,
  onViewModeChange,
  myTasksOnly,
  onToggleMyTasks,
}: TaskHubSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="pl-9"
          />
        </div>

        <select
          value={status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          <option value="all">All Status</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {TASK_STATUS_LABELS[value]}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => onFilterChange({ priority: e.target.value })}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          <option value="all">All Priority</option>
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {TASK_PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => onFilterChange({ type: e.target.value })}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          <option value="all">All Types</option>
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {TASK_TYPE_LABELS[value]}
            </option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => onFilterChange({ source: e.target.value })}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          <option value="all">All Sources</option>
          {SOURCES.map((value) => (
            <option key={value} value={value}>
              {TASK_SOURCE_LABELS[value] || value}
            </option>
          ))}
        </select>

        <Button
          variant={myTasksOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToggleMyTasks(!myTasksOnly)}
        >
          <Filter className="mr-2 h-4 w-4" />
          My Tasks
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('list')}
        >
          <LayoutList className="mr-2 h-4 w-4" />
          List
        </Button>
        <Button
          variant={viewMode === 'board' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('board')}
        >
          <LayoutGrid className="mr-2 h-4 w-4" />
          Board
        </Button>
      </div>
    </div>
  )
}

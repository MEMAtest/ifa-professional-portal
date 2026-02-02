'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/use-toast'
import {
  TaskList,
  CreateTaskModal,
  TaskDetailSheet,
  TaskHubStats,
  TaskHubSearchBar,
  TaskHubBoard,
} from '@/modules/tasks'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
} from '@/modules/tasks'
import type {
  TaskWithDetails,
  TaskListParams,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskSourceType,
} from '@/modules/tasks'
import { getTodayRange } from '@/modules/tasks/utils/dateUtils'

const DEFAULT_PARAMS: TaskListParams = {
  page: 1,
  perPage: 20,
  sortBy: 'due_date',
  sortOrder: 'asc',
}

type StatKey = 'overdue' | 'due_today' | 'my_tasks' | 'urgent'

type ViewMode = 'list' | 'board'

export default function TasksPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClientId = searchParams.get('clientId') || undefined
  const queryClientName = searchParams.get('clientName') || undefined

  const { start, end } = useMemo(() => getTodayRange(), [])

  const [baseParams, setBaseParams] = useState<TaskListParams>({
    ...DEFAULT_PARAMS,
    clientId: queryClientId,
  })
  const [viewMode, setViewMode] = useState<ViewMode>('board')

  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [activeStat, setActiveStat] = useState<StatKey | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)

  const queryParams = useMemo(() => {
    const params: TaskListParams = {
      ...baseParams,
      perPage: viewMode === 'board' ? 100 : baseParams.perPage || 20,
      search: searchValue || undefined,
    }

    if (statusFilter !== 'all') params.status = statusFilter as TaskStatus
    if (priorityFilter !== 'all') params.priority = priorityFilter as TaskPriority
    if (typeFilter !== 'all') params.type = typeFilter as TaskType
    if (sourceFilter !== 'all') params.sourceType = sourceFilter as TaskSourceType
    if (myTasksOnly) params.assignedTo = 'me'

    if (activeStat === 'overdue') {
      params.overdue = true
    }

    if (activeStat === 'due_today') {
      params.dueAfter = start.toISOString()
      params.dueBefore = end.toISOString()
    }

    if (activeStat === 'urgent') {
      params.priority = 'urgent'
      params.status = ['pending', 'in_progress']
    }

    return params
  }, [
    baseParams,
    viewMode,
    searchValue,
    statusFilter,
    priorityFilter,
    typeFilter,
    sourceFilter,
    myTasksOnly,
    activeStat,
    start,
    end,
  ])

  const { data, isLoading, refetch } = useTasks(queryParams)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const completeTask = useCompleteTask()

  useEffect(() => {
    if (!queryClientId) return
    setBaseParams((prev) => {
      if (prev.clientId === queryClientId) return prev
      return { ...prev, clientId: queryClientId, page: 1 }
    })
  }, [queryClientId])

  const handleCreateTask = async (input: CreateTaskInput) => {
    try {
      await createTask.mutateAsync(input)
      toast({
        title: 'Task Created',
        description: 'Your task has been created successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleUpdateTask = async (taskId: string, input: UpdateTaskInput) => {
    try {
      const updated = await updateTask.mutateAsync({ taskId, input })
      setSelectedTask(updated)
      toast({
        title: 'Task Updated',
        description: 'Task has been updated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteTask = async (taskId: string, clientId?: string) => {
    try {
      await deleteTask.mutateAsync({ taskId, clientId })
      toast({
        title: 'Task Deleted',
        description: 'Task has been deleted.',
      })
      setIsDetailSheetOpen(false)
      setSelectedTask(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete task. Please try again.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask.mutateAsync({ taskId })
      toast({
        title: 'Task Completed',
        description: 'Task has been marked as complete.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete task. Please try again.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask.mutateAsync({ taskId, input: { status } })
      toast({
        title: 'Status Updated',
        description: `Task status changed to ${status.replace('_', ' ')}.`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task status. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleTaskClick = (task: TaskWithDetails) => {
    setSelectedTask(task)
    setIsDetailSheetOpen(true)
  }

  const handleParamsChange = (next: TaskListParams) => {
    setBaseParams((prev) => ({
      ...prev,
      page: next.page || prev.page,
      perPage: next.perPage || prev.perPage,
      sortBy: next.sortBy || prev.sortBy,
      sortOrder: next.sortOrder || prev.sortOrder,
    }))
  }

  const handleStatSelect = (key: StatKey) => {
    if (key === 'my_tasks') {
      const next = !myTasksOnly
      setMyTasksOnly(next)
      setActiveStat(next ? 'my_tasks' : null)
      setBaseParams((prev) => ({ ...prev, page: 1 }))
      return
    }

    setActiveStat((prev) => (prev === key ? null : key))
    setBaseParams((prev) => ({ ...prev, page: 1 }))
  }

  const filterLabel = useMemo(() => {
    if (!queryClientId) return null
    if (queryClientName) return `Showing tasks for ${queryClientName}`
    return 'Showing tasks for selected client'
  }, [queryClientId, queryClientName])

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Hub</h1>
          <p className="text-gray-500">Manage tasks across compliance, documents, assessments, and manual work.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {queryClientId && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-indigo-900">{filterLabel}</p>
            <p className="text-xs text-indigo-700">Filter applied from File Review.</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              router.push('/tasks')
              setBaseParams((prev) => ({ ...prev, clientId: undefined, page: 1 }))
            }}
          >
            Clear filter
          </Button>
        </div>
      )}

      <TaskHubStats activeKey={activeStat} onSelect={handleStatSelect} />

      <TaskHubSearchBar
        searchValue={searchValue}
        onSearchChange={(value) => {
          setSearchValue(value)
          setBaseParams((prev) => ({ ...prev, page: 1 }))
        }}
        status={statusFilter}
        priority={priorityFilter}
        type={typeFilter}
        source={sourceFilter}
        onFilterChange={(next) => {
          if (next.status !== undefined) setStatusFilter(next.status)
          if (next.priority !== undefined) setPriorityFilter(next.priority)
          if (next.type !== undefined) setTypeFilter(next.type)
          if (next.source !== undefined) setSourceFilter(next.source)
          setActiveStat(null)
          setBaseParams((prev) => ({ ...prev, page: 1 }))
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        myTasksOnly={myTasksOnly}
        onToggleMyTasks={(value) => {
          setMyTasksOnly(value)
          setActiveStat(value ? 'my_tasks' : null)
          setBaseParams((prev) => ({ ...prev, page: 1 }))
        }}
      />

      {viewMode === 'board' ? (
        <TaskHubBoard
          tasks={data?.tasks || []}
          isLoading={isLoading}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
          onEditTask={(task) => {
            setSelectedTask(task)
            setIsDetailSheetOpen(true)
          }}
          onDeleteTask={handleDeleteTask}
          onCompleteTask={handleCompleteTask}
        />
      ) : (
        <TaskList
          tasks={data?.tasks || []}
          isLoading={isLoading}
          totalCount={data?.total}
          params={queryParams}
          onParamsChange={handleParamsChange}
          onCreateTask={() => setIsCreateModalOpen(true)}
          onEditTask={(task) => {
            setSelectedTask(task)
            setIsDetailSheetOpen(true)
          }}
          onDeleteTask={handleDeleteTask}
          onCompleteTask={handleCompleteTask}
          onStatusChange={handleStatusChange}
          onTaskClick={handleTaskClick}
          showCreateButton={false}
          showFilters={false}
          viewMode="list"
        />
      )}

      <CreateTaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateTask}
        defaultClientId={queryClientId}
      />

      <TaskDetailSheet
        task={selectedTask}
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        onUpdate={handleUpdateTask}
        onComplete={handleCompleteTask}
        onDelete={handleDeleteTask}
      />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/use-toast'
import {
  TaskList,
  CreateTaskModal,
  TaskDetailSheet,
} from '@/modules/tasks'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
} from '@/modules/tasks'
import type { TaskWithDetails, TaskListParams, CreateTaskInput, UpdateTaskInput, TaskStatus } from '@/modules/tasks'

export default function TasksPage() {
  const { toast } = useToast()

  // List state
  const [params, setParams] = useState<TaskListParams>({
    page: 1,
    perPage: 20,
    sortBy: 'due_date',
    sortOrder: 'asc',
  })
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list')

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)

  // Data hooks
  const { data, isLoading } = useTasks(params)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const completeTask = useCompleteTask()

  const handleCreateTask = async (input: CreateTaskInput) => {
    try {
      await createTask.mutateAsync(input)
      toast({
        title: 'Task Created',
        description: 'Your task has been created successfully.',
      })
      // Note: refetch not needed - mutation hooks invalidate queries automatically
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
      await updateTask.mutateAsync({ taskId, input })
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

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-gray-500">
            Manage your tasks, deadlines, and workflows
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Task List */}
      <TaskList
        tasks={data?.tasks || []}
        isLoading={isLoading}
        totalCount={data?.total}
        params={params}
        onParamsChange={setParams}
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateTask}
      />

      {/* Task Detail Sheet */}
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

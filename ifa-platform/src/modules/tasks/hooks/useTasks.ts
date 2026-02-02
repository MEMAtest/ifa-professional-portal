/**
 * Tasks React Query Hooks
 * Hooks for fetching and mutating tasks data
 *
 * NOTE: Toast notifications are NOT handled here - they are handled by the calling
 * components (e.g., TasksPage) to avoid duplicate notifications and give control
 * to the UI layer for user feedback.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTasks,
  fetchTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  fetchTaskComments,
  addTaskComment,
  fetchSourceTasks,
} from '../api/tasks.api'
import type {
  TaskListParams,
  CreateTaskInput,
  UpdateTaskInput,
  CompleteTaskInput,
  CreateTaskCommentInput,
} from '../types'

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  comments: (taskId: string) => [...taskKeys.all, 'comments', taskId] as const,
  myTasks: (params?: Omit<TaskListParams, 'assignedTo'>) => [...taskKeys.all, 'my', params ?? {}] as const,
  overdue: (params?: Omit<TaskListParams, 'overdue'>) => [...taskKeys.all, 'overdue', params ?? {}] as const,
  clientTasks: (clientId: string, params?: Omit<TaskListParams, 'clientId'>) => [...taskKeys.all, 'client', clientId, params ?? {}] as const,
  sourceTasks: (sourceType: string, sourceId: string, params?: Omit<TaskListParams, 'sourceType' | 'sourceId'>) =>
    [...taskKeys.all, 'source', sourceType, sourceId, params ?? {}] as const,
}

/**
 * Fetch tasks list
 */
export function useTasks(params: TaskListParams = {}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Fetch my tasks (assigned to current user)
 */
export function useMyTasks(params: Omit<TaskListParams, 'assignedTo'> = {}) {
  return useQuery({
    queryKey: taskKeys.myTasks(params),
    queryFn: () => fetchTasks({ ...params, assignedTo: 'me' }),
    staleTime: 30 * 1000,
  })
}

/**
 * Fetch overdue tasks
 */
export function useOverdueTasks(params: Omit<TaskListParams, 'overdue'> = {}) {
  return useQuery({
    queryKey: taskKeys.overdue(params),
    queryFn: () => fetchTasks({ ...params, overdue: true }),
    staleTime: 30 * 1000,
  })
}

/**
 * Fetch tasks for a specific client
 */
export function useClientTasks(clientId: string, params: Omit<TaskListParams, 'clientId'> = {}) {
  return useQuery({
    queryKey: taskKeys.clientTasks(clientId, params),
    queryFn: () => fetchTasks({ ...params, clientId }),
    staleTime: 30 * 1000,
    enabled: !!clientId,
  })
}

/**
 * Fetch tasks linked to a specific source record
 */
export function useSourceTasks(
  sourceType: string | undefined,
  sourceId: string | undefined,
  params: Omit<TaskListParams, 'sourceType' | 'sourceId'> = {}
) {
  return useQuery({
    queryKey: taskKeys.sourceTasks(sourceType || 'unknown', sourceId || 'unknown', params),
    queryFn: () => fetchSourceTasks(sourceType as any, sourceId || '', params),
    staleTime: 30 * 1000,
    enabled: !!sourceType && !!sourceId,
  })
}

/**
 * Fetch single task
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => fetchTask(taskId),
    staleTime: 30 * 1000,
    enabled: !!taskId,
  })
}

/**
 * Fetch task comments
 */
export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: () => fetchTaskComments(taskId),
    staleTime: 30 * 1000,
    enabled: !!taskId,
  })
}

/**
 * Create task mutation
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() })
      if (task.clientId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.clientTasks(task.clientId) })
      }
      if (task.sourceType && task.sourceId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.sourceTasks(task.sourceType, task.sourceId) })
      }
    },
  })
}

/**
 * Update task mutation
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      updateTask(taskId, input),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() })
      queryClient.invalidateQueries({ queryKey: taskKeys.overdue() })
      if (task.clientId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.clientTasks(task.clientId) })
      }
      if (task.sourceType && task.sourceId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.sourceTasks(task.sourceType, task.sourceId) })
      }
    },
  })
}

/**
 * Delete task mutation
 * Accepts taskId and optional clientId for proper cache invalidation
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; clientId?: string }) => deleteTask(taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() })
      queryClient.invalidateQueries({ queryKey: taskKeys.overdue() })
      if (variables.clientId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.clientTasks(variables.clientId) })
      }
    },
  })
}

/**
 * Complete task mutation
 */
export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input?: CompleteTaskInput }) =>
      completeTask(taskId, input),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() })
      queryClient.invalidateQueries({ queryKey: taskKeys.overdue() })
      if (task.clientId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.clientTasks(task.clientId) })
      }
      if (task.sourceType && task.sourceId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.sourceTasks(task.sourceType, task.sourceId) })
      }
    },
  })
}

/**
 * Add comment mutation
 */
export function useAddTaskComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTaskCommentInput) => addTaskComment(taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.comments(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
    },
  })
}

/**
 * Quick status update mutation
 */
export function useQuickStatusUpdate() {
  const updateTask = useUpdateTask()

  return {
    startTask: (taskId: string) =>
      updateTask.mutate({ taskId, input: { status: 'in_progress' } }),
    cancelTask: (taskId: string) =>
      updateTask.mutate({ taskId, input: { status: 'cancelled' } }),
    reopenTask: (taskId: string) =>
      updateTask.mutate({ taskId, input: { status: 'pending' } }),
    isPending: updateTask.isPending,
  }
}

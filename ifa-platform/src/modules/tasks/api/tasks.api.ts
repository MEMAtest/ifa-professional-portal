/**
 * Tasks API Client
 * Client-side functions for interacting with the tasks API
 */

import type {
  Task,
  TaskWithDetails,
  TaskComment,
  TaskCommentWithUser,
  CreateTaskInput,
  UpdateTaskInput,
  CompleteTaskInput,
  CreateTaskCommentInput,
  TaskListParams,
  TaskListResponse,
  TaskResponse,
  TaskCommentListResponse,
} from '../types'

const API_BASE = '/api/tasks'

/**
 * Fetch tasks with filters
 */
export async function fetchTasks(params: TaskListParams = {}): Promise<TaskListResponse> {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set('page', params.page.toString())
  if (params.perPage) searchParams.set('perPage', params.perPage.toString())
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)
  if (params.status) searchParams.set('status', Array.isArray(params.status) ? params.status.join(',') : params.status)
  if (params.type) searchParams.set('type', Array.isArray(params.type) ? params.type.join(',') : params.type)
  if (params.priority) searchParams.set('priority', Array.isArray(params.priority) ? params.priority.join(',') : params.priority)
  if (params.assignedTo) searchParams.set('assignedTo', params.assignedTo)
  if (params.clientId) searchParams.set('clientId', params.clientId)
  if (params.sourceType) searchParams.set('sourceType', params.sourceType)
  if (params.sourceId) searchParams.set('sourceId', params.sourceId)
  if (params.overdue) searchParams.set('overdue', 'true')
  if (params.search) searchParams.set('search', params.search)

  const response = await fetch(`${API_BASE}?${searchParams.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch tasks')
  }

  return response.json()
}

/**
 * Fetch a single task by ID
 */
export async function fetchTask(taskId: string): Promise<TaskWithDetails> {
  const response = await fetch(`${API_BASE}/${taskId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch task')
  }

  const data: TaskResponse = await response.json()
  return data.task
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<TaskWithDetails> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create task')
  }

  const data: TaskResponse = await response.json()
  return data.task
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskWithDetails> {
  const response = await fetch(`${API_BASE}/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update task')
  }

  const data: TaskResponse = await response.json()
  return data.task
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${taskId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete task')
  }
}

/**
 * Complete a task
 */
export async function completeTask(taskId: string, input?: CompleteTaskInput): Promise<TaskWithDetails> {
  const response = await fetch(`${API_BASE}/${taskId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input || {}),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to complete task')
  }

  const data: TaskResponse = await response.json()
  return data.task
}

/**
 * Fetch task comments
 */
export async function fetchTaskComments(taskId: string): Promise<TaskCommentListResponse> {
  const response = await fetch(`${API_BASE}/${taskId}/comments`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch comments')
  }

  return response.json()
}

/**
 * Add a comment to a task
 */
export async function addTaskComment(
  taskId: string,
  input: CreateTaskCommentInput
): Promise<TaskCommentWithUser> {
  const response = await fetch(`${API_BASE}/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add comment')
  }

  const data = await response.json()
  return data.comment
}

/**
 * Fetch my tasks (assigned to current user)
 */
export async function fetchMyTasks(params: Omit<TaskListParams, 'assignedTo'> = {}): Promise<TaskListResponse> {
  return fetchTasks({ ...params, assignedTo: 'me' })
}

/**
 * Fetch overdue tasks
 */
export async function fetchOverdueTasks(params: Omit<TaskListParams, 'overdue'> = {}): Promise<TaskListResponse> {
  return fetchTasks({ ...params, overdue: true })
}

/**
 * Fetch tasks for a specific client
 */
export async function fetchClientTasks(
  clientId: string,
  params: Omit<TaskListParams, 'clientId'> = {}
): Promise<TaskListResponse> {
  return fetchTasks({ ...params, clientId })
}

/**
 * Fetch tasks linked to a specific source record
 */
export async function fetchSourceTasks(
  sourceType: TaskListParams['sourceType'],
  sourceId: string,
  params: Omit<TaskListParams, 'sourceType' | 'sourceId'> = {}
): Promise<TaskListResponse> {
  if (!sourceType || !sourceId) {
    return {
      tasks: [],
      total: 0,
      page: 1,
      perPage: params.perPage || 20,
      hasMore: false,
    }
  }
  return fetchTasks({ ...params, sourceType, sourceId })
}

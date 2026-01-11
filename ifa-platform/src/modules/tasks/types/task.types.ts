/**
 * Task Types and Interfaces
 * Central type definitions for the tasks system
 */

// ============================================
// ENUMS / UNION TYPES
// ============================================

export type TaskType =
  | 'general'
  | 'review'
  | 'compliance'
  | 'client_follow_up'
  | 'deadline'
  | 'meeting'

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'

// ============================================
// CORE INTERFACES
// ============================================

export interface Task {
  id: string
  firmId: string
  title: string
  description?: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority

  // Assignment
  assignedTo?: string
  assignedBy?: string

  // Relationships
  clientId?: string
  assessmentId?: string

  // Dates
  dueDate?: Date
  completedAt?: Date
  completedBy?: string

  // Workflow
  requiresSignOff: boolean
  signedOffBy?: string
  signedOffAt?: Date

  // Recurrence
  isRecurring: boolean
  recurrenceRule?: string
  parentTaskId?: string

  // Metadata
  metadata: TaskMetadata

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface TaskMetadata {
  template?: string
  tags?: string[]
  customFields?: Record<string, unknown>
  [key: string]: unknown
}

// ============================================
// TASK WITH DETAILS (from view)
// ============================================

export interface TaskWithDetails extends Task {
  // Client details
  clientFirstName?: string
  clientLastName?: string
  clientRef?: string

  // Assigned user details
  assignedToFirstName?: string
  assignedToLastName?: string
  assignedToEmail?: string

  // Assigner details
  assignedByFirstName?: string
  assignedByLastName?: string

  // Counts
  commentCount: number
}

// ============================================
// TASK COMMENT
// ============================================

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface TaskCommentWithUser extends TaskComment {
  userFirstName?: string
  userLastName?: string
  userEmail?: string
  userAvatarUrl?: string
}

// ============================================
// USER TASK SUMMARY (from view)
// ============================================

export interface UserTaskSummary {
  userId: string
  firmId: string
  pendingCount: number
  inProgressCount: number
  completedThisWeek: number
  overdueCount: number
  dueThisWeek: number
}

// ============================================
// API INPUT TYPES
// ============================================

export interface CreateTaskInput {
  title: string
  description?: string
  type?: TaskType
  priority?: TaskPriority
  assignedTo?: string
  clientId?: string
  assessmentId?: string
  dueDate?: string
  requiresSignOff?: boolean
  isRecurring?: boolean
  recurrenceRule?: string
  parentTaskId?: string
  metadata?: TaskMetadata
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  type?: TaskType
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string | null
  clientId?: string | null
  assessmentId?: string | null
  dueDate?: string | null
  requiresSignOff?: boolean
  isRecurring?: boolean
  recurrenceRule?: string | null
  metadata?: TaskMetadata
}

export interface CompleteTaskInput {
  signOff?: boolean // For tasks requiring sign-off
}

export interface CreateTaskCommentInput {
  content: string
}

// ============================================
// FILTERS & QUERY PARAMS
// ============================================

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  type?: TaskType | TaskType[]
  priority?: TaskPriority | TaskPriority[]
  assignedTo?: string
  clientId?: string
  dueBefore?: string
  dueAfter?: string
  overdue?: boolean
  search?: string
}

export interface TaskListParams extends TaskFilters {
  page?: number
  perPage?: number
  sortBy?: 'due_date' | 'created_at' | 'priority' | 'status' | 'title'
  sortOrder?: 'asc' | 'desc'
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface TaskListResponse {
  tasks: TaskWithDetails[]
  total: number
  page: number
  perPage: number
  hasMore: boolean
}

export interface TaskResponse {
  task: TaskWithDetails
}

export interface TaskCommentListResponse {
  comments: TaskCommentWithUser[]
  total: number
}

// ============================================
// UI HELPERS
// ============================================

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  general: 'General',
  review: 'Review',
  compliance: 'Compliance',
  client_follow_up: 'Client Follow-up',
  deadline: 'Deadline',
  meeting: 'Meeting',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-gray-500 bg-gray-100',
  medium: 'text-blue-700 bg-blue-100',
  high: 'text-orange-700 bg-orange-100',
  urgent: 'text-red-700 bg-red-100',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'text-gray-700 bg-gray-100',
  in_progress: 'text-blue-700 bg-blue-100',
  completed: 'text-green-700 bg-green-100',
  cancelled: 'text-gray-500 bg-gray-100',
}

export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  general: 'CheckSquare',
  review: 'FileSearch',
  compliance: 'Shield',
  client_follow_up: 'Phone',
  deadline: 'Clock',
  meeting: 'Calendar',
}

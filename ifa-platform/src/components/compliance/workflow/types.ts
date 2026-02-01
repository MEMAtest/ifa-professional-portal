import type { TaskSourceType, TaskPriority } from '@/modules/tasks/types'

export type WorkflowSourceType = TaskSourceType
export type WorkflowPriority = TaskPriority

export interface WorkflowStage {
  id: string
  label: string
  color: string
}

export interface WorkflowItem {
  id: string
  sourceType: WorkflowSourceType
  sourceId: string
  title: string
  subtitle?: string
  status: string
  priority?: WorkflowPriority | null
  ownerId?: string | null
  ownerName?: string
  ownerAvatarUrl?: string | null
  commentCount?: number
  dueDate?: string | null
  sectionLabel?: string
  sectionColor?: string
  clientId?: string | null
  description?: string | null
  metadata?: Record<string, unknown>
}

export interface WorkflowConfig {
  stages: WorkflowStage[]
  cardFields?: string[]
}

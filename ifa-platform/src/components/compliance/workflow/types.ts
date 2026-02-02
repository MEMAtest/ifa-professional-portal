import type { TaskPriority } from '@/modules/tasks/types'

/** Compliance-relevant subset of TaskSourceType */
export type WorkflowSourceType =
  | 'complaint'
  | 'breach'
  | 'vulnerability'
  | 'file_review'
  | 'aml_check'
  | 'consumer_duty'
  | 'risk_assessment'
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
  sourceStatus?: string
  hubStatus?: string
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

/**
 * Task Templates
 * Pre-configured task templates for quick creation
 */

import type { CreateTaskInput, TaskType, TaskPriority } from '../types'

export interface TaskTemplate {
  id: string
  name: string
  description: string
  icon: string
  defaults: Partial<CreateTaskInput>
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'annual_review',
    name: 'Annual Review',
    description: 'Schedule an annual client review',
    icon: 'CalendarCheck',
    defaults: {
      title: 'Annual Review Due',
      type: 'review',
      priority: 'high',
      requiresSignOff: true,
      metadata: { template: 'annual_review' },
    },
  },
  {
    id: 'quarterly_compliance',
    name: 'Quarterly Compliance Check',
    description: 'Regular compliance monitoring task',
    icon: 'Shield',
    defaults: {
      title: 'Quarterly Compliance Check',
      type: 'compliance',
      priority: 'medium',
      isRecurring: true,
      recurrenceRule: 'FREQ=MONTHLY;INTERVAL=3',
      metadata: { template: 'quarterly_compliance' },
    },
  },
  {
    id: 'follow_up_call',
    name: 'Follow-up Call',
    description: 'Schedule a client follow-up call',
    icon: 'Phone',
    defaults: {
      title: 'Client Follow-up Call',
      type: 'client_follow_up',
      priority: 'medium',
      metadata: { template: 'follow_up_call' },
    },
  },
  {
    id: 'document_review',
    name: 'Document Review',
    description: 'Review client documents',
    icon: 'FileText',
    defaults: {
      title: 'Document Review Required',
      type: 'review',
      priority: 'medium',
      requiresSignOff: true,
      metadata: { template: 'document_review' },
    },
  },
  {
    id: 'suitability_review',
    name: 'Suitability Review',
    description: 'Review client suitability assessment',
    icon: 'ClipboardCheck',
    defaults: {
      title: 'Suitability Assessment Review',
      type: 'review',
      priority: 'high',
      requiresSignOff: true,
      metadata: { template: 'suitability_review' },
    },
  },
  {
    id: 'client_meeting',
    name: 'Client Meeting',
    description: 'Schedule a meeting with client',
    icon: 'Users',
    defaults: {
      title: 'Client Meeting',
      type: 'meeting',
      priority: 'medium',
      metadata: { template: 'client_meeting' },
    },
  },
  {
    id: 'deadline_reminder',
    name: 'Deadline Reminder',
    description: 'Set a deadline reminder',
    icon: 'Clock',
    defaults: {
      title: 'Deadline Approaching',
      type: 'deadline',
      priority: 'high',
      metadata: { template: 'deadline_reminder' },
    },
  },
  {
    id: 'consumer_duty_review',
    name: 'Consumer Duty Review',
    description: 'Consumer duty compliance check',
    icon: 'ShieldCheck',
    defaults: {
      title: 'Consumer Duty Review',
      type: 'compliance',
      priority: 'high',
      requiresSignOff: true,
      metadata: { template: 'consumer_duty_review' },
    },
  },
]

/**
 * Get a task template by ID
 */
export function getTaskTemplate(templateId: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find((t) => t.id === templateId)
}

/**
 * Get all templates for a specific task type
 */
export function getTemplatesByType(type: TaskType): TaskTemplate[] {
  return TASK_TEMPLATES.filter((t) => t.defaults.type === type)
}

/**
 * Get task templates grouped by type
 */
export function getTemplatesGroupedByType(): Record<TaskType, TaskTemplate[]> {
  const grouped: Record<string, TaskTemplate[]> = {}

  for (const template of TASK_TEMPLATES) {
    const type = template.defaults.type || 'general'
    if (!grouped[type]) {
      grouped[type] = []
    }
    grouped[type].push(template)
  }

  return grouped as Record<TaskType, TaskTemplate[]>
}

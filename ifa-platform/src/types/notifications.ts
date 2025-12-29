// =====================================================
// NOTIFICATION TYPES
// =====================================================

import type { Json } from '@/types/db'

export type NotificationType =
  | 'client_added'
  | 'review_due'
  | 'review_overdue'
  | 'review_completed'
  | 'document_generated'
  | 'document_ready'
  | 'document_downloaded'
  | 'signature_requested'
  | 'signature_completed'
  | 'signature_reminder'
  | 'assessment_submitted'
  | 'assessment_completed'
  | 'profile_updated'
  | 'atr_completed'
  | 'stress_test_completed'
  | 'monte_carlo_completed'
  | 'compliance_alert'
  | 'system'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationEntityType =
  | 'client'
  | 'document'
  | 'assessment'
  | 'review'
  | 'signature'
  | 'simulation'

// =====================================================
// NOTIFICATION INTERFACES
// =====================================================

export interface Notification {
  id: string
  user_id: string
  firm_id?: string | null
  client_id?: string | null
  entity_type?: NotificationEntityType | null
  entity_id?: string | null
  type: NotificationType
  title: string
  message?: string | null
  action_url?: string | null
  priority: NotificationPriority
  read: boolean
  read_at?: string | null
  metadata?: Json | null
  created_at: string
  updated_at: string
}

export interface CreateNotificationInput {
  user_id: string
  firm_id?: string
  client_id?: string
  entity_type?: NotificationEntityType
  entity_id?: string
  type: NotificationType
  title: string
  message?: string
  action_url?: string
  priority?: NotificationPriority
  metadata?: Json
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface NotificationsResponse {
  notifications: Notification[]
  total: number
  unread: number
}

export interface UnreadCountResponse {
  count: number
}

// =====================================================
// NOTIFICATION CONFIG
// =====================================================

export interface NotificationTypeConfig {
  icon: string
  defaultPriority: NotificationPriority
  category: string
}

export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  client_added: { icon: 'UserPlus', defaultPriority: 'low', category: 'clients' },
  profile_updated: { icon: 'UserCog', defaultPriority: 'low', category: 'clients' },
  review_due: { icon: 'Calendar', defaultPriority: 'normal', category: 'reviews' },
  review_overdue: { icon: 'AlertTriangle', defaultPriority: 'high', category: 'reviews' },
  review_completed: { icon: 'CheckCircle', defaultPriority: 'normal', category: 'reviews' },
  document_generated: { icon: 'FileText', defaultPriority: 'normal', category: 'documents' },
  document_ready: { icon: 'FileCheck', defaultPriority: 'normal', category: 'documents' },
  document_downloaded: { icon: 'Download', defaultPriority: 'low', category: 'documents' },
  signature_requested: { icon: 'PenTool', defaultPriority: 'normal', category: 'signatures' },
  signature_completed: { icon: 'CheckSquare', defaultPriority: 'normal', category: 'signatures' },
  signature_reminder: { icon: 'Clock', defaultPriority: 'high', category: 'signatures' },
  assessment_submitted: { icon: 'ClipboardCheck', defaultPriority: 'normal', category: 'assessments' },
  assessment_completed: { icon: 'Award', defaultPriority: 'normal', category: 'assessments' },
  atr_completed: { icon: 'ClipboardCheck', defaultPriority: 'normal', category: 'assessments' },
  stress_test_completed: { icon: 'Calculator', defaultPriority: 'normal', category: 'simulations' },
  monte_carlo_completed: { icon: 'TrendingUp', defaultPriority: 'normal', category: 'simulations' },
  compliance_alert: { icon: 'Shield', defaultPriority: 'urgent', category: 'compliance' },
  system: { icon: 'Bell', defaultPriority: 'normal', category: 'system' }
}

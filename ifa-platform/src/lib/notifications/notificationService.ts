import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type {
  Notification,
  CreateNotificationInput,
  NotificationType
} from '@/types/notifications'
import { NOTIFICATION_CONFIG } from '@/types/notifications'

const DEDUPE_WINDOW_HOURS: Partial<Record<NotificationType, number>> = {
  // Prevent accidental double-toasts/double-click spam.
  document_generated: 2,
  document_ready: 2,
  document_downloaded: 1,
  assessment_completed: 2,
  assessment_submitted: 2,
  atr_completed: 2,
  profile_updated: 1,
  stress_test_completed: 1,
  monte_carlo_completed: 1,
  signature_completed: 2,
  signature_requested: 2,
  signature_reminder: 6,
  review_due: 12,
  review_completed: 12,
  review_overdue: 24,
  client_added: 24,
  compliance_alert: 2
}

// =====================================================
// NOTIFICATION SERVICE
// =====================================================

export class NotificationService {

  /**
   * Create a new notification
   */
  static async create(input: CreateNotificationInput): Promise<Notification | null> {
    const supabase = getSupabaseServiceClient()

    // Apply default priority if not specified
    const priority = input.priority ??
      NOTIFICATION_CONFIG[input.type]?.defaultPriority ?? 'normal'

    // Best-effort dedupe to avoid repeated notifications on retry/double-click.
    const dedupeHours = DEDUPE_WINDOW_HOURS[input.type as NotificationType] ?? 0
    if (dedupeHours > 0 && input.entity_id) {
      const cutoff = new Date(Date.now() - dedupeHours * 60 * 60 * 1000).toISOString()

      let query = supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', input.user_id)
        .eq('type', input.type)
        .eq('entity_id', input.entity_id)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(1)

      if (input.entity_type) {
        query = query.eq('entity_type', input.entity_type)
      }

      const { data: existing, error: existingError } = await (query as any).maybeSingle()
      if (existing) {
        return existing as Notification
      }
      if (existingError) {
        // Don't block creation on dedupe lookup issues.
        console.warn('Notification dedupe lookup failed:', existingError)
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...input,
        priority,
        read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create notification:', error)
      return null
    }

    return data as Notification
  }

  /**
   * Create notifications for multiple users (e.g., firm-wide)
   */
  static async createBulk(
    userIds: string[],
    input: Omit<CreateNotificationInput, 'user_id'>
  ): Promise<number> {
    const supabase = getSupabaseServiceClient()

    const notifications = userIds.map(user_id => ({
      ...input,
      user_id,
      priority: input.priority ??
        NOTIFICATION_CONFIG[input.type as NotificationType]?.defaultPriority ?? 'normal',
      read: false
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      console.error('Failed to create bulk notifications:', error)
      return 0
    }

    return data?.length ?? 0
  }

  /**
   * Get notifications for a user (queries by firm_id for firm-wide notifications)
   */
  static async getForUser(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      before?: string
      firmId?: string
    } = {}
  ): Promise<{ notifications: Notification[], total: number, unread: number }> {
    const supabase = getSupabaseServiceClient()
    const { limit = 20, offset = 0, unreadOnly = false, before } = options

    // Get user's firm_id if not provided
    let firmId: string | undefined = options.firmId
    if (!firmId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', userId)
        .single()
      firmId = profile?.firm_id ?? undefined
    }

    // Query notifications by firm_id (firm-wide) OR user_id (user-specific)
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Use firm_id if available, otherwise fall back to user_id
    if (firmId) {
      query = query.or(`firm_id.eq.${firmId},user_id.eq.${userId}`)
    } else {
      query = query.eq('user_id', userId)
    }

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    if (before) {
      query = query
        .lt('created_at', before)
        .range(0, limit - 1)
    } else {
      query = query.range(offset, offset + limit - 1)
    }

    const { data, error, count } = await query

    if (error) {
      const baseMessage = isMissingTableError(error)
        ? 'Notifications are not configured (missing database table).'
        : 'Failed to fetch notifications.'
      const err = new Error(baseMessage)
      ;(err as any).code = isMissingTableError(error) ? 'NOTIFICATIONS_TABLE_MISSING' : (error as any).code
      ;(err as any).cause = error
      throw err
    }

    // Get unread count separately (also firm-wide)
    let unreadQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)

    if (firmId) {
      unreadQuery = unreadQuery.or(`firm_id.eq.${firmId},user_id.eq.${userId}`)
    } else {
      unreadQuery = unreadQuery.eq('user_id', userId)
    }

    const { count: unreadCount, error: unreadError } = await unreadQuery

    if (unreadError) {
      const err = new Error('Failed to fetch unread notification count.')
      ;(err as any).code = (unreadError as any).code
      ;(err as any).cause = unreadError
      throw err
    }

    return {
      notifications: (data ?? []) as Notification[],
      total: count ?? 0,
      unread: unreadCount ?? 0
    }
  }

  /**
   * Get unread count for a user (firm-wide)
   */
  static async getUnreadCount(userId: string, firmId?: string): Promise<number> {
    const supabase = getSupabaseServiceClient()

    // Get user's firm_id if not provided
    let resolvedFirmId: string | undefined = firmId
    if (!resolvedFirmId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', userId)
        .single()
      resolvedFirmId = profile?.firm_id ?? undefined
    }

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)

    if (resolvedFirmId) {
      query = query.or(`firm_id.eq.${resolvedFirmId},user_id.eq.${userId}`)
    } else {
      query = query.eq('user_id', userId)
    }

    const { count, error } = await query

    if (error) {
      const err = new Error('Failed to get unread notifications count.')
      ;(err as any).code = (error as any).code
      ;(err as any).cause = error
      throw err
    }

    return count ?? 0
  }

  /**
   * Mark notification as read
   * Supports both user-specific and firm-wide notifications
   */
  static async markAsRead(notificationId: string, userId: string, firmId?: string): Promise<boolean> {
    const supabase = getSupabaseServiceClient()

    // Get user's firm_id if not provided
    let resolvedFirmId: string | undefined = firmId
    if (!resolvedFirmId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', userId)
        .single()
      resolvedFirmId = profile?.firm_id ?? undefined
    }

    // Build query that matches user's notifications OR firm-wide notifications they can see
    let query = supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (resolvedFirmId) {
      query = query.or(`user_id.eq.${userId},firm_id.eq.${resolvedFirmId}`)
    } else {
      query = query.eq('user_id', userId)
    }

    const { error } = await query

    if (error) {
      const err = new Error('Failed to mark notification as read.')
      ;(err as any).code = (error as any).code
      ;(err as any).cause = error
      throw err
    }

    return true
  }

  /**
   * Mark all notifications as read for a user
   * Supports both user-specific and firm-wide notifications
   */
  static async markAllAsRead(userId: string, firmId?: string): Promise<number> {
    const supabase = getSupabaseServiceClient()

    // Get user's firm_id if not provided
    let resolvedFirmId: string | undefined = firmId
    if (!resolvedFirmId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', userId)
        .single()
      resolvedFirmId = profile?.firm_id ?? undefined
    }

    // Build query that matches user's notifications OR firm-wide notifications
    let query = supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('read', false)

    if (resolvedFirmId) {
      query = query.or(`user_id.eq.${userId},firm_id.eq.${resolvedFirmId}`)
    } else {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.select()

    if (error) {
      const err = new Error('Failed to mark all notifications as read.')
      ;(err as any).code = (error as any).code
      ;(err as any).cause = error
      throw err
    }

    return data?.length ?? 0
  }

  /**
   * Delete a notification
   * Supports both user-specific and firm-wide notifications
   */
  static async delete(notificationId: string, userId: string, firmId?: string): Promise<boolean> {
    const supabase = getSupabaseServiceClient()

    // Get user's firm_id if not provided
    let resolvedFirmId: string | undefined = firmId
    if (!resolvedFirmId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', userId)
        .single()
      resolvedFirmId = profile?.firm_id ?? undefined
    }

    // Build query that matches user's notifications OR firm-wide notifications
    let query = supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (resolvedFirmId) {
      query = query.or(`user_id.eq.${userId},firm_id.eq.${resolvedFirmId}`)
    } else {
      query = query.eq('user_id', userId)
    }

    const { error } = await query

    if (error) {
      const err = new Error('Failed to delete notification.')
      ;(err as any).code = (error as any).code
      ;(err as any).cause = error
      throw err
    }

    return true
  }

  /**
   * Delete all read notifications older than X days
   */
  static async cleanup(userId: string, daysOld: number = 30): Promise<number> {
    const supabase = getSupabaseServiceClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('read', true)
      .lt('created_at', cutoffDate.toISOString())
      .select()

    if (error) {
      const err = new Error('Failed to cleanup notifications.')
      ;(err as any).code = (error as any).code
      ;(err as any).cause = error
      throw err
    }

    return data?.length ?? 0
  }
}

function isMissingTableError(error: unknown): boolean {
  const message = typeof (error as any)?.message === 'string' ? (error as any).message : ''
  const details = typeof (error as any)?.details === 'string' ? (error as any).details : ''
  const combined = `${message} ${details}`.toLowerCase()

  return (
    (combined.includes('could not find') && combined.includes('notifications')) ||
    (combined.includes('relation') && combined.includes('notifications') && combined.includes('does not exist')) ||
    (combined.includes('schema cache') && combined.includes('notifications'))
  )
}

// =====================================================
// HELPER FUNCTIONS FOR COMMON NOTIFICATIONS
// =====================================================

export async function notifyReviewDue(
  userId: string,
  clientId: string,
  clientName: string,
  reviewId: string,
  dueDate: string
): Promise<void> {
  await NotificationService.create({
    user_id: userId,
    client_id: clientId,
    entity_type: 'review',
    entity_id: reviewId,
    type: 'review_due',
    title: `Review due for ${clientName}`,
    message: `Annual review due on ${new Date(dueDate).toLocaleDateString()}`,
    action_url: `/clients/${clientId}?tab=reviews`,
    priority: 'normal'
  })
}

export async function notifyReviewOverdue(
  userId: string,
  clientId: string,
  clientName: string,
  reviewId: string
): Promise<void> {
  await NotificationService.create({
    user_id: userId,
    client_id: clientId,
    entity_type: 'review',
    entity_id: reviewId,
    type: 'review_overdue',
    title: `Overdue review: ${clientName}`,
    message: `This client's review is overdue. Please schedule immediately.`,
    action_url: `/clients/${clientId}?tab=reviews`,
    priority: 'high'
  })
}

export async function notifyReviewCompleted(
  userId: string,
  clientId: string,
  clientName: string,
  reviewId: string
): Promise<void> {
  await NotificationService.create({
    user_id: userId,
    client_id: clientId,
    entity_type: 'review',
    entity_id: reviewId,
    type: 'review_completed',
    title: `Review completed: ${clientName}`,
    message: `Annual review has been completed successfully`,
    action_url: `/clients/${clientId}?tab=reviews`,
    priority: 'normal'
  })
}

export async function notifyDocumentGenerated(
  userId: string,
  clientId: string,
  clientName: string,
  documentId: string,
  documentName: string
): Promise<void> {
  await NotificationService.create({
    user_id: userId,
    client_id: clientId,
    entity_type: 'document',
    entity_id: documentId,
    type: 'document_generated',
    title: `Document ready: ${documentName}`,
    message: `Report generated for ${clientName}`,
    action_url: `/documents/${documentId}`,
    priority: 'normal'
  })
}

export async function notifySignatureCompleted(
  userId: string,
  clientId: string,
  clientName: string,
  documentId: string,
  documentName: string
): Promise<void> {
  await NotificationService.create({
    user_id: userId,
    client_id: clientId,
    entity_type: 'signature',
    entity_id: documentId,
    type: 'signature_completed',
    title: `Document signed: ${documentName}`,
    message: `${clientName} has signed the document`,
    action_url: `/documents/${documentId}`,
    priority: 'normal'
  })
}

export async function notifyAssessmentCompleted(
  userId: string,
  clientId: string,
  clientName: string,
  assessmentId: string,
  assessmentType: string,
  firmId?: string
): Promise<void> {
  await NotificationService.create({
    user_id: userId,
    firm_id: firmId,
    client_id: clientId,
    entity_type: 'assessment',
    entity_id: assessmentId,
    type: 'assessment_completed',
    title: `Assessment completed: ${clientName}`,
    message: `${assessmentType} assessment has been completed and is ready for review`,
    action_url: `/clients/${clientId}?tab=risk`,
    priority: 'high'
  })
}

export async function notifyClientAdded(
  userId: string,
  clientId: string,
  clientName: string
): Promise<void> {
  await NotificationService.create({
    user_id: userId,
    client_id: clientId,
    entity_type: 'client',
    entity_id: clientId,
    type: 'client_added',
    title: `New client: ${clientName}`,
    message: `Client profile has been created`,
    action_url: `/clients/${clientId}`,
    priority: 'low'
  })
}

export async function notifyComplianceAlert(
  userId: string,
  title: string,
  message: string,
  actionUrl: string,
  clientId?: string
): Promise<void> {
  await NotificationService.create({
    user_id: userId,
    client_id: clientId,
    type: 'compliance_alert',
    title,
    message,
    action_url: actionUrl,
    priority: 'urgent'
  })
}

/**
 * Helper to get user's firm_id for firm-wide notifications
 */
async function getUserFirmId(userId: string): Promise<string | undefined> {
  const supabase = getSupabaseServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', userId)
    .single()
  return profile?.firm_id ?? undefined
}

export async function notifyProfileUpdated(
  userId: string,
  clientId: string,
  clientName: string
): Promise<void> {
  console.log('[Notification] Creating profile_updated notification', { userId, clientId, clientName })
  const supabase = getSupabaseServiceClient()
  let firmId = await getUserFirmId(userId)

  if (!firmId) {
    const { data: clientFirm } = await supabase
      .from('clients')
      .select('firm_id')
      .eq('id', clientId)
      .maybeSingle()
    firmId = clientFirm?.firm_id ?? undefined
  }

  console.log('[Notification] Got firm_id:', firmId)
  const input: CreateNotificationInput = {
    user_id: userId,
    client_id: clientId,
    entity_type: 'client',
    entity_id: clientId,
    type: 'profile_updated',
    title: `Profile updated: ${clientName}`,
    message: `Client profile has been updated`,
    action_url: `/clients/${clientId}`,
    priority: 'low'
  }

  if (firmId) {
    input.firm_id = firmId
  }

  const result = await NotificationService.create(input)
  console.log('[Notification] Result:', result ? 'created' : 'deduplicated or failed')
}

export async function notifyATRCompleted(
  userId: string,
  clientId: string,
  clientName: string,
  assessmentId: string,
  score: number
): Promise<void> {
  const firmId = await getUserFirmId(userId)
  await NotificationService.create({
    user_id: userId,
    firm_id: firmId,
    client_id: clientId,
    entity_type: 'assessment',
    entity_id: assessmentId,
    type: 'atr_completed',
    title: `ATR completed: ${clientName}`,
    message: `Risk assessment completed with score ${score}`,
    action_url: `/clients/${clientId}?tab=risk`,
    priority: 'normal'
  })
}

export async function notifyStressTestCompleted(
  userId: string,
  clientId: string,
  clientName: string,
  testId: string
): Promise<void> {
  const firmId = await getUserFirmId(userId)
  await NotificationService.create({
    user_id: userId,
    firm_id: firmId,
    client_id: clientId,
    entity_type: 'simulation',
    entity_id: testId,
    type: 'stress_test_completed',
    title: `Stress test completed: ${clientName}`,
    message: `Portfolio stress test analysis is ready`,
    action_url: `/clients/${clientId}?tab=stress-testing`,
    priority: 'normal'
  })
}

export async function notifyMonteCarloCompleted(
  userId: string,
  clientId: string,
  clientName: string,
  simulationId: string
): Promise<void> {
  const firmId = await getUserFirmId(userId)
  await NotificationService.create({
    user_id: userId,
    firm_id: firmId,
    client_id: clientId,
    entity_type: 'simulation',
    entity_id: simulationId,
    type: 'monte_carlo_completed',
    title: `Monte Carlo completed: ${clientName}`,
    message: `Portfolio simulation analysis is ready`,
    action_url: `/clients/${clientId}?tab=monte-carlo`,
    priority: 'normal'
  })
}

export async function notifyDocumentDownloaded(
  userId: string,
  clientId: string,
  clientName: string,
  documentId: string,
  documentName: string
): Promise<void> {
  const firmId = await getUserFirmId(userId)
  await NotificationService.create({
    user_id: userId,
    firm_id: firmId,
    client_id: clientId,
    entity_type: 'document',
    entity_id: documentId,
    type: 'document_downloaded',
    title: `Document downloaded: ${documentName}`,
    message: `Document for ${clientName} was downloaded`,
    action_url: `/documents/${documentId}`,
    priority: 'low'
  })
}

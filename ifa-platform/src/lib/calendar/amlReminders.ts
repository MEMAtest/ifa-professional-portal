// lib/calendar/amlReminders.ts
// ================================================================
// AML Review Calendar Reminder Integration
// Creates calendar events for upcoming AML reviews
// ================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import clientLogger from '@/lib/logging/clientLogger'

interface AMLReminderParams {
  clientId: string
  clientName: string
  riskRating: 'low' | 'medium' | 'high'
  nextReviewDate: string  // ISO date string
  reminderDaysBefore?: number  // Default 60
}

// Color coding for AML reminders based on risk
const AML_REMINDER_COLORS = {
  low: '#10B981',    // Green
  medium: '#F59E0B', // Amber
  high: '#EF4444'    // Red
}

/**
 * Creates a calendar reminder event for an upcoming AML review
 * The reminder is created X days before the next review date
 */
export async function createAMLReviewReminder(
  supabase: SupabaseClient,
  params: AMLReminderParams
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const { clientId, clientName, riskRating, nextReviewDate, reminderDaysBefore = 60 } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Calculate reminder date (X days before next review)
    const reviewDate = new Date(nextReviewDate)
    const reminderDate = new Date(reviewDate)
    reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore)

    // Don't create reminder if it's in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (reminderDate < today) {
      // If reminder date is in past but review date is in future, set reminder to today
      if (reviewDate > today) {
        reminderDate.setTime(today.getTime())
      } else {
        // Review is overdue, don't create reminder
        return { success: false, error: 'Review date is in the past' }
      }
    }

    // Set reminder time to 9:00 AM
    reminderDate.setHours(9, 0, 0, 0)

    // Check if a similar reminder already exists (avoid duplicates)
    const existingReminders = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .eq('event_type', 'aml_review_reminder')
      .gte('start_date', new Date().toISOString())

    if (existingReminders.data && existingReminders.data.length > 0) {
      // Update existing reminder instead of creating new one
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({
          title: `AML Review Due: ${clientName}`,
          description: `AML review reminder for ${clientName}.\n\nRisk Rating: ${riskRating.toUpperCase()}\nReview Due: ${reviewDate.toLocaleDateString('en-GB')}\n\nThis client's AML/KYC documentation needs to be reviewed.`,
          start_date: reminderDate.toISOString(),
          end_date: new Date(reminderDate.getTime() + 30 * 60000).toISOString(), // 30 min duration
          color: AML_REMINDER_COLORS[riskRating]
        })
        .eq('id', existingReminders.data[0].id)

      if (updateError) {
        clientLogger.error('Error updating AML reminder:', updateError)
        return { success: false, error: 'Failed to update reminder' }
      }

      return { success: true, eventId: existingReminders.data[0].id }
    }

    // Create new calendar event
    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        client_id: clientId,
        title: `AML Review Due: ${clientName}`,
        description: `AML review reminder for ${clientName}.\n\nRisk Rating: ${riskRating.toUpperCase()}\nReview Due: ${reviewDate.toLocaleDateString('en-GB')}\n\nThis client's AML/KYC documentation needs to be reviewed.`,
        start_date: reminderDate.toISOString(),
        end_date: new Date(reminderDate.getTime() + 30 * 60000).toISOString(), // 30 min duration
        all_day: false,
        event_type: 'aml_review_reminder',
        color: AML_REMINDER_COLORS[riskRating],
        related_entity_type: 'aml_ctf_records',
        reminders: []
      })
      .select()
      .single()

    if (error) {
      clientLogger.error('Error creating AML reminder:', error)
      return { success: false, error: 'Failed to create reminder' }
    }

    return { success: true, eventId: event?.id }
  } catch (error) {
    clientLogger.error('Error in createAMLReviewReminder:', error)
    return { success: false, error: 'Unexpected error creating reminder' }
  }
}

/**
 * Removes existing AML review reminders for a client
 */
export async function removeAMLReviewReminders(
  supabase: SupabaseClient,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .eq('event_type', 'aml_review_reminder')

    if (error) {
      clientLogger.error('Error removing AML reminders:', error)
      return { success: false, error: 'Failed to remove reminders' }
    }

    return { success: true }
  } catch (error) {
    clientLogger.error('Error in removeAMLReviewReminders:', error)
    return { success: false, error: 'Unexpected error removing reminders' }
  }
}

// Default AML settings - used when no custom settings are configured
const DEFAULT_AML_SETTINGS = {
  lowRiskYears: 5,
  mediumRiskYears: 3,
  highRiskYears: 1,
  reminderDaysBefore: 60
}

/**
 * Get AML settings from compliance_rules table or firm settings
 * Returns defaults if table doesn't exist or no settings are configured
 */
export async function getAMLSettings(
  supabase: SupabaseClient
): Promise<{
  lowRiskYears: number
  mediumRiskYears: number
  highRiskYears: number
  reminderDaysBefore: number
}> {
  // Try to fetch from compliance_rules first
  try {
    const { data, error } = await supabase
      .from('compliance_rules')
      .select('configuration')
      .eq('rule_name', 'AML Review Settings')
      .eq('is_active', true)
      .maybeSingle() // Use maybeSingle instead of single to avoid error when no rows found

    // If table doesn't exist (406 error) or other errors, silently use defaults
    if (error) {
      // 406 typically means table doesn't exist - this is expected in some setups
      if (error.code === '42P01' || error.message?.includes('406')) {
      }
      return DEFAULT_AML_SETTINGS
    }

    if (data?.configuration) {
      const config = data.configuration as Record<string, number>
      return {
        lowRiskYears: config.lowRiskYears || DEFAULT_AML_SETTINGS.lowRiskYears,
        mediumRiskYears: config.mediumRiskYears || DEFAULT_AML_SETTINGS.mediumRiskYears,
        highRiskYears: config.highRiskYears || DEFAULT_AML_SETTINGS.highRiskYears,
        reminderDaysBefore: config.reminderDaysBefore || DEFAULT_AML_SETTINGS.reminderDaysBefore
      }
    }
  } catch (error: any) {
    // Silently handle table not found errors
    if (error?.code !== '42P01') {
      console.warn('Error fetching AML settings, using defaults:', error?.message || error)
    }
  }

  // Return defaults if no settings found or any error occurred
  return DEFAULT_AML_SETTINGS
}

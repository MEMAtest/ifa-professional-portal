import type { SupabaseClient } from '@supabase/supabase-js'
import type { CalendarEvent, CommunicationClient, CommunicationItem } from '@/components/communication/types'
import { mapCalendarEvents, mapCommunicationItems } from '@/lib/communication/mappers'

export const fetchCommunications = async (
  supabase: SupabaseClient,
  signal?: AbortSignal
): Promise<CommunicationItem[]> => {
  let query = supabase
    .from('client_communications')
    .select(`
      *,
      clients!inner(
        id,
        client_ref,
        personal_details,
        contact_info
      )
    `)
    .in('communication_type', ['call', 'email'])
    .order('communication_date', { ascending: false })
    .limit(200)

  if (signal) {
    query = query.abortSignal(signal)
  }

  const { data, error } = await query
  if (error) throw error
  return mapCommunicationItems(data || [])
}

export const fetchCommunicationClients = async (
  supabase: SupabaseClient,
  signal?: AbortSignal
): Promise<CommunicationClient[]> => {
  let query = supabase
    .from('clients')
    .select('id, client_ref, personal_details, contact_info')
    .order('personal_details->firstName')

  if (signal) {
    query = query.abortSignal(signal)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as CommunicationClient[]
}

export const fetchCalendarEventsForMonth = async (
  supabase: SupabaseClient,
  userId: string,
  monthDate: Date
): Promise<CalendarEvent[]> => {
  const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), -7)
  const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 2, 7)

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      clients!calendar_events_client_id_fkey (
        id,
        client_ref,
        personal_details
      )
    `)
    .eq('user_id', userId)
    .gte('start_date', startDate.toISOString())
    .lte('start_date', endDate.toISOString())
    .order('start_date', { ascending: true })

  if (error) throw error
  return mapCalendarEvents(data || [])
}

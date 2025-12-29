import type { CalendarEvent, CommunicationItem } from '@/components/communication/types'

export const mapCommunicationItems = (rows: any[]): CommunicationItem[] => {
  return rows.map((comm: any) => {
    const personalDetails = (comm.clients?.personal_details || {}) as Record<string, string>
    return {
      id: comm.id,
      client_id: comm.client_id,
      client_name: `${personalDetails.firstName || ''} ${personalDetails.lastName || ''}`.trim() || 'Unknown Client',
      client_ref: comm.clients?.client_ref || '',
      communication_type: comm.communication_type,
      subject: comm.subject || (comm.communication_type === 'call' ? 'Phone Call' : 'Email'),
      summary: comm.summary || '',
      communication_date: comm.communication_date,
      direction: comm.direction || 'outbound',
      contact_method: comm.contact_method || comm.communication_type,
      requires_followup: comm.requires_followup || false,
      followup_date: comm.followup_date,
      followup_completed: comm.followup_completed || false,
      created_at: comm.created_at
    }
  })
}

export const mapCalendarEvents = (rows: any[]): CalendarEvent[] => {
  return rows.map((event: any) => {
    const duration = event.end_date
      ? Math.round((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / 60000)
      : 60

    const personalDetails = (event.clients?.personal_details || {}) as Record<string, string>

    return {
      id: event.id,
      title: event.title,
      date: new Date(event.start_date).toISOString().split('T')[0],
      time: new Date(event.start_date).toTimeString().slice(0, 5),
      duration,
      clientId: event.client_id || '',
      clientName: event.clients
        ? `${personalDetails?.firstName || ''} ${personalDetails?.lastName || ''}`.trim() || 'Unknown Client'
        : 'Unknown Client',
      type: event.event_type || 'meeting',
      notes: event.description || '',
      color: event.color || '#6B7280',
      eventType: event.event_type || undefined
    }
  })
}

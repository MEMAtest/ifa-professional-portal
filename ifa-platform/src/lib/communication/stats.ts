import type { CalendarEvent, CommunicationItem, CommunicationStats } from '@/components/communication/types'

export const calculateCommunicationStats = (
  items: CommunicationItem[]
): Pick<CommunicationStats, 'messages' | 'calls' | 'followUpsNeeded' | 'todayItems'> => {
  const today = new Date().toDateString()
  const calls = items.filter((item) => item.communication_type === 'call')
  const emails = items.filter((item) => item.communication_type === 'email')
  const followUps = items.filter((item) => item.requires_followup && !item.followup_completed)
  const todayItems = items.filter((item) => new Date(item.communication_date).toDateString() === today)

  return {
    calls: calls.length,
    messages: emails.length,
    followUpsNeeded: followUps.length,
    todayItems: todayItems.length
  }
}

export const calculateUpcomingMeetings = (events: CalendarEvent[]) => {
  const now = new Date()
  return events.filter((event) => new Date(`${event.date}T${event.time}`) >= now).length
}

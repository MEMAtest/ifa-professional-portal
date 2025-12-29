import type { CalendarEvent } from '@/components/communication/types'

export type CalendarDay = { date: Date; isCurrentMonth: boolean }

export const getDaysInMonth = (date: Date): CalendarDay[] => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const days: CalendarDay[] = []

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i)
    days.push({ date: prevDate, isCurrentMonth: false })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true })
  }

  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
  }

  return days
}

export const getEventsForDate = (date: Date, events: CalendarEvent[]) => {
  const dateStr = date.toISOString().split('T')[0]
  return events.filter((event) => event.date === dateStr)
}

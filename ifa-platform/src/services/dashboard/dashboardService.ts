import type { Client } from '@/types/client'
import type { ActivityItem, WeeklyStats } from '@/components/dashboard/types'
import type { DashboardEvent, UpcomingEventsFilter } from '@/lib/dashboard/types'
import {
  mapActivityLogEntries,
  mapUpcomingReviews,
  transformClientData
} from '@/lib/dashboard/data'

const emptyWeeklyStats = (): WeeklyStats => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const now = new Date()
  const emptyChart = days.map((day, index) => ({
    day,
    value: 0,
    date: new Date(now.getTime() - (6 - index) * 24 * 60 * 60 * 1000).toISOString()
  }))
  return {
    clientsChart: emptyChart,
    assessmentsChart: emptyChart.map(d => ({ ...d })),
    documentsChart: emptyChart.map(d => ({ ...d })),
    monteCarloChart: emptyChart.map(d => ({ ...d })),
  }
}

export const fetchClients = async (limit = 1000): Promise<Client[]> => {
  try {
    const response = await fetch(`/api/clients?limit=${limit}`)
    if (!response.ok) return []
    const data = await response.json()
    const rawClients = data.clients || data || []
    return rawClients.map(transformClientData)
  } catch (error) {
    console.error('Error fetching clients:', error)
    return []
  }
}

export const fetchWeeklyActivity = async (): Promise<WeeklyStats> => {
  try {
    const response = await fetch('/api/dashboard/weekly-activity')
    if (!response.ok) {
      return emptyWeeklyStats()
    }

    const data = await response.json()
    return data.weeklyStats
  } catch (error) {
    console.error('Error fetching weekly activity:', error)
    return emptyWeeklyStats()
  }
}

export const fetchUpcomingEvents = async (
  limit: number,
  filter: UpcomingEventsFilter
): Promise<DashboardEvent[]> => {
  try {
    const response = await fetch(`/api/reviews/upcoming?limit=${limit}&filter=${filter}`)
    if (!response.ok) {
      console.error('Failed to fetch upcoming events')
      return []
    }
    const data = await response.json()
    return mapUpcomingReviews(data.data || [])
  } catch (error) {
    console.error('Error fetching upcoming events:', error)
    return []
  }
}

export const fetchAssessmentStats = async (): Promise<{ due: number }> => {
  try {
    const response = await fetch('/api/assessments/incomplete?limit=100')
    if (!response.ok) {
      return { due: 0 }
    }
    const data = await response.json()
    return { due: data.count || 0 }
  } catch (error) {
    console.error('Error fetching assessment stats:', error)
    return { due: 0 }
  }
}

export const fetchRecentActivities = async (): Promise<ActivityItem[]> => {
  try {
    const response = await fetch('/api/activity-log?recent=true&limit=20')
    if (!response.ok) {
      console.error('Failed to fetch recent activities')
      return []
    }
    const data = await response.json()
    return mapActivityLogEntries(data.data || [])
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return []
  }
}

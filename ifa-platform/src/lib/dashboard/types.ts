import type { DashboardStats } from '@/components/dashboard/types'

export type UpcomingEventsFilter = 'outstanding' | 'overdue' | 'due_7' | 'due_30'
export type DashboardEvent = DashboardStats['upcomingEvents'][number]

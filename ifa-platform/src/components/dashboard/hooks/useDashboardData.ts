import { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardStats } from '@/components/dashboard/types'
import type { UpcomingEventsFilter } from '@/lib/dashboard/types'
import {
  calculateClientDistribution,
  calculateClientStatistics,
  calculatePerformanceData
} from '@/lib/dashboard/data'
import clientLogger from '@/lib/logging/clientLogger'
import {
  fetchAssessmentStats,
  fetchClients,
  fetchRecentActivities,
  fetchUpcomingEvents,
  fetchWeeklyActivity
} from '@/services/dashboard/dashboardService'

const createInitialStats = (): DashboardStats => ({
  totalClients: 0,
  totalAUM: 0,
  assessmentsDue: 0,
  complianceScore: 0,
  recentActivity: [],
  weeklyStats: {
    clientsChart: [],
    assessmentsChart: [],
    documentsChart: [],
    monteCarloChart: []
  },
  thisWeek: {
    clientsOnboarded: 0,
    assessmentsCompleted: 0,
    documentsGenerated: 0,
    monteCarloRuns: 0
  },
  clientDistribution: {
    riskProfile: [],
    ageGroups: [],
    portfolioSizes: [],
    regionDistribution: []
  },
  performance: {
    aumGrowth: [],
    complianceHistory: []
  },
  upcomingEvents: []
})

interface UseDashboardDataOptions {
  upcomingEventsFilter: UpcomingEventsFilter
  upcomingEventsLimit?: number
}

export const useDashboardData = ({
  upcomingEventsFilter,
  upcomingEventsLimit = 20
}: UseDashboardDataOptions) => {
  const [stats, setStats] = useState<DashboardStats>(createInitialStats())
  const [loading, setLoading] = useState(true)
  const upcomingEventsInitialized = useRef(false)

  const fetchDashboardData = useCallback(async (filter: UpcomingEventsFilter) => {
    try {
      setLoading(true)

      const allClients = await fetchClients(1000)
      const clientStats = calculateClientStatistics(allClients)

      const [weeklyActivity, assessmentData, upcomingEvents, recentActivities] = await Promise.all([
        fetchWeeklyActivity(),
        fetchAssessmentStats(),
        fetchUpcomingEvents(upcomingEventsLimit, filter),
        fetchRecentActivities()
      ])

      const clientDistribution = calculateClientDistribution(allClients)
      const performanceData = calculatePerformanceData(allClients)

      setStats({
        ...clientStats,
        weeklyStats: weeklyActivity,
        clientDistribution,
        performance: performanceData,
        upcomingEvents,
        thisWeek: {
          clientsOnboarded: weeklyActivity.clientsChart.reduce((sum, day) => sum + day.value, 0),
          assessmentsCompleted: weeklyActivity.assessmentsChart.reduce((sum, day) => sum + day.value, 0),
          documentsGenerated: weeklyActivity.documentsChart.reduce((sum, day) => sum + day.value, 0),
          monteCarloRuns: weeklyActivity.monteCarloChart.reduce((sum, day) => sum + day.value, 0)
        },
        assessmentsDue: assessmentData.due,
        recentActivity: recentActivities.slice(0, 10)
      })
    } catch (error) {
      clientLogger.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [upcomingEventsLimit])

  useEffect(() => {
    fetchDashboardData(upcomingEventsFilter)
  }, [fetchDashboardData, upcomingEventsFilter])

  useEffect(() => {
    if (!upcomingEventsInitialized.current) {
      upcomingEventsInitialized.current = true
      return
    }

    const refreshUpcomingEvents = async () => {
      const upcomingEvents = await fetchUpcomingEvents(upcomingEventsLimit, upcomingEventsFilter)
      setStats((current) => ({
        ...current,
        upcomingEvents
      }))
    }

    refreshUpcomingEvents()
  }, [upcomingEventsFilter, upcomingEventsLimit])

  const refresh = useCallback(async () => {
    await fetchDashboardData(upcomingEventsFilter)
  }, [fetchDashboardData, upcomingEventsFilter])

  return { stats, loading, refresh }
}

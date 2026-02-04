import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import clientLogger from '@/lib/logging/clientLogger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CalendarEvent,
  CommunicationClient,
  CommunicationItem,
  CommunicationStats
} from '@/components/communication/types'
import { calculateCommunicationStats, calculateUpcomingMeetings } from '@/lib/communication/stats'
import {
  fetchCalendarEventsForMonth,
  fetchCommunicationClients,
  fetchCommunications
} from '@/services/communication/communicationService'

interface UseCommunicationHubDataOptions {
  supabase: SupabaseClient
  userId?: string
}

const initialStats: CommunicationStats = {
  totalCommunications: 0,
  messages: 0,
  calls: 0,
  upcomingMeetings: 0,
  followUpsNeeded: 0,
  todayItems: 0
}

export const useCommunicationHubData = ({ supabase, userId }: UseCommunicationHubDataOptions) => {
  const { toast } = useToast()
  const isMountedRef = useRef(true)
  const [communications, setCommunications] = useState<CommunicationItem[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [clients, setClients] = useState<CommunicationClient[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CommunicationStats>(initialStats)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Store refs for stable function references - prevents stale closures
  const supabaseRef = useRef(supabase)
  const userIdRef = useRef(userId)
  const currentDateRef = useRef(currentDate)
  const toastRef = useRef(toast)

  // Update refs when values change
  supabaseRef.current = supabase
  userIdRef.current = userId
  currentDateRef.current = currentDate
  toastRef.current = toast

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const [items, clientData] = await Promise.all([
        fetchCommunications(supabaseRef.current, signal),
        fetchCommunicationClients(supabaseRef.current, signal)
      ])

      // Check if request was aborted
      if (signal?.aborted) return

      const statsUpdate = calculateCommunicationStats(items)
      setCommunications(items)
      setClients(clientData)
      setStats((prev) => ({
        ...prev,
        totalCommunications: items.length,
        calls: statsUpdate.calls,
        messages: statsUpdate.messages,
        followUpsNeeded: statsUpdate.followUpsNeeded,
        todayItems: statsUpdate.todayItems
      }))
    } catch (error) {
      // Don't process aborted requests
      if ((error as Error).name === 'AbortError' || signal?.aborted) return
      clientLogger.error('Error loading data:', error)
      toastRef.current({
        title: 'Error',
        description: 'Failed to load communication data',
        variant: 'destructive'
      })
    } finally {
      // Always set loading to false unless aborted
      // React 18 safely handles setState on unmounted components
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, []) // No dependencies - uses refs for stability

  const loadCalendarEventsForMonth = useCallback(async (monthDate: Date) => {
    if (!userIdRef.current || !isMountedRef.current) return

    try {
      const events = await fetchCalendarEventsForMonth(supabaseRef.current, userIdRef.current, monthDate)
      if (!isMountedRef.current) return

      setCalendarEvents(events)
      setStats((prev) => ({
        ...prev,
        upcomingMeetings: calculateUpcomingMeetings(events)
      }))
    } catch (error) {
      if (!isMountedRef.current) return
      clientLogger.error('Error loading calendar events:', error)
    }
  }, [])

  const refresh = useCallback(async () => {
    await loadData()
    await loadCalendarEventsForMonth(currentDateRef.current)
  }, [loadCalendarEventsForMonth, loadData])

  // Initial data load - runs when userId becomes available
  // Uses AbortController to properly handle React Strict Mode double-invocation
  useEffect(() => {
    if (!userId) {
      // No user yet - ensure loading is false so we don't show spinner indefinitely
      setLoading(false)
      return
    }

    // Create abort controller for this effect instance
    const controller = new AbortController()
    isMountedRef.current = true

    // Load data on mount
    const init = async () => {
      try {
        await loadData(controller.signal)
        // Only continue to calendar if not aborted
        if (!controller.signal.aborted) {
          await loadCalendarEventsForMonth(currentDateRef.current)
        }
      } catch (error) {
        // Ignore abort errors
        if ((error as Error).name !== 'AbortError') {
          clientLogger.error('Error in init:', error)
        }
      }
    }
    init()

    return () => {
      // Abort any in-flight requests when effect cleanup runs
      controller.abort()
      isMountedRef.current = false
    }
  }, [userId, loadData, loadCalendarEventsForMonth])

  const handleMonthChange = useCallback(async (newDate: Date) => {
    setCurrentDate(newDate)
    await loadCalendarEventsForMonth(newDate)
  }, [loadCalendarEventsForMonth])

  return {
    communications,
    calendarEvents,
    clients,
    loading,
    stats,
    currentDate,
    selectedDate,
    setSelectedDate,
    handleMonthChange,
    refresh
  }
}

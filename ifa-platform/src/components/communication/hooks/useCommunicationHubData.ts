import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
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
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const [items, clientData] = await Promise.all([
        fetchCommunications(supabase, signal),
        fetchCommunicationClients(supabase, signal)
      ])

      if (signal?.aborted || !isMountedRef.current) return

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
      if ((error as Error).name === 'AbortError') return
      if (!isMountedRef.current) return
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load communication data',
        variant: 'destructive'
      })
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [supabase, toast])

  const loadCalendarEventsForMonth = useCallback(async (monthDate: Date) => {
    if (!userId || !isMountedRef.current) return

    try {
      const events = await fetchCalendarEventsForMonth(supabase, userId, monthDate)
      if (!isMountedRef.current) return

      setCalendarEvents(events)
      setStats((prev) => ({
        ...prev,
        upcomingMeetings: calculateUpcomingMeetings(events)
      }))
    } catch (error) {
      if (!isMountedRef.current) return
      console.error('Error loading calendar events:', error)
    }
  }, [supabase, userId])

  const refresh = useCallback(async () => {
    await loadData()
    await loadCalendarEventsForMonth(currentDate)
  }, [currentDate, loadCalendarEventsForMonth, loadData])

  useEffect(() => {
    if (!userId) return
    isMountedRef.current = true

    refresh()

    return () => {
      isMountedRef.current = false
    }
  }, [refresh, userId])

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

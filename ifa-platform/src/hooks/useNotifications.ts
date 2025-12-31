'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import type { Notification, NotificationsResponse } from '@/types/notifications'
import { getSupabaseAuthHeaders } from '@/lib/auth/clientAuth'

type RealtimeSubscribeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'
export type NotificationsConnectionMode = 'realtime' | 'polling'

interface UseNotificationsOptions {
  enableRealtime?: boolean
  limit?: number
  pollIntervalMs?: number
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { enableRealtime = true, limit = 20, pollIntervalMs = 30_000 } = options
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionMode, setConnectionMode] = useState<NotificationsConnectionMode>(
    enableRealtime ? 'realtime' : 'polling'
  )
  const [realtimeRetryNonce, setRealtimeRetryNonce] = useState(0)

  // Track if we've initialized to prevent duplicate subscriptions
  const initializedRef = useRef(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const realtimeUnavailableRef = useRef(false)
  const processedIdsRef = useRef<Set<string>>(new Set())
  const toastedIdsRef = useRef<Set<string>>(new Set())
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const realtimeFailuresRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 })
  const hasLoadedOnceRef = useRef(false)
  const realtimeTeardownStartedRef = useRef(false)
  const backfillTriggeredRef = useRef(false)

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit | undefined> => {
    return getSupabaseAuthHeaders(supabase)
  }, [supabase])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const stopSyncTimer = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      setTotal(0)
      setLoading(false)
      return
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)

      const headers = await getAuthHeaders()

      const response = await fetch(`/api/notifications?limit=${limit}`, {
        signal: controller.signal,
        credentials: 'include',
        headers
      })

      clearTimeout(timeout)
      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? ''
        let message = `Failed to fetch notifications (${response.status})`
        try {
          if (contentType.includes('application/json')) {
            const body = (await response.json()) as { error?: string; message?: string; code?: string }
            message = body.error || body.message || message
            if (body.code) message = `${message} (${body.code})`
          } else {
            const text = await response.text()
            if (text) message = text
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message)
      }

      const data: NotificationsResponse = await response.json()
      const fetchedNotifications = data.notifications ?? []
      const knownIds = processedIdsRef.current
      const newlyFetched = fetchedNotifications.filter((n) => n?.id && !knownIds.has(n.id))

      setNotifications(fetchedNotifications)
      setUnreadCount(data.unread ?? 0)
      setTotal(data.total ?? 0)
      setError(null)

      for (const n of fetchedNotifications) {
        if (n?.id) knownIds.add(n.id)
      }
      if (knownIds.size > 2000) {
        processedIdsRef.current = new Set(fetchedNotifications.map((n) => n.id).filter(Boolean))
      }

      const shouldToastFromPolling =
        hasLoadedOnceRef.current &&
        (typeof document !== 'undefined' && document.visibilityState === 'visible') &&
        (!enableRealtime || realtimeUnavailableRef.current)

      if (shouldToastFromPolling && newlyFetched.length > 0) {
        const toastable = newlyFetched.filter((n) => n?.id && !toastedIdsRef.current.has(n.id))

        for (const n of toastable) {
          toastedIdsRef.current.add(n.id)
        }
        if (toastedIdsRef.current.size > 2000) toastedIdsRef.current.clear()

        if (toastable.length === 1) {
          const n = toastable[0]
          toast({
            title: n.title,
            description: n.message ?? undefined,
            variant: n.priority === 'urgent' ? 'destructive' : 'default'
          })
        } else if (toastable.length > 1) {
          const hasUrgent = toastable.some((n) => n.priority === 'urgent')
          toast({
            title: `${toastable.length} new notifications`,
            description: 'Open notifications to view.',
            variant: hasUrgent ? 'destructive' : 'default'
          })
        }
      }

      hasLoadedOnceRef.current = true
    } catch (err) {
      // Silently ignore AbortError (timeout or component unmount)
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [user?.id, limit, getAuthHeaders, enableRealtime, toast])

  useEffect(() => {
    if (!user?.id || backfillTriggeredRef.current) return
    backfillTriggeredRef.current = true

    const runBackfill = async () => {
      try {
        const headers = await getAuthHeaders()
        await fetch('/api/notifications/backfill-profile-updates', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(headers || {})
          },
          body: JSON.stringify({ days: 2 })
        })
        await fetchNotifications()
      } catch (err) {
        console.warn('Notification backfill skipped:', err)
      }
    }

    void runBackfill()
  }, [user?.id, getAuthHeaders, fetchNotifications])

  const startPolling = useCallback(() => {
    if (pollIntervalMs <= 0) return
    if (pollingRef.current) return
    void fetchNotifications()
    pollingRef.current = setInterval(() => {
      void fetchNotifications()
    }, pollIntervalMs)
  }, [pollIntervalMs, fetchNotifications])

  const scheduleSync = useCallback(() => {
    if (syncTimeoutRef.current) return
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null
      void fetchNotifications()
    }, 750)
  }, [fetchNotifications])

  const attemptRealtimeReconnect = useCallback(() => {
    if (!enableRealtime || !user?.id) return
    if (!realtimeUnavailableRef.current) return

    const now = Date.now()
    const { count, lastAt } = realtimeFailuresRef.current
    if (count >= 3) return
    if (now - lastAt < 60_000) return

    // Best-effort cleanup of the previous channel before we try again.
    if (channelRef.current) {
      try {
        const result = supabase.removeChannel(channelRef.current)
        Promise.resolve(result).catch(() => {
          // ignore
        })
      } catch {
        // ignore
      } finally {
        channelRef.current = null
      }
    }

    realtimeUnavailableRef.current = false
    initializedRef.current = false
    realtimeTeardownStartedRef.current = false
    stopPolling()
    setRealtimeRetryNonce((v) => v + 1)
  }, [enableRealtime, user?.id, stopPolling, supabase])

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, read: true, read_at: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        scheduleSync()
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [scheduleSync, getAuthHeaders])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
        headers
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
        )
        setUnreadCount(0)
        scheduleSync()
      }
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }, [scheduleSync, getAuthHeaders])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      })

      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        setTotal(prev => prev - 1)
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
        scheduleSync()
      }
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }, [notifications, scheduleSync, getAuthHeaders])

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
    }
  }, [user?.id, fetchNotifications])

  // Reset realtime/polling state when user changes
  useEffect(() => {
    realtimeUnavailableRef.current = false
    realtimeFailuresRef.current = { count: 0, lastAt: 0 }
    processedIdsRef.current = new Set()
    toastedIdsRef.current = new Set()
    hasLoadedOnceRef.current = false
    realtimeTeardownStartedRef.current = false
    stopPolling()
    stopSyncTimer()
    setConnectionMode(enableRealtime ? 'realtime' : 'polling')
  }, [user?.id, enableRealtime, stopPolling, stopSyncTimer])

  // Polling fallback (realtime disabled or unavailable)
  useEffect(() => {
    if (!user?.id) return
    if (!enableRealtime || realtimeUnavailableRef.current) {
      setConnectionMode('polling')
      startPolling()
      return () => stopPolling()
    }
    stopPolling()
  }, [enableRealtime, user?.id, startPolling, stopPolling])

  // Realtime reconnect triggers (when in polling mode due to a failure).
  useEffect(() => {
    if (!enableRealtime || !user?.id) return

    const handleOnline = () => attemptRealtimeReconnect()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') attemptRealtimeReconnect()
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [enableRealtime, user?.id, attemptRealtimeReconnect])

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime || !user?.id || initializedRef.current || realtimeUnavailableRef.current) return

    initializedRef.current = true
    setConnectionMode('realtime')

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: RealtimePostgresChangesPayload<Notification & Record<string, any>>) => {
          const newNotification = payload.new as Notification
          if (!newNotification?.id) return
          if (processedIdsRef.current.has(newNotification.id)) return
          processedIdsRef.current.add(newNotification.id)

          // Add to list
          setNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)].slice(0, limit))
          setUnreadCount(prev => prev + (newNotification.read ? 0 : 1))
          setTotal(prev => prev + 1)

          // Show toast for new notification
          if (!toastedIdsRef.current.has(newNotification.id)) {
            toastedIdsRef.current.add(newNotification.id)
            if (toastedIdsRef.current.size > 2000) toastedIdsRef.current.clear()
            toast({
              title: newNotification.title,
              description: newNotification.message ?? undefined,
              variant: newNotification.priority === 'urgent' ? 'destructive' : 'default'
            })
          }

          scheduleSync()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: RealtimePostgresChangesPayload<Notification & Record<string, any>>) => {
          const updated = payload.new as Notification
          if (updated?.id) processedIdsRef.current.add(updated.id)
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          )
          scheduleSync()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload: RealtimePostgresChangesPayload<{ id: string } & Record<string, any>>) => {
          const deleted = payload.old as { id: string }
          setNotifications(prev => prev.filter(n => n.id !== deleted.id))
          scheduleSync()
        }
      )
      .subscribe((status: RealtimeSubscribeStatus, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          realtimeUnavailableRef.current = false
          realtimeFailuresRef.current = { count: 0, lastAt: 0 }
          realtimeTeardownStartedRef.current = false
          setConnectionMode('realtime')
          stopPolling()
          return
        }

        // Firefox can throw "too much recursion" if we remove/unsubscribe within the subscribe callback
        // and then react to the resulting "CLOSED" status by removing again.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (realtimeTeardownStartedRef.current) return
          realtimeTeardownStartedRef.current = true

          if (err) console.warn('[useNotifications] realtime subscribe error', err)
          realtimeUnavailableRef.current = true
          realtimeFailuresRef.current = {
            count: realtimeFailuresRef.current.count + 1,
            lastAt: Date.now()
          }
          setConnectionMode('polling')
          startPolling()

          // Remove channel asynchronously to avoid re-entrancy/recursion in realtime-js.
          setTimeout(() => {
            try {
              const result = supabase.removeChannel(channel)
              Promise.resolve(result).catch(() => {
                // ignore
              })
            } catch {
              // ignore
            } finally {
              if (channelRef.current === channel) channelRef.current = null
            }
          }, 0)
          return
        }

        if (status === 'CLOSED') {
          // CLOSED can be emitted after we already initiated teardown; don't re-remove.
          if (realtimeUnavailableRef.current) return
          realtimeUnavailableRef.current = true
          realtimeFailuresRef.current = {
            count: realtimeFailuresRef.current.count + 1,
            lastAt: Date.now()
          }
          setConnectionMode('polling')
          startPolling()
        }
      })

    channelRef.current = channel

    return () => {
      initializedRef.current = false
      stopPolling()
      stopSyncTimer()
      if (channelRef.current) {
        try {
          const result = supabase.removeChannel(channelRef.current)
          Promise.resolve(result).catch(() => {
            // ignore
          })
        } catch {
          // ignore
        }
        channelRef.current = null
      }
    }
  }, [enableRealtime, user?.id, supabase, toast, limit, startPolling, stopPolling, scheduleSync, stopSyncTimer, realtimeRetryNonce])

  return {
    notifications,
    unreadCount,
    total,
    loading,
    error,
    connectionMode,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  }
}

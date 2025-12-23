'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell,
  Calendar,
  FileText,
  CheckSquare,
  AlertTriangle,
  UserPlus,
  Award,
  Shield,
  Clock,
  PenTool,
  FileCheck,
  ClipboardCheck,
  CheckCircle,
  Trash2,
  Check,
  Loader2
} from 'lucide-react'
import { useNotificationsContext } from '@/components/notifications/NotificationsProvider'
import { Button } from '@/components/ui/Button'
import type { Notification, NotificationType } from '@/types/notifications'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseAuthHeaders } from '@/lib/auth/clientAuth'

const PAGE_SIZE = 50

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  client_added: UserPlus,
  review_due: Calendar,
  review_overdue: AlertTriangle,
  review_completed: CheckCircle,
  document_generated: FileText,
  document_ready: FileCheck,
  signature_requested: PenTool,
  signature_completed: CheckSquare,
  signature_reminder: Clock,
  assessment_submitted: ClipboardCheck,
  assessment_completed: Award,
  compliance_alert: Shield,
  system: Bell
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600'
}

export default function NotificationsPage() {
  const supabase = createClient()

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit | undefined> => {
    return getSupabaseAuthHeaders(supabase)
  }, [supabase])
  const {
    notifications: recentNotifications,
    unreadCount,
    total,
    error: providerError,
    connectionMode,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch
  } = useNotificationsContext()

  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [seeding, setSeeding] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [newCount, setNewCount] = useState(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.read) {
      // Optimistic UI update for the list; global counts reconcile via hook sync.
      if (filter === 'unread') {
        setItems((prev) => prev.filter((n) => n.id !== notification.id))
      } else {
        setItems((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true, read_at: new Date().toISOString() } : n
          )
        )
      }
      await markAsRead(notification.id)
    }
  }

  const fetchPage = useCallback(async (before?: string | null) => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE)
    })
    if (before) params.set('before', before)
    if (filter === 'unread') params.set('unread_only', 'true')

    const headers = await getAuthHeaders()

    const response = await fetch(`/api/notifications?${params.toString()}`, {
      credentials: 'include',
      headers
    })
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

    const data = (await response.json()) as { notifications?: Notification[] }
    return data.notifications ?? []
  }, [filter, getAuthHeaders])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setListError(null)
    setNewCount(0)
    try {
      const firstPage = await fetchPage(null)
      setItems(firstPage)
      setNextBefore(firstPage.length > 0 ? firstPage[firstPage.length - 1].created_at : null)
      setHasMore(firstPage.length === PAGE_SIZE)
    } catch (e) {
      console.error('Failed to load notifications page:', e)
      setListError(e instanceof Error ? e.message : 'Failed to load notifications')
      setItems([])
      setNextBefore(null)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextBefore) return
    setLoadingMore(true)
    setListError(null)
    try {
      const more = await fetchPage(nextBefore)
      setItems((prev) => {
        const existing = new Set(prev.map((n) => n.id))
        const appended = more.filter((n) => !existing.has(n.id))
        return [...prev, ...appended]
      })
      setNextBefore(more.length > 0 ? more[more.length - 1].created_at : nextBefore)
      setHasMore(more.length === PAGE_SIZE)
    } catch (e) {
      console.error('Failed to load more notifications:', e)
      setListError(e instanceof Error ? e.message : 'Failed to load more notifications')
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loadingMore, nextBefore])

  useEffect(() => {
    void loadInitial()
  }, [loadInitial])

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return
    if (!hasMore) return

    const element = sentinelRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore()
        }
      },
      { rootMargin: '250px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  // If new notifications arrive while user is not at top, show a banner instead of jumping the list.
  useEffect(() => {
    if (filter !== 'all') return
    if (items.length === 0) return
    if (recentNotifications.length === 0) return
    if (typeof window === 'undefined') return

    const topId = items[0]?.id
    if (!topId) return

    const idx = recentNotifications.findIndex((n) => n.id === topId)
    if (idx <= 0) {
      setNewCount(0)
      return
    }

    const isAtTop = window.scrollY < 80
    if (isAtTop) {
      const toPrepend = recentNotifications.slice(0, idx)
      setItems((prev) => {
        const existing = new Set(prev.map((n) => n.id))
        const fresh = toPrepend.filter((n) => !existing.has(n.id))
        return fresh.length > 0 ? [...fresh, ...prev] : prev
      })
      setNewCount(0)
      return
    }

    setNewCount(idx)
  }, [filter, items, recentNotifications])

  const handleShowNew = () => {
    if (filter !== 'all' || newCount <= 0) return
    const toPrepend = recentNotifications.slice(0, newCount)
    setItems((prev) => {
      const existing = new Set(prev.map((n) => n.id))
      const fresh = toPrepend.filter((n) => !existing.has(n.id))
      return fresh.length > 0 ? [...fresh, ...prev] : prev
    })
    setNewCount(0)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    if (filter === 'unread') {
      setItems([])
      setHasMore(false)
      setNextBefore(null)
    } else {
      setItems((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })))
    }
  }

  const handleSeed = async () => {
    if (!isDev || seeding) return
    setSeeding(true)
    setListError(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/notifications/dev/seed', {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? ''
        let message = `Seed failed (${res.status})`
        try {
          if (contentType.includes('application/json')) {
            const body = (await res.json()) as { error?: string; message?: string; code?: string }
            message = body.error || body.message || message
            if (body.code) message = `${message} (${body.code})`
          } else {
            const text = await res.text()
            if (text) message = text
          }
        } catch {
          // ignore
        }
        throw new Error(message)
      }
      await refetch()
      await loadInitial()
    } catch (e) {
      console.error('Failed to seed notification:', e)
      setListError(e instanceof Error ? e.message : 'Failed to seed notification')
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} | {total} total
          </p>
          {connectionMode === 'polling' && (
            <p className="text-xs text-amber-700 mt-1">
              Live updates unavailable — refreshing automatically.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                filter === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                filter === 'unread' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          {isDev && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2"
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Seed notification
            </Button>
          )}
        </div>
      </div>

      {(listError || providerError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {listError ?? providerError}
        </div>
      )}

      {newCount > 0 && (
        <button
          type="button"
          onClick={handleShowNew}
          className="mb-4 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800 hover:bg-blue-100 transition-colors"
        >
          {newCount} new notification{newCount === 1 ? '' : 's'} — click to show
        </button>
      )}

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {items.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm mt-1">
              {filter === 'unread' ? 'All notifications have been read' : 'You have no notifications yet'}
            </p>
          </div>
        ) : (
          items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => handleMarkAsRead(notification)}
              onDelete={async () => {
                setItems((prev) => prev.filter((n) => n.id !== notification.id))
                await deleteNotification(notification.id)
              }}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-center py-6">
        {hasMore ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="flex items-center gap-2"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        ) : (
          <p className="text-sm text-gray-400">You’re up to date.</p>
        )}
      </div>

      <div ref={sentinelRef} />
    </div>
  )
}

interface NotificationRowProps {
  notification: Notification
  onMarkAsRead: () => void
  onDelete: () => void
}

function NotificationRow({ notification, onMarkAsRead, onDelete }: NotificationRowProps) {
  const Icon = ICONS[notification.type] || Bell
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  const content = (
    <div
      className={cn(
        'flex gap-4 px-4 py-4 hover:bg-gray-50 transition-colors',
        !notification.read && 'bg-blue-50/30'
      )}
      onClick={onMarkAsRead}
    >
      {/* Icon */}
      <div className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
        PRIORITY_STYLES[notification.priority]
      )}>
        <Icon className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={cn(
              'text-gray-900',
              !notification.read && 'font-semibold'
            )}>
              {notification.title}
            </p>
            {notification.message && (
              <p className="text-sm text-gray-500 mt-0.5">
                {notification.message}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!notification.read && (
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            )}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete()
              }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete notification"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (notification.action_url) {
    return (
      <Link href={notification.action_url} className="block">
        {content}
      </Link>
    )
  }

  return <div className="cursor-pointer">{content}</div>
}

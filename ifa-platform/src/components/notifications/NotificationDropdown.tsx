'use client'

import Link from 'next/link'
import { useNotificationsContext } from './NotificationsProvider'
import { NotificationItem } from './NotificationItem'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'

interface NotificationDropdownProps {
  onClose: () => void
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    loading,
    connectionMode,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationsContext()

  const latestNotifications = notifications.slice(0, 5)

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-blue-600 hover:text-blue-700 h-auto py-1 px-2"
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        )}
      </div>
      {connectionMode === 'polling' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Live updates unavailable — refreshing automatically.
        </div>
      )}

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !latestNotifications || latestNotifications.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {latestNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
                onDelete={() => deleteNotification(notification.id)}
                onClick={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-3">
        <Link
          href="/notifications"
          className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          onClick={onClose}
        >
          View all notifications
        </Link>
      </div>
    </div>
  )
}

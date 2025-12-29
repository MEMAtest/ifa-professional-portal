'use client'

import Link from 'next/link'
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
  X,
  Download,
  UserCog,
  Calculator,
  TrendingUp
} from 'lucide-react'
import type { Notification, NotificationType } from '@/types/notifications'
import { cn } from '@/lib/utils'

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  client_added: UserPlus,
  profile_updated: UserCog,
  review_due: Calendar,
  review_overdue: AlertTriangle,
  review_completed: CheckCircle,
  document_generated: FileText,
  document_ready: FileCheck,
  document_downloaded: Download,
  signature_requested: PenTool,
  signature_completed: CheckSquare,
  signature_reminder: Clock,
  assessment_submitted: ClipboardCheck,
  assessment_completed: Award,
  atr_completed: ClipboardCheck,
  stress_test_completed: Calculator,
  monte_carlo_completed: TrendingUp,
  compliance_alert: Shield,
  system: Bell
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600'
}

interface NotificationItemProps {
  notification: Notification
  onRead: () => void
  onDelete?: () => void
  onClick?: () => void
}

export function NotificationItem({ notification, onRead, onDelete, onClick }: NotificationItemProps) {
  const Icon = ICONS[notification.type] || Bell
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })

  const handleClick = () => {
    if (!notification.read) {
      onRead()
    }
    onClick?.()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.()
  }

  const content = (
    <div
      className={cn(
        'group relative flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors',
        !notification.read && 'bg-blue-50/50'
      )}
      onClick={handleClick}
    >
      {/* Dismiss button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
        </button>
      )}

      {/* Icon */}
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        PRIORITY_STYLES[notification.priority]
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm text-gray-900',
            !notification.read && 'font-semibold'
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500 mt-1.5" />
          )}
        </div>
        {notification.message && (
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>
    </div>
  )

  if (notification.action_url) {
    return (
      <Link href={notification.action_url}>
        {content}
      </Link>
    )
  }

  return content
}

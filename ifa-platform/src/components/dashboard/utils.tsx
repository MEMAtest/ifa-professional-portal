import React from 'react'
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator,
  UserPlus,
  Edit,
  Shield,
  Calendar
} from 'lucide-react'
import type { ActivityItem } from '@/components/dashboard/types'
import type { UpcomingEventsFilter } from '@/lib/dashboard/types'

export const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'client_added':
      return <UserPlus className="h-4 w-4 text-blue-500" />
    case 'assessment_completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'document_signed':
      return <FileText className="h-4 w-4 text-purple-500" />
    case 'monte_carlo_run':
      return <Calculator className="h-4 w-4 text-orange-500" />
    case 'review_due':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case 'profile_update':
      return <Edit className="h-4 w-4 text-gray-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

export const getEventIcon = (type: string) => {
  switch (type) {
    case 'meeting':
      return <Calendar className="h-4 w-4 text-blue-500" />
    case 'review':
      return <Shield className="h-4 w-4 text-orange-500" />
    case 'deadline':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'medium':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export const upcomingFilterDescription: Record<UpcomingEventsFilter, string> = {
  outstanding: 'Overdue + next 30 days',
  overdue: 'Overdue reviews only',
  due_7: 'Next 7 days',
  due_30: 'Next 30 days'
}

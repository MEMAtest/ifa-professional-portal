import type { ElementType } from 'react'
import { AlertTriangle, Calendar, Clock, Mail, PhoneIncoming, PhoneOutgoing, Shield } from 'lucide-react'

export const getCommunicationIcon = (type: string, direction: string): ElementType => {
  if (type === 'call') {
    return direction === 'inbound' ? PhoneIncoming : PhoneOutgoing
  }
  return Mail
}

export const getEventIcon = (type: string): ElementType => {
  switch (type) {
    case 'meeting':
      return Calendar
    case 'review':
      return Shield
    case 'deadline':
      return AlertTriangle
    default:
      return Clock
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

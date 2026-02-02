'use client'

import { Badge } from '@/components/ui/Badge'
import { TASK_SOURCE_COLORS, TASK_SOURCE_LABELS } from '@/modules/tasks/types'

interface SourceBadgeProps {
  sourceType?: string | null
}

export default function SourceBadge({ sourceType }: SourceBadgeProps) {
  if (!sourceType) return null
  const label = TASK_SOURCE_LABELS[sourceType] || sourceType
  const classes = TASK_SOURCE_COLORS[sourceType] || 'bg-gray-100 text-gray-600'

  return (
    <Badge className={`text-xs font-medium ${classes}`}>
      {label}
    </Badge>
  )
}

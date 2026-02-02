'use client'

import { AlertTriangle, Calendar, User, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { getTodayRange } from '@/modules/tasks/utils/dateUtils'

interface TaskHubStatsProps {
  activeKey?: string | null
  onSelect: (key: 'overdue' | 'due_today' | 'my_tasks' | 'urgent') => void
}

export default function TaskHubStats({ activeKey, onSelect }: TaskHubStatsProps) {
  const { start, end } = getTodayRange()

  const overdue = useTasks({ overdue: true, perPage: 1 })
  const dueToday = useTasks({ dueAfter: start.toISOString(), dueBefore: end.toISOString(), perPage: 1 })
  const myTasks = useTasks({ assignedTo: 'me', perPage: 1 })
  const urgent = useTasks({ priority: 'urgent', status: ['pending', 'in_progress'], perPage: 1 })

  const queries = [overdue, dueToday, myTasks, urgent]
  const hasError = queries.some((q) => q.isError)

  const cards = [
    {
      key: 'overdue' as const,
      label: 'Overdue',
      count: overdue.data?.total || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      isError: overdue.isError,
    },
    {
      key: 'due_today' as const,
      label: 'Due Today',
      count: dueToday.data?.total || 0,
      icon: Calendar,
      color: 'text-amber-600',
      isError: dueToday.isError,
    },
    {
      key: 'my_tasks' as const,
      label: 'My Tasks',
      count: myTasks.data?.total || 0,
      icon: User,
      color: 'text-blue-600',
      isError: myTasks.isError,
    },
    {
      key: 'urgent' as const,
      label: 'Urgent',
      count: urgent.data?.total || 0,
      icon: Zap,
      color: 'text-red-500',
      isError: urgent.isError,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        const isActive = activeKey === card.key
        return (
          <Card
            key={card.key}
            role="button"
            className={cn(
              'cursor-pointer transition hover:shadow-sm',
              isActive && 'ring-2 ring-blue-500'
            )}
            onClick={() => onSelect(card.key)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-gray-500">{card.label}</p>
                {card.isError ? (
                  <p className="text-sm font-medium text-red-500">Error</p>
                ) : (
                  <p className="text-2xl font-semibold text-gray-900">{card.count}</p>
                )}
              </div>
              <div className={cn('rounded-full bg-gray-100 p-2', card.color)}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

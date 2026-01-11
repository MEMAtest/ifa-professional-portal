'use client'

import React from 'react'
import Link from 'next/link'
import { format, isPast, isToday } from 'date-fns'
import { CheckCircle2, Circle, Clock, AlertTriangle, ArrowRight, Plus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useMyTasks } from '@/modules/tasks'
import type { TaskWithDetails } from '@/modules/tasks'
import { TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from '@/modules/tasks'

interface MyTasksWidgetProps {
  limit?: number
  onCreateTask?: () => void
}

export function MyTasksWidget({ limit = 5, onCreateTask }: MyTasksWidgetProps) {
  const { data, isLoading, isError, error, refetch } = useMyTasks({
    status: 'pending',
    sortBy: 'due_date',
    sortOrder: 'asc',
    perPage: limit,
  })

  const tasks = data?.tasks || []
  const total = data?.total || 0

  const getTaskDueInfo = (task: TaskWithDetails) => {
    if (!task.dueDate) return null
    const dueDate = new Date(task.dueDate)
    const isOverdue = isPast(dueDate) && task.status !== 'completed'
    const isDueToday = isToday(dueDate)

    if (isOverdue) {
      return {
        text: 'Overdue',
        className: 'text-red-600 font-medium',
        icon: <AlertTriangle className="h-3 w-3" />,
      }
    }
    if (isDueToday) {
      return {
        text: 'Due today',
        className: 'text-amber-600 font-medium',
        icon: <Clock className="h-3 w-3" />,
      }
    }
    return {
      text: format(dueDate, 'MMM d'),
      className: 'text-gray-500',
      icon: <Clock className="h-3 w-3" />,
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-5 w-5 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Failed to load tasks</p>
            <p className="text-xs text-gray-400 mt-1">
              {error instanceof Error ? error.message : 'Please try again later'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {total} pending
            </Badge>
          )}
          <CheckCircle2 className="h-4 w-4 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">All caught up!</p>
            <p className="text-xs text-gray-400">No pending tasks</p>
            {onCreateTask && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onCreateTask}
              >
                <Plus className="h-3 w-3 mr-1" />
                New Task
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {tasks.map((task) => {
                const dueInfo = getTaskDueInfo(task)
                return (
                  <Link
                    key={task.id}
                    href={`/tasks?taskId=${task.id}`}
                    className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {dueInfo && (
                          <span className={cn('flex items-center gap-1 text-xs', dueInfo.className)}>
                            {dueInfo.icon}
                            {dueInfo.text}
                          </span>
                        )}
                        <Badge className={cn('text-xs', TASK_PRIORITY_COLORS[task.priority])}>
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {total > limit && (
              <Link
                href="/tasks"
                className="flex items-center justify-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-800"
              >
                View all {total} tasks
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

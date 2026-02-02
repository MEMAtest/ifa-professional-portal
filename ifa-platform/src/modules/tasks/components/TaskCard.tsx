'use client'

import { useState, useRef, useEffect } from 'react'
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns'
import {
  CheckCircle2,
  Circle,
  Clock,
  MoreVertical,
  User,
  MessageSquare,
  AlertTriangle,
  Trash2,
  Edit,
  Play,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import SourceBadge from './TaskHub/SourceBadge'
import type { TaskWithDetails, TaskStatus } from '../types'
import {
  TASK_PRIORITY_COLORS,
  TASK_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
} from '../types'

interface TaskCardProps {
  task: TaskWithDetails
  onComplete?: (taskId: string) => void
  onEdit?: (task: TaskWithDetails) => void
  onDelete?: (taskId: string, clientId?: string) => void
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  onClick?: (task: TaskWithDetails) => void
  isCompact?: boolean
}

export function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  onStatusChange,
  onClick,
  isCompact = false,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed' && task.status !== 'cancelled'
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

  const assigneeName = task.assignedToFirstName
    ? `${task.assignedToFirstName} ${task.assignedToLastName || ''}`.trim()
    : null

  const clientName = task.clientFirstName
    ? `${task.clientFirstName} ${task.clientLastName || ''}`.trim()
    : null

  // Close menu when clicking outside — only attach listener while menu is open
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.status !== 'completed' && onComplete) {
      onComplete(task.id)
    }
  }

  const handleCardClick = () => {
    if (onClick) {
      onClick(task)
    }
  }

  const handleMenuAction = (action: () => void) => {
    setMenuOpen(false)
    action()
  }

  if (isCompact) {
    return (
      <div
        className={cn(
          'p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors cursor-pointer',
          isOverdue && 'border-red-200 bg-red-50',
          task.status === 'completed' && 'opacity-60'
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Row 1: checkbox + title + priority */}
        <div className="flex items-start gap-2">
          <button
            onClick={handleComplete}
            className="flex-shrink-0 mt-0.5"
            disabled={task.status === 'completed'}
          >
            {task.status === 'completed' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className={cn('h-4 w-4', isHovered ? 'text-blue-600' : 'text-gray-400')} />
            )}
          </button>
          <p className={cn('flex-1 text-sm font-medium leading-snug', task.status === 'completed' && 'line-through text-gray-500')}>
            {task.title}
          </p>
          <Badge className={cn('flex-shrink-0 text-[10px] px-1.5 py-0', TASK_PRIORITY_COLORS[task.priority])}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>

        {/* Row 2: metadata */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs text-gray-500">
          {task.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                isOverdue && 'text-red-600 font-medium',
                isDueToday && !isOverdue && 'text-amber-600 font-medium'
              )}
              title={format(new Date(task.dueDate), 'MMMM d, yyyy')}
            >
              {isOverdue && <AlertTriangle className="h-3 w-3" />}
              <Clock className="h-3 w-3" />
              {isOverdue
                ? `Overdue ${formatDistanceToNow(new Date(task.dueDate), { addSuffix: false })}`
                : isDueToday
                  ? 'Due today'
                  : format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          )}
          {assigneeName && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {assigneeName}
            </span>
          )}
          {clientName && (
            <span className="inline-flex items-center gap-1 text-gray-400">
              Client: <span className="text-gray-600">{clientName}</span>
            </span>
          )}
        </div>

        {/* Row 3: badges */}
        {task.sourceType && (
          <div className="mt-1.5 pl-6">
            <SourceBadge sourceType={task.sourceType} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border bg-white hover:shadow-md transition-all cursor-pointer',
        isOverdue && 'border-red-200 bg-red-50',
        task.status === 'completed' && 'opacity-70'
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleComplete}
          className="flex-shrink-0 mt-0.5"
          disabled={task.status === 'completed'}
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className={cn('h-5 w-5', isHovered ? 'text-blue-600' : 'text-gray-400')} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className={cn(
                'font-medium',
                task.status === 'completed' && 'line-through text-gray-500'
              )}>
                {task.title}
              </h4>
              {task.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                  {task.description}
                </p>
              )}
            </div>

            {/* Actions Menu */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(!menuOpen)
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-10 w-48 rounded-md border bg-white shadow-lg py-1">
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <>
                      {task.status === 'pending' && onStatusChange && (
                        <button
                          className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMenuAction(() => onStatusChange(task.id, 'in_progress'))
                          }}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Task
                        </button>
                      )}
                      {onComplete && (
                        <button
                          className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMenuAction(() => onComplete(task.id))
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete
                        </button>
                      )}
                    </>
                  )}
                  {task.status === 'completed' && onStatusChange && (
                    <button
                      className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMenuAction(() => onStatusChange(task.id, 'pending'))
                      }}
                    >
                      <Circle className="h-4 w-4 mr-2" />
                      Reopen
                    </button>
                  )}
                  {onEdit && (
                    <button
                      className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMenuAction(() => onEdit(task))
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  )}
                  <div className="border-t my-1" />
                  {task.status !== 'cancelled' && onStatusChange && (
                    <button
                      className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMenuAction(() => onStatusChange(task.id, 'cancelled'))
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="flex w-full items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMenuAction(() => onDelete(task.id, task.clientId))
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge className={cn('text-xs', TASK_PRIORITY_COLORS[task.priority])}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {TASK_TYPE_LABELS[task.type]}
            </Badge>
            {task.sourceType && <SourceBadge sourceType={task.sourceType} />}
            {task.requiresSignOff && (
              <Badge className="text-xs text-purple-700 bg-purple-50 border-purple-200">
                Sign-off required
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
            {task.dueDate && (
              <div
                className={cn(
                  'flex items-center gap-1',
                  isOverdue && 'text-red-600 font-medium',
                  isDueToday && !isOverdue && 'text-amber-600'
                )}
                title={`Due: ${format(new Date(task.dueDate), 'MMMM d, yyyy h:mm a')}`}
              >
                {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {isOverdue
                    ? `Overdue ${formatDistanceToNow(new Date(task.dueDate), { addSuffix: false })}`
                    : isDueToday
                      ? 'Due today'
                      : format(new Date(task.dueDate), 'MMM d, yyyy')
                  }
                </span>
              </div>
            )}

            {assigneeName && (
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{assigneeName}</span>
              </div>
            )}

            {clientName && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">Client:</span>
                <span>{clientName}</span>
              </div>
            )}

            {task.commentCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{task.commentCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

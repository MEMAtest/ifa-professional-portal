'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns'
import {
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Trash2,
  User,
  AlertTriangle,
  Send,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { TaskWithDetails, UpdateTaskInput, TaskCommentWithUser, TaskType, TaskPriority, TaskStatus } from '../types'
import {
  TASK_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_STATUS_COLORS,
} from '../types'

interface TaskDetailSheetProps {
  task: TaskWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (taskId: string, data: UpdateTaskInput) => Promise<void>
  onComplete: (taskId: string) => Promise<void>
  onDelete: (taskId: string, clientId?: string) => Promise<void>
  onAddComment?: (taskId: string, content: string) => Promise<void>
  comments?: TaskCommentWithUser[]
  users?: Array<{ id: string; fullName: string }>
  isLoadingComments?: boolean
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onUpdate,
  onComplete,
  onDelete,
  onAddComment,
  comments = [],
  users = [],
  isLoadingComments,
}: TaskDetailSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskType>('general')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('pending')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  // Sync form state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setType(task.type)
      setPriority(task.priority)
      setStatus(task.status)
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')
      setAssignedTo(task.assignedTo || '')
    }
  }, [task])

  if (!task) return null
  if (!open) return null

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed' && task.status !== 'cancelled'
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

  const assigneeName = task.assignedToFirstName
    ? `${task.assignedToFirstName} ${task.assignedToLastName || ''}`.trim()
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignedTo: assignedTo || null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      await onComplete(task.id)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }
    setIsDeleting(true)
    try {
      await onDelete(task.id, task.clientId)
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !onAddComment) return

    setIsAddingComment(true)
    try {
      await onAddComment(task.id, newComment.trim())
      setNewComment('')
    } finally {
      setIsAddingComment(false)
    }
  }

  const taskTypes: TaskType[] = ['general', 'review', 'compliance', 'client_follow_up', 'deadline', 'meeting']
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
  const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => onOpenChange(false)}>
      <div
        className="fixed right-0 top-0 h-full w-full sm:max-w-[540px] bg-white shadow-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{task.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Created {format(new Date(task.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={TASK_STATUS_COLORS[task.status]}>
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            <Badge className={TASK_PRIORITY_COLORS[task.priority]}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </Badge>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Due Date Warning */}
          {isOverdue && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Overdue by {formatDistanceToNow(new Date(task.dueDate!))}
              </span>
            </div>
          )}

          {isDueToday && !isOverdue && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Due today</span>
            </div>
          )}

          {/* Quick Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {task.dueDate && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {assigneeName && (
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>{assigneeName}</span>
              </div>
            )}
            <Badge variant="secondary">{TASK_TYPE_LABELS[task.type]}</Badge>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-title" className="text-sm font-medium">Title</label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium">Description</label>
              <Textarea
                id="edit-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="edit-status" className="text-sm font-medium">Status</label>
                <select
                  id="edit-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-priority" className="text-sm font-medium">Priority</label>
                <select
                  id="edit-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {priorities.map((p) => (
                    <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-type" className="text-sm font-medium">Type</label>
              <select
                id="edit-type"
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {taskTypes.map((t) => (
                  <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-dueDate" className="text-sm font-medium">Due Date</label>
              <Input
                id="edit-dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {users.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="edit-assignedTo" className="text-sm font-medium">Assigned To</label>
                <select
                  id="edit-assignedTo"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.fullName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sign-off Info */}
            {task.requiresSignOff && (
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                <p className="text-sm font-medium text-purple-700">
                  Requires supervisor sign-off
                </p>
                {task.signedOffAt && (
                  <p className="text-xs text-purple-600 mt-1">
                    Signed off {format(new Date(task.signedOffAt), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              )}
            </div>
          </form>

          <hr />

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <h4 className="font-medium">Comments</h4>
              <span className="text-xs text-gray-500">({comments.length})</span>
            </div>

            {/* Add Comment */}
            {onAddComment && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddComment()
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isAddingComment}
                >
                  {isAddingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No comments yet
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {comment.userFirstName?.[0] || 'U'}
                      {comment.userLastName?.[0] || ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.userFirstName} {comment.userLastName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr />

          {/* Delete Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Task
          </Button>
        </div>
      </div>
    </div>
  )
}

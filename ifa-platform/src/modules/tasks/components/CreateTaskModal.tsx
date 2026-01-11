'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { CreateTaskInput, TaskType, TaskPriority } from '../types'
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '../types'
import { TASK_TEMPLATES, type TaskTemplate } from '../constants'

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateTaskInput) => Promise<void>
  users?: Array<{ id: string; fullName: string }>
  clients?: Array<{ id: string; firstName: string; lastName: string }>
  defaultClientId?: string
  defaultAssigneeId?: string
}

export function CreateTaskModal({
  open,
  onOpenChange,
  onSubmit,
  users = [],
  clients = [],
  defaultClientId,
  defaultAssigneeId,
}: CreateTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskType>('general')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState(defaultAssigneeId || '')
  const [clientId, setClientId] = useState(defaultClientId || '')
  const [requiresSignOff, setRequiresSignOff] = useState(false)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setType('general')
    setPriority('medium')
    setDueDate('')
    setAssignedTo(defaultAssigneeId || '')
    setClientId(defaultClientId || '')
    setRequiresSignOff(false)
    setSelectedTemplate(null)
    setErrors({})
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = TASK_TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      if (template.defaults.title) setTitle(template.defaults.title)
      if (template.defaults.type) setType(template.defaults.type as TaskType)
      if (template.defaults.priority) setPriority(template.defaults.priority as TaskPriority)
      setRequiresSignOff(template.defaults.requiresSignOff || false)
      if (template.defaults.description) {
        setDescription(template.defaults.description)
      }
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) {
      newErrors.title = 'Title is required'
    } else if (title.length > 200) {
      newErrors.title = 'Title is too long (max 200 characters)'
    }
    if (description && description.length > 2000) {
      newErrors.description = 'Description is too long (max 2000 characters)'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        assignedTo: assignedTo || undefined,
        clientId: clientId || undefined,
        requiresSignOff,
      })
      resetForm()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const taskTypes: TaskType[] = ['general', 'review', 'compliance', 'client_follow_up', 'deadline', 'meeting']
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Create a new task to track work items and deadlines.
          </DialogDescription>
        </DialogHeader>

        {/* Template Quick Select */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Templates</label>
          <div className="flex flex-wrap gap-2">
            {TASK_TEMPLATES.map((template) => (
              <Button
                key={template.id}
                type="button"
                variant={selectedTemplate === template.id ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleTemplateSelect(template.id)}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Add details about this task..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">Type</label>
              <select
                id="type"
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
              <label htmlFor="priority" className="text-sm font-medium">Priority</label>
              <select
                id="priority"
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

          {/* Due Date */}
          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium">Due Date</label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Assign To */}
          {users.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="assignedTo" className="text-sm font-medium">Assign To</label>
              <select
                id="assignedTo"
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

          {/* Related Client */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="clientId" className="text-sm font-medium">Related Client</label>
              <select
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Link this task to a specific client</p>
            </div>
          )}

          {/* Requires Sign-off */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <label htmlFor="requiresSignOff" className="text-sm font-medium">
                Requires Sign-off
              </label>
              <p className="text-xs text-gray-500">
                Task must be approved by a supervisor when completed
              </p>
            </div>
            <input
              id="requiresSignOff"
              type="checkbox"
              checked={requiresSignOff}
              onChange={(e) => setRequiresSignOff(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

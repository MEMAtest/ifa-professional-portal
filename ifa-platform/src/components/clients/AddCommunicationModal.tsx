'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/use-toast'
import { Phone, Mail, Video, Users, MessageSquare } from 'lucide-react'

interface AddCommunicationModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  onSuccess?: () => void
}

const COMMUNICATION_TYPES = [
  { value: 'call', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'video_call', label: 'Video Call', icon: Video },
  { value: 'other', label: 'Other', icon: MessageSquare }
]

export function AddCommunicationModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onSuccess
}: AddCommunicationModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    type: 'call',
    subject: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    direction: 'outbound' as 'inbound' | 'outbound',
    requiresFollowup: false,
    followupDate: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subject.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a subject',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)

      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          type: formData.type,
          subject: formData.subject,
          content: formData.content,
          date: formData.date,
          direction: formData.direction,
          requiresFollowup: formData.requiresFollowup,
          followupDate: formData.requiresFollowup ? formData.followupDate : null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save communication')
      }

      toast({
        title: 'Communication Logged',
        description: `Communication with ${clientName} has been recorded`
      })

      // Reset form
      setFormData({
        type: 'call',
        subject: '',
        content: '',
        date: new Date().toISOString().split('T')[0],
        direction: 'outbound',
        requiresFollowup: false,
        followupDate: ''
      })

      onSuccess?.()
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save communication',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Communication</DialogTitle>
          <DialogDescription>
            Record a communication with {clientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Communication Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {COMMUNICATION_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: value }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    formData.type === value
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label>Direction</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, direction: 'outbound' }))}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors w-full ${
                  formData.direction === 'outbound'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Outbound (You contacted client)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, direction: 'inbound' }))}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors w-full ${
                  formData.direction === 'inbound'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Inbound (Client contacted you)
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief subject of the communication"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="content">Notes</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Summary of the communication..."
              rows={3}
            />
          </div>

          {/* Follow-up */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresFollowup"
                checked={formData.requiresFollowup}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresFollowup: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label htmlFor="requiresFollowup">Requires follow-up</Label>
            </div>
            {formData.requiresFollowup && (
              <Input
                type="date"
                value={formData.followupDate}
                onChange={(e) => setFormData(prev => ({ ...prev, followupDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-4 border-t sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving...' : 'Log Communication'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

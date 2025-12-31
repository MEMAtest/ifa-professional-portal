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
import { Calendar, Clock, Shield, AlertTriangle, FileCheck } from 'lucide-react'

interface ScheduleReviewModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  onSuccess?: () => void
}

const REVIEW_TYPES = [
  { value: 'annual', label: 'Annual Review', icon: Calendar, description: 'Yearly comprehensive review' },
  { value: 'suitability', label: 'Suitability', icon: FileCheck, description: 'Investment suitability check' },
  { value: 'vulnerability', label: 'Vulnerability', icon: AlertTriangle, description: 'Vulnerability assessment' },
  { value: 'ad_hoc', label: 'Ad-hoc', icon: Clock, description: 'One-off review meeting' }
]

export function ScheduleReviewModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onSuccess
}: ScheduleReviewModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  // Default due date to 30 days from now
  const defaultDueDate = new Date()
  defaultDueDate.setDate(defaultDueDate.getDate() + 30)

  const [formData, setFormData] = useState({
    reviewType: 'annual',
    dueDate: defaultDueDate.toISOString().split('T')[0],
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a due date',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          reviewType: formData.reviewType,
          dueDate: formData.dueDate,
          status: 'pending',
          reviewSummary: formData.notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule review')
      }

      toast({
        title: 'Review Scheduled',
        description: `${REVIEW_TYPES.find(t => t.value === formData.reviewType)?.label} scheduled for ${clientName}`
      })

      // Reset form
      const newDefaultDate = new Date()
      newDefaultDate.setDate(newDefaultDate.getDate() + 30)
      setFormData({
        reviewType: 'annual',
        dueDate: newDefaultDate.toISOString().split('T')[0],
        notes: ''
      })

      onSuccess?.()
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule review',
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
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Schedule Review
          </DialogTitle>
          <DialogDescription>
            Schedule a review for {clientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Review Type */}
          <div className="space-y-2">
            <Label>Review Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REVIEW_TYPES.map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, reviewType: value }))}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                    formData.reviewType === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${
                    formData.reviewType === value ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <p className={`font-medium text-sm ${
                      formData.reviewType === value ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {label}
                    </p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500">
              The review must be completed by this date
            </p>
          </div>

          {/* Quick Date Options */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: '1 Week', days: 7 },
              { label: '2 Weeks', days: 14 },
              { label: '1 Month', days: 30 },
              { label: '3 Months', days: 90 }
            ].map(({ label, days }) => {
              const date = new Date()
              date.setDate(date.getDate() + days)
              const dateStr = date.toISOString().split('T')[0]
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, dueDate: dateStr }))}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    formData.dueDate === dateStr
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any specific topics or concerns to address..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-4 border-t sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Scheduling...' : 'Schedule Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

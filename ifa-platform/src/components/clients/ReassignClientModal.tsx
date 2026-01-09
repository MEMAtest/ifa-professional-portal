'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/use-toast'
import { UserCheck, AlertCircle, Loader2 } from 'lucide-react'

interface Advisor {
  id: string
  name: string
  role?: string
}

interface ClientToReassign {
  id: string
  name: string
  currentAdvisorId?: string | null
  currentAdvisorName?: string
}

interface ReassignClientModalProps {
  isOpen: boolean
  onClose: () => void
  clients: ClientToReassign[]
  advisors: Advisor[]
  onSuccess?: () => void
}

export function ReassignClientModal({
  isOpen,
  onClose,
  clients,
  advisors,
  onSuccess
}: ReassignClientModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [transferAssessments, setTransferAssessments] = useState(true)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAdvisorId('')
      setReason('')
      setTransferAssessments(true)
    }
  }, [isOpen])

  // Filter out advisors that are currently assigned to ALL selected clients
  const currentAdvisorIds = new Set(clients.map(c => c.currentAdvisorId).filter(Boolean))
  const availableAdvisors = advisors.filter(a => {
    // If only one client is selected, exclude their current advisor
    if (clients.length === 1) {
      return a.id !== clients[0].currentAdvisorId
    }
    // If multiple clients, show all advisors
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAdvisorId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an advisor',
        variant: 'destructive'
      })
      return
    }

    if (clients.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'No clients selected',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)

      const response = await fetch('/api/clients/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: clients.map(c => c.id),
          newAdvisorId: selectedAdvisorId,
          transferAssessments,
          reason: reason.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reassign clients')
      }

      const selectedAdvisor = advisors.find(a => a.id === selectedAdvisorId)
      const advisorName = selectedAdvisor?.name || 'the selected advisor'

      // Show appropriate message based on results
      if (data.failed > 0) {
        toast({
          title: 'Partial Success',
          description: `${data.reassigned} reassigned, ${data.failed} failed, ${data.skipped} skipped`,
          variant: 'destructive'
        })
      } else if (data.skipped > 0 && data.reassigned === 0) {
        toast({
          title: 'No Changes Made',
          description: 'All selected clients are already assigned to this advisor',
        })
      } else {
        toast({
          title: 'Clients Reassigned',
          description: data.reassigned === 1
            ? `${clients[0].name} has been reassigned to ${advisorName}`
            : `${data.reassigned} client(s) have been reassigned to ${advisorName}${
                data.assessmentsTransferred ? ` (${data.assessmentsTransferred} assessments transferred)` : ''
              }`
        })
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reassign clients',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const isSingleClient = clients.length === 1
  const clientNames = clients.map(c => c.name).join(', ')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Reassign {isSingleClient ? 'Client' : 'Clients'}
          </DialogTitle>
          <DialogDescription>
            {isSingleClient
              ? `Transfer ${clients[0].name} to a different advisor`
              : `Transfer ${clients.length} selected clients to a different advisor`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client(s) being reassigned */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <Label className="text-xs text-gray-500">
              {isSingleClient ? 'Client' : 'Clients'} to reassign
            </Label>
            <div className="text-sm font-medium">
              {isSingleClient ? (
                <div>
                  <span>{clients[0].name}</span>
                  {clients[0].currentAdvisorName && (
                    <span className="text-gray-500 ml-2">
                      (currently with {clients[0].currentAdvisorName})
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <span>{clients.length} clients selected</span>
                  <div className="text-gray-500 text-xs mt-1 max-h-20 overflow-y-auto">
                    {clientNames}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advisor Selection */}
          <div className="space-y-2">
            <Label htmlFor="advisor">New Advisor *</Label>
            {availableAdvisors.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4" />
                No other advisors available
              </div>
            ) : (
              <select
                id="advisor"
                value={selectedAdvisorId}
                onChange={(e) => setSelectedAdvisorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an advisor...</option>
                {availableAdvisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.name}
                    {advisor.role && ` (${advisor.role})`}
                    {currentAdvisorIds.has(advisor.id) && ' - Already assigned to some'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason (optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Advisor on leave, workload balancing..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Transfer assessments checkbox */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="transferAssessments"
              checked={transferAssessments}
              onChange={(e) => setTransferAssessments(e.target.checked)}
              className="mt-1 rounded border-gray-300"
            />
            <div>
              <Label htmlFor="transferAssessments" className="text-sm font-medium">
                Transfer in-progress assessments
              </Label>
              <p className="text-xs text-gray-500">
                Any in-progress assessments will be transferred to the new advisor
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-4 border-t sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !selectedAdvisorId || availableAdvisors.length === 0}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reassigning...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Reassign {isSingleClient ? 'Client' : 'Clients'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Reassign Clients Modal
 * Shows when deactivating a user who has assigned clients
 * Allows bulk reassignment to another advisor before deactivation
 */

'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, Users, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useFirmUsers } from '../../hooks/useFirmUsers'
import { useToast } from '@/hooks/use-toast'
import type { FirmUser } from '../../types/user.types'

interface ReassignClientsModalProps {
  open: boolean
  onClose: () => void
  userToDeactivate: FirmUser
  clientCount: number
  clientSamples: string[]
  onReassignComplete: () => void
  onSkipReassignment: () => void
}

export function ReassignClientsModal({
  open,
  onClose,
  userToDeactivate,
  clientCount,
  clientSamples,
  onReassignComplete,
  onSkipReassignment,
}: ReassignClientsModalProps) {
  const { users } = useFirmUsers()
  const { toast } = useToast()
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('')
  const [transferAssessments, setTransferAssessments] = useState(true)
  const [reason, setReason] = useState('')
  const [isReassigning, setIsReassigning] = useState(false)

  // Filter out the user being deactivated and inactive users
  const availableAdvisors = users?.filter(
    u => u.id !== userToDeactivate.id &&
         u.status === 'active' &&
         ['advisor', 'supervisor', 'admin'].includes(u.role)
  ) ?? []

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedAdvisorId('')
      setTransferAssessments(true)
      setReason(`Advisor ${userToDeactivate.fullName} deactivated`)
      setIsReassigning(false)
    }
  }, [open, userToDeactivate.fullName])

  if (!open) return null

  const handleReassign = async () => {
    if (!selectedAdvisorId) {
      toast({
        title: 'Error',
        description: 'Please select an advisor to reassign clients to',
        variant: 'destructive',
      })
      return
    }

    setIsReassigning(true)

    try {
      // First, get all clients for this advisor
      const clientsResponse = await fetch(
        `/api/clients?advisorId=${userToDeactivate.id}&limit=1000`
      )

      if (!clientsResponse.ok) {
        throw new Error('Failed to fetch client list')
      }

      const clientsData = await clientsResponse.json()
      const clientIds = clientsData.clients?.map((c: { id: string }) => c.id) ?? []

      if (clientIds.length === 0) {
        toast({
          title: 'No clients found',
          description: 'No clients to reassign',
        })
        onReassignComplete()
        return
      }

      // Reassign all clients
      const response = await fetch('/api/clients/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds,
          newAdvisorId: selectedAdvisorId,
          transferAssessments,
          reason: reason.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reassign clients')
      }

      const selectedAdvisor = availableAdvisors.find(a => a.id === selectedAdvisorId)

      toast({
        title: 'Clients reassigned',
        description: `${result.reassigned} client(s) reassigned to ${selectedAdvisor?.fullName}`,
      })

      onReassignComplete()
    } catch (error) {
      console.error('Reassignment error:', error)
      toast({
        title: 'Reassignment failed',
        description: error instanceof Error ? error.message : 'Failed to reassign clients',
        variant: 'destructive',
      })
    } finally {
      setIsReassigning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Reassign Clients
              </h2>
              <p className="text-sm text-gray-500">
                {userToDeactivate.fullName} has {clientCount} client(s) assigned
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Client samples */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Affected Clients
              </span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              {clientSamples.slice(0, 5).map((name, idx) => (
                <li key={idx}>{name}</li>
              ))}
              {clientCount > 5 && (
                <li className="text-gray-400">
                  ... and {clientCount - 5} more
                </li>
              )}
            </ul>
          </div>

          {/* Advisor selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reassign clients to
            </label>
            <select
              value={selectedAdvisorId}
              onChange={(e) => setSelectedAdvisorId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isReassigning}
            >
              <option value="">Select an advisor...</option>
              {availableAdvisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.fullName} ({advisor.role})
                </option>
              ))}
            </select>
            {availableAdvisors.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                No other active advisors available. You may need to skip reassignment.
              </p>
            )}
          </div>

          {/* Transfer assessments checkbox */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={transferAssessments}
              onChange={(e) => setTransferAssessments(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isReassigning}
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Transfer in-progress assessments
              </span>
              <p className="text-xs text-gray-500">
                Also reassign any assessments not yet completed
              </p>
            </div>
          </label>

          {/* Reason input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Advisor leaving firm"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={500}
              disabled={isReassigning}
            />
          </div>

          {/* Visual indicator */}
          {selectedAdvisorId && (
            <div className="flex items-center justify-center gap-4 py-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {userToDeactivate.fullName}
                </div>
                <div className="text-xs text-gray-500">{clientCount} clients</div>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-500" />
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {availableAdvisors.find(a => a.id === selectedAdvisorId)?.fullName}
                </div>
                <div className="text-xs text-gray-500">New advisor</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
          <Button
            variant="outline"
            onClick={onSkipReassignment}
            disabled={isReassigning}
          >
            Skip & Leave Orphaned
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isReassigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!selectedAdvisorId || isReassigning}
            >
              {isReassigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reassigning...
                </>
              ) : (
                `Reassign ${clientCount} Client(s)`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

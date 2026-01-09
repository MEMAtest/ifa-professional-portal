/**
 * Reassign Clients Modal
 * Shows when deactivating a user who has assigned clients
 * Allows bulk reassignment to another advisor before deactivation
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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

  // Refs for accessibility
  const modalRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Filter out the user being deactivated and inactive users
  const availableAdvisors = users?.filter(
    u => u.id !== userToDeactivate.id &&
         u.status === 'active' &&
         ['advisor', 'supervisor', 'admin'].includes(u.role)
  ) ?? []

  // Handle escape key to close modal
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isReassigning) {
      onClose()
    }
  }, [isReassigning, onClose])

  // Focus trap - keep focus within modal
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusableElements.length) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault()
      lastElement.focus()
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault()
      firstElement.focus()
    }
  }, [])

  // Combined keyboard handler
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      handleEscape(e)
      handleTabKey(e)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleEscape, handleTabKey])

  // Focus management - save previous focus and set initial focus
  useEffect(() => {
    if (open) {
      // Save current focus
      previouslyFocusedRef.current = document.activeElement as HTMLElement
      // Set initial focus to select element
      setTimeout(() => selectRef.current?.focus(), 0)
      // Reset state
      setSelectedAdvisorId('')
      setTransferAssessments(true)
      setReason(`Advisor ${userToDeactivate.fullName} deactivated`)
      setIsReassigning(false)
    } else {
      // Restore focus when modal closes
      previouslyFocusedRef.current?.focus()
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Reassignment error:', error)
      }
      toast({
        title: 'Reassignment failed',
        description: error instanceof Error ? error.message : 'Failed to reassign clients',
        variant: 'destructive',
      })
    } finally {
      setIsReassigning(false)
    }
  }

  // Handle backdrop click - prevent close during operation
  const handleBackdropClick = () => {
    if (!isReassigning) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - disabled during operation */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassign-modal-title"
        aria-describedby="reassign-modal-description"
        className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <h2 id="reassign-modal-title" className="text-lg font-semibold text-gray-900">
                Reassign Clients
              </h2>
              <p id="reassign-modal-description" className="text-sm text-gray-500">
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
              <Users className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span className="text-sm font-medium text-gray-700">
                Affected Clients
              </span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1" aria-label="List of affected clients">
              {clientSamples.slice(0, 5).map((name, idx) => (
                <li key={`client-${idx}-${name}`}>{name}</li>
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
            <label htmlFor="advisor-select" className="block text-sm font-medium text-gray-700 mb-2">
              Reassign clients to
            </label>
            <select
              id="advisor-select"
              ref={selectRef}
              value={selectedAdvisorId}
              onChange={(e) => setSelectedAdvisorId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isReassigning}
              aria-describedby={availableAdvisors.length === 0 ? 'no-advisors-warning' : undefined}
            >
              <option value="">Select an advisor...</option>
              {availableAdvisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.fullName} ({advisor.role})
                </option>
              ))}
            </select>
            {availableAdvisors.length === 0 && (
              <p id="no-advisors-warning" className="mt-2 text-sm text-amber-600" role="alert">
                No other active advisors available. You may need to skip reassignment.
              </p>
            )}
          </div>

          {/* Transfer assessments checkbox */}
          <div className="flex items-center gap-3">
            <input
              id="transfer-assessments"
              type="checkbox"
              checked={transferAssessments}
              onChange={(e) => setTransferAssessments(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isReassigning}
            />
            <label htmlFor="transfer-assessments">
              <span className="text-sm font-medium text-gray-700">
                Transfer in-progress assessments
              </span>
              <p className="text-xs text-gray-500">
                Also reassign any assessments not yet completed
              </p>
            </label>
          </div>

          {/* Reason input */}
          <div>
            <label htmlFor="reason-input" className="block text-sm font-medium text-gray-700 mb-2">
              Reason (optional)
            </label>
            <input
              id="reason-input"
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
            <div className="flex items-center justify-center gap-4 py-4 bg-blue-50 rounded-lg" aria-live="polite">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">
                  {userToDeactivate.fullName}
                </div>
                <div className="text-xs text-gray-500">{clientCount} clients</div>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-500" aria-hidden="true" />
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
              aria-busy={isReassigning}
            >
              {isReassigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
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

/**
 * Invite Modal Component
 * Modal for inviting new users to the firm
 */

'use client'

import React, { useState } from 'react'
import { UserPlus, Mail, Shield, X } from 'lucide-react'
import { useUserInvitations } from '../../hooks/useFirmUsers'
import { useFirmSeats } from '../../hooks/useFirm'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { useToast } from '@/hooks/use-toast'
import type { UserRole } from '../../types/user.types'

interface InviteModalProps {
  open: boolean
  onClose: () => void
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'advisor',
    label: 'Advisor',
    description: 'Can manage their own clients and assessments',
  },
  {
    value: 'supervisor',
    label: 'Supervisor',
    description: 'Can view all clients and approve assessments',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access including firm settings and user management',
  },
]

export function InviteModal({ open, onClose }: InviteModalProps) {
  const { inviteUserAsync, isInviting } = useUserInvitations()
  const { seatsRemaining } = useFirmSeats()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('advisor')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    // Check seats
    if (seatsRemaining <= 0) {
      setError('No seats available. Contact support to upgrade your plan.')
      return
    }

    try {
      const result = await inviteUserAsync({ email: email.toLowerCase().trim(), role })

      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${email}`,
      })

      // Reset and close
      setEmail('')
      setRole('advisor')
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleClose = () => {
    setEmail('')
    setRole('advisor')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your firm. They'll receive an email with a link to create their account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    role === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {option.label}
                    </div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Seats Warning */}
          {seatsRemaining <= 2 && seatsRemaining > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
              You have {seatsRemaining} seat{seatsRemaining === 1 ? '' : 's'} remaining.
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting || seatsRemaining <= 0}>
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

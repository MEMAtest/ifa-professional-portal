/**
 * User Table Component
 * Displays list of firm users with management actions
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Users, UserPlus, MoreHorizontal, Mail, Shield, Clock, AlertCircle, Edit, RotateCcw, XCircle, RefreshCw } from 'lucide-react'
import { useFirmUsers, useUserInvitations } from '../../hooks/useFirmUsers'
import { usePermissions } from '../../hooks/usePermissions'
import { useFirmSeats } from '../../hooks/useFirm'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { InviteModal } from './InviteModal'
import { EditUserSheet } from './EditUserSheet'
import { ReassignClientsModal } from './ReassignClientsModal'
import { useToast } from '@/hooks/use-toast'
import type { FirmUser, UserInvitation } from '../../types/user.types'

// State for tracking user with clients that need reassignment
interface ReassignmentState {
  user: FirmUser
  clientCount: number
  clientSamples: string[]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  advisor: 'Advisor',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  supervisor: 'bg-blue-100 text-blue-800',
  advisor: 'bg-gray-100 text-gray-800',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  invited: 'bg-amber-100 text-amber-800',
  deactivated: 'bg-red-100 text-red-800',
}

function formatDate(date: Date | undefined): string {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

// Simple dropdown menu component
function ActionMenu({ children, items }: { children: React.ReactNode; items: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Only add event listener when menu is open to prevent memory leaks
  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="p-2 hover:bg-gray-100 rounded-md">
        {children}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-md last:rounded-b-md ${
                item.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function UserTable() {
  const { users, isLoading, deactivateUserAsync, updateUserAsync, refetch } = useFirmUsers()
  const { invitations, isLoadingInvitations, cancelInviteAsync, resendInviteAsync } = useUserInvitations()
  const { canInviteUsers, canEditUsers, canDeleteUsers } = usePermissions()
  const { maxSeats, currentSeats, seatsRemaining } = useFirmSeats()
  const { toast } = useToast()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingUser, setEditingUser] = useState<FirmUser | null>(null)
  const [reassignmentState, setReassignmentState] = useState<ReassignmentState | null>(null)

  // Handle deactivation with client reassignment check
  const handleDeactivate = useCallback(async (user: FirmUser) => {
    try {
      // First, try to deactivate - the API will return 409 if user has clients
      const response = await fetch(`/api/firm/users/${user.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.status === 409 && result.code === 'HAS_CLIENTS') {
        // User has clients - show reassignment modal
        setReassignmentState({
          user,
          clientCount: result.clientCount,
          clientSamples: result.clientSamples || [],
        })
        return
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to deactivate user')
      }

      toast({
        title: 'User deactivated',
        description: `${user.fullName} has been deactivated`,
      })

      refetch()
    } catch (error) {
      console.error('Deactivation error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deactivate user',
        variant: 'destructive',
      })
    }
  }, [toast, refetch])

  // Handle deactivation after reassignment
  const handleReassignComplete = useCallback(async () => {
    if (!reassignmentState) return

    try {
      // Now deactivate the user (clients have been reassigned)
      const response = await fetch(`/api/firm/users/${reassignmentState.user.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to deactivate user')
      }

      toast({
        title: 'User deactivated',
        description: `${reassignmentState.user.fullName} has been deactivated and clients reassigned`,
      })

      setReassignmentState(null)
      refetch()
    } catch (error) {
      console.error('Post-reassignment deactivation error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deactivate user',
        variant: 'destructive',
      })
    }
  }, [reassignmentState, toast, refetch])

  // Handle skipping reassignment (leave clients orphaned)
  const handleSkipReassignment = useCallback(async () => {
    if (!reassignmentState) return

    try {
      // Deactivate with confirmOrphan flag
      const response = await fetch(`/api/firm/users/${reassignmentState.user.id}?confirmOrphan=true`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to deactivate user')
      }

      toast({
        title: 'User deactivated',
        description: `${reassignmentState.user.fullName} has been deactivated. ${reassignmentState.clientCount} client(s) are now unassigned.`,
        variant: 'default',
      })

      setReassignmentState(null)
      refetch()
    } catch (error) {
      console.error('Skip reassignment error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deactivate user',
        variant: 'destructive',
      })
    }
  }, [reassignmentState, toast, refetch])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeUsers = users?.filter(u => u.status !== 'deactivated') ?? []
  const deactivatedUsers = users?.filter(u => u.status === 'deactivated') ?? []
  const pendingInvitations = invitations ?? []

  return (
    <div className="space-y-6">
      {/* Seat Usage Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">User Seats</div>
                <div className="text-2xl font-semibold">
                  {currentSeats} / {maxSeats}
                </div>
              </div>
            </div>
            {canInviteUsers && seatsRemaining > 0 && (
              <Button onClick={() => setShowInviteModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            )}
            {canInviteUsers && seatsRemaining === 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Seat limit reached</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Users
          </CardTitle>
          <CardDescription>
            Team members who can access the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {activeUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                canEdit={canEditUsers}
                canDelete={canDeleteUsers}
                onEdit={() => setEditingUser(user)}
                onDeactivate={() => handleDeactivate(user)}
              />
            ))}
            {activeUsers.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                No active users
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Users who have been invited but haven&apos;t joined yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pendingInvitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  canManage={canInviteUsers}
                  onCancel={async () => {
                    if (confirm(`Cancel invitation for ${invitation.email}?`)) {
                      await cancelInviteAsync(invitation.id)
                    }
                  }}
                  onResend={async () => {
                    await resendInviteAsync(invitation.id)
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deactivated Users */}
      {deactivatedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-500">
              <Clock className="h-5 w-5" />
              Deactivated Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {deactivatedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  canEdit={canEditUsers}
                  canDelete={false}
                  onEdit={() => setEditingUser(user)}
                  onReactivate={async () => {
                    if (seatsRemaining > 0) {
                      await updateUserAsync({ userId: user.id, input: { status: 'active' } })
                    } else {
                      alert('No seats available. Upgrade your plan to reactivate this user.')
                    }
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <InviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserSheet
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* Reassign Clients Modal */}
      {reassignmentState && (
        <ReassignClientsModal
          open={!!reassignmentState}
          onClose={() => setReassignmentState(null)}
          userToDeactivate={reassignmentState.user}
          clientCount={reassignmentState.clientCount}
          clientSamples={reassignmentState.clientSamples}
          onReassignComplete={handleReassignComplete}
          onSkipReassignment={handleSkipReassignment}
        />
      )}
    </div>
  )
}

interface UserRowProps {
  user: FirmUser
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDeactivate?: () => void
  onReactivate?: () => void
}

function UserRow({ user, canEdit, canDelete, onEdit, onDeactivate, onReactivate }: UserRowProps) {
  const menuItems: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[] = []

  if (canEdit) {
    menuItems.push({ label: 'Edit User', onClick: onEdit })
  }
  if (user.status === 'deactivated' && onReactivate) {
    menuItems.push({ label: 'Reactivate User', onClick: onReactivate })
  }
  if (user.status !== 'deactivated' && canDelete && onDeactivate) {
    menuItems.push({ label: 'Deactivate User', onClick: onDeactivate, variant: 'danger' })
  }

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
          {user.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={user.avatarUrl} alt={user.fullName} className="h-10 w-10 rounded-full" />
          ) : (
            <span className="text-sm font-medium text-gray-600">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </span>
          )}
        </div>
        <div>
          <div className="font-medium">{user.fullName}</div>
          <div className="text-sm text-gray-500">{user.email || 'No email'}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[user.role]}`}>
          {ROLE_LABELS[user.role]}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[user.status]}`}>
          {user.status}
        </span>
        <span className="text-sm text-gray-400">
          Last login: {formatDate(user.lastLoginAt)}
        </span>
        {menuItems.length > 0 && (
          <ActionMenu items={menuItems}>
            <MoreHorizontal className="h-4 w-4" />
          </ActionMenu>
        )}
      </div>
    </div>
  )
}

interface InvitationRowProps {
  invitation: UserInvitation
  canManage: boolean
  onCancel: () => void
  onResend: () => void
}

function InvitationRow({ invitation, canManage, onCancel, onResend }: InvitationRowProps) {
  const isExpired = new Date(invitation.expiresAt) < new Date()

  const menuItems: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[] = []

  if (canManage) {
    menuItems.push({ label: 'Resend Invitation', onClick: onResend })
    menuItems.push({ label: 'Cancel Invitation', onClick: onCancel, variant: 'danger' })
  }

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
          <Mail className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <div className="font-medium">{invitation.email}</div>
          <div className="text-sm text-gray-500">
            Invited {formatDate(invitation.createdAt)}
            {isExpired && <span className="text-red-500 ml-2">(Expired)</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[invitation.role]}`}>
          {ROLE_LABELS[invitation.role]}
        </span>
        {menuItems.length > 0 && (
          <ActionMenu items={menuItems}>
            <MoreHorizontal className="h-4 w-4" />
          </ActionMenu>
        )}
      </div>
    </div>
  )
}

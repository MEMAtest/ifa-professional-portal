/**
 * Edit User Dialog Component
 * Dialog for editing user details and role
 */

'use client'

import React, { useState, useEffect } from 'react'
import { User, Shield, Phone, Save } from 'lucide-react'
import { useFirmUsers } from '../../hooks/useFirmUsers'
import { usePermissions } from '../../hooks/usePermissions'
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
import type { FirmUser, UserRole, UserStatus } from '../../types/user.types'

interface EditUserSheetProps {
  user: FirmUser
  open: boolean
  onClose: () => void
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'advisor', label: 'Advisor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Admin' },
]

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'deactivated', label: 'Deactivated', color: 'bg-red-100 text-red-800' },
]

export function EditUserSheet({ user, open, onClose }: EditUserSheetProps) {
  const { updateUserAsync, isUpdating } = useFirmUsers()
  const { isAdmin } = usePermissions()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phone: user.phone ?? '',
    role: user.role,
    status: user.status,
  })

  // Reset form when user changes
  useEffect(() => {
    setFormData({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      role: user.role,
      status: user.status,
    })
  }, [user])

  const handleSave = async () => {
    try {
      await updateUserAsync({
        userId: user.id,
        input: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          role: formData.role,
          status: formData.status,
        },
      })

      toast({
        title: 'Success',
        description: 'User updated successfully',
      })

      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      })
    }
  }

  const hasChanges =
    formData.firstName !== (user.firstName ?? '') ||
    formData.lastName !== (user.lastName ?? '') ||
    formData.phone !== (user.phone ?? '') ||
    formData.role !== user.role ||
    formData.status !== user.status

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user details and permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Identity */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
              {user.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={user.avatarUrl} alt={user.fullName} className="h-12 w-12 rounded-full" />
              ) : (
                <span className="text-lg font-medium text-gray-600">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              )}
            </div>
            <div>
              <div className="font-medium">{user.fullName}</div>
              <div className="text-sm text-gray-500">{user.email || 'No email'}</div>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="inline-block h-4 w-4 mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7xxx xxxxxx"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Selection */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="inline-block h-4 w-4 mr-1" />
                Role
              </label>
              <div className="flex gap-2">
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: option.value })}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                      formData.role === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status (for deactivation/reactivation) */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: option.value })}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                      formData.status === option.value
                        ? `${option.color} border-current`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {formData.status === 'deactivated' && formData.status !== user.status && (
                <p className="mt-2 text-sm text-amber-600">
                  This user will lose access to the platform.
                </p>
              )}
            </div>
          )}

          {/* User Stats */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Activity</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Joined:</span>
                <span className="ml-2">
                  {new Intl.DateTimeFormat('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(user.createdAt))}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last login:</span>
                <span className="ml-2">
                  {user.lastLoginAt
                    ? new Intl.DateTimeFormat('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(user.lastLoginAt))
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

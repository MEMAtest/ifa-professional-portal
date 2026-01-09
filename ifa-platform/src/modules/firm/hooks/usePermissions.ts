/**
 * Firm Module - usePermissions Hook
 * React hooks for permission checking
 */

'use client'

import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  type Permission,
} from '../types/permission.types'
import type { UserRole } from '../types/user.types'

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { user } = useAuth()

  // Get user's role from the profile
  const role = useMemo((): UserRole => {
    const userRole = user?.role || 'advisor'
    return userRole as UserRole
  }, [user])

  // Get all permissions for the current user's role
  const permissions = useMemo(() => {
    return getPermissionsForRole(role)
  }, [role])

  // Permission checking functions bound to the current user's role
  const can = useMemo(() => {
    return (permission: Permission) => hasPermission(role, permission)
  }, [role])

  const canAny = useMemo(() => {
    return (permissions: Permission[]) => hasAnyPermission(role, permissions)
  }, [role])

  const canAll = useMemo(() => {
    return (permissions: Permission[]) => hasAllPermissions(role, permissions)
  }, [role])

  // Convenience booleans for common permission checks
  const isAdmin = role === 'admin'
  const isSupervisor = role === 'supervisor'
  const isAdvisor = role === 'advisor'

  const canManageUsers = can('users:read')
  const canInviteUsers = can('users:invite')
  const canEditUsers = can('users:edit')
  const canDeleteUsers = can('users:deactivate')
  const canEditFirm = can('firm:edit')
  const canApproveAssessments = can('assessments:approve')
  const canAssignReviews = can('reviews:assign')
  const canDeleteClients = can('clients:delete')
  const canReassignClients = can('clients:reassign')
  const canAccessCompliance = can('compliance:read')

  return {
    role,
    permissions,
    can,
    canAny,
    canAll,
    // Role checks
    isAdmin,
    isSupervisor,
    isAdvisor,
    // Common permission checks
    canManageUsers,
    canInviteUsers,
    canEditUsers,
    canDeleteUsers,
    canEditFirm,
    canApproveAssessments,
    canAssignReviews,
    canDeleteClients,
    canReassignClients,
    canAccessCompliance,
  }
}

/**
 * Hook to check a specific permission
 * Returns true if user has the permission, false otherwise
 */
export function useHasPermission(permission: Permission): boolean {
  const { can } = usePermissions()
  return can(permission)
}

/**
 * Hook to check multiple permissions (any)
 * Returns true if user has any of the permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { canAny } = usePermissions()
  return canAny(permissions)
}

/**
 * Hook to check multiple permissions (all)
 * Returns true if user has all of the permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { canAll } = usePermissions()
  return canAll(permissions)
}

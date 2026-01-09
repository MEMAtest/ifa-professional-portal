/**
 * Firm Module - PermissionGate Component
 * Conditionally renders children based on user permissions
 */

'use client'

import { type ReactNode } from 'react'
import { usePermissions, useHasPermission, useHasAnyPermission, useHasAllPermissions } from '../hooks/usePermissions'
import type { Permission } from '../types/permission.types'
import type { UserRole } from '../types/user.types'

interface PermissionGateProps {
  children: ReactNode
  /** Single permission required */
  permission?: Permission
  /** Any of these permissions required */
  anyOf?: Permission[]
  /** All of these permissions required */
  allOf?: Permission[]
  /** Specific role required */
  role?: UserRole
  /** Roles allowed */
  roles?: UserRole[]
  /** Fallback content when access denied */
  fallback?: ReactNode
  /** If true, shows nothing when access denied (default: shows fallback) */
  silent?: boolean
}

/**
 * Component that conditionally renders children based on permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission="users:invite">
 *   <InviteButton />
 * </PermissionGate>
 *
 * @example
 * // Any of multiple permissions
 * <PermissionGate anyOf={['users:edit', 'users:invite']}>
 *   <UserManagement />
 * </PermissionGate>
 *
 * @example
 * // All permissions required
 * <PermissionGate allOf={['firm:edit', 'users:invite']}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // Role-based
 * <PermissionGate roles={['admin', 'supervisor']}>
 *   <ComplianceDashboard />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  anyOf,
  allOf,
  role: requiredRole,
  roles,
  fallback = null,
  silent = false,
}: PermissionGateProps) {
  const { role, can, canAny, canAll } = usePermissions()

  // Check single permission
  if (permission && !can(permission)) {
    return silent ? null : <>{fallback}</>
  }

  // Check any of permissions
  if (anyOf && anyOf.length > 0 && !canAny(anyOf)) {
    return silent ? null : <>{fallback}</>
  }

  // Check all permissions
  if (allOf && allOf.length > 0 && !canAll(allOf)) {
    return silent ? null : <>{fallback}</>
  }

  // Check specific role
  if (requiredRole && role !== requiredRole) {
    return silent ? null : <>{fallback}</>
  }

  // Check roles array
  if (roles && roles.length > 0 && !roles.includes(role)) {
    return silent ? null : <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Component that shows children only for admins
 */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate role="admin" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Component that shows children for supervisors and admins
 */
export function SupervisorOrAdmin({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate roles={['supervisor', 'admin']} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Component that shows children only if user can manage users
 */
export function CanManageUsers({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate permission="users:read" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Component that shows children only if user can invite users
 */
export function CanInviteUsers({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate permission="users:invite" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

/**
 * Component that shows children only if user can edit firm settings
 */
export function CanEditFirm({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate permission="firm:edit" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

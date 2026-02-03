/**
 * Firm Module - Permission Type Definitions
 * Role-based access control (RBAC) system
 */

import type { UserRole } from './user.types'

export type Permission =
  // Client management
  | 'clients:read'
  | 'clients:write'
  | 'clients:delete'
  | 'clients:reassign'
  // Assessments
  | 'assessments:read'
  | 'assessments:write'
  | 'assessments:approve'
  // User management
  | 'users:read'
  | 'users:invite'
  | 'users:edit'
  | 'users:deactivate'
  // Firm settings
  | 'firm:read'
  | 'firm:edit'
  // Compliance
  | 'compliance:read'
  | 'compliance:write'
  // File reviews
  | 'reviews:read'
  | 'reviews:assign'
  | 'reviews:complete'

/**
 * Permission matrix defining which roles have which permissions
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  advisor: [
    'clients:read',
    'clients:write',
    'assessments:read',
    'assessments:write',
    'firm:read',
    'reviews:read',
  ],
  supervisor: [
    'clients:read',
    'clients:write',
    'clients:delete',
    'clients:reassign',
    'assessments:read',
    'assessments:write',
    'assessments:approve',
    'users:read',
    'firm:read',
    'compliance:read',
    'compliance:write',
    'reviews:read',
    'reviews:assign',
    'reviews:complete',
  ],
  compliance: [
    'clients:read',
    'assessments:read',
    'firm:read',
    'compliance:read',
    'compliance:write',
    'reviews:read',
    'reviews:assign',
    'reviews:complete',
  ],
  admin: [
    'clients:read',
    'clients:write',
    'clients:delete',
    'clients:reassign',
    'assessments:read',
    'assessments:write',
    'assessments:approve',
    'users:read',
    'users:invite',
    'users:edit',
    'users:deactivate',
    'firm:read',
    'firm:edit',
    'compliance:read',
    'compliance:write',
    'reviews:read',
    'reviews:assign',
    'reviews:complete',
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Route protection configuration
 */
export const PROTECTED_ROUTES: Record<string, Permission[]> = {
  '/settings/users': ['users:read'],
  '/settings/firm': ['firm:edit'],
  '/compliance': ['compliance:read'],
  '/file-reviews/assign': ['reviews:assign'],
}

/**
 * Firm Module
 * Multi-tenant firm management, user management, and RBAC
 *
 * @example
 * import { useFirm, usePermissions, PermissionGate } from '@/modules/firm'
 */

// Types
export * from './types/firm.types'
export * from './types/user.types'
export * from './types/permission.types'

// API clients
export * from './api/firm.api'
export * from './api/user.api'
export * from './api/invite.api'

// Hooks
export * from './hooks/useFirm'
export * from './hooks/useFirmUsers'
export * from './hooks/usePermissions'

// Components
export * from './components/PermissionGate'
export * from './components/FirmSettingsPanel'
export * from './components/UserManagement'

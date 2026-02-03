/**
 * Firm Module - User Type Definitions
 * Defines firm user and invitation types
 */

export type UserRole = 'advisor' | 'supervisor' | 'compliance' | 'admin'
export type UserStatus = 'active' | 'invited' | 'deactivated'

export interface FirmUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: UserRole
  status: UserStatus
  firmId: string
  avatarUrl?: string
  phone?: string
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface FirmUserCreateInput {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
}

export interface FirmUserUpdateInput {
  firstName?: string
  lastName?: string
  role?: UserRole
  status?: UserStatus
  phone?: string
  avatarUrl?: string
}

export interface UserInvitation {
  id: string
  firmId: string
  email: string
  role: UserRole
  invitedBy?: string
  invitedByName?: string
  token: string
  expiresAt: Date
  acceptedAt?: Date
  createdAt: Date
}

export interface InviteUserInput {
  email: string
  role: UserRole
}

export interface AcceptInviteInput {
  token: string
  firstName: string
  lastName: string
  password: string
}

export interface ReassignClientsInput {
  clientIds: string[]
  newAdvisorId: string
  transferAssessments: boolean
  reason?: string
}

export interface UserCaseload {
  userId: string
  userName: string
  clientCount: number
  activeAssessments: number
  pendingReviews: number
}

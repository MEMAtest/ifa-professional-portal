/**
 * Firm Module - User API Client
 * Client-side API functions for user management
 */

import type { FirmUser, FirmUserUpdateInput, UserCaseload, ReassignClientsInput } from '../types/user.types'

const API_BASE = '/api/firm/users'

export interface UserApiResponse<T> {
  data?: T
  error?: string
}

/**
 * Get all users in the firm
 */
export async function getFirmUsers(): Promise<UserApiResponse<FirmUser[]>> {
  try {
    const response = await fetch(API_BASE, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to fetch users' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Get a specific user by ID
 */
export async function getUser(userId: string): Promise<UserApiResponse<FirmUser>> {
  try {
    const response = await fetch(`${API_BASE}/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to fetch user' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Update a user's profile
 */
export async function updateUser(userId: string, input: FirmUserUpdateInput): Promise<UserApiResponse<FirmUser>> {
  try {
    const response = await fetch(`${API_BASE}/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to update user' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Deactivate a user
 */
export async function deactivateUser(userId: string): Promise<UserApiResponse<FirmUser>> {
  return updateUser(userId, { status: 'deactivated' })
}

/**
 * Reactivate a user
 */
export async function reactivateUser(userId: string): Promise<UserApiResponse<FirmUser>> {
  return updateUser(userId, { status: 'active' })
}

/**
 * Change a user's role
 */
export async function changeUserRole(userId: string, role: FirmUser['role']): Promise<UserApiResponse<FirmUser>> {
  return updateUser(userId, { role })
}

/**
 * Get caseload for all advisors in the firm
 */
export async function getAdvisorCaseloads(): Promise<UserApiResponse<UserCaseload[]>> {
  try {
    const response = await fetch(`${API_BASE}/caseloads`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to fetch caseloads' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Reassign clients from one advisor to another
 */
export async function reassignClients(input: ReassignClientsInput): Promise<UserApiResponse<{ reassignedCount: number }>> {
  try {
    const response = await fetch('/api/clients/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to reassign clients' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Send password reset email to a user
 */
export async function sendPasswordReset(userId: string): Promise<UserApiResponse<{ sent: boolean }>> {
  try {
    const response = await fetch(`${API_BASE}/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to send password reset' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

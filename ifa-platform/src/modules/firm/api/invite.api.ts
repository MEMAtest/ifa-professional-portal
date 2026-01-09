/**
 * Firm Module - Invitation API Client
 * Client-side API functions for user invitations
 */

import type { UserInvitation, InviteUserInput, AcceptInviteInput } from '../types/user.types'

const API_BASE = '/api/firm/invite'

export interface InviteApiResponse<T> {
  data?: T
  error?: string
}

/**
 * Get all pending invitations for the firm
 */
export async function getPendingInvitations(): Promise<InviteApiResponse<UserInvitation[]>> {
  try {
    const response = await fetch(API_BASE, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to fetch invitations' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Send a new user invitation
 */
export async function inviteUser(input: InviteUserInput): Promise<InviteApiResponse<UserInvitation>> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to send invitation' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Resend an existing invitation
 */
export async function resendInvitation(invitationId: string): Promise<InviteApiResponse<UserInvitation>> {
  try {
    const response = await fetch(`${API_BASE}/${invitationId}/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to resend invitation' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Cancel/revoke an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<InviteApiResponse<{ cancelled: boolean }>> {
  try {
    const response = await fetch(`${API_BASE}/${invitationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to cancel invitation' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Verify an invitation token (public endpoint)
 */
export async function verifyInvitationToken(token: string): Promise<InviteApiResponse<{ valid: boolean; email: string; firmName: string; role: string }>> {
  try {
    const response = await fetch(`/api/auth/verify-invite?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Invalid or expired invitation' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Accept an invitation and create account (public endpoint)
 */
export async function acceptInvitation(input: AcceptInviteInput): Promise<InviteApiResponse<{ success: boolean }>> {
  try {
    const response = await fetch('/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to accept invitation' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

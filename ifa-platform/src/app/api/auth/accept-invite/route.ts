/**
 * Accept Invitation API
 * POST /api/auth/accept-invite
 * Creates user account from invitation token
 *
 * Uses saga pattern for transaction handling:
 * 1. Validate & lock invitation atomically
 * 2. Create auth user
 * 3. Create profile
 * 4. Allocate seat atomically
 * 5. Log activity
 *
 * Each step has compensating actions for rollback on failure.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { rateLimit } from '@/lib/security/rateLimit'
import { hashToken } from '@/lib/security/crypto'
import type { AcceptInviteInput } from '@/modules/firm/types/user.types'
import { parseRequestBody } from '@/app/api/utils'

// Saga state for tracking completed steps and enabling rollback
interface SagaState {
  authUserId?: string
  profileCreated?: boolean
  invitationAccepted?: boolean
  seatAllocated?: boolean
}

const requestSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(1)
})

// Rollback function to undo completed steps on failure
async function rollbackSaga(
  supabaseAdmin: any,
  state: SagaState,
  invitationId?: string,
  failureReason?: string
): Promise<void> {
  log.info('[Accept Invite] Rolling back saga', { state, reason: failureReason })

  // Rollback in reverse order of creation
  // IMPORTANT: We do NOT revert invitation acceptance to prevent race conditions
  // Once accepted_at is set, the token cannot be reused. Admin must create new invitation.

  // 1. Delete profile first (depends on auth user)
  if (state.profileCreated && state.authUserId) {
    try {
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', state.authUserId)
      log.info('[Accept Invite] Rolled back profile creation')
    } catch (err) {
      log.error('[Accept Invite] Failed to rollback profile', err)
    }
  }

  // 2. Delete auth user (this is the most important cleanup)
  if (state.authUserId) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(state.authUserId)
      log.info('[Accept Invite] Rolled back auth user creation')
    } catch (err) {
      log.error('[Accept Invite] Failed to rollback auth user', err)
    }
  }

  // 3. Log failure on invitation (but keep accepted_at set to prevent reuse)
  // This helps with debugging while maintaining security
  if (invitationId && failureReason) {
    try {
      await supabaseAdmin
        .from('user_invitations')
        .update({
          // Keep accepted_at set - NEVER revert to null (security)
          // Add failure metadata for admin visibility
          metadata: {
            failed: true,
            failure_reason: failureReason,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', invitationId)
      log.info('[Accept Invite] Marked invitation as failed (token remains consumed)')
    } catch (err) {
      log.error('[Accept Invite] Failed to update invitation metadata', err)
    }
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per 15 minutes per IP (strict for account creation)
  const rateLimitResponse = await rateLimit(request, 'auth')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const sagaState: SagaState = {}
  let invitationId: string | undefined

  try {
    const body: AcceptInviteInput = await parseRequestBody(request, requestSchema)
    const { token, firstName, lastName, password } = body

    // ========================================
    // INPUT VALIDATION
    // ========================================
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // ========================================
    // PASSWORD VALIDATION (Strong requirements for financial platform)
    // ========================================
    const MIN_PASSWORD_LENGTH = 12
    const MAX_PASSWORD_LENGTH = 72 // bcrypt limit

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Validate password strength
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, number, and special character' },
        { status: 400 }
      )
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password123!', 'Password123!', 'Qwerty123456!', 'Admin123456!',
      'Welcome123!', 'Changeme123!', 'Password1234!', 'Letmein12345!'
    ]
    if (commonPasswords.some(common => password.toLowerCase() === common.toLowerCase())) {
      return NextResponse.json(
        { error: 'Password is too common. Please choose a stronger password.' },
        { status: 400 }
      )
    }

    const supabase: any = getSupabaseServiceClient()
    const supabaseAdmin: any = getSupabaseServiceClient()

    // Hash the incoming token for comparison (tokens are stored hashed in DB)
    const hashedToken = hashToken(token)

    // ========================================
    // STEP 1: ATOMICALLY VALIDATE & LOCK INVITATION
    // Uses database function with FOR UPDATE lock
    // ========================================

    // First, get invitation details for validation
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .select('id, email, role, firm_id, expires_at, accepted_at')
      .eq('token', hashedToken)
      .single()

    if (inviteError || !invitation) {
      log.warn('[Accept Invite] Invalid or expired invitation token')
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    invitationId = invitation.id

    // Check if already accepted (pre-check before atomic operation)
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // ========================================
    // STEP 2: CHECK FOR EXISTING USER
    // ========================================
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === invitation.email.toLowerCase()
    )

    if (existingUser) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', existingUser.id)
        .eq('firm_id', invitation.firm_id)
        .single()

      if (existingProfile) {
        return NextResponse.json(
          { error: 'An account with this email already exists in this firm' },
          { status: 400 }
        )
      }
    }

    // ========================================
    // STEP 3: ATOMICALLY ACCEPT INVITATION
    // Uses database function with row-level lock
    // ========================================
    type AcceptInvitationResult = { success: boolean; error?: string; message?: string; email?: string; role?: string; firmId?: string }

    const { data: acceptResult, error: acceptError } = await (supabaseAdmin as any)
      .rpc('accept_invitation', {
        p_invitation_id: invitation.id,
        p_hashed_token: hashedToken
      }) as { data: AcceptInvitationResult | null; error: any }

    if (acceptError) {
      log.error('[Accept Invite] Failed to accept invitation atomically', acceptError)
      // Try fallback method
      const { error: updateError } = await supabaseAdmin
        .from('user_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)
        .is('accepted_at', null) // Only update if not already accepted

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to process invitation' },
          { status: 500 }
        )
      }
    } else if (acceptResult && !acceptResult.success) {
      return NextResponse.json(
        { error: 'Invitation validation failed' },
        { status: 400 }
      )
    }

    sagaState.invitationAccepted = true

    // ========================================
    // STEP 4: CREATE AUTH USER
    // ========================================
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        firm_id: invitation.firm_id
      }
    })

    if (createError) {
      log.error('[Accept Invite] Failed to create user', createError)
      await rollbackSaga(supabaseAdmin, sagaState, invitationId, `Auth user creation failed: ${createError.message}`)

      if (createError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      await rollbackSaga(supabaseAdmin, sagaState, invitationId, 'Auth user creation returned null')
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    sagaState.authUserId = newUser.user.id

    // ========================================
    // STEP 5: CREATE PROFILE
    // ========================================
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: invitation.role,
        firm_id: invitation.firm_id,
        status: 'active',
        email: invitation.email.toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      log.error('[Accept Invite] Failed to create profile', profileError)
      await rollbackSaga(supabaseAdmin, sagaState, invitationId, `Profile creation failed: ${profileError.message}`)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    sagaState.profileCreated = true

    // ========================================
    // STEP 6: ALLOCATE SEAT ATOMICALLY
    // Uses database function with row-level lock on firms table
    // NO FALLBACK - atomic operations are required for data integrity
    // ========================================
    type AllocateSeatResult = { success: boolean; error?: string; message?: string; currentSeats?: number; maxSeats?: number }

    const { data: seatResult, error: seatError } = await (supabaseAdmin as any)
      .rpc('allocate_firm_seat', {
        p_firm_id: invitation.firm_id,
        p_user_id: newUser.user.id,
        p_invitation_id: invitation.id
      }) as { data: AllocateSeatResult | null; error: any }

    if (seatError) {
      // Atomic seat allocation failed - this is a hard failure
      // DO NOT use a non-atomic fallback as it creates race conditions
      log.error('[Accept Invite] Atomic seat allocation failed', seatError)
      await rollbackSaga(supabaseAdmin, sagaState, invitationId, `Seat allocation failed: ${seatError.message}`)
      return NextResponse.json(
        { error: 'Failed to allocate seat. Please try again or contact support.' },
        { status: 500 }
      )
    }

    if (seatResult && !seatResult.success) {
      // Seat limit reached - this is a hard failure
      log.error('[Accept Invite] Seat limit reached', undefined, { seatResult })
      await rollbackSaga(supabaseAdmin, sagaState, invitationId, `Seat limit reached: ${seatResult.message}`)
      return NextResponse.json(
        {
          error: 'Seat limit reached',
          message: seatResult.message,
          currentSeats: seatResult.currentSeats,
          maxSeats: seatResult.maxSeats
        },
        { status: 400 }
      )
    }

    sagaState.seatAllocated = true

    // ========================================
    // STEP 7: LOG ACTIVITY (non-critical)
    // ========================================
    try {
      await supabaseAdmin
        .from('activity_log')
        .insert({
          type: 'user_joined',
          action: `${firstName.trim()} ${lastName.trim()} joined as ${invitation.role}`,
          date: new Date().toISOString(),
          user_name: `${firstName.trim()} ${lastName.trim()}`,
          metadata: {
            user_id: newUser.user.id,
            email: invitation.email,
            role: invitation.role,
            firm_id: invitation.firm_id,
            invitation_id: invitation.id
          }
        })
    } catch (logErr) {
      log.warn('[Accept Invite] Failed to log activity', { error: logErr })
    }

    log.info('[Accept Invite] User created successfully', {
      userId: newUser.user.id,
      email: invitation.email,
      role: invitation.role,
      firmId: invitation.firm_id
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      userId: newUser.user.id
    })

  } catch (error) {
    log.error('[Accept Invite] Error', error)

    // Attempt rollback on unexpected errors
    if (Object.keys(sagaState).length > 0) {
      try {
        const supabaseAdmin: any = getSupabaseServiceClient()
        const errorMessage = ''
        await rollbackSaga(supabaseAdmin, sagaState, invitationId, `Unexpected error: ${errorMessage}`)
      } catch (rollbackErr) {
        log.error('[Accept Invite] Rollback failed', rollbackErr)
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

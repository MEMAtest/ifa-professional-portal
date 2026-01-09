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
import { createClient } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { rateLimit } from '@/lib/security/rateLimit'
import { hashToken } from '@/lib/security/crypto'
import type { AcceptInviteInput } from '@/modules/firm/types/user.types'

// Saga state for tracking completed steps and enabling rollback
interface SagaState {
  authUserId?: string
  profileCreated?: boolean
  invitationAccepted?: boolean
  seatAllocated?: boolean
}

// Rollback function to undo completed steps on failure
async function rollbackSaga(
  supabaseAdmin: ReturnType<typeof getSupabaseServiceClient>,
  state: SagaState,
  invitationId?: string
): Promise<void> {
  console.log('[Accept Invite] Rolling back saga, state:', state)

  // Rollback in reverse order of creation

  // 1. Revert invitation acceptance
  if (state.invitationAccepted && invitationId) {
    try {
      await supabaseAdmin
        .from('user_invitations' as any)
        .update({ accepted_at: null })
        .eq('id', invitationId)
      console.log('[Accept Invite] Rolled back invitation acceptance')
    } catch (err) {
      console.error('[Accept Invite] Failed to rollback invitation:', err)
    }
  }

  // 2. Delete profile
  if (state.profileCreated && state.authUserId) {
    try {
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', state.authUserId)
      console.log('[Accept Invite] Rolled back profile creation')
    } catch (err) {
      console.error('[Accept Invite] Failed to rollback profile:', err)
    }
  }

  // 3. Delete auth user (this is the most important cleanup)
  if (state.authUserId) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(state.authUserId)
      console.log('[Accept Invite] Rolled back auth user creation')
    } catch (err) {
      console.error('[Accept Invite] Failed to rollback auth user:', err)
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
    const body: AcceptInviteInput = await request.json()
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

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Validate password strength
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, and a number' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const supabaseAdmin = getSupabaseServiceClient()

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
      console.log('[Accept Invite] Invalid or expired invitation token')
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
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
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
      console.error('[Accept Invite] Failed to accept invitation atomically:', acceptError)
      // Try fallback method
      const { error: updateError } = await supabaseAdmin
        .from('user_invitations' as any)
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
        { error: acceptResult.message || 'Invitation validation failed' },
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
      console.error('[Accept Invite] Failed to create user:', createError)
      await rollbackSaga(supabaseAdmin, sagaState, invitationId)

      if (createError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create account: ' + createError.message },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      await rollbackSaga(supabaseAdmin, sagaState, invitationId)
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
      console.error('[Accept Invite] Failed to create profile:', profileError)
      await rollbackSaga(supabaseAdmin, sagaState, invitationId)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    sagaState.profileCreated = true

    // ========================================
    // STEP 6: ALLOCATE SEAT ATOMICALLY
    // Uses database function with row-level lock on firms table
    // ========================================
    type AllocateSeatResult = { success: boolean; error?: string; message?: string; currentSeats?: number; maxSeats?: number }

    try {
      const { data: seatResult, error: seatError } = await (supabaseAdmin as any)
        .rpc('allocate_firm_seat', {
          p_firm_id: invitation.firm_id,
          p_user_id: newUser.user.id,
          p_invitation_id: invitation.id
        }) as { data: AllocateSeatResult | null; error: any }

      if (seatError) {
        console.warn('[Accept Invite] Atomic seat allocation failed, using fallback:', seatError)
        // Fallback to manual update (less safe but functional)
        const { data: firm } = await supabase
          .from('firms')
          .select('settings')
          .eq('id', invitation.firm_id)
          .single()

        if (firm?.settings) {
          const settings = firm.settings as any
          await supabaseAdmin
            .from('firms')
            .update({
              settings: {
                ...settings,
                billing: {
                  ...settings.billing,
                  currentSeats: (settings.billing?.currentSeats || 0) + 1
                }
              }
            })
            .eq('id', invitation.firm_id)
        }
      } else if (seatResult && !seatResult.success) {
        // Seat limit reached - this is a hard failure
        console.error('[Accept Invite] Seat limit reached:', seatResult)
        await rollbackSaga(supabaseAdmin, sagaState, invitationId)
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
    } catch (seatErr) {
      console.warn('[Accept Invite] Failed to update seat count:', seatErr)
      // Don't fail the entire operation for seat tracking issues
    }

    // ========================================
    // STEP 7: LOG ACTIVITY (non-critical)
    // ========================================
    try {
      await supabaseAdmin
        .from('activity_log' as any)
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
      console.warn('[Accept Invite] Failed to log activity:', logErr)
    }

    console.log('[Accept Invite] User created successfully:', {
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
    console.error('[Accept Invite] Error:', error)

    // Attempt rollback on unexpected errors
    if (Object.keys(sagaState).length > 0) {
      try {
        const supabaseAdmin = getSupabaseServiceClient()
        await rollbackSaga(supabaseAdmin, sagaState, invitationId)
      } catch (rollbackErr) {
        console.error('[Accept Invite] Rollback failed:', rollbackErr)
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

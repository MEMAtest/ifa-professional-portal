/**
 * Accept Invitation API
 * POST /api/auth/accept-invite
 * Creates user account from invitation token
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { AcceptInviteInput } from '@/modules/firm/types/user.types'

export async function POST(request: NextRequest) {
  try {
    const body: AcceptInviteInput = await request.json()
    const { token, firstName, lastName, password } = body

    // Validate input
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

    // Find and validate the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .select('id, email, role, firm_id, expires_at, accepted_at')
      .eq('token', token)
      .single()

    if (inviteError || !invitation) {
      console.log('[Accept Invite] Token not found:', token.slice(0, 8) + '...')
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if already accepted
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

    // Check if email already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    )

    if (existingUser) {
      // Check if they already have a profile in this firm
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

    // Create the user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm since they have a valid invite
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        firm_id: invitation.firm_id
      }
    })

    if (createError) {
      console.error('[Accept Invite] Failed to create user:', createError)

      // Handle specific error cases
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
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create the profile
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

      // Try to clean up the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      } catch (deleteErr) {
        console.error('[Accept Invite] Failed to cleanup auth user:', deleteErr)
      }

      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Mark the invitation as accepted
    // Using raw query since user_invitations may not be in generated types
    const { error: updateError } = await supabaseAdmin
      .from('user_invitations' as any)
      .update({
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.warn('[Accept Invite] Failed to mark invitation as accepted:', updateError)
      // Don't fail the request for this - user is already created
    }

    // Update firm seat count if tracking
    try {
      const { data: firm } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', invitation.firm_id)
        .single()

      if (firm?.settings) {
        const settings = firm.settings as any
        if (settings.billing?.currentSeats !== undefined) {
          await supabaseAdmin
            .from('firms')
            .update({
              settings: {
                ...settings,
                billing: {
                  ...settings.billing,
                  currentSeats: (settings.billing.currentSeats || 0) + 1
                }
              }
            })
            .eq('id', invitation.firm_id)
        }
      }
    } catch (seatErr) {
      console.warn('[Accept Invite] Failed to update seat count:', seatErr)
    }

    // Log activity (using type cast since activity_log may not have all fields in generated types)
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

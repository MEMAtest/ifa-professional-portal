/**
 * Verify Invitation Token API
 * GET /api/auth/verify-invite?token=xxx
 * Returns invitation details if token is valid
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', code: 'MISSING_TOKEN' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find the invitation by token
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        firm_id,
        invited_by,
        expires_at,
        accepted_at,
        firms!inner (
          name
        )
      `)
      .eq('token', token)
      .single()

    if (error || !invitation) {
      console.log('[Verify Invite] Token not found:', token.slice(0, 8) + '...')
      return NextResponse.json(
        { error: 'Invalid invitation token', code: 'INVALID_TOKEN' },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted', code: 'ACCEPTED' },
        { status: 400 }
      )
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired', code: 'EXPIRED' },
        { status: 400 }
      )
    }

    // Get inviter name if available
    let inviterName = 'Your administrator'
    if (invitation.invited_by) {
      const { data: inviter } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', invitation.invited_by)
        .single()

      if (inviter) {
        inviterName = `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || 'Your administrator'
      }
    }

    // Return invitation details
    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      firmName: (invitation.firms as any)?.name || 'Your firm',
      inviterName,
      expiresAt: expiresAt.toISOString()
    })

  } catch (error) {
    console.error('[Verify Invite] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * User Invitation API Route
 * GET /api/firm/invite - Get pending invitations
 * POST /api/firm/invite - Send a new invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import type { UserInvitation, InviteUserInput } from '@/modules/firm/types/user.types'

function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view invitations
    if (authResult.context.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can view invitations' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const supabase = await createClient()

    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select(`
        id,
        firm_id,
        email,
        role,
        invited_by,
        token,
        expires_at,
        accepted_at,
        created_at
      `)
      .eq('firm_id', firmIdResult.firmId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Invite API] Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    const response: UserInvitation[] = (invitations ?? []).map((inv: {
      id: string
      firm_id: string
      email: string
      role: string
      invited_by: string | null
      token: string
      expires_at: string
      accepted_at: string | null
      created_at: string
    }) => ({
      id: inv.id,
      firmId: inv.firm_id,
      email: inv.email,
      role: inv.role as UserInvitation['role'],
      invitedBy: inv.invited_by ?? undefined,
      token: inv.token,
      expiresAt: new Date(inv.expires_at),
      acceptedAt: inv.accepted_at ? new Date(inv.accepted_at) : undefined,
      createdAt: new Date(inv.created_at),
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Invite API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can send invitations
    if (authResult.context.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can send invitations' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const body: InviteUserInput = await request.json()

    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!body.role || !['advisor', 'supervisor', 'admin'].includes(body.role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check seat limit
    const { data: firm } = await supabase
      .from('firms')
      .select('settings')
      .eq('id', firmIdResult.firmId)
      .single()

    const settings = firm?.settings as { billing?: { maxSeats?: number } } | null
    const maxSeats = settings?.billing?.maxSeats ?? 3

    // Count current active users + pending invitations
    const [{ count: activeUsers }, { count: pendingInvites }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmIdResult.firmId)
        .neq('status', 'deactivated'),
      supabase
        .from('user_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmIdResult.firmId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString()),
    ])

    const totalSeats = (activeUsers ?? 0) + (pendingInvites ?? 0)
    if (totalSeats >= maxSeats) {
      return NextResponse.json(
        {
          error: 'Seat limit reached',
          message: `Your firm has ${maxSeats} seats. Contact support to upgrade.`,
          currentSeats: totalSeats,
          maxSeats,
        },
        { status: 400 }
      )
    }

    // Check if email already has a pending invitation
    const { data: existingInvite } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('firm_id', firmIdResult.firmId)
      .eq('email', body.email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Invitation already pending for this email' },
        { status: 400 }
      )
    }

    // Check if email already exists in the firm
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('firm_id', firmIdResult.firmId)
      // Would need to check auth.users for email - skipped for now
      .limit(1)

    // Create invitation
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .insert({
        firm_id: firmIdResult.firmId,
        email: body.email.toLowerCase(),
        role: body.role,
        invited_by: authResult.context.userId,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Invite API] Error creating invitation:', error)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // TODO: Send email with invitation link
    // For now, return the invitation with token
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/accept-invite?token=${token}`

    const response: UserInvitation & { inviteUrl: string } = {
      id: invitation.id,
      firmId: invitation.firm_id,
      email: invitation.email,
      role: invitation.role as UserInvitation['role'],
      invitedBy: invitation.invited_by ?? undefined,
      token: invitation.token,
      expiresAt: new Date(invitation.expires_at),
      acceptedAt: undefined,
      createdAt: new Date(invitation.created_at),
      inviteUrl,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[Invite API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

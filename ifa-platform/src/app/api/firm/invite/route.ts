export const dynamic = 'force-dynamic'

/**
 * User Invitation API Route
 * GET /api/firm/invite - Get pending invitations
 * POST /api/firm/invite - Send a new invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { rateLimit } from '@/lib/security/rateLimit'
import { generateTokenPair } from '@/lib/security/crypto'

import type { UserInvitation, InviteUserInput } from '@/modules/firm/types/user.types'
import type { Json } from '@/types/db'
import { log } from '@/lib/logging/structured'
import { parseRequestBody } from '@/app/api/utils'

const inviteSchema = z.object({
  email: z.string().min(1),
  role: z.enum(['advisor', 'supervisor', 'admin'])
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Block client-role users; allow admin, advisor, compliance, and null (firm creator during onboarding)
    if (authResult.context.role === 'client') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Clients cannot view invitations' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const supabase: any = getSupabaseServiceClient()

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
      // Gracefully handle missing user_invitations table
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json([])
      }
      log.error('[Invite API] Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // SECURITY: Never expose tokens in responses - they should only be in invitation emails
  const response: Omit<UserInvitation, 'token'>[] = (invitations ?? []).map((inv: {
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
      // token intentionally omitted for security
      expiresAt: new Date(inv.expires_at),
      acceptedAt: inv.accepted_at ? new Date(inv.accepted_at) : undefined,
      createdAt: new Date(inv.created_at),
    }))

    return NextResponse.json(response)
  } catch (error) {
    log.error('[Invite API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 invitations per hour per IP
  const rateLimitResponse = await rateLimit(request, 'invite')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Block client-role users; allow admin, advisor, compliance, and null (firm creator during onboarding)
    if (authResult.context.role === 'client') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Clients cannot send invitations' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const body: InviteUserInput = await parseRequestBody(request, inviteSchema)

    // Validate email with RFC 5322 compliant regex
    // This catches most common email format issues while being permissive enough for real-world use
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    if (!body.email || !emailRegex.test(body.email) || body.email.length > 254) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    // Additional email validation
    const emailParts = body.email.split('@')
    if (emailParts.length !== 2 || emailParts[0].length > 64 || emailParts[1].length > 253) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check for consecutive dots (invalid in email local part)
    if (/\.\./.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (!body.role || !['advisor', 'supervisor', 'admin'].includes(body.role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 })
    }

    const supabase: any = getSupabaseServiceClient()
    const supabaseService: any = getSupabaseServiceClient()

    // ========================================
    // CHECK FOR EXISTING USER
    // Uses paginated API to handle firms with >1000 users
    // ========================================
    const normalizedEmail = body.email.toLowerCase()
    let emailExists = false
    let page = 1
    const perPage = 1000

    // Iterate through all users with pagination
    while (!emailExists) {
      const { data: usersPage, error: listError } = await supabaseService.auth.admin.listUsers({
        page,
        perPage,
      })

      if (listError) {
        log.error('[Invite API] Error checking existing users:', listError)
        // Don't fail silently - return error to prevent duplicate invites
        return NextResponse.json({ error: 'Failed to validate email' }, { status: 500 })
      }

      if (!usersPage?.users || usersPage.users.length === 0) {
        break // No more users to check
      }

      emailExists = usersPage.users.some(
        (u: any) => u.email?.toLowerCase() === normalizedEmail
      )

      // If we got fewer users than perPage, we've reached the end
      if (usersPage.users.length < perPage) {
        break
      }

      page++

      // Safety limit to prevent infinite loops (100,000 users max)
      if (page > 100) {
        log.warn('[Invite API] Hit pagination safety limit')
        break
      }
    }

    if (emailExists) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Create invitation with hashed token for timing attack protection
    // The plain token goes in the email URL, the hash is stored in DB
    const { token: plainToken, hashedToken } = generateTokenPair()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // ========================================
    // ATOMIC SEAT CHECK + INVITATION CREATION
    // Uses database function with row-level lock to prevent race conditions
    // ========================================
    type CreateInvitationResult = { success: boolean; error?: string; message?: string; invitationId?: string; currentSeats?: number; maxSeats?: number }

    let invitation: { id: string; firm_id: string; email: string; role: string; invited_by: string | null; expires_at: string; created_at: string }

    const { data: createResult, error: rpcError } = await (supabaseService as any)
      .rpc('create_invitation_with_seat_check', {
        p_firm_id: firmIdResult.firmId,
        p_email: body.email.toLowerCase(),
        p_role: body.role,
        p_invited_by: authResult.context.userId,
        p_hashed_token: hashedToken,
        p_expires_at: expiresAt.toISOString()
      }) as { data: CreateInvitationResult | null; error: any }

    if (rpcError) {
      log.warn('[Invite API] Atomic invitation creation failed, using fallback', {
        error: rpcError?.message || String(rpcError)
      })

      // Fallback to manual checks (less safe but functional)
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

      // Create invitation manually
      const { data: manualInvitation, error } = await supabase
        .from('user_invitations')
        .insert({
          firm_id: firmIdResult.firmId,
          email: body.email.toLowerCase(),
          role: body.role,
          invited_by: authResult.context.userId,
          token: hashedToken,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (error || !manualInvitation) {
        log.error('[Invite API] Error creating invitation:', error)
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
      }

      invitation = manualInvitation
    } else if (createResult && !createResult.success) {
      // Atomic function returned an error
      const errorMap: Record<string, number> = {
        'SEAT_LIMIT_REACHED': 400,
        'INVITATION_EXISTS': 400,
        'FIRM_NOT_FOUND': 404,
      }
      const errorMessageMap: Record<string, string> = {
        'SEAT_LIMIT_REACHED': 'Seat limit reached',
        'INVITATION_EXISTS': 'Invitation already pending for this email',
        'FIRM_NOT_FOUND': 'Firm not found'
      }
      const errorCode = createResult.error || 'UNKNOWN'
      const statusCode = errorMap[errorCode] || 400
      const publicMessage = errorMessageMap[errorCode] || 'Failed to create invitation'

      return NextResponse.json(
        {
          error: publicMessage,
          message: publicMessage,
          currentSeats: createResult.currentSeats,
          maxSeats: createResult.maxSeats,
        },
        { status: statusCode }
      )
    } else if (createResult && createResult.success && createResult.invitationId) {
      // Atomic creation succeeded - fetch the full invitation record
      const { data: createdInvitation, error: fetchError } = await supabase
        .from('user_invitations')
        .select('id, firm_id, email, role, invited_by, expires_at, created_at')
        .eq('id', createResult.invitationId)
        .single()

      if (fetchError || !createdInvitation) {
        log.error('[Invite API] Error fetching created invitation:', fetchError)
        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
      }

      invitation = createdInvitation
    } else {
      // Unexpected response from RPC - should not happen
      log.error('[Invite API] Unexpected RPC response:', createResult)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Use plain token in URL (user receives this in email)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/accept-invite?token=${plainToken}`

    // Get firm name and inviter name for the email
    const { data: firmData } = await supabase
      .from('firms')
      .select('name')
      .eq('id', firmIdResult.firmId)
      .single()

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', authResult.context.userId)
      .single()

    const firmName = firmData?.name || 'your firm'
    const inviterName = inviterProfile
      ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim() || 'Your administrator'
      : 'Your administrator'

    // Send invitation email
    let emailSent = false
    let emailError: string | undefined

    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'userInvitation',
          recipient: body.email.toLowerCase(),
          data: {
            inviteeEmail: body.email.toLowerCase(),
            firmName,
            role: body.role,
            inviterName,
            inviteUrl,
            expiresAt: expiresAt.toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          }
        })
      })

      if (emailResponse.ok) {
        emailSent = true
        log.info('[Invite API] Invitation email sent successfully')
      } else {
        const emailResult = await emailResponse.json().catch(() => ({}))
        emailError = emailResult.error || 'Failed to send email'
        log.warn('[Invite API] Failed to send invitation email', { error: emailError })
      }
    } catch (emailErr) {
      emailError = emailErr instanceof Error ? emailErr.message : 'Email service unavailable'
      log.warn('[Invite API] Email sending failed', {
        error: emailErr instanceof Error ? emailErr.message : String(emailErr)
      })
    }

    // ========================================
    // ACTIVITY LOGGING - User invitation sent
    // ========================================
    const { error: activityError } = await supabaseService
      .from('activity_log')
      .insert({
        id: crypto.randomUUID(),
        client_id: null,
        firm_id: firmIdResult.firmId, // Required for RLS policy
        action: `Invitation sent to ${body.email.toLowerCase()} as ${body.role}`,
        type: 'user_invited',
        date: new Date().toISOString(),
        user_name: inviterName,
        metadata: {
          invitation_id: invitation.id,
          invitee_email: body.email.toLowerCase(),
          role: body.role,
          firm_name: firmName,
          performed_by: authResult.context.userId,
          email_sent: emailSent
        } as Json
      })

    if (activityError) {
      log.warn('[Invite API] Failed to log invitation activity', {
        error: activityError instanceof Error ? activityError.message : String(activityError)
      })
    }

    // ========================================
    // HANDLE EMAIL FAILURE
    // If email failed, don't expose the invite URL (contains plain token)
    // Return error status so client knows to handle appropriately
    // ========================================
    if (!emailSent) {
      // Delete the invitation if email failed to prevent orphaned records
      await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitation.id)

      log.error('[Invite API] Email failed - invitation deleted for security')

      return NextResponse.json(
        {
          error: 'Failed to send invitation email',
          message: emailError || 'The email service is unavailable. Please try again later.',
          code: 'EMAIL_FAILED'
        },
        { status: 500 }
      )
    }

    // SECURITY: Only include inviteUrl if email was successfully sent
    // (The plain token is only safe to expose because user received it in email)
    const response: Omit<UserInvitation, 'token'> & { inviteUrl: string; emailSent: boolean } = {
      id: invitation.id,
      firmId: invitation.firm_id,
      email: invitation.email,
      role: invitation.role as UserInvitation['role'],
      invitedBy: invitation.invited_by ?? undefined,
      expiresAt: new Date(invitation.expires_at),
      acceptedAt: undefined,
      createdAt: new Date(invitation.created_at),
      inviteUrl,
      emailSent: true
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    log.error('[Invite API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

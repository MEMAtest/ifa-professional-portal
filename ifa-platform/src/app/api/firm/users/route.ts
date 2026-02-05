export const dynamic = 'force-dynamic'

/**
 * Firm Users API Route
 * GET /api/firm/users - Get all users in the firm
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/security/rateLimit'
import type { FirmUser } from '@/modules/firm/types/user.types'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'

export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute per IP
  const rateLimitResponse = await rateLimit(request, 'api')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only supervisors and admins can view all users
    const role = authResult.context.role
    if (role !== 'admin' && role !== 'supervisor') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only supervisors and admins can view users' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const supabase = getSupabaseServiceClient()

    const { data: profiles, error } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('firm_id', firmIdResult.firmId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('[Users API] Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get emails using RPC function (SECURITY DEFINER to access auth.users, not in generated types)
    const emailMap = new Map<string, string>()
    try {
      const { data: emailData, error: emailError } = await (supabase as any)
        .rpc('get_firm_user_emails', { firm_uuid: firmIdResult.firmId })

      if (emailError) {
        log.warn('[Users API] Unable to load user emails via RPC', {
          error: emailError.message || String(emailError)
        })
      } else if (emailData) {
        for (const item of emailData as { user_id: string; email: string }[]) {
          emailMap.set(item.user_id, item.email)
        }
      }
    } catch (err) {
      log.warn('[Users API] Email RPC failed, continuing without emails', {
        error: err instanceof Error ? err.message : String(err)
      })
    }

    const users: FirmUser[] = (profiles ?? []).map((profile: Record<string, any>) => {
      const fullName = (profile.full_name || profile.fullName || '').trim()
      let firstName = (profile.first_name || profile.firstName || '').trim()
      let lastName = (profile.last_name || profile.lastName || '').trim()

      if ((!firstName || !lastName) && fullName) {
        const parts = fullName.split(' ').filter(Boolean)
        firstName = firstName || parts[0] || ''
        lastName = lastName || parts.slice(1).join(' ')
      }

      const createdAt = profile.created_at ? new Date(profile.created_at) : new Date()
      const updatedAt = profile.updated_at ? new Date(profile.updated_at) : createdAt
      const lastLoginRaw = profile.last_login_at || profile.last_login

      return {
        id: profile.id,
        email: emailMap.get(profile.id) || profile.email || '',
        firstName,
        lastName,
        fullName: fullName || `${firstName} ${lastName}`.trim(),
        role: (profile.role || 'advisor') as FirmUser['role'],
        status: (profile.status ?? 'active') as FirmUser['status'],
        firmId: profile.firm_id ?? '',
        phone: profile.phone ?? undefined,
        avatarUrl: profile.avatar_url ?? undefined,
        lastLoginAt: lastLoginRaw ? new Date(lastLoginRaw) : undefined,
        createdAt,
        updatedAt,
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    log.error('[Users API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

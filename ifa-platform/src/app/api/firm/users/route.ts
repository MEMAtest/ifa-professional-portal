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

    // Get all profiles in the firm with user email (status column not in generated types)
    const { data: profiles, error } = await (supabase
      .from('profiles') as any)
      .select(`
        id,
        first_name,
        last_name,
        role,
        status,
        firm_id,
        phone,
        avatar_url,
        last_login_at,
        created_at,
        updated_at
      `)
      .eq('firm_id', firmIdResult.firmId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Users API] Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get emails using RPC function (SECURITY DEFINER to access auth.users, not in generated types)
    const { data: emailData } = await (supabase as any)
      .rpc('get_firm_user_emails', { firm_uuid: firmIdResult.firmId })

    // Create a map of user_id -> email for quick lookup
    const emailMap = new Map<string, string>()
    if (emailData) {
      for (const item of emailData as { user_id: string; email: string }[]) {
        emailMap.set(item.user_id, item.email)
      }
    }

    const users: FirmUser[] = (profiles ?? []).map((profile: {
      id: string
      first_name: string
      last_name: string
      role: string
      status: string | null
      firm_id: string | null
      phone: string | null
      avatar_url: string | null
      last_login_at: string | null
      created_at: string
      updated_at: string
    }) => ({
      id: profile.id,
      email: emailMap.get(profile.id) || '',
      firstName: profile.first_name,
      lastName: profile.last_name,
      fullName: `${profile.first_name} ${profile.last_name}`.trim(),
      role: profile.role as FirmUser['role'],
      status: (profile.status ?? 'active') as FirmUser['status'],
      firmId: profile.firm_id ?? '',
      phone: profile.phone ?? undefined,
      avatarUrl: profile.avatar_url ?? undefined,
      lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at) : undefined,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error('[Users API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

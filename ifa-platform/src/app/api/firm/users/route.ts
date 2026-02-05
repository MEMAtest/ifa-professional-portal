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

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
  created_at?: string
  last_sign_in_at?: string | null
}

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
    if (!('firmId' in firmIdResult)) {
      return firmIdResult
    }

    const supabase = getSupabaseServiceClient()

    const { data: profiles, error: profilesError } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('firm_id', firmIdResult.firmId)
      .order('created_at', { ascending: false })

    const shouldFallbackToAuth =
      !!profilesError &&
      (profilesError.code === '42P01' ||
        profilesError.code === '42703' ||
        profilesError.message?.includes('does not exist') ||
        profilesError.message?.includes('column'))

    const listFirmAuthUsers = async (): Promise<AuthUser[]> => {
      const firmUsers: AuthUser[] = []
      let page = 1
      const perPage = 1000
      while (true) {
        const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        })
        if (listError) throw listError
        if (!usersPage?.users || usersPage.users.length === 0) break

        for (const user of usersPage.users as AuthUser[]) {
          const metadata = (user.user_metadata || {}) as Record<string, unknown>
          const appMetadata = (user.app_metadata || {}) as Record<string, unknown>
          const userFirmId =
            (metadata.firm_id as string | undefined) ||
            (metadata.firmId as string | undefined) ||
            (appMetadata.firm_id as string | undefined) ||
            (appMetadata.firmId as string | undefined)
          if (userFirmId && userFirmId === firmIdResult.firmId) {
            firmUsers.push(user)
          }
        }

        if (usersPage.users.length < perPage) break
        page += 1
      }
      return firmUsers
    }

    if (profilesError && !shouldFallbackToAuth) {
      log.error('[Users API] Error fetching users:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const shouldLoadAuthUsers =
      shouldFallbackToAuth || (profiles ?? []).some((profile: Record<string, any>) => !profile.email)
    const authUsers = shouldLoadAuthUsers ? await listFirmAuthUsers() : []
    const authUserMap = new Map(authUsers.map((user) => [user.id, user]))

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

      const authUser = authUserMap.get(profile.id)
      const authMetadata = (authUser?.user_metadata || {}) as Record<string, unknown>

      return {
        id: profile.id,
        email: profile.email || authUser?.email || (authMetadata.email as string | undefined) || '',
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

    if (profiles?.length || !shouldFallbackToAuth) {
      return NextResponse.json(users)
    }

    const fallbackUsers: FirmUser[] = authUsers.map((authUser) => {
      const metadata = (authUser.user_metadata || {}) as Record<string, unknown>
      const fullName = (metadata.full_name as string | undefined) || ''
      const firstName = (metadata.first_name as string | undefined) || ''
      const lastName = (metadata.last_name as string | undefined) || ''
      const role =
        (metadata.role as FirmUser['role'] | undefined) ||
        (authUser.app_metadata?.role as FirmUser['role'] | undefined) ||
        'advisor'
      const status = (metadata.status as FirmUser['status'] | undefined) || 'active'

      return {
        id: authUser.id,
        email: authUser.email || '',
        firstName,
        lastName,
        fullName: fullName || `${firstName} ${lastName}`.trim() || 'User',
        role,
        status,
        firmId: firmIdResult.firmId,
        phone: (metadata.phone as string | undefined) || undefined,
        avatarUrl: (metadata.avatar_url as string | undefined) || undefined,
        lastLoginAt: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at) : undefined,
        createdAt: authUser.created_at ? new Date(authUser.created_at) : new Date(),
        updatedAt: authUser.created_at ? new Date(authUser.created_at) : new Date(),
      }
    })

    return NextResponse.json(fallbackUsers)
  } catch (error) {
    log.error('[Users API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

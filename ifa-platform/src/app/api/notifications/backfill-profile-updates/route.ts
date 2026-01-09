export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger } from '@/lib/logging/structured'

type ClientRow = {
  id: string
  personal_details: Record<string, any> | null
  status: string | null
  updated_at: string | null
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json().catch(() => ({}))
    const requestedDays = Number(payload?.days ?? 2)
    const days = Number.isFinite(requestedDays)
      ? Math.min(Math.max(requestedDays, 1), 30)
      : 2
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const service = getSupabaseServiceClient()

    // Type for profile data
    type ProfileData = {
      firm_id?: string | null
      first_name?: string | null
      last_name?: string | null
    }

    const { data: profileData, error: profileError } = await service
      .from('profiles')
      .select('firm_id, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()

    // Cast to handle schema variations
    const profile = profileData as ProfileData | null

    if (profileError) {
      logger.error('Backfill failed to fetch profile', profileError)
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 })
    }

    const firmId = profile?.firm_id ?? null
    let clientsQuery = service
      .from('clients')
      .select('id, personal_details, status, updated_at')
      .gte('updated_at', cutoff)

    if (firmId) {
      clientsQuery = clientsQuery.eq('firm_id', firmId)
    } else {
      logger.info('Backfill using advisor_id fallback', { userId: user.id })
      clientsQuery = clientsQuery.eq('advisor_id', user.id)
    }

    const { data: clients, error: clientsError } = await clientsQuery

    if (clientsError) {
      logger.error('Backfill failed to fetch clients', clientsError)
      return NextResponse.json({ success: false, error: clientsError.message }, { status: 500 })
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, notifications: 0, activities: 0, clients: 0 })
    }

    const clientIds = clients.map((client) => client.id)

    const { data: existingNotifications } = await service
      .from('notifications')
      .select('entity_id')
      .eq('user_id', user.id)
      .eq('type', 'profile_updated')
      .gte('created_at', cutoff)

    const notifiedClientIds = new Set(
      (existingNotifications || []).map((notification) => notification.entity_id).filter(Boolean)
    )

    const { data: existingActivity } = await service
      .from('activity_log')
      .select('client_id')
      .eq('type', 'profile_update')
      .gte('date', cutoff)
      .in('client_id', clientIds)

    const loggedClientIds = new Set(
      (existingActivity || []).map((entry) => entry.client_id).filter(Boolean)
    )

    const nowIso = new Date().toISOString()
    const profileName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
    const userName = (profileName || user.email || '').trim() || null

    const notificationsToInsert = []
    const activitiesToInsert = []

    const formatName = (details: Record<string, any> | null): string => {
      if (!details) return 'Client'
      const first = details.firstName || details.first_name || ''
      const last = details.lastName || details.last_name || ''
      const combined = `${first} ${last}`.trim()
      return combined || 'Client'
    }

    for (const client of clients as ClientRow[]) {
      if (!notifiedClientIds.has(client.id)) {
        notificationsToInsert.push({
          user_id: user.id,
          firm_id: firmId,
          client_id: client.id,
          entity_type: 'client',
          entity_id: client.id,
          type: 'profile_updated',
          title: `Profile updated: ${formatName(client.personal_details)}`,
          message: 'Client profile updated recently',
          action_url: `/clients/${client.id}`,
          priority: 'low',
          read: false,
          created_at: nowIso,
          updated_at: nowIso,
          metadata: {
            backfilled: true,
            updatedAt: client.updated_at
          }
        })
      }

      if (!loggedClientIds.has(client.id)) {
        activitiesToInsert.push({
          id: crypto.randomUUID(),
          client_id: client.id,
          action: 'Profile updated (backfill)',
          type: 'profile_update',
          user_name: userName,
          date: nowIso,
          metadata: {
            backfilled: true,
            updatedAt: client.updated_at
          }
        })
      }
    }

    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await service
        .from('notifications')
        .insert(notificationsToInsert)
      if (insertError) {
        logger.error('Backfill failed to insert notifications', insertError)
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
      }
    }

    if (activitiesToInsert.length > 0) {
      const { error: activityError } = await service
        .from('activity_log')
        .insert(activitiesToInsert)
      if (activityError) {
        logger.error('Backfill failed to insert activity logs', activityError)
        return NextResponse.json({ success: false, error: activityError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      notifications: notificationsToInsert.length,
      activities: activitiesToInsert.length,
      clients: clients.length,
      scope: firmId ? 'firm' : 'advisor'
    })
  } catch (error) {
    logger.error('Backfill profile update notifications failed', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

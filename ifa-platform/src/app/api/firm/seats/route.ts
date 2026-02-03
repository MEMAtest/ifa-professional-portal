export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) return firmIdResult

    const supabase = getSupabaseServiceClient()

    // Get maxSeats from firm settings
    const { data: firm } = await supabase
      .from('firms')
      .select('settings')
      .eq('id', firmIdResult.firmId)
      .single()

    const settings = (firm?.settings as { billing?: { maxSeats?: number } }) || {}
    const maxSeats = settings.billing?.maxSeats ?? 3

    // Count active profiles
    const { count: activeProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmIdResult.firmId)
      .neq('status', 'deactivated')

    // Count pending invitations
    let pendingInvites = 0
    try {
      const { count, error: inviteError } = await supabase
        .from('user_invitations' as any)
        .select('*', { count: 'exact', head: true })
        .eq('firm_id', firmIdResult.firmId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (!inviteError) {
        pendingInvites = count ?? 0
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      log.debug('[Seats API] user_invitations query skipped', { error: errorMessage })
    }

    const currentSeats = (activeProfiles ?? 0) + pendingInvites

    return NextResponse.json({
      data: { maxSeats, currentSeats }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error('[Seats API] Unexpected error', { error: errorMessage })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

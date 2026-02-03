export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
import { log } from '@/lib/logging/structured'

type BillingSettings = {
  billingEmail?: string
  includedSeats?: number
  maxSeats?: number
  currentSeats?: number
  termMonths?: number
  basePrice?: number
  seatPrice?: number
  contractStart?: string
  contractEnd?: string
  autoRenew?: boolean
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripeScheduleId?: string
}

const DEFAULT_INCLUDED_SEATS = 1

function resolveBilling(settings: { billing?: BillingSettings } | null) {
  const billing = settings?.billing ?? {}
  const includedSeats =
    typeof billing.includedSeats === 'number' ? billing.includedSeats : DEFAULT_INCLUDED_SEATS

  return {
    billingEmail: billing.billingEmail ?? null,
    includedSeats,
    maxSeats: billing.maxSeats ?? null,
    currentSeats: billing.currentSeats ?? null,
    termMonths: billing.termMonths ?? null,
    basePrice: billing.basePrice ?? null,
    seatPrice: billing.seatPrice ?? null,
    contractStart: billing.contractStart ?? null,
    contractEnd: billing.contractEnd ?? null,
    autoRenew: billing.autoRenew ?? null,
    stripeCustomerId: billing.stripeCustomerId ?? null,
    stripeSubscriptionId: billing.stripeSubscriptionId ?? null,
    stripeScheduleId: billing.stripeScheduleId ?? null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { firmId: string } }
) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPlatformAdminUser(authResult.context)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabaseServiceClient()
    const firmId = params.firmId

    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('id,name,subscription_tier,settings,created_at,updated_at')
      .eq('id', firmId)
      .single()

    if (firmError || !firm) {
      log.error('[Admin Firm] Error fetching firm:', firmError)
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 })
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,role,last_login_at')
      .eq('firm_id', firmId)
      .order('last_name', { ascending: true })

    if (profileError) {
      log.error('[Admin Firm] Error fetching users:', profileError)
      return NextResponse.json({ error: 'Failed to fetch firm users' }, { status: 500 })
    }

    const billing = resolveBilling(firm.settings as { billing?: BillingSettings } | null)
    const activeUsers = profiles?.length ?? 0
    const billableSeats = Math.max(activeUsers - billing.includedSeats, 0)

    return NextResponse.json({
      firm: {
        id: firm.id,
        name: firm.name,
        subscriptionTier: firm.subscription_tier ?? 'starter',
        createdAt: firm.created_at,
        updatedAt: firm.updated_at,
        activeUsers,
        billableSeats,
        ...billing
      },
      users: profiles ?? []
    })
  } catch (error) {
    log.error('[Admin Firm] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
import { log } from '@/lib/logging/structured'
import { DEFAULT_INCLUDED_SEATS } from '@/lib/billing/firmBilling'

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

type FirmRow = {
  id: string
  name: string
  subscription_tier: string | null
  settings: { billing?: BillingSettings } | null
  created_at: string
  updated_at: string
}

function resolveBilling(settings: FirmRow['settings']) {
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

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPlatformAdminUser(authResult.context)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabaseServiceClient()

    const { data: firms, error: firmError } = await supabase
      .from('firms')
      .select('id,name,subscription_tier,settings,created_at,updated_at')

    if (firmError) {
      log.error('[Admin Firms] Error fetching firms:', firmError)
      return NextResponse.json({ error: 'Failed to fetch firms' }, { status: 500 })
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('firm_id')

    if (profileError) {
      log.error('[Admin Firms] Error fetching profiles:', profileError)
      return NextResponse.json({ error: 'Failed to fetch firm users' }, { status: 500 })
    }

    const userCounts = new Map<string, number>()
    for (const profile of profiles ?? []) {
      if (!profile.firm_id) continue
      userCounts.set(profile.firm_id, (userCounts.get(profile.firm_id) ?? 0) + 1)
    }

    const response = (firms as FirmRow[] | null)?.map((firm) => {
      const billing = resolveBilling(firm.settings)
      const activeUsers = userCounts.get(firm.id) ?? 0
      const billableSeats = Math.max(activeUsers - billing.includedSeats, 0)

      return {
        id: firm.id,
        name: firm.name,
        subscriptionTier: firm.subscription_tier ?? 'starter',
        createdAt: firm.created_at,
        updatedAt: firm.updated_at,
        activeUsers,
        billableSeats,
        ...billing
      }
    }) ?? []

    response.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ firms: response })
  } catch (error) {
    log.error('[Admin Firms] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

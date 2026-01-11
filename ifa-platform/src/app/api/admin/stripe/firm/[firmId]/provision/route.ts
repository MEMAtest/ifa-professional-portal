import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getStripeClient } from '@/lib/billing/stripeClient'
import { BASE_PLAN_PRICES } from '@/lib/billing/stripeConfig'
import { getPlatformBillingConfig, resolveStripePriceConfig } from '@/lib/billing/platformBillingConfig'
import { mergeFirmBillingSettings, type FirmBillingSettings } from '@/lib/billing/firmBilling'

const DEFAULT_INCLUDED_SEATS = 1
const DEFAULT_SEAT_PRICE = 85

function normalizeTerm(value: unknown): 12 | 24 | 36 {
  const term = Number(value)
  if (term === 12 || term === 24 || term === 36) return term
  return 36
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + months)
  return copy
}

export async function POST(
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

    const payload = await request.json().catch(() => ({}))
    const termMonths = normalizeTerm(payload?.termMonths)
    const requestedSeatPrice = Number(payload?.seatPrice)
    const platformConfig = await getPlatformBillingConfig()
    const seatPrice = Number.isFinite(requestedSeatPrice)
      ? requestedSeatPrice
      : (platformConfig?.seat_price ?? DEFAULT_SEAT_PRICE)

    const supabase = getSupabaseServiceClient()
    const firmId = params.firmId

    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('id,name,settings')
      .eq('id', firmId)
      .single()

    if (firmError || !firm) {
      console.error('[Stripe Provision] Firm not found:', firmError)
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 })
    }

    const settings = (firm.settings ?? {}) as { billing?: FirmBillingSettings }
    const billing = settings.billing ?? {}
    const includedSeats =
      typeof billing.includedSeats === 'number' ? billing.includedSeats : DEFAULT_INCLUDED_SEATS

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('firm_id', firmId)

    if (profilesError) {
      console.error('[Stripe Provision] Failed to fetch profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch firm users' }, { status: 500 })
    }

    const activeUsers = profiles?.length ?? 0
    const billableSeats = Math.max(activeUsers - includedSeats, 0)

    const stripe = getStripeClient()
    const priceConfig = resolveStripePriceConfig(platformConfig)

    let stripeCustomerId = billing.stripeCustomerId ?? null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: firm.name,
        email: billing.billingEmail ?? undefined,
        metadata: {
          firmId
        }
      })
      stripeCustomerId = customer.id
    }

    const basePriceId = priceConfig.basePriceIds[termMonths]
    const seatPriceId = priceConfig.seatPriceId

    const items = [
      {
        price: basePriceId,
        quantity: 1
      }
    ]

    if (billableSeats > 0) {
      items.push({
        price: seatPriceId,
        quantity: billableSeats
      })
    }

    const schedule = await stripe.subscriptionSchedules.create({
      customer: stripeCustomerId,
      start_date: 'now',
      end_behavior: 'release',
      phases: [
        {
          items,
          iterations: termMonths,
          proration_behavior: 'create_prorations'
        }
      ]
    })

    const startDate = new Date()
    const contractEnd = addMonths(startDate, termMonths)

    const billingPatch: FirmBillingSettings = {
      termMonths,
      basePrice: BASE_PLAN_PRICES[termMonths],
      seatPrice,
      includedSeats,
      currentSeats: activeUsers,
      stripeCustomerId,
      stripeSubscriptionId: typeof schedule.subscription === 'string' ? schedule.subscription : (schedule.subscription?.id ?? undefined),
      stripeScheduleId: schedule.id,
      stripeBasePriceId: basePriceId,
      stripeSeatPriceId: seatPriceId,
      contractStart: startDate.toISOString(),
      contractEnd: contractEnd.toISOString(),
      autoRenew: true
    }

    const updatedSettings = mergeFirmBillingSettings(settings, billingPatch)

    const { data: updatedFirm, error: updateError } = await supabase
      .from('firms')
      .update({ settings: updatedSettings as any, updated_at: new Date().toISOString() })
      .eq('id', firmId)
      .select('id,name,subscription_tier,settings,created_at,updated_at')
      .single()

    if (updateError || !updatedFirm) {
      console.error('[Stripe Provision] Failed to update firm settings:', updateError)
      return NextResponse.json({ error: 'Failed to update firm settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      firm: {
        id: updatedFirm.id,
        name: updatedFirm.name,
        subscriptionTier: updatedFirm.subscription_tier ?? 'starter',
        settings: updatedFirm.settings
      }
    })
  } catch (error) {
    console.error('[Stripe Provision] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

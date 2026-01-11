import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getStripeClient } from '@/lib/billing/stripeClient'
import { getPlatformBillingConfig, resolveStripePriceConfig } from '@/lib/billing/platformBillingConfig'
import { mergeFirmBillingSettings, type FirmBillingSettings } from '@/lib/billing/firmBilling'

const DEFAULT_INCLUDED_SEATS = 1

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

    const supabase = getSupabaseServiceClient()
    const firmId = params.firmId

    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .select('id,settings')
      .eq('id', firmId)
      .single()

    if (firmError || !firm) {
      console.error('[Stripe Seat Sync] Firm not found:', firmError)
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 })
    }

    const settings = (firm.settings ?? {}) as { billing?: FirmBillingSettings }
    const billing = settings.billing ?? {}
    const stripeSubscriptionId = billing.stripeSubscriptionId
    const stripeCustomerId = billing.stripeCustomerId

    if (!stripeSubscriptionId || !stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe subscription is not linked for this firm.' },
        { status: 400 }
      )
    }

    const includedSeats =
      typeof billing.includedSeats === 'number' ? billing.includedSeats : DEFAULT_INCLUDED_SEATS

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('firm_id', firmId)

    if (profilesError) {
      console.error('[Stripe Seat Sync] Failed to fetch profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch firm users' }, { status: 500 })
    }

    const activeUsers = profiles?.length ?? 0
    const billableSeats = Math.max(activeUsers - includedSeats, 0)

    const stripe = getStripeClient()
    const platformConfig = await getPlatformBillingConfig()
    const priceConfig = resolveStripePriceConfig(platformConfig)
    const seatPriceId = billing.stripeSeatPriceId ?? priceConfig.seatPriceId

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    const seatItem = subscription.items.data.find((item) => item.price.id === seatPriceId)

    if (seatItem && seatItem.quantity === billableSeats) {
      return NextResponse.json({
        success: true,
        billableSeats,
        message: 'Seat counts already aligned.'
      })
    }

    if (billableSeats === 0 && !seatItem) {
      const updatedSettings = mergeFirmBillingSettings(settings, {
        currentSeats: activeUsers,
        includedSeats
      })

      await supabase
        .from('firms')
        .update({ settings: updatedSettings as any, updated_at: new Date().toISOString() })
        .eq('id', firmId)

      return NextResponse.json({ success: true, billableSeats })
    }

    if (seatItem) {
      await stripe.subscriptionItems.update(seatItem.id, {
        quantity: billableSeats,
        proration_behavior: 'create_prorations'
      })
    } else {
      await stripe.subscriptionItems.create({
        subscription: stripeSubscriptionId,
        price: seatPriceId,
        quantity: billableSeats,
        proration_behavior: 'create_prorations'
      })
    }

    await stripe.invoices.create({
      customer: stripeCustomerId,
      subscription: stripeSubscriptionId,
      auto_advance: true
    })

    const billingPatch: FirmBillingSettings = {
      currentSeats: activeUsers,
      includedSeats,
      stripeSeatPriceId: seatPriceId
    }

    const updatedSettings = mergeFirmBillingSettings(settings, billingPatch)

    await supabase
      .from('firms')
      .update({ settings: updatedSettings as any, updated_at: new Date().toISOString() })
      .eq('id', firmId)

    return NextResponse.json({ success: true, billableSeats })
  } catch (error) {
    console.error('[Stripe Seat Sync] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

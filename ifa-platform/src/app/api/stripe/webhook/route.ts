export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { getStripeClient } from '@/lib/billing/stripeClient'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { mergeFirmBillingSettings, type FirmBillingSettings, DEFAULT_INCLUDED_SEATS } from '@/lib/billing/firmBilling'
import { getPlatformBillingConfig, resolveStripePriceConfig } from '@/lib/billing/platformBillingConfig'
import { log } from '@/lib/logging/structured'

function parseStripeDate(value?: number | null): string | null {
  if (!value) return null
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function findFirmByCustomerId(customerId: string) {
  const supabase = getSupabaseServiceClient()

  const { data: firms, error } = await supabase
    .from('firms')
    .select('id,settings')
    .contains('settings', { billing: { stripeCustomerId: customerId } })

  if (error) {
    log.error('[Stripe Webhook] Failed to lookup firm', error)
    return null
  }

  return firms?.[0] ?? null
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient()
  const signature = headers().get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
  }

  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    log.error('[Stripe Webhook] Signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (
      event.type === 'invoice.paid' ||
      event.type === 'invoice.payment_failed'
    ) {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      if (customerId) {
        const firm = await findFirmByCustomerId(customerId)
        if (firm) {
          const settings = (firm.settings ?? {}) as { billing?: FirmBillingSettings }
          const billingPatch: FirmBillingSettings = {
            lastInvoiceStatus: invoice.status ?? undefined,
            lastInvoiceAt: parseStripeDate(invoice.created) ?? new Date().toISOString()
          }
          const updatedSettings = mergeFirmBillingSettings(settings, billingPatch)

          const supabase = getSupabaseServiceClient()
          await supabase
            .from('firms')
            .update({ settings: updatedSettings as any, updated_at: new Date().toISOString() })
            .eq('id', firm.id)
        }
      }
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.created'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      if (customerId) {
        const firm = await findFirmByCustomerId(customerId)
        if (firm) {
          const settings = (firm.settings ?? {}) as { billing?: FirmBillingSettings }
          const currentBilling = settings.billing ?? {}

          // Calculate maxSeats from subscription seat quantity + included seats
          // Seat items in Stripe represent billable (extra) seats beyond included seats
          let maxSeats: number | undefined
          try {
            const platformConfig = await getPlatformBillingConfig()
            const priceConfig = resolveStripePriceConfig(platformConfig)
            const seatPriceId = currentBilling.stripeSeatPriceId ?? priceConfig.seatPriceId
            const includedSeats = currentBilling.includedSeats ?? DEFAULT_INCLUDED_SEATS

            // Find the seat line item in the subscription
            const seatItem = subscription.items.data.find(
              (item) => item.price.id === seatPriceId
            )

            // maxSeats = included seats + billable seats from Stripe
            const billableSeats = seatItem?.quantity ?? 0
            maxSeats = includedSeats + billableSeats

            log.info('[Stripe Webhook] Synced seat count from subscription', {
              firmId: firm.id,
              includedSeats,
              billableSeats,
              maxSeats
            })
          } catch (err) {
            log.warn('[Stripe Webhook] Failed to calculate maxSeats from subscription', {
              error: err instanceof Error ? err.message : String(err)
            })
            // Don't fail the webhook, just skip maxSeats update
          }

          const billingPatch: FirmBillingSettings = {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status ?? undefined,
            contractStart: parseStripeDate(subscription.current_period_start) ?? undefined,
            contractEnd: parseStripeDate(subscription.current_period_end) ?? undefined,
            ...(maxSeats !== undefined && { maxSeats })
          }
          const updatedSettings = mergeFirmBillingSettings(settings, billingPatch)

          const supabase = getSupabaseServiceClient()
          await supabase
            .from('firms')
            .update({ settings: updatedSettings as any, updated_at: new Date().toISOString() })
            .eq('id', firm.id)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    log.error('[Stripe Webhook] Handler error', error)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }
}

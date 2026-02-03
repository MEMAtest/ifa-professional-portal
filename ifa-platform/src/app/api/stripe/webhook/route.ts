export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { getStripeClient } from '@/lib/billing/stripeClient'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { mergeFirmBillingSettings, type FirmBillingSettings } from '@/lib/billing/firmBilling'
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
          const billingPatch: FirmBillingSettings = {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status ?? undefined,
            contractStart: parseStripeDate(subscription.current_period_start) ?? undefined,
            contractEnd: parseStripeDate(subscription.current_period_end) ?? undefined
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

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

type BillingConfigRow = {
  id: string
  stripe_base_price_12m_id: string | null
  stripe_base_price_24m_id: string | null
  stripe_base_price_36m_id: string | null
  stripe_seat_price_id: string | null
  seat_price: number | null
  currency: string
  created_at: string
  updated_at: string
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeSeatPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
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

    const supabase: any = getSupabaseServiceClient()
    const { data, error } = await (supabase as any)
      .from('platform_billing_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('[Billing Config] Failed to fetch config:', error)
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }

    return NextResponse.json({ config: (data?.[0] as BillingConfigRow | undefined) ?? null })
  } catch (error) {
    console.error('[Billing Config] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPlatformAdminUser(authResult.context)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const payload = {
      stripe_base_price_12m_id: normalizeString(body.stripeBasePrice12mId),
      stripe_base_price_24m_id: normalizeString(body.stripeBasePrice24mId),
      stripe_base_price_36m_id: normalizeString(body.stripeBasePrice36mId),
      stripe_seat_price_id: normalizeString(body.stripeSeatPriceId),
      seat_price: normalizeSeatPrice(body.seatPrice),
      currency: normalizeString(body.currency) ?? 'GBP',
      updated_at: new Date().toISOString()
    }

    const supabase: any = getSupabaseServiceClient()

    const { data: existing, error: existingError } = await (supabase as any)
      .from('platform_billing_config')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (existingError) {
      console.error('[Billing Config] Failed to load existing config:', existingError)
      return NextResponse.json({ error: 'Failed to load existing config' }, { status: 500 })
    }

    let result: BillingConfigRow | null = null

    if (existing && existing.length > 0) {
      const { data: updated, error: updateError } = await (supabase as any)
        .from('platform_billing_config')
        .update(payload)
        .eq('id', existing[0].id)
        .select('*')
        .single()

      if (updateError || !updated) {
        console.error('[Billing Config] Failed to update config:', updateError)
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
      }

      result = updated as BillingConfigRow
    } else {
      const { data: inserted, error: insertError } = await (supabase as any)
        .from('platform_billing_config')
        .insert({
          ...payload,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (insertError || !inserted) {
        console.error('[Billing Config] Failed to insert config:', insertError)
        return NextResponse.json({ error: 'Failed to insert config' }, { status: 500 })
      }

      result = inserted as BillingConfigRow
    }

    return NextResponse.json({ config: result })
  } catch (error) {
    console.error('[Billing Config] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

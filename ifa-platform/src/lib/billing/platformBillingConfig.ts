import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getStripePriceConfig } from '@/lib/billing/stripeConfig'

export type PlatformBillingConfig = {
  id: string
  stripe_base_price_12m_id: string | null
  stripe_base_price_24m_id: string | null
  stripe_base_price_36m_id: string | null
  stripe_seat_price_id: string | null
  seat_price: number | null
  currency: string | null
  created_at: string
  updated_at: string
}

function isTableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string; message?: string }
  return err.code === '42P01' || Boolean(err.message?.includes('platform_billing_config'))
}

export async function getPlatformBillingConfig(): Promise<PlatformBillingConfig | null> {
  try {
    const supabase = getSupabaseServiceClient()
    const { data, error } = await supabase
      .from('platform_billing_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      if (isTableMissing(error)) {
        return null
      }
      console.error('[Platform Billing] Failed to fetch config:', error)
      return null
    }

    return (data?.[0] as PlatformBillingConfig | undefined) ?? null
  } catch (error) {
    if (isTableMissing(error)) {
      return null
    }
    console.error('[Platform Billing] Unexpected error:', error)
    return null
  }
}

export function resolveStripePriceConfig(config: PlatformBillingConfig | null) {
  if (
    config?.stripe_base_price_12m_id &&
    config?.stripe_base_price_24m_id &&
    config?.stripe_base_price_36m_id &&
    config?.stripe_seat_price_id
  ) {
    return {
      basePriceIds: {
        12: config.stripe_base_price_12m_id,
        24: config.stripe_base_price_24m_id,
        36: config.stripe_base_price_36m_id
      },
      seatPriceId: config.stripe_seat_price_id
    }
  }

  return getStripePriceConfig()
}

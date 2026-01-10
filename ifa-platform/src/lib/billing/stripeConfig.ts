export const BASE_PLAN_PRICES = {
  12: 500,
  24: 415,
  36: 350
} as const

export type TermMonths = keyof typeof BASE_PLAN_PRICES

type StripePriceConfig = {
  basePriceIds: Record<TermMonths, string>
  seatPriceId: string
}

export function getStripePriceConfig(): StripePriceConfig {
  const base12 = process.env.STRIPE_BASE_PRICE_12M_ID
  const base24 = process.env.STRIPE_BASE_PRICE_24M_ID
  const base36 = process.env.STRIPE_BASE_PRICE_36M_ID
  const seat = process.env.STRIPE_SEAT_PRICE_ID

  if (!base12 || !base24 || !base36 || !seat) {
    throw new Error('Stripe price IDs are not configured')
  }

  return {
    basePriceIds: {
      12: base12,
      24: base24,
      36: base36
    },
    seatPriceId: seat
  }
}

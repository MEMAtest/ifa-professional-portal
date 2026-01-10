export type FirmBillingSettings = {
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
  stripeBasePriceId?: string
  stripeSeatPriceId?: string
  subscriptionStatus?: string
  lastInvoiceStatus?: string
  lastInvoiceAt?: string
}

export type FirmSettingsRecord = {
  billing?: FirmBillingSettings
  [key: string]: unknown
}

export function mergeFirmBillingSettings(
  settings: FirmSettingsRecord | null | undefined,
  patch: FirmBillingSettings
): FirmSettingsRecord {
  const current = settings ?? {}
  const currentBilling = (current.billing ?? {}) as FirmBillingSettings

  return {
    ...current,
    billing: {
      ...currentBilling,
      ...patch
    }
  }
}

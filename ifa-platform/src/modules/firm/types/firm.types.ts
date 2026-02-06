/**
 * Firm Module - Type Definitions
 * Defines firm entity and settings types
 */

export interface FirmAddress {
  line1: string
  line2?: string
  city: string
  postcode: string
  country?: string
}

export interface FirmBranding {
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  reportFooterText?: string
  emailSignature?: string
}

export interface FirmCompliance {
  tr241Enabled: boolean
  consumerDutyEnabled: boolean
  autoReviewReminders: boolean
  reviewFrequencyMonths: number
}

export interface FirmBilling {
  maxSeats: number
  currentSeats: number
  billingEmail?: string
}

export interface FirmFeatures {
  cashFlowModeling: boolean
  aiInsights: boolean
  advancedAnalytics: boolean
}

export interface FirmSettings {
  branding: FirmBranding
  compliance: FirmCompliance
  billing: FirmBilling
  features: FirmFeatures
}

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise'

export interface Firm {
  id: string
  name: string
  fcaNumber?: string
  address?: FirmAddress
  settings: FirmSettings
  subscriptionTier: SubscriptionTier
  createdAt: Date
  updatedAt: Date
}

export interface FirmCreateInput {
  name: string
  fcaNumber?: string
  address?: FirmAddress
  subscriptionTier?: SubscriptionTier
}

export interface FirmUpdateInput {
  name?: string
  fcaNumber?: string
  address?: FirmAddress
  settings?: Partial<FirmSettings>
  subscriptionTier?: SubscriptionTier
}

/**
 * Default firm settings for new firms.
 * NOTE: maxSeats defaults to 1 - actual seat limit should come from Stripe subscription
 * or be configured by admin. Do not hardcode seat limits here.
 */
export const DEFAULT_FIRM_SETTINGS: FirmSettings = {
  branding: {
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
  },
  compliance: {
    tr241Enabled: true,
    consumerDutyEnabled: true,
    autoReviewReminders: true,
    reviewFrequencyMonths: 12,
  },
  billing: {
    maxSeats: 1, // Default to 1 - subscription determines actual limit
    currentSeats: 0,
  },
  features: {
    cashFlowModeling: false,
    aiInsights: false,
    advancedAnalytics: false,
  },
}

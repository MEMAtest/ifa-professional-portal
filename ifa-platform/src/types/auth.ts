// File: src/types/auth.ts
export interface User {
  id: string
  email: string
  role: 'advisor' | 'supervisor' | 'admin' | 'owner' | 'compliance' | 'support' | 'client'
  firmId: string | null
  firstName: string
  lastName: string
  avatarUrl?: string
  phone?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  isPlatformAdmin?: boolean
}

export interface Firm {
  id: string
  name: string
  fcaNumber?: string
  address: Address
  settings: FirmSettings
  subscriptionTier: 'basic' | 'professional' | 'enterprise'
  createdAt: string
  updatedAt: string
}

export interface Address {
  line1: string
  line2?: string
  city: string
  postcode: string
  country: string
}

export interface FirmSettings {
  branding?: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
  }
  compliance?: {
    tr241Enabled: boolean
    consumerDutyEnabled: boolean
    autoReviewReminders: boolean
  }
  features?: {
    cashFlowModeling: boolean
    advancedAnalytics: boolean
    aiInsights: boolean
  }
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  firmName?: string
  fcaNumber?: string
}

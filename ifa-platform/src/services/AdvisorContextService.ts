// ================================================================
// ADVISOR CONTEXT SERVICE
// Centralizes advisor and firm context for reports and documents
// Replaces hardcoded "Professional Advisor" values throughout the app
// ================================================================

import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

// ================================================================
// TYPES
// ================================================================

export interface AdvisorProfile {
  id: string
  fullName: string
  firmId?: string
  title?: string
  qualifications?: string[]
  phone?: string
  role: string
  signatureUrl?: string
}

export interface FirmBranding {
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  footerText?: string
  website?: string
  email?: string
  phone?: string
}

export interface FirmProfile {
  id: string
  name: string
  address?: string
  fcaNumber?: string
  branding?: FirmBranding
}

export interface AdvisorContext {
  advisor: AdvisorProfile
  firm: FirmProfile
}

export interface ReportContext {
  advisorName: string
  advisorTitle: string
  advisorQualifications: string
  advisorSignatureUrl: string
  firmName: string
  firmAddress: string
  firmPhone: string
  firmEmail: string
  firmFcaNumber: string
  firmWebsite: string
  firmLogoUrl: string
  firmPrimaryColor: string
  firmAccentColor: string
  firmFooterText: string
  complianceRef: string
  generatedAt: string
  generatedDate: string
}

// ================================================================
// DEFAULT VALUES (Used when user/firm data is not available)
// ================================================================

const DEFAULT_ADVISOR: AdvisorProfile = {
  id: '',
  fullName: 'Financial Advisor',
  title: '',
  qualifications: [],
  phone: '',
  role: 'advisor',
  firmId: undefined,
  signatureUrl: ''
}

const DEFAULT_FIRM: FirmProfile = {
  id: '',
  name: 'Financial Advisory Services',
  address: '',
  fcaNumber: '',
  branding: {
    logoUrl: '',
    primaryColor: '#1e3a5f',
    accentColor: '#2563eb',
    footerText: 'Confidential - Prepared for the client',
    website: '',
    email: '',
    phone: ''
  }
}

// ================================================================
// ADVISOR CONTEXT SERVICE CLASS
// ================================================================

export class AdvisorContextService {
  private static instance: AdvisorContextService
  private supabase: SupabaseClient<Database>
  private cache: Map<string, { data: AdvisorContext; expiry: number }> = new Map()
  private cacheExpiry = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    if (typeof window === 'undefined') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) {
        throw new Error('Supabase credentials missing for AdvisorContextService')
      }
      this.supabase = createSupabaseClient<Database>(url, key)
    } else {
      this.supabase = createBrowserClient()
    }
  }

  static getInstance(): AdvisorContextService {
    if (!AdvisorContextService.instance) {
      AdvisorContextService.instance = new AdvisorContextService()
    }
    return AdvisorContextService.instance
  }

  /**
   * Get the full advisor context including firm details
   */
  async getContext(userId?: string, firmIdOverride?: string): Promise<AdvisorContext> {
    try {
      // Get current user if not provided
      let advisorId = userId
      if (!advisorId) {
        const {
          data: { user }
        } = await this.supabase.auth.getUser()
        advisorId = user?.id
      }

      if (!advisorId) {
        return { advisor: DEFAULT_ADVISOR, firm: DEFAULT_FIRM }
      }

      const cacheKey = `${advisorId}:${firmIdOverride || ''}`

      // Check cache
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expiry > Date.now()) {
        return cached.data
      }

      // Fetch advisor profile
      const advisor = await this.getAdvisorProfile(advisorId)

      // Fetch firm profile
      const firmId = firmIdOverride || advisor.firmId
      const firm = await this.getFirmProfile(firmId)

      const context: AdvisorContext = { advisor, firm }

      // Cache the result
      this.cache.set(cacheKey, {
        data: context,
        expiry: Date.now() + this.cacheExpiry
      })

      return context

    } catch (error) {
      console.error('[AdvisorContextService] Error getting context:', error)
      return { advisor: DEFAULT_ADVISOR, firm: DEFAULT_FIRM }
    }
  }

  /**
   * Get advisor profile from database
   */
  private async getAdvisorProfile(userId: string): Promise<AdvisorProfile> {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('id, firm_id, first_name, last_name, phone, role, preferences')
        .eq('id', userId)
        .maybeSingle()

      if (error || !profile) {
        console.warn(
          '[AdvisorContextService] Could not fetch advisor profile:',
          error?.message || 'not found'
        )
        return { ...DEFAULT_ADVISOR, id: userId }
      }

      const preferences = (profile.preferences || {}) as any
      const advisorProfile = (preferences.advisorProfile || {}) as any
      const displayNameOverride = (advisorProfile.displayNameOverride || '').trim()

      const firstName = (profile.first_name || '').trim()
      const lastName = (profile.last_name || '').trim()
      const fullName =
        displayNameOverride || `${firstName} ${lastName}`.trim() || DEFAULT_ADVISOR.fullName

      return {
        id: profile.id,
        fullName,
        firmId: profile.firm_id || undefined,
        title: (advisorProfile.title || '').trim(),
        qualifications: Array.isArray(advisorProfile.qualifications) ? advisorProfile.qualifications : [],
        phone: profile.phone || '',
        role: profile.role || 'advisor',
        signatureUrl: (advisorProfile.signatureUrl || '').trim()
      }

    } catch (error) {
      console.error('[AdvisorContextService] Error fetching advisor profile:', error)
      return { ...DEFAULT_ADVISOR, id: userId }
    }
  }

  /**
   * Get firm profile from database
   */
  private async getFirmProfile(firmId?: string): Promise<FirmProfile> {
    try {
      if (!firmId) {
        return DEFAULT_FIRM
      }

      // Fetch firm details
      const { data: firm, error } = await this.supabase
        .from('firms')
        .select('id, name, address, fca_number, settings')
        .eq('id', firmId)
        .maybeSingle()

      if (error || !firm) {
        console.warn(
          '[AdvisorContextService] Could not fetch firm profile:',
          error?.message || 'not found'
        )
        return DEFAULT_FIRM
      }

      return this.mapFirmData(firm)

    } catch (error) {
      console.error('[AdvisorContextService] Error fetching firm profile:', error)
      return DEFAULT_FIRM
    }
  }

  /**
   * Validate that a URL is a safe, valid logo URL (https only)
   */
  private isValidLogoUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false
    const trimmed = url.trim()
    // Only allow https URLs for security
    if (!trimmed.startsWith('https://')) return false
    // Basic URL format validation
    try {
      new URL(trimmed)
      return true
    } catch {
      return false
    }
  }

  /**
   * Validate hex color format
   */
  private isValidHexColor(color: string): boolean {
    if (!color || typeof color !== 'string') return false
    return /^#[0-9A-Fa-f]{6}$/.test(color.trim())
  }

  /**
   * Map database firm data to FirmProfile interface
   */
  private mapFirmData(firm: any): FirmProfile {
    const settings = (firm.settings || {}) as any
    const branding = (settings.branding || {}) as any

    // Handle both 'secondaryColor' (database schema) and 'accentColor' (legacy) field names
    const accentColorValue = branding.secondaryColor || branding.accentColor || ''
    // Handle both 'reportFooterText' (database schema) and 'footerText' (legacy) field names
    const footerTextValue = branding.reportFooterText || branding.footerText || ''

    // Validate logo URL - only use if valid https URL
    const rawLogoUrl = (branding.logoUrl || '').trim()
    const validatedLogoUrl = this.isValidLogoUrl(rawLogoUrl) ? rawLogoUrl : ''

    // Validate colors - use defaults if invalid
    const rawPrimaryColor = (branding.primaryColor || '').trim()
    const rawAccentColor = accentColorValue.trim()
    const validatedPrimaryColor = this.isValidHexColor(rawPrimaryColor)
      ? rawPrimaryColor
      : (DEFAULT_FIRM.branding?.primaryColor || '#1e3a5f')
    const validatedAccentColor = this.isValidHexColor(rawAccentColor)
      ? rawAccentColor
      : (DEFAULT_FIRM.branding?.accentColor || '#2563eb')

    return {
      id: firm.id,
      name: (firm.name || DEFAULT_FIRM.name).trim(),
      address: this.formatFirmAddress(firm.address),
      fcaNumber: (firm.fca_number || '').trim(),
      branding: {
        logoUrl: validatedLogoUrl,
        primaryColor: validatedPrimaryColor,
        accentColor: validatedAccentColor,
        footerText: (footerTextValue || DEFAULT_FIRM.branding?.footerText || '').trim(),
        website: (branding.website || '').trim(),
        email: (branding.email || '').trim(),
        phone: (branding.phone || '').trim()
      }
    }
  }

  private formatFirmAddress(address: any): string {
    if (!address) return ''
    if (typeof address === 'string') return address
    if (typeof address !== 'object') return String(address)

    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.county,
      address.postcode,
      address.country
    ]
      .map((p: any) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean)

    return parts.join(', ')
  }

  /**
   * Get a formatted context object for use in report templates
   */
  async getReportContext(userId?: string, firmIdOverride?: string): Promise<ReportContext> {
    const context = await this.getContext(userId, firmIdOverride)

    const now = new Date()
    const generatedDate = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    // Format qualifications as comma-separated string
    const qualifications = context.advisor.qualifications?.join(', ') || ''
    const branding = context.firm.branding || DEFAULT_FIRM.branding || {}

    return {
      advisorName: context.advisor.fullName,
      advisorTitle: context.advisor.title || '',
      advisorQualifications: qualifications,
      advisorSignatureUrl: context.advisor.signatureUrl || '',
      firmName: context.firm.name,
      firmAddress: context.firm.address || '',
      firmPhone: branding.phone || '',
      firmEmail: branding.email || '',
      firmFcaNumber: context.firm.fcaNumber || '',
      firmWebsite: branding.website || '',
      firmLogoUrl: branding.logoUrl || '',
      firmPrimaryColor: branding.primaryColor || '',
      firmAccentColor: branding.accentColor || '',
      firmFooterText: branding.footerText || '',
      complianceRef: `RPT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`,
      generatedAt: now.toISOString(),
      generatedDate
    }
  }

  /**
   * Get display name for the advisor
   */
  async getAdvisorDisplayName(userId?: string): Promise<string> {
    const context = await this.getContext(userId)
    const title = context.advisor.title ? `${context.advisor.title} ` : ''
    return `${title}${context.advisor.fullName}`
  }

  /**
   * Get display name for the firm
   */
  async getFirmDisplayName(userId?: string, firmIdOverride?: string): Promise<string> {
    const context = await this.getContext(userId, firmIdOverride)
    return context.firm.name
  }

  /**
   * Clear the cache (useful after profile updates)
   */
  clearCache(userId?: string): void {
    if (userId) {
      const prefix = `${userId}:`
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }
}

// ================================================================
// CONVENIENCE EXPORTS
// ================================================================

/**
 * Singleton instance for easy import
 */
export const advisorContextService = AdvisorContextService.getInstance()

/**
 * Quick helper to get report context
 */
export async function getReportContext(userId?: string): Promise<ReportContext> {
  return advisorContextService.getReportContext(userId)
}

/**
 * Quick helper to get advisor name
 */
export async function getAdvisorName(userId?: string): Promise<string> {
  return advisorContextService.getAdvisorDisplayName(userId)
}

/**
 * Quick helper to get firm name
 */
export async function getFirmName(userId?: string): Promise<string> {
  return advisorContextService.getFirmDisplayName(userId)
}

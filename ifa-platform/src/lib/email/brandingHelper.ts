/**
 * Email Branding Helper
 * Applies firm branding to email templates
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

export interface EmailBranding {
  firmName: string
  firmId: string
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  emailSignature?: string
  reportFooterText?: string
  fcaNumber?: string
  address?: {
    line1?: string
    line2?: string
    city?: string
    postcode?: string
  }
}

const DEFAULT_BRANDING: Omit<EmailBranding, 'firmName' | 'firmId'> = {
  primaryColor: '#2563eb', // Blue-600
  secondaryColor: '#1e40af', // Blue-800
}

/**
 * Fetch firm branding from database
 */
export async function getFirmBranding(firmId: string): Promise<EmailBranding | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[emailBranding] Supabase credentials not configured')
    return null
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  const { data: firm, error } = await supabase
    .from('firms')
    .select('id, name, fca_number, settings')
    .eq('id', firmId)
    .maybeSingle()

  if (error || !firm) {
    console.warn('[emailBranding] Failed to fetch firm:', error?.message)
    return null
  }

  const settings = (firm.settings || {}) as Record<string, any>
  const branding = settings.branding || {}

  return {
    firmId: firm.id,
    firmName: firm.name,
    fcaNumber: firm.fca_number || undefined,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    emailSignature: branding.emailSignature,
    reportFooterText: branding.reportFooterText,
    address: branding.address,
  }
}

/**
 * Generate branded email header HTML
 */
export function generateEmailHeader(branding: EmailBranding): string {
  const headerBg = branding.primaryColor
  const textColor = getContrastColor(headerBg)

  let logoHtml = ''
  if (branding.logoUrl) {
    logoHtml = `
      <img
        src="${branding.logoUrl}"
        alt="${branding.firmName}"
        style="max-width: 180px; max-height: 50px; margin-bottom: 10px;"
      />
    `
  }

  return `
    <div style="background: ${headerBg}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
      ${logoHtml}
      <h1 style="color: ${textColor}; margin: 0; font-size: 24px; font-weight: 600;">
        ${branding.firmName}
      </h1>
    </div>
  `
}

/**
 * Generate branded email footer HTML with signature
 */
export function generateEmailFooter(branding: EmailBranding): string {
  const parts: string[] = []

  // Custom email signature (HTML)
  if (branding.emailSignature) {
    parts.push(`
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        ${sanitizeHtml(branding.emailSignature)}
      </div>
    `)
  }

  // Firm details
  const firmDetails: string[] = []
  if (branding.firmName) firmDetails.push(branding.firmName)
  if (branding.fcaNumber) firmDetails.push(`FCA: ${branding.fcaNumber}`)

  if (firmDetails.length > 0 || branding.address) {
    parts.push(`
      <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px; font-size: 12px; color: #6b7280;">
        ${firmDetails.length > 0 ? `<p style="margin: 0 0 5px 0;">${firmDetails.join(' | ')}</p>` : ''}
        ${branding.address ? formatAddress(branding.address) : ''}
        ${branding.reportFooterText ? `<p style="margin: 10px 0 0 0; font-style: italic;">${branding.reportFooterText}</p>` : ''}
      </div>
    `)
  }

  // Standard disclaimer
  parts.push(`
    <p style="margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center;">
      This email was sent by ${branding.firmName}. If you received this in error, please disregard.
    </p>
  `)

  return parts.join('')
}

/**
 * Wrap email content with branding (header + content + footer)
 */
export function wrapWithBranding(
  content: string,
  branding: EmailBranding,
  options: { includeHeader?: boolean; includeFooter?: boolean } = {}
): string {
  const { includeHeader = true, includeFooter = true } = options

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      ${includeHeader ? generateEmailHeader(branding) : ''}
      <div style="padding: 30px;">
        ${content}
      </div>
      ${includeFooter ? generateEmailFooter(branding) : ''}
    </div>
  `
}

/**
 * Apply brand colors to template HTML
 * Replaces generic colors with firm brand colors
 */
export function applyBrandColors(html: string, branding: EmailBranding): string {
  // Replace common blue colors with primary color
  let result = html
    .replace(/#3b82f6/gi, branding.primaryColor) // blue-500
    .replace(/#2563eb/gi, branding.primaryColor) // blue-600
    .replace(/#1e40af/gi, branding.secondaryColor) // blue-800
    .replace(/#1d4ed8/gi, branding.secondaryColor) // blue-700

  return result
}

/**
 * Format address for display
 */
function formatAddress(address: EmailBranding['address']): string {
  if (!address) return ''

  const lines: string[] = []
  if (address.line1) lines.push(address.line1)
  if (address.line2) lines.push(address.line2)
  if (address.city || address.postcode) {
    lines.push([address.city, address.postcode].filter(Boolean).join(', '))
  }

  if (lines.length === 0) return ''

  return `<p style="margin: 5px 0 0 0;">${lines.join('<br>')}</p>`
}

/**
 * Basic HTML sanitization for user-provided signatures
 * Strips dangerous tags while keeping basic formatting
 */
function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')

  return clean
}

/**
 * Get contrasting text color for a background color
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Parse RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

/**
 * Get sender name with firm branding
 */
export function getBrandedSender(branding: EmailBranding, defaultDomain: string = 'resend.dev'): string {
  const domain = process.env.EMAIL_FROM_DOMAIN || defaultDomain
  return `${branding.firmName} <noreply@${domain}>`
}

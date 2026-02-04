/**
 * Email Branding Helper
 * Applies firm branding to email templates
 */

import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import sanitizeHtmlLib from 'sanitize-html'
import type { Database } from '@/types/db'
import clientLogger from '@/lib/logging/clientLogger'

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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Hex color validation regex
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

// URL validation for logos (only https allowed for security)
const SAFE_URL_REGEX = /^https:\/\/[^\s<>"{}|\\^`[\]]+$/

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

/**
 * Validate hex color format
 */
function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color)
}

/**
 * Validate URL is safe (https only)
 */
function isValidUrl(url: string): boolean {
  return SAFE_URL_REGEX.test(url)
}

/**
 * HTML-escape a string to prevent XSS
 */
function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitize HTML content using sanitize-html library
 * Allows safe formatting tags but strips dangerous content
 */
function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''

  return sanitizeHtmlLib(html, {
    allowedTags: [
      'p', 'br', 'b', 'i', 'strong', 'em', 'u', 'span', 'div',
      'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img'
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'span': ['style'],
      'div': ['style'],
      'p': ['style'],
      'table': ['style', 'width', 'cellpadding', 'cellspacing', 'border'],
      'tr': ['style'],
      'td': ['style', 'width', 'colspan', 'rowspan'],
      'th': ['style', 'width', 'colspan', 'rowspan']
    },
    allowedSchemes: ['https', 'mailto'],
    allowedStyles: {
      '*': {
        'color': [/.*/],
        'background': [/.*/],
        'background-color': [/.*/],
        'font-size': [/.*/],
        'font-weight': [/.*/],
        'font-style': [/.*/],
        'text-align': [/.*/],
        'text-decoration': [/.*/],
        'margin': [/.*/],
        'margin-top': [/.*/],
        'margin-bottom': [/.*/],
        'margin-left': [/.*/],
        'margin-right': [/.*/],
        'padding': [/.*/],
        'padding-top': [/.*/],
        'padding-bottom': [/.*/],
        'padding-left': [/.*/],
        'padding-right': [/.*/],
        'border': [/.*/],
        'border-radius': [/.*/],
        'width': [/.*/],
        'max-width': [/.*/]
      }
    },
    transformTags: {
      'a': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    }
  })
}

/**
 * Fetch firm branding from database
 */
export async function getFirmBranding(firmId: string): Promise<EmailBranding | null> {
  // Validate firmId is a valid UUID
  if (!firmId || !isValidUUID(firmId)) {
    console.warn('[emailBranding] Invalid firmId format:', firmId)
    return null
  }

  try {
    const supabase = getSupabaseServiceClient()

    const { data: firm, error } = await supabase
      .from('firms')
      .select('id, name, fca_number, settings')
      .eq('id', firmId)
      .maybeSingle()

    if (error || !firm) {
      console.warn('[emailBranding] Failed to fetch firm:', error?.message)
      return null
    }

    const settings = (firm.settings || {}) as Record<string, unknown>
    const branding = (settings.branding || {}) as Record<string, unknown>

    // Validate and sanitize colors
    const primaryColor = typeof branding.primaryColor === 'string' && isValidHexColor(branding.primaryColor)
      ? branding.primaryColor
      : DEFAULT_BRANDING.primaryColor

    const secondaryColor = typeof branding.secondaryColor === 'string' && isValidHexColor(branding.secondaryColor)
      ? branding.secondaryColor
      : DEFAULT_BRANDING.secondaryColor

    // Validate logo URL
    const logoUrl = typeof branding.logoUrl === 'string' && isValidUrl(branding.logoUrl)
      ? branding.logoUrl
      : undefined

    // Parse and validate address
    const addressInput = branding.address as Record<string, unknown> | undefined
    const address = addressInput ? {
      line1: typeof addressInput.line1 === 'string' ? addressInput.line1 : undefined,
      line2: typeof addressInput.line2 === 'string' ? addressInput.line2 : undefined,
      city: typeof addressInput.city === 'string' ? addressInput.city : undefined,
      postcode: typeof addressInput.postcode === 'string' ? addressInput.postcode : undefined,
    } : undefined

    return {
      firmId: firm.id,
      firmName: firm.name,
      fcaNumber: firm.fca_number || undefined,
      logoUrl,
      primaryColor,
      secondaryColor,
      emailSignature: typeof branding.emailSignature === 'string' ? branding.emailSignature : undefined,
      reportFooterText: typeof branding.reportFooterText === 'string' ? branding.reportFooterText : undefined,
      address,
    }
  } catch (err) {
    clientLogger.error('[emailBranding] Error fetching firm branding:', err)
    return null
  }
}

/**
 * Generate branded email header HTML
 */
export function generateEmailHeader(branding: EmailBranding): string {
  const headerBg = isValidHexColor(branding.primaryColor) ? branding.primaryColor : DEFAULT_BRANDING.primaryColor
  const textColor = getContrastColor(headerBg)

  // Escape firm name for safe HTML rendering
  const safeFirmName = escapeHtml(branding.firmName)

  let logoHtml = ''
  if (branding.logoUrl && isValidUrl(branding.logoUrl)) {
    logoHtml = `
      <img
        src="${escapeHtml(branding.logoUrl)}"
        alt="${safeFirmName}"
        style="max-width: 180px; max-height: 50px; margin-bottom: 10px;"
      />
    `
  }

  return `
    <div style="background: ${headerBg}; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
      ${logoHtml}
      <h1 style="color: ${textColor}; margin: 0; font-size: 24px; font-weight: 600;">
        ${safeFirmName}
      </h1>
    </div>
  `
}

/**
 * Generate branded email footer HTML with signature
 */
export function generateEmailFooter(branding: EmailBranding): string {
  const parts: string[] = []
  const safeFirmName = escapeHtml(branding.firmName)

  // Custom email signature (sanitized HTML)
  if (branding.emailSignature) {
    parts.push(`
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        ${sanitizeHtml(branding.emailSignature)}
      </div>
    `)
  }

  // Firm details (escaped)
  const firmDetails: string[] = []
  if (branding.firmName) firmDetails.push(safeFirmName)
  if (branding.fcaNumber) firmDetails.push(`FCA: ${escapeHtml(branding.fcaNumber)}`)

  if (firmDetails.length > 0 || branding.address) {
    const footerTextSafe = branding.reportFooterText ? escapeHtml(branding.reportFooterText) : ''

    parts.push(`
      <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px; font-size: 12px; color: #6b7280;">
        ${firmDetails.length > 0 ? `<p style="margin: 0 0 5px 0;">${firmDetails.join(' | ')}</p>` : ''}
        ${branding.address ? formatAddress(branding.address) : ''}
        ${footerTextSafe ? `<p style="margin: 10px 0 0 0; font-style: italic;">${footerTextSafe}</p>` : ''}
      </div>
    `)
  }

  // Standard disclaimer
  parts.push(`
    <p style="margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center;">
      This email was sent by ${safeFirmName}. If you received this in error, please disregard.
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
  // Validate colors before applying
  const primaryColor = isValidHexColor(branding.primaryColor) ? branding.primaryColor : DEFAULT_BRANDING.primaryColor
  const secondaryColor = isValidHexColor(branding.secondaryColor) ? branding.secondaryColor : DEFAULT_BRANDING.secondaryColor

  // Replace common blue colors with brand colors
  return html
    .replace(/#3b82f6/gi, primaryColor) // blue-500
    .replace(/#2563eb/gi, primaryColor) // blue-600
    .replace(/#1e40af/gi, secondaryColor) // blue-800
    .replace(/#1d4ed8/gi, secondaryColor) // blue-700
}

/**
 * Format address for display (all values escaped)
 */
function formatAddress(address: EmailBranding['address']): string {
  if (!address) return ''

  const lines: string[] = []
  if (address.line1) lines.push(escapeHtml(address.line1))
  if (address.line2) lines.push(escapeHtml(address.line2))
  if (address.city || address.postcode) {
    const cityPostcode = [address.city, address.postcode]
      .filter(Boolean)
      .map(v => escapeHtml(v!))
      .join(', ')
    if (cityPostcode) lines.push(cityPostcode)
  }

  if (lines.length === 0) return ''

  return `<p style="margin: 5px 0 0 0;">${lines.join('<br>')}</p>`
}

/**
 * Get contrasting text color for a background color
 */
function getContrastColor(hexColor: string): string {
  // Validate input
  if (!hexColor || typeof hexColor !== 'string') {
    return '#ffffff'
  }

  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Validate hex length
  if (hex.length !== 6) {
    return '#ffffff'
  }

  try {
    // Parse RGB using substring (not deprecated substr)
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Check for NaN
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return '#ffffff'
    }

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#ffffff'
  } catch {
    return '#ffffff'
  }
}

/**
 * Get sender name with firm branding (escaped)
 */
export function getBrandedSender(branding: EmailBranding, defaultDomain: string = 'plannetic.com'): string {
  const domain = process.env.EMAIL_FROM_DOMAIN || defaultDomain
  // Whitelist approach: only allow safe characters to prevent header injection
  // Strips control chars (\0, \v, \f, \r, \n), angle brackets, quotes, and unicode line separators
  const safeFirmName = branding.firmName
    .replace(/[^\w\s\-&.,()]/g, '')
    .trim()
    .slice(0, 100)
  return `${safeFirmName || 'Plannetic'} <noreply@${domain}>`
}

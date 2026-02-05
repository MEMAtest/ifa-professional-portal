// =====================================================
// FILE: src/lib/security/csrf.ts
// PURPOSE: CSRF protection for state-changing API endpoints
// Phase D: API Standardization - Security
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure crypto unavailable for CSRF token generation')
  }
  const bytes = new Uint8Array(CSRF_TOKEN_LENGTH)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate CSRF token from request header against cookie
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  if (safeMethod) {
    return true
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (!headerToken) {
    return false
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (!cookieToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(headerToken, cookieToken)
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * CSRF protection middleware response
 */
export function csrfError(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'CSRF validation failed',
      message: 'Invalid or missing CSRF token',
      timestamp: new Date().toISOString()
    },
    { status: 403 }
  )
}

/**
 * Create response with CSRF cookie set
 */
export function withCsrfCookie(response: NextResponse, token?: string): NextResponse {
  const csrfToken = token || generateCsrfToken()

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by JavaScript to include in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  })

  return response
}

/**
 * Higher-order function to wrap handlers with CSRF protection
 */
export function withCsrfProtection<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T> | NextResponse> => {
    const isValid = await validateCsrfToken(request)

    if (!isValid) {
      return csrfError()
    }

    return handler(request)
  }
}

/**
 * Routes that should skip CSRF validation
 * (webhooks, public APIs, etc.)
 */
const CSRF_EXEMPT_PATHS = [
  '/api/health',
  '/api/readiness',
  '/api/signatures/webhook',
  '/api/stripe/webhook',
  '/api/assessments/share/', // Token-based auth
  '/api/cron/', // Server-to-server
  '/api/auth/accept-invite', // Already protected by rate limiting + token validation
  '/api/auth/verify-invite', // Read-only, protected by rate limiting
]

/**
 * Check if a path is exempt from CSRF protection
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some(exemptPath =>
    pathname.startsWith(exemptPath)
  )
}

/**
 * CSRF validation that respects exemptions
 */
export async function validateCsrfWithExemptions(request: NextRequest): Promise<boolean> {
  const pathname = new URL(request.url).pathname

  // Check exemptions
  if (isCsrfExempt(pathname)) {
    return true
  }

  return validateCsrfToken(request)
}

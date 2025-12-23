// =====================================================
// FILE: src/lib/cors.ts
// PURPOSE: CORS configuration without wildcard for security
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

/**
 * Get allowed origins for CORS
 * In production, restricts to app domain only
 */
export function getAllowedOrigins(): string[] {
  const origins: string[] = []

  // Add configured app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    origins.push(appUrl)
    // Handle www variant
    try {
      const url = new URL(appUrl)
      if (!url.hostname.startsWith('www.') && !url.hostname.includes('localhost')) {
        origins.push(`${url.protocol}//www.${url.hostname}${url.port ? ':' + url.port : ''}`)
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // Development origins
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000')
    origins.push('http://localhost:3001')
    origins.push('http://127.0.0.1:3000')
  }

  return origins
}

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  const allowed = getAllowedOrigins()
  return allowed.includes(origin)
}

/**
 * Get the origin to use in Access-Control-Allow-Origin
 * Returns the request origin if allowed, or undefined if not
 */
export function getCorsOrigin(request: NextRequest): string | undefined {
  const origin = request.headers.get('origin')

  if (origin && isOriginAllowed(origin)) {
    return origin
  }

  // In development, be permissive
  if (process.env.NODE_ENV === 'development' && origin) {
    return origin
  }

  return undefined
}

/**
 * Standard CORS headers for API responses
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = getCorsOrigin(request)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-id, x-request-id',
    'Access-Control-Max-Age': '86400'
  }

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

/**
 * Create a CORS preflight response
 */
export function createCorsPreflightResponse(request: NextRequest): NextResponse {
  const headers = getCorsHeaders(request)
  return new NextResponse(null, {
    status: 204,
    headers
  })
}

/**
 * Add CORS headers to an existing response
 */
export function withCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const corsHeaders = getCorsHeaders(request)

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * CORS headers specifically for webhook endpoints
 * These need to accept requests from external services
 * Note: Server-to-server webhooks don't require CORS - this is only for browser-based testing
 */
export function getWebhookCorsHeaders(allowedDomain?: string, requestOrigin?: string | null): Record<string, string> {
  // Webhooks are typically POST-only from known services
  // We can be more restrictive with methods
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-signature',
    'Access-Control-Max-Age': '86400'
  }

  // For webhooks from known services, we can allow their specific domain
  if (allowedDomain) {
    headers['Access-Control-Allow-Origin'] = allowedDomain
  } else if (process.env.NODE_ENV === 'development' && requestOrigin) {
    // Development: only allow localhost origins for testing, not wildcard
    if (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('http://127.0.0.1:')) {
      headers['Access-Control-Allow-Origin'] = requestOrigin
    }
  }
  // Production without specified domain: no Access-Control-Allow-Origin
  // The webhook will still work (server-to-server), but browser-based testing won't

  return headers
}

/**
 * Create preflight response for webhook endpoints
 */
export function createWebhookPreflightResponse(allowedDomain?: string, requestOrigin?: string | null): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getWebhookCorsHeaders(allowedDomain, requestOrigin)
  })
}

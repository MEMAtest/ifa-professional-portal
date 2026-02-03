/**
 * Rate Limiting Infrastructure
 *
 * Uses Upstash Redis for distributed rate limiting in production.
 * Falls back to in-memory store for development/testing.
 *
 * Environment Variables:
 * - UPSTASH_REDIS_REST_URL: Upstash Redis REST URL
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis REST Token
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import * as nodeCrypto from 'crypto'

// In-memory fallback for development
const inMemoryStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Create a rate limiter instance
 * Uses Upstash Redis if configured, otherwise falls back to in-memory
 */
function createRateLimiter(
  requests: number,
  windowSeconds: number,
  prefix: string
): Ratelimit | null {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashUrl && upstashToken) {
    const redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    })

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      prefix: `ratelimit:${prefix}:`,
      analytics: true,
    })
  }

  // Return null to indicate fallback to in-memory
  return null
}

/**
 * In-memory rate limiting (for development)
 */
function checkInMemoryLimit(
  key: string,
  requests: number,
  windowMs: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const entry = inMemoryStore.get(key)

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: requests - 1, reset: now + windowMs }
  }

  if (entry.count >= requests) {
    // Rate limit exceeded
    return { success: false, remaining: 0, reset: entry.resetAt }
  }

  // Increment counter
  entry.count++
  return { success: true, remaining: requests - entry.count, reset: entry.resetAt }
}

// Pre-configured rate limiters for different endpoints
const rateLimiters = {
  // Auth endpoints: 5 requests per 15 minutes per IP
  auth: createRateLimiter(5, 900, 'auth'),

  // Invitation endpoints: 10 requests per hour per IP
  invite: createRateLimiter(10, 3600, 'invite'),

  // Address search endpoints: 30 requests per minute per IP
  address: createRateLimiter(30, 60, 'address'),

  // General API: 100 requests per minute per IP
  api: createRateLimiter(100, 60, 'api'),

  // Strict: 3 requests per 5 minutes (for sensitive operations)
  strict: createRateLimiter(3, 300, 'strict'),
}

type RateLimitType = keyof typeof rateLimiters

interface RateLimitConfig {
  requests: number
  windowSeconds: number
}

const rateLimitConfigs: Record<RateLimitType, RateLimitConfig> = {
  auth: { requests: 5, windowSeconds: 900 },
  invite: { requests: 10, windowSeconds: 3600 },
  address: { requests: 30, windowSeconds: 60 },
  api: { requests: 100, windowSeconds: 60 },
  strict: { requests: 3, windowSeconds: 300 },
}

/**
 * Validate if a string looks like a valid IP address
 */
function isValidIP(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  // IPv6 (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$/

  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.').map(Number)
    return parts.every(p => p >= 0 && p <= 255)
  }

  return ipv6Regex.test(ip)
}

/**
 * Check if IP is a private/internal address that shouldn't be trusted
 */
function isPrivateIP(ip: string): boolean {
  // Private IPv4 ranges
  const privateRanges = [
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,                    // 192.168.0.0/16
    /^127\./,                         // 127.0.0.0/8 (loopback)
    /^169\.254\./,                    // 169.254.0.0/16 (link-local)
    /^0\./,                           // 0.0.0.0/8
  ]

  return privateRanges.some(regex => regex.test(ip))
}

/**
 * Get client IP from request headers with security validation
 *
 * SECURITY NOTES:
 * - Only trusts x-forwarded-for when behind Vercel (detected by x-vercel-id header)
 * - Takes the rightmost non-private IP from x-forwarded-for (closest to the proxy)
 * - Validates IP format to prevent injection
 * - Falls back to a request-unique identifier instead of shared 127.0.0.1
 */
export function getClientIP(request: NextRequest): string {
  // Check if we're behind Vercel (or another trusted proxy)
  const vercelId = request.headers.get('x-vercel-id')
  const isBehindTrustedProxy = !!vercelId || process.env.TRUST_PROXY === 'true'

  if (isBehindTrustedProxy) {
    // x-real-ip is set by Vercel to the actual client IP
    const realIP = request.headers.get('x-real-ip')
    if (realIP && isValidIP(realIP) && !isPrivateIP(realIP)) {
      return realIP
    }

    // x-forwarded-for contains: client, proxy1, proxy2, ...
    // Take the rightmost non-private IP (most reliable when behind multiple proxies)
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      const ips = forwarded.split(',').map(ip => ip.trim())

      // Work backwards to find the first non-private, valid IP
      for (let i = ips.length - 1; i >= 0; i--) {
        const ip = ips[i]
        if (isValidIP(ip) && !isPrivateIP(ip)) {
          return ip
        }
      }

      // If all IPs are private, take the leftmost (original client)
      const firstIP = ips[0]
      if (isValidIP(firstIP)) {
        return firstIP
      }
    }
  }

  // NOT behind a trusted proxy - don't trust x-forwarded-for or x-real-ip
  // as they can be spoofed by the client

  // Try to get IP from the connection (only works in some environments)
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP
  }

  // Cannot determine client IP — build a fingerprint from multiple request
  // characteristics using a proper hash to reduce collision probability.
  //
  // In production (Vercel/Cloudflare), IP should always be available via
  // x-real-ip or cf-connecting-ip. If this fallback path is hit frequently
  // in production, investigate proxy/CDN configuration.
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  const secChUa = request.headers.get('sec-ch-ua') || ''
  const secChUaPlatform = request.headers.get('sec-ch-ua-platform') || ''
  const secChUaMobile = request.headers.get('sec-ch-ua-mobile') || ''

  // Use SHA-256 hash of multiple client hints for a more unique fingerprint
  const fingerprintData = [userAgent, acceptLanguage, acceptEncoding, secChUa, secChUaPlatform, secChUaMobile].join('|')
  const hash = nodeCrypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 24)
  const identifier = `fp-${hash}`

  console.warn('[RateLimit] Could not determine client IP, using fingerprint:', identifier)
  return identifier
}

/**
 * Apply rate limiting to a request
 *
 * @param request - Next.js request object
 * @param type - Type of rate limit to apply
 * @param identifier - Optional custom identifier (defaults to IP)
 * @returns null if allowed, NextResponse if rate limited
 */
export async function rateLimit(
  request: NextRequest,
  type: RateLimitType = 'api',
  identifier?: string
): Promise<NextResponse | null> {
  const ip = getClientIP(request)
  const key = identifier ? `${identifier}:${ip}` : ip

  const limiter = rateLimiters[type]
  const config = rateLimitConfigs[type]

  let result: { success: boolean; remaining: number; reset: number }

  if (limiter) {
    // Use Upstash Redis
    const upstashResult = await limiter.limit(key)
    result = {
      success: upstashResult.success,
      remaining: upstashResult.remaining,
      reset: upstashResult.reset,
    }
  } else {
    // Use in-memory fallback
    result = checkInMemoryLimit(key, config.requests, config.windowSeconds * 1000)
  }

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.requests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset),
        },
      }
    )
  }

  // Request allowed
  return null
}

/**
 * Rate limit wrapper for API route handlers
 * Use as: export const POST = withRateLimit(handler, 'auth')
 */
export function withRateLimit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  type: RateLimitType = 'api'
): T {
  return (async (request: NextRequest, ...args: any[]) => {
    const rateLimitResponse = await rateLimit(request, type)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    return handler(request, ...args)
  }) as T
}

/**
 * Check if rate limiting is using Redis (production) or in-memory (development)
 */
export function isRedisRateLimiting(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// Clean up in-memory store periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of inMemoryStore.entries()) {
      if (entry.resetAt < now) {
        inMemoryStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

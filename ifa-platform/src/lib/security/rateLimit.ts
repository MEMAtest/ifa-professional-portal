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
  api: { requests: 100, windowSeconds: 60 },
  strict: { requests: 3, windowSeconds: 300 },
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback to a default (shouldn't happen in production)
  return '127.0.0.1'
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

// src/app/api/utils.ts
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext } from '@/lib/auth/apiAuth'

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Check authentication for API routes
 */
export async function checkAuthentication(request: NextRequest) {
  const supabase = getSupabaseServiceClient()
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: new Error('No authorization header') };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: error || new Error('Not authenticated') };
    }
    
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

/**
 * Check authentication using cookies (for SSR)
 * Uses the proper getAuthContext helper from apiAuth.
 */
export async function checkAuthenticationFromCookies(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return { user: null, error: new Error(authResult.error || 'Not authenticated') }
    }

    return { user: authResult.context.user, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

/**
 * Handle API errors with NextResponse
 */
export function handleError(error: any, message: string) {
  log.error(message, error);

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const statusCode = error?.status || 500;
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      details: errorMessage
    },
    { status: statusCode }
  );
}

/**
 * Create a successful API response with NextResponse
 */
export function createSuccessResponse<T>(data: T, message?: string, status: number = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message })
  }
  
  return NextResponse.json(response, { status });
}

/**
 * Create an error API response with NextResponse
 */
export function createErrorResponse(error: string, status: number = 400) {
  const response: ApiResponse = {
    success: false,
    error
  }
  
  return NextResponse.json(response, { status });
}

/**
 * Handle API errors with consistent formatting
 */
export function handleApiError(error: unknown) {
  log.error('API Error', error)

  if (error instanceof Error) {
    return createErrorResponse(error.message, 500)
  }
  
  return createErrorResponse('An unexpected error occurred', 500)
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): string | null {
  for (const field of requiredFields) {
    if (!body[field] && body[field] !== 0 && body[field] !== false) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Parse and validate JSON from request
 */
export async function parseRequestBody(request: NextRequest): Promise<any> {
  try {
    const body = await request.json()
    return body
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

/**
 * Extract query parameters from URL
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const { searchParams } = new URL(request.url)
  const params: Record<string, string> = {}
  
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

/**
 * Rate limiting helper (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function isRateLimited(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const record = requestCounts.get(identifier)
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return false
  }
  
  record.count++
  
  if (record.count > maxRequests) {
    return true
  }
  
  requestCounts.set(identifier, record)
  return false
}

/**
 * Get allowed origins for CORS
 * In production, this should be restricted to your domain(s)
 */
function getAllowedOrigins(): string[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const origins = [
    'http://localhost:3000',
    'http://localhost:3001'
  ]

  if (appUrl) {
    origins.push(appUrl)
    // Also allow www subdomain if applicable
    if (appUrl.includes('://') && !appUrl.includes('localhost')) {
      const url = new URL(appUrl)
      if (!url.hostname.startsWith('www.')) {
        origins.push(`${url.protocol}//www.${url.hostname}${url.port ? ':' + url.port : ''}`)
      }
    }
  }

  return origins
}

/**
 * CORS headers for API responses
 * Uses allowlist instead of wildcard for security
 */
export function addCorsHeaders(response: Response, requestOrigin?: string | null): Response {
  const headers = new Headers(response.headers)
  const allowedOrigins = getAllowedOrigins()

  // Only set Access-Control-Allow-Origin if the request origin is in our allowlist
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers.set('Access-Control-Allow-Origin', requestOrigin)
  } else if (process.env.NODE_ENV === 'development') {
    // In development, be more permissive
    headers.set('Access-Control-Allow-Origin', requestOrigin || 'http://localhost:3000')
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Allow-Credentials', 'true')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * Create CORS preflight response
 */
export function createCorsPreflightResponse(requestOrigin?: string | null): Response {
  const allowedOrigins = getAllowedOrigins()
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin
  } else if (process.env.NODE_ENV === 'development') {
    headers['Access-Control-Allow-Origin'] = requestOrigin || 'http://localhost:3000'
  }

  return new Response(null, { status: 204, headers })
}

/**
 * Log API request for debugging
 */
export function logApiRequest(
  method: string,
  url: string,
  body?: any,
  userId?: string
): void {
  log.debug(`[API] ${method} ${url}`, {
    timestamp: new Date().toISOString(),
    userId,
    ...(body && { body })
  })
}

/**
 * Parse pagination parameters
 */
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

/**
 * Format pagination response
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit)
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1
    }
  }
}
// src/app/api/utils.ts
import { NextRequest } from 'next/server'

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
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T, message?: string): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message })
  }
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Create an error API response
 */
export function createErrorResponse(error: string, status: number = 400): Response {
  const response: ApiResponse = {
    success: false,
    error
  }
  
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Handle API errors with consistent formatting
 */
export function handleApiError(error: unknown): Response { 
  console.error('API Error:', error)
  
  if (error instanceof Error) {
    return createErrorResponse(error.message, 500)
  }
  
  return createErrorResponse('An unexpected error occurred', 500)
}

// ✅ ADD missing exports for backward compatibility
export function handleError(error: unknown, message?: string): Response {
  console.error('API Error:', error, message);
  return handleApiError(error);
}

export async function checkAuthentication(request: Request): Promise<{ user: { id: string } | null, error: string | null }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }
  
  // TODO: Replace with actual auth logic
  return { 
    user: { id: 'authenticated-user-id' }, 
    error: null 
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): string[] {
  const missing: string[] = []
  
  for (const field of requiredFields) {
    if (!body[field] && body[field] !== 0 && body[field] !== false) {
      missing.push(field)
    }
  }
  
  return missing
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
 * CORS headers for API responses
 */
export function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
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
  console.log(`[API] ${method} ${url}`, {
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

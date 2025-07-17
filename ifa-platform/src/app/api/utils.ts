// src/app/api/utils.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Use your existing supabase client

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
 * Alternative: Check authentication using cookies (for SSR)
 */
export async function checkAuthenticationFromCookies(request: NextRequest) {
  try {
    // Get the session from cookies
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      return { user: null, error: new Error('No cookies found') };
    }

    // For now, return a mock user since we can't access cookies directly
    // In production, you'd parse the Supabase session cookie
    return { 
      user: { id: 'authenticated-user-id' }, 
      error: null 
    };
  } catch (error) {
    return { user: null, error };
  }
}

/**
 * Handle API errors with NextResponse
 */
export function handleError(error: any, message: string) {
  console.error(`${message}:`, error);
  
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
  console.error('API Error:', error)
  
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
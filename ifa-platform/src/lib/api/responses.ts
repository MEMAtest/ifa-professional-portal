// =====================================================
// FILE: src/lib/api/responses.ts
// PURPOSE: Standardized API response utilities
// Phase D: API Standardization
// =====================================================

import { NextResponse } from 'next/server'
import { ErrorCode, AppError, isAppError, getErrorMessage } from '@/lib/errors'

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
  timestamp: string
  requestId?: string
}

/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
  timestamp: string
  requestId?: string
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * HTTP status codes mapped to error types
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data?: T,
  options?: {
    message?: string
    status?: number
    requestId?: string
    headers?: Record<string, string>
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    timestamp: new Date().toISOString()
  }

  if (data !== undefined) {
    response.data = data
  }

  if (options?.message) {
    response.message = options.message
  }

  if (options?.requestId) {
    response.requestId = options.requestId
  }

  return NextResponse.json(response, {
    status: options?.status ?? HTTP_STATUS.OK,
    headers: options?.headers
  })
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: string | Error | AppError | unknown,
  options?: {
    status?: number
    code?: string
    details?: unknown
    requestId?: string
    headers?: Record<string, string>
  }
): NextResponse<ApiErrorResponse> {
  let errorMessage: string
  let errorCode: string | undefined = options?.code
  let statusCode = options?.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR
  let details = options?.details

  if (isAppError(error)) {
    errorMessage = error.message
    errorCode = errorCode ?? error.code
    statusCode = options?.status ?? error.statusCode
    details = details ?? error.details
  } else if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  } else {
    errorMessage = 'An unexpected error occurred'
  }

  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    details = undefined
    if (!errorCode) {
      errorMessage = 'Internal server error'
    }
  }

  const response: ApiErrorResponse = {
    success: false,
    error: errorMessage,
    timestamp: new Date().toISOString()
  }

  if (errorCode) {
    response.code = errorCode
  }

  if (details !== undefined) {
    response.details = details
  }

  if (options?.requestId) {
    response.requestId = options.requestId
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: options?.headers
  })
}

/**
 * Common error responses for reuse
 */
export const errors = {
  unauthorized: (message = 'Authentication required', requestId?: string) =>
    errorResponse(message, {
      status: HTTP_STATUS.UNAUTHORIZED,
      code: ErrorCode.UNAUTHORIZED,
      requestId
    }),

  forbidden: (message = 'You do not have permission to perform this action', requestId?: string) =>
    errorResponse(message, {
      status: HTTP_STATUS.FORBIDDEN,
      code: ErrorCode.FORBIDDEN,
      requestId
    }),

  notFound: (resource = 'Resource', requestId?: string) =>
    errorResponse(`${resource} not found`, {
      status: HTTP_STATUS.NOT_FOUND,
      code: ErrorCode.NOT_FOUND,
      requestId
    }),

  badRequest: (message: string, details?: unknown, requestId?: string) =>
    errorResponse(message, {
      status: HTTP_STATUS.BAD_REQUEST,
      code: ErrorCode.VALIDATION_ERROR,
      details,
      requestId
    }),

  validationError: (message: string, details?: unknown, requestId?: string) =>
    errorResponse(message, {
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: ErrorCode.VALIDATION_ERROR,
      details,
      requestId
    }),

  conflict: (message: string, requestId?: string) =>
    errorResponse(message, {
      status: HTTP_STATUS.CONFLICT,
      code: ErrorCode.CONFLICT,
      requestId
    }),

  rateLimited: (retryAfter = 60, requestId?: string) =>
    errorResponse('Too many requests. Please try again later.', {
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      code: ErrorCode.RATE_LIMITED,
      details: { retryAfter },
      requestId,
      headers: { 'Retry-After': String(retryAfter) }
    }),

  internal: (message = 'Internal server error', requestId?: string) =>
    errorResponse(message, {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      requestId
    }),

  databaseError: (message = 'Database operation failed', requestId?: string) =>
    errorResponse(message, {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: ErrorCode.DATABASE_ERROR,
      requestId
    }),

  serviceUnavailable: (message = 'Service temporarily unavailable', requestId?: string) =>
    errorResponse(message, {
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      requestId
    }),

  missingEnvVar: (varName: string, requestId?: string) =>
    errorResponse(`Configuration error: ${varName} is not set`, {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      requestId
    })
}

/**
 * Wrap an async handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  requestId?: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error: unknown) => {
    console.error('API Error:', error)
    return errorResponse(error, { requestId })
  })
}

/**
 * Type guard for checking if response is an error
 */
export function isErrorResponse(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false
}

/**
 * Type guard for checking if response is success
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true
}

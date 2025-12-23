// =====================================================
// FILE: src/lib/service-result.ts
// Standardized result type for service operations
// =====================================================

/**
 * Represents a successful or failed operation result
 * Use this pattern for all service methods to ensure consistent error handling
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string; details?: unknown }

/**
 * Create a successful result
 */
export function success<T>(data: T): ServiceResult<T> {
  return { success: true, data }
}

/**
 * Create a failed result
 */
export function failure(error: string, code?: string, details?: unknown): ServiceResult<never> {
  return { success: false, error, code, details }
}

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T>(result: ServiceResult<T>): result is { success: true; data: T } {
  return result.success === true
}

/**
 * Type guard to check if result is a failure
 */
export function isFailure<T>(result: ServiceResult<T>): result is { success: false; error: string; code?: string; details?: unknown } {
  return result.success === false
}

/**
 * Unwrap a result, throwing an error if it failed
 */
export function unwrap<T>(result: ServiceResult<T>): T {
  if (isSuccess(result)) {
    return result.data
  }
  throw new Error(result.error)
}

/**
 * Unwrap a result with a default value if it failed
 */
export function unwrapOr<T>(result: ServiceResult<T>, defaultValue: T): T {
  if (isSuccess(result)) {
    return result.data
  }
  return defaultValue
}

/**
 * Map over a successful result
 */
export function map<T, U>(result: ServiceResult<T>, fn: (data: T) => U): ServiceResult<U> {
  if (isSuccess(result)) {
    return success(fn(result.data))
  }
  return result as ServiceResult<U>
}

/**
 * Chain multiple operations that return ServiceResult
 */
export async function chain<T, U>(
  result: ServiceResult<T>,
  fn: (data: T) => Promise<ServiceResult<U>>
): Promise<ServiceResult<U>> {
  if (isSuccess(result)) {
    return fn(result.data)
  }
  return result as ServiceResult<U>
}

/**
 * Wrap an async function to return a ServiceResult
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorCode?: string
): Promise<ServiceResult<T>> {
  try {
    const data = await fn()
    return success(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return failure(message, errorCode, error)
  }
}

/**
 * Wrap a sync function to return a ServiceResult
 */
export function tryCatchSync<T>(
  fn: () => T,
  errorCode?: string
): ServiceResult<T> {
  try {
    const data = fn()
    return success(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return failure(message, errorCode, error)
  }
}

// =====================================================
// API RESPONSE HELPERS
// =====================================================

/**
 * Convert a ServiceResult to an API response format
 */
export function toApiResponse<T>(result: ServiceResult<T>): {
  success: boolean
  data?: T
  error?: string
  code?: string
} {
  if (isSuccess(result)) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error, code: result.code }
}

/**
 * Convert an API response to a ServiceResult
 */
export function fromApiResponse<T>(response: {
  success: boolean
  data?: T
  error?: string
  code?: string
}): ServiceResult<T> {
  if (response.success && response.data !== undefined) {
    return success(response.data)
  }
  return failure(response.error || 'Unknown error', response.code)
}

// =====================================================
// ERROR CODES
// =====================================================

export const ErrorCodes = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED: 'MISSING_REQUIRED',

  // Authentication/Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Data errors
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  CONFLICT: 'CONFLICT',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Business logic errors
  INVALID_STATE: 'INVALID_STATE',
  OPERATION_FAILED: 'OPERATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

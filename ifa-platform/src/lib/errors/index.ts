// =====================================================
// FILE: src/lib/errors/index.ts
// PURPOSE: Centralized error types for consistent error handling
// Phase 3: Architecture & Error Handling
// =====================================================

/**
 * Error codes used throughout the application
 * These map to HTTP status codes and provide semantic meaning
 */
export enum ErrorCode {
  // Client errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',

  // Business logic errors
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  ASSESSMENT_ERROR = 'ASSESSMENT_ERROR',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',

  // Server errors (5xx)
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Maps error codes to HTTP status codes
 */
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.CALCULATION_ERROR]: 422,
  [ErrorCode.ASSESSMENT_ERROR]: 422,
  [ErrorCode.INVALID_STATE_TRANSITION]: 422,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.INTERNAL_ERROR]: 500,
}

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly timestamp: string

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = ERROR_STATUS_CODES[code]
    this.details = details
    this.timestamp = new Date().toISOString()

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    }
  }
}

/**
 * Validation error - input data failed validation
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, details)
    this.name = 'ValidationError'
  }
}

/**
 * Not found error - requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`
    super(ErrorCode.NOT_FOUND, message, { resource, identifier })
    this.name = 'NotFoundError'
  }
}

/**
 * Unauthorized error - authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Forbidden error - insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(ErrorCode.FORBIDDEN, message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Calculation error - mathematical or business logic calculation failed
 */
export class CalculationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CALCULATION_ERROR, message, details)
    this.name = 'CalculationError'
  }
}

/**
 * Assessment error - assessment-specific business logic error
 */
export class AssessmentError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.ASSESSMENT_ERROR, message, details)
    this.name = 'AssessmentError'
  }
}

/**
 * Invalid state transition error - workflow state transition not allowed
 */
export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string, resource = 'Assessment') {
    super(
      ErrorCode.INVALID_STATE_TRANSITION,
      `Cannot transition ${resource} from '${from}' to '${to}'`,
      { from, to, resource }
    )
    this.name = 'InvalidStateTransitionError'
  }
}

/**
 * Database error - database operation failed
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(ErrorCode.DATABASE_ERROR, message, details)
    this.name = 'DatabaseError'
  }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(retryAfter = 60) {
    super(ErrorCode.RATE_LIMITED, 'Too many requests. Please try again later.', {
      retryAfter,
    })
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

// =====================================================
// ERROR HANDLING UTILITIES
// =====================================================

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Safely extract error details for logging
 */
export function getErrorDetails(error: unknown): Record<string, unknown> {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack,
    }
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return { error: String(error) }
}

/**
 * Convert any error to an AppError for consistent API responses
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  const message = getErrorMessage(error)

  // Check for common error patterns
  if (error instanceof Error) {
    // Supabase/PostgreSQL errors
    if ('code' in error && typeof (error as Record<string, unknown>).code === 'string') {
      const pgCode = (error as Record<string, unknown>).code as string
      if (pgCode === '23505') {
        return new AppError(ErrorCode.CONFLICT, 'Resource already exists', { pgCode })
      }
      if (pgCode === '23503') {
        return new AppError(ErrorCode.VALIDATION_ERROR, 'Referenced resource not found', { pgCode })
      }
      if (pgCode.startsWith('42')) {
        return new DatabaseError('Database schema error', { pgCode })
      }
    }
  }

  return new AppError(ErrorCode.INTERNAL_ERROR, message)
}

/**
 * Format error for NextResponse JSON
 */
export function formatErrorResponse(error: unknown): {
  body: Record<string, unknown>
  status: number
} {
  const appError = toAppError(error)
  return {
    body: appError.toJSON(),
    status: appError.statusCode,
  }
}

// =====================================================
// LOGGING HELPERS
// =====================================================

/**
 * Log levels for structured logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  error?: Record<string, unknown>
  timestamp: string
}

/**
 * Simple structured logger
 * In production, this should be replaced with a proper logging service
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({ level: 'debug', message, context, timestamp: new Date().toISOString() }))
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    console.info(JSON.stringify({ level: 'info', message, context, timestamp: new Date().toISOString() }))
  },

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'warn', message, context, timestamp: new Date().toISOString() }))
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const errorDetails = error ? getErrorDetails(error) : undefined
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: errorDetails,
      context,
      timestamp: new Date().toISOString()
    }))
  },
}

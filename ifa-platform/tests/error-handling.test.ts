// =====================================================
// FILE: tests/error-handling.test.ts
// PURPOSE: Tests for centralized error handling
// Phase 4: Testing & Infrastructure
// =====================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  CalculationError,
  AssessmentError,
  InvalidStateTransitionError,
  DatabaseError,
  RateLimitError,
  ErrorCode,
  ERROR_STATUS_CODES,
  isAppError,
  getErrorMessage,
  getErrorDetails,
  toAppError,
  formatErrorResponse
} from '@/lib/errors'

describe('Error Classes', () => {
  describe('AppError', () => {
    it('creates error with correct code and message', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test error')
      assert.equal(error.code, ErrorCode.VALIDATION_ERROR)
      assert.equal(error.message, 'Test error')
      assert.equal(error.name, 'AppError')
    })

    it('includes details when provided', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test', { field: 'email' })
      assert.deepEqual(error.details, { field: 'email' })
    })

    it('sets correct status code', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test')
      assert.equal(error.statusCode, 400)
    })

    it('includes timestamp', () => {
      const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test')
      assert.ok(error.timestamp)
      assert.ok(new Date(error.timestamp).getTime() > 0)
    })

    it('toJSON returns correct structure', () => {
      const error = new AppError(ErrorCode.NOT_FOUND, 'Resource not found', { id: '123' })
      const json = error.toJSON()

      assert.ok('error' in json)
      assert.equal(json.error.code, ErrorCode.NOT_FOUND)
      assert.equal(json.error.message, 'Resource not found')
      assert.deepEqual(json.error.details, { id: '123' })
      assert.ok(json.error.timestamp)
    })
  })

  describe('ValidationError', () => {
    it('creates with correct code', () => {
      const error = new ValidationError('Invalid input')
      assert.equal(error.code, ErrorCode.VALIDATION_ERROR)
      assert.equal(error.name, 'ValidationError')
      assert.equal(error.statusCode, 400)
    })
  })

  describe('NotFoundError', () => {
    it('creates with resource name only', () => {
      const error = new NotFoundError('User')
      assert.equal(error.message, 'User not found')
      assert.equal(error.code, ErrorCode.NOT_FOUND)
      assert.equal(error.statusCode, 404)
    })

    it('creates with resource name and identifier', () => {
      const error = new NotFoundError('User', 'abc-123')
      assert.equal(error.message, "User with ID 'abc-123' not found")
      assert.deepEqual(error.details, { resource: 'User', identifier: 'abc-123' })
    })
  })

  describe('UnauthorizedError', () => {
    it('creates with default message', () => {
      const error = new UnauthorizedError()
      assert.equal(error.message, 'Authentication required')
      assert.equal(error.statusCode, 401)
    })

    it('creates with custom message', () => {
      const error = new UnauthorizedError('Token expired')
      assert.equal(error.message, 'Token expired')
    })
  })

  describe('ForbiddenError', () => {
    it('creates with default message', () => {
      const error = new ForbiddenError()
      assert.equal(error.message, 'You do not have permission to perform this action')
      assert.equal(error.statusCode, 403)
    })
  })

  describe('CalculationError', () => {
    it('creates with correct code', () => {
      const error = new CalculationError('Division by zero')
      assert.equal(error.code, ErrorCode.CALCULATION_ERROR)
      assert.equal(error.statusCode, 422)
    })
  })

  describe('AssessmentError', () => {
    it('creates with correct code', () => {
      const error = new AssessmentError('Assessment incomplete')
      assert.equal(error.code, ErrorCode.ASSESSMENT_ERROR)
      assert.equal(error.statusCode, 422)
    })
  })

  describe('InvalidStateTransitionError', () => {
    it('creates with transition details', () => {
      const error = new InvalidStateTransitionError('draft', 'submitted')
      assert.equal(error.message, "Cannot transition Assessment from 'draft' to 'submitted'")
      assert.deepEqual(error.details, { from: 'draft', to: 'submitted', resource: 'Assessment' })
    })

    it('accepts custom resource name', () => {
      const error = new InvalidStateTransitionError('pending', 'completed', 'Order')
      assert.equal(error.message, "Cannot transition Order from 'pending' to 'completed'")
    })
  })

  describe('DatabaseError', () => {
    it('creates with correct code', () => {
      const error = new DatabaseError('Connection failed')
      assert.equal(error.code, ErrorCode.DATABASE_ERROR)
      assert.equal(error.statusCode, 500)
    })
  })

  describe('RateLimitError', () => {
    it('creates with default retry after', () => {
      const error = new RateLimitError()
      assert.equal(error.retryAfter, 60)
      assert.equal(error.statusCode, 429)
    })

    it('creates with custom retry after', () => {
      const error = new RateLimitError(120)
      assert.equal(error.retryAfter, 120)
    })
  })
})

describe('Error Status Codes', () => {
  it('maps all error codes to status codes', () => {
    assert.equal(ERROR_STATUS_CODES[ErrorCode.VALIDATION_ERROR], 400)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.NOT_FOUND], 404)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.UNAUTHORIZED], 401)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.FORBIDDEN], 403)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.CONFLICT], 409)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.RATE_LIMITED], 429)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.CALCULATION_ERROR], 422)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.ASSESSMENT_ERROR], 422)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.INVALID_STATE_TRANSITION], 422)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.DATABASE_ERROR], 500)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.EXTERNAL_SERVICE_ERROR], 502)
    assert.equal(ERROR_STATUS_CODES[ErrorCode.INTERNAL_ERROR], 500)
  })
})

describe('Error Utilities', () => {
  describe('isAppError', () => {
    it('returns true for AppError instances', () => {
      assert.equal(isAppError(new AppError(ErrorCode.VALIDATION_ERROR, 'test')), true)
      assert.equal(isAppError(new ValidationError('test')), true)
      assert.equal(isAppError(new NotFoundError('User')), true)
    })

    it('returns false for non-AppError', () => {
      assert.equal(isAppError(new Error('test')), false)
      assert.equal(isAppError('string error'), false)
      assert.equal(isAppError(null), false)
      assert.equal(isAppError(undefined), false)
      assert.equal(isAppError({ message: 'fake error' }), false)
    })
  })

  describe('getErrorMessage', () => {
    it('extracts message from Error', () => {
      assert.equal(getErrorMessage(new Error('Test error')), 'Test error')
    })

    it('extracts message from AppError', () => {
      assert.equal(getErrorMessage(new ValidationError('Validation failed')), 'Validation failed')
    })

    it('returns string directly', () => {
      assert.equal(getErrorMessage('String error'), 'String error')
    })

    it('returns default for unknown types', () => {
      assert.equal(getErrorMessage(null), 'An unknown error occurred')
      assert.equal(getErrorMessage(undefined), 'An unknown error occurred')
      assert.equal(getErrorMessage(123), 'An unknown error occurred')
    })
  })

  describe('getErrorDetails', () => {
    it('extracts details from AppError', () => {
      const error = new ValidationError('Failed', { field: 'email' })
      const details = getErrorDetails(error)

      assert.equal(details.code, ErrorCode.VALIDATION_ERROR)
      assert.equal(details.message, 'Failed')
      assert.deepEqual(details.details, { field: 'email' })
      assert.ok(details.stack)
    })

    it('extracts details from standard Error', () => {
      const error = new Error('Standard error')
      const details = getErrorDetails(error)

      assert.equal(details.name, 'Error')
      assert.equal(details.message, 'Standard error')
      assert.ok(details.stack)
    })

    it('handles non-error values', () => {
      const details = getErrorDetails('string error')
      assert.deepEqual(details, { error: 'string error' })
    })
  })

  describe('toAppError', () => {
    it('returns AppError unchanged', () => {
      const original = new ValidationError('Test')
      const result = toAppError(original)
      assert.strictEqual(result, original)
    })

    it('converts standard Error to AppError', () => {
      const original = new Error('Standard error')
      const result = toAppError(original)

      assert.ok(result instanceof AppError)
      assert.equal(result.message, 'Standard error')
      assert.equal(result.code, ErrorCode.INTERNAL_ERROR)
    })

    it('handles PostgreSQL unique violation', () => {
      const pgError = new Error('duplicate key value') as Error & { code: string }
      pgError.code = '23505'

      const result = toAppError(pgError)
      assert.equal(result.code, ErrorCode.CONFLICT)
    })

    it('handles PostgreSQL foreign key violation', () => {
      const pgError = new Error('foreign key violation') as Error & { code: string }
      pgError.code = '23503'

      const result = toAppError(pgError)
      assert.equal(result.code, ErrorCode.VALIDATION_ERROR)
    })

    it('handles PostgreSQL schema errors', () => {
      const pgError = new Error('schema error') as Error & { code: string }
      pgError.code = '42P01' // undefined table

      const result = toAppError(pgError)
      assert.equal(result.code, ErrorCode.DATABASE_ERROR)
    })

    it('handles string errors', () => {
      const result = toAppError('Something went wrong')
      assert.ok(result instanceof AppError)
      assert.equal(result.message, 'Something went wrong')
    })
  })

  describe('formatErrorResponse', () => {
    it('returns correct body and status for AppError', () => {
      const error = new NotFoundError('User', '123')
      const response = formatErrorResponse(error)

      assert.equal(response.status, 404)
      assert.ok('error' in response.body)
      assert.equal((response.body as any).error.code, ErrorCode.NOT_FOUND)
    })

    it('converts non-AppError and returns correct response', () => {
      const error = new Error('Internal error')
      const response = formatErrorResponse(error)

      assert.equal(response.status, 500)
      assert.ok('error' in response.body)
    })
  })
})

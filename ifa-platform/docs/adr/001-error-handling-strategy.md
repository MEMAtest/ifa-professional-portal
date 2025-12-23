# ADR-001: Centralized Error Handling Strategy

## Status
Accepted

## Context
The suitability/assessment module had inconsistent error handling across 89+ API routes and service files:
- Silent `catch` blocks that swallowed errors
- Inconsistent use of `console.error` vs `console.log`
- No structured error types
- Duplicate error handling code
- No correlation between errors and their context

This made debugging difficult and created potential security issues where errors were not properly logged.

## Decision
We implemented a centralized error handling system with:

### 1. Typed Error Classes (`src/lib/errors/index.ts`)
- `AppError` - Base error class with code, message, details, statusCode, timestamp
- `ValidationError` - Input validation failures (400)
- `NotFoundError` - Resource not found (404)
- `UnauthorizedError` - Authentication required (401)
- `ForbiddenError` - Permission denied (403)
- `CalculationError` - Business logic errors (422)
- `AssessmentError` - Assessment-specific errors (422)
- `InvalidStateTransitionError` - State machine violations (422)
- `DatabaseError` - Database operation failures (500)
- `RateLimitError` - Rate limit exceeded (429)

### 2. Structured Logger
```typescript
const logger = {
  debug: (message: string, context?: Record<string, unknown>) => void
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  error: (message: string, error: unknown, context?: Record<string, unknown>) => void
}
```

### 3. Error Utility Functions
- `isAppError(error)` - Type guard for AppError
- `getErrorMessage(error)` - Extract message from any error type
- `getErrorDetails(error)` - Get full error details for logging
- `toAppError(error)` - Convert any error to AppError (handles PostgreSQL errors)
- `formatErrorResponse(error)` - Format error for HTTP response

## Consequences

### Positive
- Consistent error handling across all routes
- Structured logs enable better monitoring/alerting
- Type-safe error handling with TypeScript
- PostgreSQL error codes automatically converted to appropriate HTTP errors
- Error context preserved for debugging

### Negative
- Requires updating existing code to use new patterns
- Slight increase in bundle size for error classes

## Implementation Notes
- All catch blocks should use `logger.error()` instead of `console.error()`
- Errors should be thrown using typed error classes
- API routes should use `formatErrorResponse()` for consistent responses
- PostgreSQL errors (23505, 23503, 42P01, etc.) are automatically handled

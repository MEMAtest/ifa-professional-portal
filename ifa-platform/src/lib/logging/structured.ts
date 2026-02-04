// =====================================================
// FILE: src/lib/logging/structured.ts
// PURPOSE: Production-grade structured logging with correlation IDs
// Phase B: Observability Infrastructure
// =====================================================

import { NextRequest } from 'next/server'
import { getErrorDetails } from '@/lib/errors'
import clientLogger from '@/lib/logging/clientLogger'

/**
 * Log levels for structured logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured log entry format
 */
export interface LogEntry {
  level: LogLevel
  message: string
  requestId?: string
  timestamp: string
  durationMs?: number
  context?: Record<string, unknown>
  error?: Record<string, unknown>
}

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  serviceName?: string
  environment?: string
  minLevel?: LogLevel
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

/**
 * Global logger configuration
 */
const globalConfig: LoggerConfig = {
  serviceName: 'ifa-platform',
  environment: process.env.NODE_ENV || 'development',
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

/**
 * Format and output a log entry
 */
function outputLog(entry: LogEntry): void {
  const minPriority = LOG_LEVEL_PRIORITY[globalConfig.minLevel || 'debug']
  const entryPriority = LOG_LEVEL_PRIORITY[entry.level]

  if (entryPriority < minPriority) {
    return
  }

  const logObject = {
    ...entry,
    service: globalConfig.serviceName,
    env: globalConfig.environment
  }

  const logString = JSON.stringify(logObject)

  switch (entry.level) {
    case 'debug':
      break
    case 'info':
      clientLogger.info(logString)
      break
    case 'warn':
      clientLogger.warn(logString)
      break
    case 'error':
      clientLogger.error(logString)
      break
  }
}

/**
 * Request-scoped logger with correlation ID
 */
export interface RequestLogger {
  requestId: string
  startTime: number

  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: unknown, context?: Record<string, unknown>): void

  /** Get elapsed time in milliseconds */
  duration(): number

  /** Log request completion with timing */
  logRequestComplete(statusCode: number, context?: Record<string, unknown>): void
}

/**
 * Create a request-scoped logger with correlation ID
 * Use this in API routes to correlate all logs for a single request
 */
export function createRequestLogger(request?: NextRequest): RequestLogger {
  // Generate or extract request ID
  const requestId = request?.headers.get('x-request-id')
    || request?.headers.get('x-correlation-id')
    || crypto.randomUUID()

  const startTime = Date.now()

  const createEntry = (
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: unknown
  ): LogEntry => ({
    level,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    context,
    error: error ? getErrorDetails(error) : undefined
  })

  return {
    requestId,
    startTime,

    debug(message: string, context?: Record<string, unknown>) {
      outputLog(createEntry('debug', message, context))
    },

    info(message: string, context?: Record<string, unknown>) {
      outputLog(createEntry('info', message, context))
    },

    warn(message: string, context?: Record<string, unknown>) {
      outputLog(createEntry('warn', message, context))
    },

    error(message: string, error?: unknown, context?: Record<string, unknown>) {
      outputLog(createEntry('error', message, context, error))
    },

    duration() {
      return Date.now() - startTime
    },

    logRequestComplete(statusCode: number, context?: Record<string, unknown>) {
      const duration = Date.now() - startTime
      const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

      outputLog(createEntry(level, 'Request completed', {
        ...context,
        statusCode,
        durationMs: duration
      }))
    }
  }
}

/**
 * Extract useful request metadata for logging
 */
export function getRequestMetadata(request: NextRequest): Record<string, unknown> {
  const url = new URL(request.url)

  return {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: request.headers.get('user-agent')?.slice(0, 100),
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
  }
}

/**
 * Standalone logger for non-request contexts (services, jobs, etc.)
 */
export const log = {
  debug(message: string, context?: Record<string, unknown>) {
    outputLog({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context
    })
  },

  info(message: string, context?: Record<string, unknown>) {
    outputLog({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context
    })
  },

  warn(message: string, context?: Record<string, unknown>) {
    outputLog({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context
    })
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    outputLog({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? getErrorDetails(error) : undefined
    })
  }
}

/**
 * Configure global logger settings
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  Object.assign(globalConfig, config)
}

/**
 * Higher-order function to wrap API route handlers with logging
 */
export function withRequestLogging<T>(
  handler: (request: NextRequest, logger: RequestLogger) => Promise<T>
) {
  return async (request: NextRequest): Promise<T> => {
    const logger = createRequestLogger(request)
    const metadata = getRequestMetadata(request)

    logger.info('Request started', metadata)

    try {
      const result = await handler(request, logger)
      return result
    } catch (error) {
      logger.error('Request failed', error, metadata)
      throw error
    }
  }
}

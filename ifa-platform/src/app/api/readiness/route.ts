// =====================================================
// FILE: src/app/api/readiness/route.ts
// PURPOSE: Readiness probe - application is ready to serve traffic
// Phase B: Observability Infrastructure
// =====================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  latencyMs?: number
  message?: string
}

/**
 * GET /api/readiness
 *
 * Readiness probe - checks if the application can serve traffic.
 * Verifies all critical dependencies are available.
 * Used by load balancers to determine if traffic should be routed to this instance.
 */
export async function GET() {
  const checks: HealthCheck[] = []
  const startTime = Date.now()

  // Check 1: Environment variables
  const envCheck = checkEnvironmentVariables()
  checks.push(envCheck)

  // Check 2: Database connectivity
  const dbCheck = await checkDatabaseConnection()
  checks.push(dbCheck)

  // Determine overall status
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy')
  const hasDegraded = checks.some(c => c.status === 'degraded')

  const overallStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy'
  const statusCode = hasUnhealthy ? 503 : 200

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalLatencyMs: Date.now() - startTime,
    checks
  }, { status: statusCode })
}

/**
 * Verify required environment variables are set
 */
function checkEnvironmentVariables(): HealthCheck {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    return {
      name: 'environment',
      status: 'unhealthy',
      message: `Missing required env vars: ${missing.join(', ')}`
    }
  }

  // Check optional but important vars
  const optional = ['RESEND_API_KEY', 'NEXT_PUBLIC_APP_URL']
  const missingOptional = optional.filter(key => !process.env[key])

  if (missingOptional.length > 0) {
    return {
      name: 'environment',
      status: 'degraded',
      message: `Missing optional env vars: ${missingOptional.join(', ')}`
    }
  }

  return {
    name: 'environment',
    status: 'healthy'
  }
}

/**
 * Verify database connection is working
 */
async function checkDatabaseConnection(): Promise<HealthCheck> {
  const startTime = Date.now()

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: 'Database credentials not configured'
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Simple query to test connectivity
    const { error } = await supabase
      .from('clients')
      .select('id')
      .limit(1)

    const latencyMs = Date.now() - startTime

    if (error) {
      // Table might not exist in development, but connection works
      if (error.code === '42P01') {
        return {
          name: 'database',
          status: 'degraded',
          latencyMs,
          message: 'Connected but schema may be incomplete'
        }
      }

      return {
        name: 'database',
        status: 'unhealthy',
        latencyMs,
        message: error.message
      }
    }

    // Warn if latency is high
    if (latencyMs > 1000) {
      return {
        name: 'database',
        status: 'degraded',
        latencyMs,
        message: 'High latency detected'
      }
    }

    return {
      name: 'database',
      status: 'healthy',
      latencyMs
    }

  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

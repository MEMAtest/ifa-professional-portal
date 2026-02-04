// src/app/api/monte-carlo/status/route.ts
// Authenticated Monte Carlo system status (firm-scoped)

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const supabase = getSupabaseServiceClient()

    const { error: pingError } = await supabase
      .from('monte_carlo_results')
      .select('id')
      .limit(1)

    if (pingError) {
      log.error('Monte Carlo database health check failed', { error: pingError.message })
      return NextResponse.json(
        {
          success: false,
          status: 'unhealthy',
          error: 'Database health check failed',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    const { count: scenarioCount, error: scenarioError } = await supabase
      .from('cash_flow_scenarios')
      .select('id', { count: 'exact', head: true })
      .eq('firm_id', firmId)

    if (scenarioError) {
      log.warn('Failed to fetch scenario count for status', { error: scenarioError.message })
    }

    return NextResponse.json(
      {
        success: true,
        status: 'healthy',
        database: {
          connection: 'ok',
          health: 'ok',
          totalRecords: scenarioCount || 0
        },
        features: {
          simulation: true,
          storage: true,
          api: true,
          healthCheck: true
        },
        data: {
          hasScenarios: Boolean(scenarioCount && scenarioCount > 0),
          recentScenarioCount: scenarioCount || 0
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    log.error('Monte Carlo status API error', error)
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// src/app/api/monte-carlo/cleanup/route.ts
// Firm-scoped cleanup for Monte Carlo results

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'

export const dynamic = 'force-dynamic'

function parseOlderThanDays(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const olderThanDaysParam = searchParams.get('olderThanDays')
  let olderThanDays = 90
  if (olderThanDaysParam !== null) {
    const parsed = parseInt(olderThanDaysParam, 10)
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 365) {
      return { error: 'olderThanDays must be a number between 1 and 365' }
    }
    olderThanDays = parsed
  }
  return { olderThanDays }
}

async function getFirmScenarioIds(supabase: ReturnType<typeof getSupabaseServiceClient>, firmId: string) {
  const { data, error } = await supabase
    .from('cash_flow_scenarios')
    .select('id')
    .eq('firm_id', firmId)

  if (error) {
    return { error }
  }

  return { ids: (data || []).map((row: any) => row.id) }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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

    const parsed = parseOlderThanDays(request)
    if (parsed.error) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    }
    const olderThanDays = parsed.olderThanDays ?? 90

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()
    const supabase: any = getSupabaseServiceClient()

    const scenarioResult = await getFirmScenarioIds(supabase, firmId)
    if (scenarioResult.error) {
      log.error('Failed to fetch firm scenarios for cleanup', { error: scenarioResult.error.message })
      return NextResponse.json({ success: false, error: 'Failed to fetch scenarios' }, { status: 500 })
    }

    const scenarioIds = scenarioResult.ids || []
    if (scenarioIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scenarios to clean up',
        data: {
          deletedCount: 0,
          olderThanDays,
          cleanupDate: new Date().toISOString(),
          cutoffDate
        }
      })
    }

    const { data: deletedResults, error: deleteError } = await supabase
      .from('monte_carlo_results')
      .delete()
      .in('scenario_id', scenarioIds)
      .lt('created_at', cutoffDate)
      .select('id')

    if (deleteError) {
      log.error('Failed to delete Monte Carlo results', { error: deleteError.message })
      return NextResponse.json({ success: false, error: 'Failed to cleanup old results' }, { status: 500 })
    }

    const deletedCount = deletedResults?.length || 0

    // Best-effort cleanup assumptions if table exists
    try {
      await supabase
        .from('monte_carlo_assumptions')
        .delete()
        .in('scenario_id', scenarioIds)
        .lt('created_at', cutoffDate)
    } catch (assumptionError) {
      log.warn('Failed to cleanup Monte Carlo assumptions', {
        error: assumptionError instanceof Error ? assumptionError.message : String(assumptionError)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: {
        deletedCount,
        olderThanDays,
        cleanupDate: new Date().toISOString(),
        cutoffDate
      },
      metadata: {
        operation: 'cleanup',
        completedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    })
  } catch (error) {
    log.error('Monte Carlo cleanup API error', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cleanup old results', timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

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

    const parsed = parseOlderThanDays(request)
    if (parsed.error) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 })
    }
    const olderThanDays = parsed.olderThanDays ?? 90

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()
    const supabase: any = getSupabaseServiceClient()

    const scenarioResult = await getFirmScenarioIds(supabase, firmId)
    if (scenarioResult.error) {
      log.error('Failed to fetch firm scenarios for cleanup status', { error: scenarioResult.error.message })
      return NextResponse.json({ success: false, error: 'Failed to fetch scenarios' }, { status: 500 })
    }

    const scenarioIds = scenarioResult.ids || []
    if (scenarioIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalScenarios: 0,
          oldScenarios: 0,
          recentScenarios: 0,
          olderThanDays,
          cutoffDate,
          wouldDelete: 0
        }
      })
    }

    const { count: totalCount, error: totalError } = await supabase
      .from('monte_carlo_results')
      .select('id', { count: 'exact', head: true })
      .in('scenario_id', scenarioIds)

    if (totalError) {
      log.error('Failed to count Monte Carlo results', { error: totalError.message })
      return NextResponse.json({ success: false, error: 'Failed to fetch cleanup status' }, { status: 500 })
    }

    const { count: oldCount, error: oldError } = await supabase
      .from('monte_carlo_results')
      .select('id', { count: 'exact', head: true })
      .in('scenario_id', scenarioIds)
      .lt('created_at', cutoffDate)

    if (oldError) {
      log.error('Failed to count old Monte Carlo results', { error: oldError.message })
      return NextResponse.json({ success: false, error: 'Failed to fetch cleanup status' }, { status: 500 })
    }

    const totalScenarios = totalCount || 0
    const oldScenarios = oldCount || 0

    return NextResponse.json({
      success: true,
      data: {
        totalScenarios,
        oldScenarios,
        recentScenarios: Math.max(0, totalScenarios - oldScenarios),
        olderThanDays,
        cutoffDate,
        wouldDelete: oldScenarios
      },
      metadata: {
        operation: 'cleanup-preview',
        checkedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    })
  } catch (error) {
    log.error('Monte Carlo cleanup status API error', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cleanup status', timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

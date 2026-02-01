// src/app/api/assessments/incomplete/route.ts
// Dashboard endpoint: "Assessments to Complete" / in-progress work items
//
// Fixes:
// - Enforces auth (prevents anonymous access)
// - Fixes incorrect OR filter that included completed (100%) rows
// - Uses correct client schema (personal_details JSON), eliminating "Unknown Client"
// - Returns an accurate total count (deduped by client_id + assessment_type)
// - Scopes to the current user's firm when possible

import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/db'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { createRequestLogger } from '@/lib/logging/structured'
import { normalizeAssessmentType } from '@/lib/assessments/routing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_FIRM_ID = process.env.DEFAULT_FIRM_ID || null

function getServiceClient() {
  return getSupabaseServiceClient()
}

async function fetchFirmClientIds(supabase: ReturnType<typeof getServiceClient>, firmId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .or(`firm_id.eq.${firmId},firm_id.is.null`)
    .limit(10000)

  if (error) throw error
  return (data || []).map((r) => r.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
}

function getClientDisplayName(personalDetails: any): string {
  if (!personalDetails || typeof personalDetails !== 'object') return 'Unknown Client'
  const title = String(personalDetails.title || '').trim()
  const firstName = String(personalDetails.firstName || personalDetails.first_name || '').trim()
  const lastName = String(personalDetails.lastName || personalDetails.last_name || '').trim()
  const fullName = `${title} ${firstName} ${lastName}`.replace(/\s+/g, ' ').trim()
  return fullName || 'Unknown Client'
}

export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request)
  let step = 'init'

  try {
    step = 'auth'
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const user = auth.context.user

    const url = new URL(request.url)
    const limitParam = Number(url.searchParams.get('limit') || 5)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 5

    // Determine firm scope from auth context
    let firmId: string | null = auth.context.firmId

    if (!firmId && DEFAULT_FIRM_ID) {
      firmId = DEFAULT_FIRM_ID
    }

    const supabase = getServiceClient()

    // NOTE: We intentionally query more rows and dedupe because assessment_progress
    // may contain legacy duplicates (no unique constraint in some environments).
    const MAX_ROWS = 5000

    let firmClientIds: string[] | null = null
    if (firmId) {
      step = 'firm_client_ids'
      try {
        firmClientIds = await fetchFirmClientIds(supabase, firmId)
      } catch (e: any) {
        logger.warn('Failed to fetch firm client IDs; falling back to unscoped incomplete list', {
          firmId,
          message: e?.message || String(e)
        })
        firmClientIds = null
        firmId = null
      }
    }

    if (firmId && DEFAULT_FIRM_ID && firmId === DEFAULT_FIRM_ID && firmClientIds && firmClientIds.length > 0) {
      const { count: unscopedClients, error: unscopedClientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      if (unscopedClientsError) {
        logger.warn('Could not count clients (unscoped) for fallback check', { message: unscopedClientsError.message })
      } else if (typeof unscopedClients === 'number' && unscopedClients > 0) {
        const ratio = firmClientIds.length / unscopedClients
        if (ratio < 0.6) {
          logger.warn('Firm client ID list seems incomplete; falling back to unscoped incomplete list', {
            firmId,
            firmClientIds: firmClientIds.length,
            unscopedClients,
            ratio
          })
          firmClientIds = null
          firmId = null
        }
      }
    }

    step = 'progress_rows'
    // Query a reasonably sized window of recent progress rows, then apply strict filtering in code.
    // This avoids edge-cases where legacy rows have inconsistent status/percentage.
    let query = supabase
      .from('assessment_progress')
      .select(`id, client_id, assessment_type, status, progress_percentage, updated_at`)
      .order('updated_at', { ascending: false })
      .limit(MAX_ROWS)

    if (firmClientIds && firmClientIds.length > 0) query = query.in('client_id', firmClientIds)

    const { data: progressRows, error: progressError } = await query

    if (progressError) {
      logger.error('Error fetching assessment_progress', progressError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch incomplete assessments' },
        { status: 500 }
      )
    }

    const strictIncomplete = (progressRows || []).filter((row) => {
      const pct = typeof row.progress_percentage === 'number' ? row.progress_percentage : 0
      const status = String(row.status || '').toLowerCase()
      // "To complete" = started but not completed.
      if (!(pct > 0 && pct < 100)) return false
      if (status === 'completed') return false
      return true
    })

    // Dedupe by client_id + normalized assessment type (keep most recent due to ordering)
    const deduped = new Map<string, any>()
    for (const row of strictIncomplete) {
      const normalizedType = normalizeAssessmentType(row.assessment_type)
      const key = `${row.client_id}:${normalizedType}`
      if (!deduped.has(key)) {
        deduped.set(key, { ...row, assessment_type: normalizedType })
      }
    }

    const uniqueRows = Array.from(deduped.values())
    const totalCount = uniqueRows.length

    step = 'client_lookup'
    const clientIds = Array.from(new Set(uniqueRows.map((r) => r.client_id).filter(Boolean))).slice(0, 10000)
    const { data: clientRows, error: clientError } = await supabase
      .from('clients')
      .select('id, client_ref, personal_details')
      .in('id', clientIds)
      .limit(10000)

    if (clientError) {
      logger.warn('Failed to load client details for incomplete list', { message: clientError.message })
    }

    const clientMap = new Map<string, { client_ref?: string | null; personal_details?: any }>()
    for (const c of clientRows || []) {
      clientMap.set(c.id, { client_ref: (c as any).client_ref ?? null, personal_details: (c as any).personal_details })
    }

    // Map rows to response objects
    const assessments = uniqueRows.slice(0, limit).map((row) => {
      const client = clientMap.get(row.client_id) || null
      const clientName = getClientDisplayName(client?.personal_details)

      return {
        id: row.id,
        client_id: row.client_id,
        client_name: clientName,
        client_ref: client?.client_ref ?? null,
        assessment_type: row.assessment_type,
        progress_percentage: row.progress_percentage ?? 0,
        status: row.status || 'in_progress',
        last_updated: row.updated_at
      }
    })

    return NextResponse.json({
      success: true,
      assessments,
      count: totalCount,
      limit,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Incomplete assessments API error', { step, error })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch incomplete assessments',
        message: error instanceof Error ? error.message : 'Unknown error',
        step,
        ...(process.env.NODE_ENV !== 'production'
          ? { stack: error instanceof Error ? error.stack : undefined }
          : {})
      },
      { status: 500 }
    )
  }
}

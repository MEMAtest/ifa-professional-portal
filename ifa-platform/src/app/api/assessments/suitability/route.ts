// =====================================================
// FILE: src/app/api/assessments/suitability/route.ts
// GET - Fetch latest completed suitability assessment for a client
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { isUUID } from '@/lib/utils'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { normalizeCompletionPercentage } from '@/lib/assessments/suitabilityStatus'
import { createRequestLogger } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

function normalizeSuitabilityAssessmentRow(row: any) {
  if (!row) return row
  const normalized = { ...row }
  normalized.completion_percentage = normalizeCompletionPercentage(row.completion_percentage)
  return normalized
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }

    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const assessmentId = searchParams.get('assessmentId')

    if (!clientId && !assessmentId) {
      return NextResponse.json(
        { success: false, error: 'clientId or assessmentId is required' },
        { status: 400 }
      )
    }

    if (clientId && !isUUID(clientId)) {
      return NextResponse.json({ success: false, error: 'Invalid clientId' }, { status: 400 })
    }
    if (assessmentId && !isUUID(assessmentId)) {
      return NextResponse.json({ success: false, error: 'Invalid assessmentId' }, { status: 400 })
    }

    // Explicit assessment lookup (used by history UI / deep links).
    // SECURITY: Check authorization BEFORE returning any data.
    if (assessmentId) {
      // First, fetch only the client_id to check access
      const { data: assessmentMeta, error: metaError } = await supabase
        .from('suitability_assessments')
        .select('client_id')
        .eq('id', assessmentId)
        .maybeSingle()

      if (metaError && metaError.code !== 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch suitability assessment' },
          { status: 500 }
        )
      }

      // Check authorization before fetching full data
      if (assessmentMeta?.client_id) {
        const access = await requireClientAccess({
          supabase,
          clientId: String(assessmentMeta.client_id),
          ctx,
          select: 'id,firm_id,advisor_id'
        })
        if (!access.ok) return access.response
      } else {
        // Assessment not found - return 404-like response
        return NextResponse.json({
          success: true,
          data: null,
          hasAssessment: false
        })
      }

      // Now fetch full data after authorization passes
      const { data, error } = await supabase
        .from('suitability_assessments')
        .select(
          'id,client_id,version_number,parent_assessment_id,is_current,completion_percentage,status,is_final,is_draft,created_at,updated_at,completed_at,completed_by,assessment_date,metadata'
        )
        .eq('id', assessmentId)
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch suitability assessment' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: data || null,
        hasAssessment: Boolean(data)
      })
    }

    const base = supabase
      .from('suitability_assessments')
      .select(
        'id,client_id,version_number,parent_assessment_id,is_current,completion_percentage,status,is_final,is_draft,created_at,updated_at,completed_at,completed_by,assessment_date,metadata'
      )
      .limit(1)

    const access = await requireClientAccess({
      supabase,
      clientId: clientId as string,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    // Prefer latest finalized/completed/submitted assessment.
    // Use case-insensitive matching to support legacy rows where status was stored with different casing.
    const completedQuery = base
      .eq('client_id', clientId as string)
      .or('is_final.eq.true,status.ilike.completed,status.ilike.submitted')
      .order('is_current', { ascending: false, nullsFirst: false })
      .order('is_final', { ascending: false, nullsFirst: false })
      .order('version_number', { ascending: false, nullsFirst: false })
      .order('completed_at', { ascending: false })
      .order('updated_at', { ascending: false })

    const { data: completed, error: completedError } = await completedQuery.maybeSingle()

    if (completedError && completedError.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch suitability assessment' },
        { status: 500 }
      )
    }

    if (completed) {
      return NextResponse.json({
        success: true,
        data: normalizeSuitabilityAssessmentRow(completed),
        hasAssessment: true
      })
    }

    // Fallback: return the latest draft/in-progress record so the results page can show progress + allow continuing.
    // Do not rely solely on `is_current` here: legacy data may not have it set consistently.
    const currentQuery = base
      .eq('client_id', clientId as string)
      .order('is_current', { ascending: false, nullsFirst: false })
      .order('version_number', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })

    const { data: current, error: currentError } = await currentQuery.maybeSingle()

    if (currentError && currentError.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch suitability assessment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: normalizeSuitabilityAssessmentRow(current || null),
      hasAssessment: Boolean(current)
    })
  } catch (error) {
    const logger = createRequestLogger(request)
    logger.error('Suitability GET route error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: ''
      },
      { status: 500 }
    )
  }
}

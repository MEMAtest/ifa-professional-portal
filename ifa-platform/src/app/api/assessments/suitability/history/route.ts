// =====================================================
// FILE: src/app/api/assessments/suitability/history/route.ts
// GET - Fetch suitability assessment version history for a client
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

function isFinalLike(row: any) {
  const status = String(row?.status || '').trim().toLowerCase()
  return Boolean(row?.is_final) || status === 'completed' || status === 'submitted'
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

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 })
    }

    if (!isUUID(clientId)) {
      return NextResponse.json({ success: false, error: 'Invalid clientId' }, { status: 400 })
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    const { data, error } = await supabase
      .from('suitability_assessments')
      .select(
        'id,client_id,version_number,parent_assessment_id,is_current,completion_percentage,status,is_final,is_draft,created_at,updated_at,completed_at,completed_by,assessment_date,metadata'
      )
      .eq('client_id', clientId)
      .order('version_number', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch suitability history' },
        { status: 500 }
      )
    }

    const versions = (data || []).map(normalizeSuitabilityAssessmentRow)
    const current = versions.find(isFinalLike) || versions[0] || null

    return NextResponse.json({
      success: true,
      current,
      versions,
      clientId
    })
  } catch (error) {
    const logger = createRequestLogger(request)
    logger.error('Suitability history route error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

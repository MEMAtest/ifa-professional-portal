// =====================================================
// FILE: src/app/api/assessments/suitability/submit/route.ts
// SUBMIT ENDPOINT - Mark suitability assessment as submitted
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { isUUID } from '@/lib/utils'
import type { SuitabilityFormData } from '@/types/suitability'
import { mapSuitabilityFormDataToAssessmentUpdate } from '@/lib/suitability/mappers'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

async function upsertByClientAndType(
  table: 'assessments' | 'assessment_progress',
  payload: any,
  now: string
) {
  const supabase = getSupabaseServiceClient()
  const { data: existing, error: existingError } = await supabase
    .from(table)
    .select('id')
    .eq('client_id', payload.client_id)
    .eq('assessment_type', payload.assessment_type)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') {
    return { data: null, error: existingError }
  }

  if (existing?.id) {
    return supabase.from(table).update(payload).eq('id', existing.id).select().maybeSingle()
  }

  return supabase
    .from(table)
    .insert({ ...payload, created_at: payload.created_at || now })
    .select()
    .maybeSingle()
}

type SubmitPayload = {
  clientId: string
  assessmentId: string
  data: SuitabilityFormData
  completionPercentage?: number
}

// =====================================================
// POST - Submit Suitability Assessment
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body: SubmitPayload = await request.json()
    const { clientId, assessmentId, data, completionPercentage } = body

    if (!clientId || !assessmentId) {
      return NextResponse.json(
        { success: false, error: 'Client ID and Assessment ID are required' },
        { status: 400 }
      )
    }

    if (!isUUID(assessmentId)) {
      return NextResponse.json({ success: false, error: 'Invalid assessmentId' }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Assessment data is required' }, { status: 400 })
    }

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    const now = new Date().toISOString()
    const completion =
      typeof completionPercentage === 'number'
        ? completionPercentage
        : data?._metadata?.completionPercentage ?? 0

    const mappedUpdate = mapSuitabilityFormDataToAssessmentUpdate(data, {
      completionPercentage: completion,
      status: 'submitted',
      updatedAt: now,
      completedBy: ctx.userId
    })

    await supabase
      .from('suitability_assessments')
      .update({ is_current: false } as any)
      .eq('client_id', clientId)
      .eq('is_current', true)

    const updateResult = await supabase
      .from('suitability_assessments')
      .update({
        ...mappedUpdate,
        status: 'submitted',
        completion_percentage: completion,
        is_current: true,
        is_draft: false,
        is_final: true,
        completed_at: now,
        completed_by: ctx.userId,
        updated_at: now,
        assessment_date: (data as any)?._metadata?.assessmentDate || (data as any)?._metadata?.assessment_date || now,
        metadata: {
          ...(mappedUpdate.metadata as any),
          completionPercentage: completion,
          submittedAt: now,
          submittedBy: ctx.userId,
          source: 'submit-api'
        }
      })
      .eq('id', assessmentId)
      .eq('client_id', clientId)
      .select('id,version_number')
      .maybeSingle()

    if (updateResult.error) {
      log.error('Failed to submit assessment', updateResult.error)
      return NextResponse.json(
        { success: false, error: 'Failed to submit assessment', details: updateResult.error.message },
        { status: 500 }
      )
    }

    if (!updateResult.data) {
      return NextResponse.json({ success: false, error: 'Assessment not found' }, { status: 404 })
    }

    // Update assessment_progress to completed (secondary)
    try {
      const progressMirror = await upsertByClientAndType(
        'assessment_progress',
        {
          client_id: clientId,
          assessment_type: 'suitability',
          status: 'completed',
          progress_percentage: completion,
          completed_at: now,
          completed_by: ctx.userId,
          last_updated: now,
          updated_at: now,
          metadata: {
            assessmentId,
            submittedAt: now,
            submittedBy: ctx.userId,
            source: 'submit-api'
          }
        },
        now
      )
      if (progressMirror.error) throw progressMirror.error
    } catch (progressError) {
      log.warn('Failed to update progress on submit', { error: progressError instanceof Error ? progressError.message : 'Unknown' })
    }

    // Mirror into assessments table (secondary)
    try {
      const assessmentsMirror = await upsertByClientAndType(
        'assessments',
        {
          client_id: clientId,
          assessment_type: 'suitability',
          advisor_id: ctx.userId,
          legacy_form_id: assessmentId,
          assessment_data: data,
          status: 'submitted',
          completed_at: now,
          updated_at: now,
          version: updateResult.data.version_number ?? null
        },
        now
      )
      if (assessmentsMirror.error) throw assessmentsMirror.error
    } catch (mirrorError) {
      log.warn('assessments mirror warning', { error: mirrorError instanceof Error ? mirrorError.message : 'Unknown' })
    }

    // Log submission history (secondary)
    try {
      await supabase.from('assessment_history').insert({
        client_id: clientId,
        assessment_id: assessmentId,
        assessment_type: 'suitability',
        action: 'submitted',
        performed_by: ctx.userId,
        performed_at: now,
        changes: {},
        metadata: {
          newStatus: 'submitted',
          source: 'submit-api'
        },
        created_at: now
      })
    } catch (historyError) {
      log.warn('Failed to log submission history', { error: historyError instanceof Error ? historyError.message : 'Unknown' })
    }

    return NextResponse.json({
      success: true,
      assessmentId,
      submittedAt: now,
      status: 'submitted'
    })
  } catch (error) {
    log.error('Suitability submit API error', error)
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

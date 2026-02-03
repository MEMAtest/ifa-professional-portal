// =====================================================
// FILE: src/app/api/assessments/suitability/save/route.ts
// BACK-COMPAT SAVE ENDPOINT (maps to suitability_assessments schema)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { isUUID } from '@/lib/utils'
import type { SuitabilityFormData } from '@/types/suitability'
import { mapSuitabilityAssessmentRowToFormData } from '@/lib/suitability/mappers'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { saveSuitabilityDraftWithMirrors } from '@/lib/suitability/server/saveSuitabilityDraftWithMirrors'
import { log } from '@/lib/logging/structured'
import { parseRequestBody } from '@/app/api/utils'

export const dynamic = 'force-dynamic'

type SavePayload = {
  clientId: string
  assessmentId?: string | null
  data: SuitabilityFormData
  progressPercentage?: number
}

// =====================================================
// POST - Save/Update Suitability Assessment
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!

    const supabase = getSupabaseServiceClient()

    const body: SavePayload = await parseRequestBody(request)
    const { clientId, assessmentId, data, progressPercentage } = body

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID is required' }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Assessment data is required' }, { status: 400 })
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    const now = new Date().toISOString()
    const completion =
      typeof progressPercentage === 'number' ? progressPercentage : data._metadata?.completionPercentage ?? 0

    const saved = await saveSuitabilityDraftWithMirrors({
      supabase,
      clientId,
      assessmentId: assessmentId && isUUID(assessmentId) ? assessmentId : undefined,
      formData: data,
      completionPercentage: completion,
      userId: ctx.userId,
      nowISO: now,
      source: 'save-api'
    })

    const savedId = saved.assessmentId
    const versionNumber = saved.versionNumber

    if (!savedId) return NextResponse.json({ success: false, error: 'Failed to save assessment' }, { status: 500 })

    return NextResponse.json({
      success: true,
      assessmentId: savedId,
      versionNumber,
      savedAt: now,
      status: 'in_progress'
    })
  } catch (error) {
    log.error('Suitability save API error', error)
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

// =====================================================
// GET - Retrieve Suitability Assessment
// =====================================================

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
      return NextResponse.json({ success: false, error: 'Either clientId or assessmentId is required' }, { status: 400 })
    }

    const effectiveAssessmentId = assessmentId && isUUID(assessmentId) ? assessmentId : undefined

    let query = supabase.from('suitability_assessments').select('*')

    if (effectiveAssessmentId) {
      query = query.eq('id', effectiveAssessmentId)
    } else if (clientId) {
      query = query.eq('client_id', clientId).order('updated_at', { ascending: false }).limit(1)
    }

    const { data: assessment, error } = await query.maybeSingle()

    if (error && error.code !== 'PGRST116') {
      log.error('Failed to fetch assessment', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch assessment' }, { status: 500 })
    }

    if (!assessment) {
      return NextResponse.json({ success: true, assessment: null, message: 'No assessment found' })
    }

    const access = await requireClientAccess({
      supabase,
      clientId: String((assessment as any).client_id),
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    const formData = mapSuitabilityAssessmentRowToFormData(assessment as any)

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        clientId: assessment.client_id,
        data: formData,
        status: assessment.status,
        completionPercentage: assessment.completion_percentage,
        createdAt: assessment.created_at,
        updatedAt: assessment.updated_at,
        versionNumber: assessment.version_number
      }
    })
  } catch (error) {
    log.error('Suitability fetch API error', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

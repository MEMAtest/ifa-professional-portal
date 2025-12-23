export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isUUID } from '@/lib/utils'
import type { SuitabilityFormData } from '@/types/suitability'
import {
  mapSuitabilityAssessmentRowToFormData
} from '@/lib/suitability/mappers'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { saveSuitabilityDraftWithMirrors } from '@/lib/suitability/server/saveSuitabilityDraftWithMirrors'
import { log } from '@/lib/logging/structured'

type DraftPayload = {
  clientId: string
  assessmentId?: string
  formData: any
  completionPercentage?: number
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!

    const supabase = getSupabaseServiceClient()

    const body: DraftPayload = await req.json()
    const { clientId, assessmentId, formData, completionPercentage } = body
    if (!clientId || !formData) {
      return NextResponse.json({ success: false, error: 'clientId and formData are required' }, { status: 400 })
    }

    if (!isUUID(clientId)) {
      return NextResponse.json({ success: false, error: 'Invalid clientId format' }, { status: 400 })
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    // If assessmentId is supplied but not a UUID, ignore it to avoid Supabase errors
    const now = new Date().toISOString()
    const saved = await saveSuitabilityDraftWithMirrors({
      supabase,
      clientId,
      assessmentId: assessmentId && isUUID(assessmentId) ? assessmentId : undefined,
      formData: formData as SuitabilityFormData,
      completionPercentage,
      userId: ctx.userId,
      nowISO: now,
      source: 'draft-api'
    })

    return NextResponse.json({
      success: true,
      assessmentId: saved.assessmentId,
      versionNumber: saved.versionNumber,
      completionPercentage: saved.completionPercentage ?? 0
    })
  } catch (error) {
    log.error('Suitability draft error', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!

    const supabase = getSupabaseServiceClient()

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const assessmentId = searchParams.get('assessmentId')

    if (!clientId && !assessmentId) {
      return NextResponse.json({ success: false, error: 'clientId or assessmentId is required' }, { status: 400 })
    }

    if (clientId && !isUUID(clientId)) {
      return NextResponse.json({ success: false, error: 'Invalid clientId format' }, { status: 400 })
    }
    if (assessmentId && !isUUID(assessmentId)) {
      return NextResponse.json({ success: false, error: 'Invalid assessmentId format' }, { status: 400 })
    }

    if (clientId) {
      const access = await requireClientAccess({
        supabase,
        clientId,
        ctx,
        select: 'id,firm_id,advisor_id'
      })
      if (!access.ok) return access.response
    }

    let query = supabase
      .from('suitability_assessments')
      .select(
        'id,client_id,version_number,is_draft,is_final,completion_percentage,updated_at,created_at,status,completed_at,completed_by,assessment_date,' +
        'personal_circumstances,financial_situation,investment_objectives,risk_assessment,knowledge_experience,' +
        'contact_details,existing_arrangements,vulnerability,regulatory,costs_charges,recommendations,metadata'
      )
      .order('updated_at', { ascending: false })
      .limit(1)

    if (assessmentId) {
      query = query.eq('id', assessmentId)
    } else {
      // Prefer drafts/in-progress, but fall back to the latest record for legacy rows.
      const { data: draftRow, error: draftError } = await supabase
        .from('suitability_assessments')
        .select(
          'id,client_id,version_number,is_draft,is_final,completion_percentage,updated_at,created_at,status,completed_at,completed_by,assessment_date,' +
            'personal_circumstances,financial_situation,investment_objectives,risk_assessment,knowledge_experience,' +
            'contact_details,existing_arrangements,vulnerability,regulatory,costs_charges,recommendations,metadata'
        )
        .eq('client_id', clientId as string)
        .or('is_draft.eq.true,status.ilike.in_progress,status.ilike.draft')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (draftError && draftError.code !== 'PGRST116') throw draftError
      if (draftRow) {
        const formData = mapSuitabilityAssessmentRowToFormData(draftRow as any)
        return NextResponse.json({
          success: true,
          assessmentId: (draftRow as any).id,
          versionNumber: (draftRow as any).version_number,
          completionPercentage: (draftRow as any).completion_percentage ?? 0,
          updatedAt: (draftRow as any).updated_at || (draftRow as any).created_at,
          status: (draftRow as any).status,
          formData
        })
      }

      query = query.eq('client_id', clientId as string)
    }

    const { data, error } = await query.maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!data) {
      return NextResponse.json({ success: true, assessmentId: null, formData: null })
    }

    // Cast to any to avoid TypeScript error with maybeSingle() return type
    const row = data as any

    if (!clientId && row?.client_id) {
      const access = await requireClientAccess({
        supabase,
        clientId: String(row.client_id),
        ctx,
        select: 'id,firm_id,advisor_id'
      })
      if (!access.ok) return access.response
    }

    const formData = mapSuitabilityAssessmentRowToFormData(row)

    return NextResponse.json({
      success: true,
      assessmentId: row.id,
      versionNumber: row.version_number,
      completionPercentage: row.completion_percentage ?? 0,
      updatedAt: row.updated_at || row.created_at,
      status: row.status,
      formData
    })
  } catch (error) {
    log.error('Suitability draft fetch error', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

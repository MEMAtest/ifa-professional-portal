import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'
import type { SuitabilityFormData } from '@/types/suitability'

import { saveSuitabilityDraft } from './saveSuitabilityDraft'

async function upsertByClientAndType(
  supabase: SupabaseClient<Database>,
  table: 'assessments' | 'assessment_progress',
  payload: any,
  now: string
) {
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

export async function saveSuitabilityDraftWithMirrors(params: {
  supabase: SupabaseClient<Database>
  clientId: string
  assessmentId?: string
  formData: SuitabilityFormData
  completionPercentage?: number
  userId: string
  nowISO?: string
  source?: string
}) {
  const now = params.nowISO || new Date().toISOString()
  const saved = await saveSuitabilityDraft({
    supabase: params.supabase,
    clientId: params.clientId,
    assessmentId: params.assessmentId,
    formData: params.formData,
    completionPercentage: params.completionPercentage,
    userId: params.userId,
    nowISO: now,
    source: params.source
  })

  const savedId = saved.assessmentId
  const versionNumber = saved.versionNumber
  const completion = saved.completionPercentage ?? 0

  if (!savedId) return saved

  // Keep these mirrors best-effort only; they are not the source of truth.
  try {
    const progressMirror = await upsertByClientAndType(
      params.supabase,
      'assessment_progress',
      {
        client_id: params.clientId,
        assessment_type: 'suitability',
        status: 'in_progress',
        progress_percentage: Math.min(completion, 99),
        completed_at: null,
        completed_by: null,
        last_updated: now,
        updated_at: now,
        metadata: {
          assessmentId: savedId,
          lastUpdated: now,
          source: params.source || 'draft-mirror',
          versionNumber
        }
      },
      now
    )
    if (progressMirror.error) throw progressMirror.error
  } catch (error) {
    console.warn('Failed to update assessment_progress mirror:', error)
  }

  try {
    const assessmentsMirror = await upsertByClientAndType(
      params.supabase,
      'assessments',
      {
        client_id: params.clientId,
        assessment_type: 'suitability',
        advisor_id: params.userId,
        legacy_form_id: savedId,
        assessment_data: params.formData,
        status: 'in_progress',
        completed_at: null,
        updated_at: now,
        version: versionNumber ?? null
      },
      now
    )
    if (assessmentsMirror.error) throw assessmentsMirror.error
  } catch (error) {
    console.warn('Failed to update assessments mirror:', error)
  }

  return saved
}


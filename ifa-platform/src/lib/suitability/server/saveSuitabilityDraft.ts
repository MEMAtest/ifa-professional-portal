import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'
import type { SuitabilityFormData } from '@/types/suitability'
import { isUUID } from '@/lib/utils'
import { mapSuitabilityFormDataToAssessmentUpdate } from '@/lib/suitability/mappers'

type SaveSuitabilityDraftArgs = {
  supabase: SupabaseClient<Database>
  clientId: string
  assessmentId?: string
  formData: SuitabilityFormData
  completionPercentage?: number
  userId: string
  nowISO?: string
  source?: string
}

const MAX_VERSION_RETRIES = 10

export async function saveSuitabilityDraft({
  supabase,
  clientId,
  assessmentId,
  formData,
  completionPercentage,
  userId,
  nowISO,
  source
}: SaveSuitabilityDraftArgs) {
  const now = nowISO || new Date().toISOString()

  let effectiveAssessmentId = assessmentId && isUUID(assessmentId) ? assessmentId : undefined

  // Find next version if inserting.
  // Uses retry loop to handle race conditions where concurrent requests
  // calculate the same version number. DB constraint (client_id, version_number)
  // ensures uniqueness - on conflict we retry with refreshed version.
  if (!effectiveAssessmentId) {
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from('suitability_assessments')
      .select('id')
      .eq('client_id', clientId)
      .or('is_draft.eq.true,status.ilike.in_progress,status.ilike.draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestDraftError && latestDraftError.code !== 'PGRST116') throw latestDraftError
    if (latestDraft?.id) {
      effectiveAssessmentId = latestDraft.id
    }
  }

  let versionNumber = 1
  if (!effectiveAssessmentId) {
    const { data: latest, error: latestError } = await supabase
      .from('suitability_assessments')
      .select('version_number')
      .eq('client_id', clientId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestError && latestError.code !== 'PGRST116') throw latestError
    versionNumber = (latest?.version_number || 0) + 1
  }

  const completion =
    typeof completionPercentage === 'number'
      ? completionPercentage
      : (formData as any)?._metadata?.completionPercentage ?? 0

  const mappedUpdate = mapSuitabilityFormDataToAssessmentUpdate(formData as SuitabilityFormData, {
    completionPercentage: completion,
    status: 'in_progress',
    updatedAt: now,
    completedBy: userId
  })

  const mapped = {
    client_id: clientId,
    ...mappedUpdate,
    completion_percentage: completion,
    status: 'in_progress',
    is_current: true,
    is_draft: true,
    is_final: false,
    updated_at: now,
    completed_by: userId,
    assessment_date:
      (formData as any)?._metadata?.assessmentDate ||
      (formData as any)?._metadata?.assessment_date ||
      now,
    metadata: {
      ...(mappedUpdate.metadata as any),
      completionPercentage: completion,
      lastSavedAt: now,
      ...(source ? { savedVia: source } : null)
    }
  }

  const insertWithRetries = async (initialVersion: number) => {
    let version = initialVersion
    let retries = 0
    let insertSuccess = false
    let insertResult: any

    while (!insertSuccess && retries < MAX_VERSION_RETRIES) {
      // Mark existing current as not current
      await supabase
        .from('suitability_assessments')
        .update({ is_current: false } as any)
        .eq('client_id', clientId)
        .eq('is_current', true)

      insertResult = await supabase
        .from('suitability_assessments')
        .insert({
          ...(mapped as any),
          version_number: version
        })
        .select('id,version_number,completion_percentage')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const uniqueCode = insertResult.error?.code
      const isUniqueViolation = uniqueCode === '23505' || uniqueCode === 23505

      if (isUniqueViolation) {
        retries++
        const { data: refreshed, error: refreshedError } = await supabase
          .from('suitability_assessments')
          .select('version_number')
          .eq('client_id', clientId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (refreshedError && refreshedError.code !== 'PGRST116') {
          throw refreshedError
        }

        const delayMs = Math.min(2000, Math.pow(2, retries) * 50 + Math.random() * 50)
        await new Promise((resolve) => setTimeout(resolve, delayMs))

        version = (refreshed?.version_number || 0) + 1
        continue
      }

      insertSuccess = true
    }

    const finalCode = insertResult?.error?.code
    if (!insertSuccess && (finalCode === '23505' || finalCode === 23505)) {
      const err = new Error('Failed to create assessment after max retries (version conflict)')
      ;(err as any).status = 409
      throw err
    }

    return insertResult
  }

  let result: any

  if (effectiveAssessmentId) {
    result = await supabase
      .from('suitability_assessments')
      .update(mapped as any)
      .eq('id', effectiveAssessmentId)
      .select('id,version_number,completion_percentage')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if ((result.error && result.error.code === 'PGRST116') || (!result.error && !result.data)) {
      const { data: latestDraft, error: latestDraftError } = await supabase
        .from('suitability_assessments')
        .select('id')
        .eq('client_id', clientId)
        .or('is_draft.eq.true,status.ilike.in_progress,status.ilike.draft')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestDraftError && latestDraftError.code !== 'PGRST116') throw latestDraftError

      if (latestDraft?.id) {
        result = await supabase
          .from('suitability_assessments')
          .update(mapped as any)
          .eq('id', latestDraft.id)
          .select('id,version_number,completion_percentage')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      }

      if ((result.error && result.error.code === 'PGRST116') || (!result.error && !result.data)) {
        const { data: latest, error: latestError } = await supabase
          .from('suitability_assessments')
          .select('version_number')
          .eq('client_id', clientId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestError && latestError.code !== 'PGRST116') throw latestError

        const nextVersion = (latest?.version_number || 0) + 1
        result = await insertWithRetries(nextVersion)
      }
    }
  } else {
    result = await insertWithRetries(versionNumber)
  }

  if (result.error) {
    // Surface common constraint issues as 400s so the UI can fall back safely.
    if (result.error.code === '23503') {
      const err = new Error('Client record not found for this assessment (foreign key constraint)')
      ;(err as any).status = 400
      throw err
    }
    throw result.error
  }

  return {
    assessmentId: result.data?.id as string | undefined,
    versionNumber: result.data?.version_number as number | undefined,
    completionPercentage: (result.data?.completion_percentage ?? completion) as number
  }
}

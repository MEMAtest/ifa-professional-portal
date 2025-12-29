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

const MAX_VERSION_RETRIES = 3

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

  const effectiveAssessmentId = assessmentId && isUUID(assessmentId) ? assessmentId : undefined

  // Find next version if inserting.
  // Uses retry loop to handle race conditions where concurrent requests
  // calculate the same version number. DB constraint (client_id, version_number)
  // ensures uniqueness - on conflict we retry with refreshed version.
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
      result = await supabase
        .from('suitability_assessments')
        .insert({
          ...(mapped as any),
          version_number: versionNumber
        })
        .select('id,version_number,completion_percentage')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    }
  } else {
    // New draft/version becomes the current one.
    // Retry loop handles version number race conditions.
    let retries = 0
    let insertSuccess = false

    while (!insertSuccess && retries < MAX_VERSION_RETRIES) {
      // Mark existing current as not current
      await supabase
        .from('suitability_assessments')
        .update({ is_current: false } as any)
        .eq('client_id', clientId)
        .eq('is_current', true)

      result = await supabase
        .from('suitability_assessments')
        .insert({
          ...(mapped as any),
          version_number: versionNumber
        })
        .select('id,version_number,completion_percentage')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Check for unique constraint violation on (client_id, version_number)
      if (result.error?.code === '23505') {
        retries++
        // Re-fetch latest version number and increment
        const { data: refreshed } = await supabase
          .from('suitability_assessments')
          .select('version_number')
          .eq('client_id', clientId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle()

        versionNumber = (refreshed?.version_number || 0) + 1
        continue
      }

      insertSuccess = true
    }

    if (!insertSuccess && result?.error?.code === '23505') {
      const err = new Error('Failed to create assessment after max retries (version conflict)')
      ;(err as any).status = 409
      throw err
    }
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

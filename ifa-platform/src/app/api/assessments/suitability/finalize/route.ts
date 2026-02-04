export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { SuitabilityFormData } from '@/types/suitability'
import { mapSuitabilityFormDataToAssessmentUpdate } from '@/lib/suitability/mappers'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger, getRequestMetadata } from '@/lib/logging/structured'
import { getCurrentAssessment } from '@/domain/queries'
import type { SnapshotReferences } from '@/domain/models'
import { mapSuitabilityToClientVulnerability } from '@/lib/suitability/vulnerability/mapSuitabilityToClientVulnerability'
import { mapSuitabilityToClientFinancials, mergeFinancialProfiles } from '@/lib/suitability/financials/mapSuitabilityToClientFinancials'
import { mapSuitabilityToClientContactInfo } from '@/lib/suitability/contact/mapSuitabilityToClientContactInfo'
import { notifyAssessmentCompleted } from '@/lib/notifications/notificationService'
import { parseRequestBody } from '@/app/api/utils'

type FinalizePayload = {
  assessmentId?: string
  clientId: string
  formData?: SuitabilityFormData
  completionPercentage?: number
}

const requestSchema = z.object({
  assessmentId: z.string().optional(),
  clientId: z.string().min(1),
  formData: z.any().optional(),
  completionPercentage: z.number().optional()
})

async function upsertByClientAndType(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
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

export async function POST(req: NextRequest) {
  const logger = createRequestLogger(req)
  const metadata = getRequestMetadata(req)

  logger.info('Suitability finalize started', metadata)

  try {
    let body: FinalizePayload
    try {
      body = await parseRequestBody(req, undefined, { allowEmpty: true })
    } catch (error) {
      logger.warn('Invalid JSON in finalize request', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { assessmentId, clientId, formData, completionPercentage } = body
    if (!clientId) {
      logger.warn('Missing clientId in request', { assessmentId })
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      logger.warn('Invalid finalize request body', { issues: parsed.error.issues })
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    logger.debug('Finalize payload received', { clientId, assessmentId, hasFormData: !!formData })

    const auth = await getAuthContext(req)
    if (!auth.success) {
      logger.warn('Authentication failed', { error: auth.error })
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
        : formData?._metadata?.completionPercentage ?? 0

    const assessmentDate =
      (formData as any)?._metadata?.assessmentDate || (formData as any)?._metadata?.assessment_date || now

    const mappedUpdate = mapSuitabilityFormDataToAssessmentUpdate((formData || ({} as any)) as SuitabilityFormData, {
      completionPercentage: completion,
      status: 'completed',
      updatedAt: now,
      completedBy: ctx.userId
    })

    // Capture snapshot references for report reproducibility
    logger.debug('Capturing snapshot references', { clientId })
    const [atr, cfl, persona] = await Promise.all([
      getCurrentAssessment(supabase as any, clientId, 'atr'),
      getCurrentAssessment(supabase as any, clientId, 'cfl'),
      getCurrentAssessment(supabase as any, clientId, 'persona')
    ])

    const snapshotRefs: SnapshotReferences = {
      atrAssessmentId: atr?.id,
      atrVersion: atr?.versionNumber,
      cflAssessmentId: cfl?.id,
      cflVersion: cfl?.versionNumber,
      personaAssessmentId: persona?.id,
      personaVersion: persona?.versionNumber,
      capturedAt: now
    }

    logger.info('Snapshot references captured', {
      clientId,
      hasAtr: !!atr,
      hasCfl: !!cfl,
      hasPersona: !!persona
    })

    let targetId = assessmentId
    let targetVersionNumber: number | null | undefined

    if (!targetId) {
      const { data: latest, error: latestError } = await supabase
        .from('suitability_assessments')
        .select('version_number')
        .eq('client_id', clientId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestError && latestError.code !== 'PGRST116') throw latestError

      const nextVersion = (latest?.version_number || 0) + 1

      // Track which records were marked as not current for potential rollback
      const { data: previousCurrentRecords } = await supabase
        .from('suitability_assessments')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_current', true)

      const previousCurrentIds = ((previousCurrentRecords || []) as any[]).map((r: any) => r.id)

      await supabase
        .from('suitability_assessments')
        .update({ is_current: false } as any)
        .eq('client_id', clientId)
        .eq('is_current', true)

      const insert = await supabase
        .from('suitability_assessments')
        .insert({
          client_id: clientId,
          version_number: nextVersion,
          is_current: true,
          ...mappedUpdate,
          is_draft: false,
          is_final: true,
          status: 'completed',
          completion_percentage: completion,
          completed_at: now,
          completed_by: ctx.userId,
          assessment_date: assessmentDate,
          metadata: {
            ...(mappedUpdate.metadata as any),
            completionPercentage: completion,
            finalizedAt: now,
            snapshot_refs: snapshotRefs
          }
        })
        .select('id,version_number')
        .maybeSingle()

      if (insert.error) {
        // Rollback: restore is_current=true on previously current records
        if (previousCurrentIds.length > 0) {
          await supabase
            .from('suitability_assessments')
            .update({ is_current: true } as any)
            .in('id', previousCurrentIds)
          logger.warn('Rolled back is_current flags after insert failure', {
            clientId,
            restoredIds: previousCurrentIds
          })
        }
        throw insert.error
      }

      targetId = insert.data?.id
      targetVersionNumber = insert.data?.version_number ?? nextVersion
    } else {
      const update = await supabase
        .from('suitability_assessments')
        .update({
          ...mappedUpdate,
          is_current: true,
          is_draft: false,
          is_final: true,
          status: 'completed',
          completion_percentage: completion,
          completed_at: now,
          completed_by: ctx.userId,
          updated_at: now,
          assessment_date: assessmentDate,
          metadata: {
            ...(mappedUpdate.metadata as any),
            completionPercentage: completion,
            finalizedAt: now,
            snapshot_refs: snapshotRefs
          }
        })
        .eq('id', targetId)
        .select('id,version_number')
        .maybeSingle()

      if (update.error) throw update.error

      targetVersionNumber = update.data?.version_number
    }

    // Upsert to assessments table for dashboard/overview
    const assessmentsMirror = await upsertByClientAndType(
      supabase,
      'assessments',
      {
        client_id: clientId,
        assessment_type: 'suitability',
        advisor_id: ctx.userId,
        legacy_form_id: targetId || null,
        assessment_data: formData || {},
        status: 'completed',
        completed_at: now,
        updated_at: now,
        version: targetVersionNumber ?? null
      },
      now
    )
    if (assessmentsMirror.error) {
      logger.warn('Assessments mirror upsert failed', { error: assessmentsMirror.error.message, clientId })
    }

    // Also upsert to assessment_progress table (used by client assessments overview)
    const progressMirror = await upsertByClientAndType(
      supabase,
      'assessment_progress',
      {
        client_id: clientId,
        assessment_type: 'suitability',
        status: 'completed',
        progress_percentage: completion,
        completed_at: now,
        completed_by: ctx.userId,
        last_updated: now,
        updated_at: now
      },
      now
    )
    if (progressMirror.error) {
      logger.warn('Assessment progress mirror upsert failed', { error: progressMirror.error.message, clientId })
    }

    // Sync vulnerability assessment into client profile (single source of truth for compliance/register views)
    try {
      const vulnerabilityAssessment = mapSuitabilityToClientVulnerability({
        formData: (formData || ({} as any)) as SuitabilityFormData,
        nowISO: now,
        assessorId: ctx.userId
      })

      const { error: vulnError } = await supabase
        .from('clients')
        .update({
          vulnerability_assessment: vulnerabilityAssessment,
          updated_at: now
        } as any)
        .eq('id', clientId)

      if (vulnError) {
        logger.warn('Client vulnerability sync failed', { clientId, error: vulnError.message })
      }
    } catch (error) {
      logger.warn('Client vulnerability sync error', { clientId, error: error instanceof Error ? error.message : String(error) })
    }

    // Sync financial data from suitability assessment to client profile
    // This populates existingInvestments[], pensionArrangements[], insurancePolicies[] arrays
    try {
      // First fetch existing client profile to merge with
      const { data: clientData } = await supabase
        .from('clients')
        .select('financial_profile, contact_info')
        .eq('id', clientId)
        .single()

      const existingProfile = (clientData?.financial_profile || {}) as any
      const existingContact = (clientData?.contact_info || {}) as any

      // Map suitability financial data to client profile structure
      const syncedFinancials = mapSuitabilityToClientFinancials({
        formData: (formData || ({} as any)) as SuitabilityFormData,
        existingProfile,
        nowISO: now
      })

      // Merge with existing profile (preserves user-entered data)
      const mergedProfile = mergeFinancialProfiles(existingProfile, syncedFinancials)

      const mergedContactInfo = mapSuitabilityToClientContactInfo({
        formData: (formData || ({} as any)) as SuitabilityFormData,
        existingContact
      })

      const { error: finError } = await supabase
        .from('clients')
        .update({
          financial_profile: mergedProfile,
          contact_info: mergedContactInfo,
          updated_at: now
        } as any)
        .eq('id', clientId)

      if (finError) {
        logger.warn('Client financial/contact sync failed', { clientId, error: finError.message })
      } else {
        logger.info('Client financial profile synced from suitability', {
          clientId,
          investmentsCount: mergedProfile.existingInvestments?.length || 0,
          pensionsCount: mergedProfile.pensionArrangements?.length || 0,
          insuranceCount: mergedProfile.insurancePolicies?.length || 0
        })
      }
    } catch (error) {
      logger.warn('Client financial sync error', { clientId, error: error instanceof Error ? error.message : String(error) })
    }

    logger.info('Suitability finalize completed', {
      clientId,
      assessmentId: targetId,
      versionNumber: targetVersionNumber,
      completion
    })

    // Send notification for assessment completion
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('personal_details, client_ref')
        .eq('id', clientId)
        .single()

      if (clientData && targetId) {
        const personalDetails = (clientData.personal_details || {}) as Record<string, any>
        const firstName = personalDetails.firstName ?? personalDetails.first_name ?? ''
        const lastName = personalDetails.lastName ?? personalDetails.last_name ?? ''
        const title = personalDetails.title ?? personalDetails.salutation ?? ''

        const clientName = `${title} ${firstName} ${lastName}`.replace(/\s+/g, ' ').trim() || clientData.client_ref || 'Client'
        await notifyAssessmentCompleted(
          ctx.userId,
          clientId,
          clientName,
          targetId,
          'Suitability'
        )
      }
    } catch (notifyError) {
      logger.warn('Could not send assessment completion notification', {
        error: notifyError instanceof Error ? notifyError.message : 'Unknown'
      })
    }

    logger.logRequestComplete(200, { clientId, assessmentId: targetId })

    return NextResponse.json({
      success: true,
      assessmentId: targetId,
      completionPercentage: completion
    })
  } catch (error) {
    logger.error('Suitability finalize failed', error, { clientId: 'unknown' })
    logger.logRequestComplete(500)
    return NextResponse.json(
      { success: false, error: '' },
      { status: 500 }
    )
  }
}

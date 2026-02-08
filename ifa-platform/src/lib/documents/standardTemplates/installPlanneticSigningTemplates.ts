import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, DbInsert } from '@/types/db'
import { getPlanneticSigningStandardTemplates } from '@/lib/documents/standardTemplates/planneticSigningStandardTemplates'
import { buildTemplateVariablesPayload, extractTemplateVariableKeys } from '@/lib/documents/templateVariables'
import { createHash } from 'crypto'
import { sanitizeTemplateHtml } from '@/lib/documents/templateSanitizer'

type DocumentTemplateInsert = DbInsert<'document_templates'>

export type StandardTemplateInstallResult = {
  installed: number
  updated: number
  skipped: number
  missing: string[]
  updated_keys: string[]
  skipped_forked: string[]
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

const PLANNETIC_SIGNING_TEMPLATE_PACK = 'plannetic_signing'
const PLANNETIC_SIGNING_TEMPLATE_PACK_VERSION = 1

export async function ensurePlanneticSigningTemplatesInstalled(args: {
  supabase: SupabaseClient<Database>
  firmId: string
  userId: string
  assessmentTypes?: string[]
  syncUpdates?: boolean
  force?: boolean
}): Promise<StandardTemplateInstallResult> {
  const {
    supabase,
    firmId,
    userId,
    assessmentTypes: requestedAssessmentTypes,
    syncUpdates = false,
    force = false
  } = args

  const standards = getPlanneticSigningStandardTemplates().filter((t) => {
    if (!requestedAssessmentTypes || requestedAssessmentTypes.length === 0) return true
    return requestedAssessmentTypes.includes(t.assessment_type)
  })
  if (standards.length === 0) {
    return {
      installed: 0,
      updated: 0,
      skipped: 0,
      missing: [],
      updated_keys: [],
      skipped_forked: []
    }
  }
  const assessmentTypes = standards.map((t) => t.assessment_type)

  const { data: existing, error: existingError } = await supabase
    .from('document_templates')
    .select('id, assessment_type, template_content, requires_signature, template_variables')
    .eq('firm_id', firmId)
    .in('assessment_type', assessmentTypes)

  if (existingError) {
    throw new Error(existingError.message)
  }

  const existingRows = (existing || []) as any[]
  const existingByKey = new Map<string, any>()
  for (const row of existingRows) {
    const key = String(row?.assessment_type || '')
    if (!key) continue
    existingByKey.set(key, row)
  }

  const existingKeys = new Set(Array.from(existingByKey.keys()))
  const missing = assessmentTypes.filter((key) => key && !existingKeys.has(key))

  const now = new Date().toISOString()
  const toInsert: DocumentTemplateInsert[] = standards
    .filter((t) => missing.includes(t.assessment_type))
    .map((t) => {
      const sanitizedContent = sanitizeTemplateHtml(t.template_content)
      const variableKeys = extractTemplateVariableKeys(sanitizedContent)
      const varsPayload = buildTemplateVariablesPayload(variableKeys) as any
      varsPayload._standard = {
        pack: PLANNETIC_SIGNING_TEMPLATE_PACK,
        pack_version: PLANNETIC_SIGNING_TEMPLATE_PACK_VERSION,
        key: t.assessment_type,
        content_hash: sha256(sanitizedContent),
        synced_at: now,
        forked: false
      }
      return {
        name: t.name,
        description: t.description,
        assessment_type: t.assessment_type,
        template_content: sanitizedContent,
        template_variables: varsPayload as any,
        requires_signature: t.requires_signature,
        is_active: true,
        is_default: true,
        firm_id: firmId,
        created_by: userId,
        updated_at: now
      }
    })

  // Insert one-by-one so we can gracefully handle concurrent installs that race
  // on the same `(firm_id, assessment_type)` unique constraint.
  let installed = 0
  let duplicateSkipped = 0
  let updated = 0
  const updated_keys: string[] = []
  const skipped_forked: string[] = []

  for (const row of toInsert) {
    const { error: insertError } = await supabase
      .from('document_templates')
      .insert(row)

    if (insertError) {
      const code = (insertError as any)?.code
      // 23505 = unique violation (concurrent installs)
      // 23514 = check constraint violation (assessment_type not in allowed list)
      if (code === '23505' || code === 23505 || code === '23514' || code === 23514) {
        duplicateSkipped += 1
        continue
      }
      throw new Error(insertError.message)
    }

    installed += 1
  }

  // Sync updates from standards only when explicitly requested. This avoids
  // surprising firms by silently changing documents in production.
  // Fork detection is based on `_standard` metadata in `template_variables`.
  if (syncUpdates || force) {
    for (const t of standards) {
      const existingRow = existingByKey.get(t.assessment_type)
      if (!existingRow) continue

      const sanitizedStandardContent = sanitizeTemplateHtml(t.template_content)
      const existingContent = String(existingRow?.template_content || '')
      const existingContentHash = sha256(existingContent)

      const meta = (existingRow?.template_variables as any)?._standard as any | undefined
      const isManagedByPack =
        !!meta &&
        typeof meta === 'object' &&
        meta.pack === PLANNETIC_SIGNING_TEMPLATE_PACK &&
        meta.key === t.assessment_type

      const standardContentHash = sha256(sanitizedStandardContent)
      const lastSyncedHash = isManagedByPack && typeof meta?.content_hash === 'string' ? meta.content_hash : ''
      const forkedFlag = isManagedByPack && meta?.forked === true
      const forkedByContent = isManagedByPack && !!lastSyncedHash && existingContentHash !== lastSyncedHash
      const isForked = !isManagedByPack ? true : (forkedFlag || forkedByContent)

      if (isForked && !force) {
        skipped_forked.push(t.assessment_type)
        continue
      }

      const needsUpdate =
        existingContentHash !== standardContentHash ||
        (existingRow?.requires_signature ?? null) !== t.requires_signature

      if (!needsUpdate) {
        continue
      }

      const variableKeys = extractTemplateVariableKeys(sanitizedStandardContent)
      const varsPayload = buildTemplateVariablesPayload(variableKeys) as any
      varsPayload._standard = {
        pack: PLANNETIC_SIGNING_TEMPLATE_PACK,
        pack_version: PLANNETIC_SIGNING_TEMPLATE_PACK_VERSION,
        key: t.assessment_type,
        content_hash: standardContentHash,
        synced_at: now,
        forked: false
      }

      const { error: updateError } = await supabase
        .from('document_templates')
        .update({
          name: t.name,
          description: t.description,
          template_content: sanitizedStandardContent,
          template_variables: varsPayload as any,
          requires_signature: t.requires_signature,
          // For this pack we always keep one active default per assessment type.
          is_default: true,
          updated_at: now
        } as any)
        .eq('id', existingRow.id)
        .eq('firm_id', firmId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      updated += 1
      updated_keys.push(t.assessment_type)
    }
  }

  return {
    installed,
    updated,
    skipped: (standards.length - toInsert.length) + duplicateSkipped + skipped_forked.length,
    missing,
    updated_keys,
    skipped_forked
  }
}

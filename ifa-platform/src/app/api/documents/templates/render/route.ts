export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'
import { buildFirmClientTemplateVariables } from '@/lib/documents/templateContext'
import { populateTemplate } from '@/services/document-generation/template-utils'
import { findPlanneticSigningStandardTemplate } from '@/lib/documents/standardTemplates/planneticSigningStandardTemplates'
import { extractTemplateVariableKeys } from '@/lib/documents/templateVariables'

interface RenderTemplateRequest {
  templateId: string
  clientId: string
  overrides?: Record<string, unknown>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toStringRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!k) continue
    if (v === null || v === undefined) {
      out[k] = ''
      continue
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v)
      continue
    }
    // Avoid surprising `[object Object]` values in signed documents.
    out[k] = ''
  }
  return out
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Rendering templates produces a client-facing document body, so treat as a write-capability.
    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) return permissionError

    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) return firmResult
    const { firmId } = firmResult

    const body = (await parseRequestBody(request)) as Partial<RenderTemplateRequest>
    const templateId = (body.templateId || '').trim()
    const clientId = (body.clientId || '').trim()

    if (!templateId || !clientId) {
      return NextResponse.json(
        { success: false, error: 'templateId and clientId are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id, client_ref, personal_details, contact_info'
    })
    if (!access.ok) return access.response

    // Fetch the firm-scoped template (by id, assessment_type, or name)
    const baseQuery = supabase
      .from('document_templates')
      .select('*')
      .eq('firm_id', firmId)
      .eq('is_active', true)

    let template: any | null = null
    let templateError: any | null = null
    if (isUuid(templateId)) {
      const res = await baseQuery.eq('id', templateId).maybeSingle()
      template = res.data
      templateError = res.error
    } else {
      const resByAssessment = await baseQuery.eq('assessment_type', templateId).maybeSingle()
      if (resByAssessment.data) {
        template = resByAssessment.data
      } else {
        const resByName = await baseQuery.eq('name', templateId).maybeSingle()
        template = resByName.data
        templateError = resByName.error
      }
    }

    const standardFallback = !templateError && !template
      ? findPlanneticSigningStandardTemplate(templateId)
      : null

    if (templateError || (!template && !standardFallback)) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    const resolvedTemplateId = (template as any)?.id || standardFallback?.assessment_type
    const resolvedTemplateName = (template as any)?.name || standardFallback?.name || 'Document'
    const templateContent = String((template as any)?.template_content || standardFallback?.template_content || '')

    const baseVariables = await buildFirmClientTemplateVariables({
      userId: auth.context.userId,
      firmId,
      client: access.client
    })

    const variables = {
      ...baseVariables,
      DOCUMENT_TITLE: resolvedTemplateName,
      ...toStringRecord(body.overrides)
    }

    // Ensure we never leave raw placeholders in a client-facing document.
    // Missing variables render as empty strings unless explicitly overridden.
    for (const key of extractTemplateVariableKeys(templateContent)) {
      if (!(key in variables)) {
        ;(variables as any)[key] = ''
      }
    }

    // Backwards compatible replacements:
    // - `[KEY]`
    // - `${KEY}`
    // - `{{KEY}}` (via populateTemplate)
    let rendered = templateContent
    for (const [key, value] of Object.entries(variables)) {
      const safeValue = value !== null && value !== undefined ? String(value) : ''
      const escapedKey = escapeRegExp(key)
      rendered = rendered.replace(new RegExp(`\\[${escapedKey}\\]`, 'g'), () => safeValue)
      rendered = rendered.replace(new RegExp(`\\$\\{\\s*${escapedKey}\\s*\\}`, 'g'), () => safeValue)
    }
    rendered = populateTemplate(rendered, variables)

    return NextResponse.json({
      success: true,
      rendered: {
        templateId: resolvedTemplateId,
        templateName: resolvedTemplateName,
        clientId,
        html: rendered
      }
    })
  } catch (error) {
    log.error('Error rendering template', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { rateLimit } from '@/lib/security/rateLimit'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'
import { buildTemplateVariablesPayload, extractTemplateVariableKeys } from '@/lib/documents/templateVariables'

type UpdateTemplateRequest = {
  templateId: string
  name?: string
  description?: string | null
  template_content: string
  requires_signature?: boolean | null
  is_active?: boolean | null
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rateLimitResponse = await rateLimit(request, 'api')
    if (rateLimitResponse) return rateLimitResponse

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) return permissionError

    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) return firmResult
    const { firmId } = firmResult

    const body = (await parseRequestBody(request)) as Partial<UpdateTemplateRequest>
    const templateId = (body.templateId || '').trim()
    const templateContent = typeof body.template_content === 'string' ? body.template_content : ''

    if (!templateId || !isUuid(templateId)) {
      return NextResponse.json({ success: false, error: 'Valid templateId is required' }, { status: 400 })
    }

    if (!templateContent.trim()) {
      return NextResponse.json({ success: false, error: 'template_content cannot be empty' }, { status: 400 })
    }

    const nextName = typeof body.name === 'string' ? body.name.trim() : ''
    const nextDescription =
      body.description === undefined ? undefined : (body.description === null ? null : String(body.description))

    const variableKeys = extractTemplateVariableKeys(templateContent)
    const varsPayload = buildTemplateVariablesPayload(variableKeys) as any

    const supabase = getSupabaseServiceClient()

    // Preserve standard metadata so we can support "Update from standard" safely.
    const { data: existing, error: existingError } = await supabase
      .from('document_templates')
      .select('id, template_variables')
      .eq('id', templateId)
      .eq('firm_id', firmId)
      .maybeSingle()

    if (existingError) {
      log.error('Failed to load template for update', { error: existingError?.message, code: (existingError as any)?.code, templateId })
      return NextResponse.json({ success: false, error: 'Failed to update template' }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    const standardMeta = (existing as any)?.template_variables?._standard
    if (standardMeta && typeof standardMeta === 'object') {
      varsPayload._standard = {
        ...standardMeta,
        forked: true,
        forked_at: new Date().toISOString(),
        forked_by: auth.context.userId
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('document_templates')
      .update({
        ...(nextName ? { name: nextName } : {}),
        ...(nextDescription !== undefined ? { description: nextDescription } : {}),
        template_content: templateContent,
        ...(body.requires_signature !== undefined ? { requires_signature: body.requires_signature } : {}),
        ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
        template_variables: varsPayload as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('firm_id', firmId)
      .select('*')
      .maybeSingle()

    if (updateError) {
      log.error('Template update failed', { error: updateError?.message, code: (updateError as any)?.code, templateId })
      return NextResponse.json({ success: false, error: 'Failed to update template' }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      template: updated
    })
  } catch (error) {
    log.error('Error updating template', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

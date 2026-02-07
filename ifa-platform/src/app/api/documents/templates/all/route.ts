export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ================================================================
// FILE: /api/documents/templates/all/route.ts
// PURPOSE: Get all active document templates regardless of assessment type
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { DocumentTemplateService } from '@/services/documentTemplateService'
import { DocumentGenerationRouter } from '@/services/DocumentGenerationRouter'
import { ensurePlanneticSigningTemplatesInstalled } from '@/lib/documents/standardTemplates/installPlanneticSigningTemplates'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Listing and provisioning firm templates is a configuration capability, not a client-facing read.
    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) return permissionError

    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const supabase = getSupabaseServiceClient()

    const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true'

    const buildQuery = () => {
      // Fetch firm templates (active by default)
      let query = supabase
        .from('document_templates')
        .select('*')
        .eq('firm_id', firmId)
        .order('assessment_type')
        .order('is_default', { ascending: false })
        .order('name')

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      return query
    }

    const { data: templates, error } = await buildQuery()

    if (error) {
      log.error('Error fetching all templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    const hydratedTemplates = templates || []

    // Ensure Plannetic signing standard templates exist for this firm.
    // Insert missing only; never overwrite existing firm customisations.
    try {
      const installResult = await ensurePlanneticSigningTemplatesInstalled({
        supabase,
        firmId,
        userId: auth.context.userId
      })

      if (installResult.installed > 0) {
        const { data: refreshed, error: refreshError } = await buildQuery()
        if (refreshError) {
          log.error('Error refetching templates after install:', refreshError)
          return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          templates: refreshed || [],
          count: (refreshed || []).length,
          installed_standard_templates: installResult.installed
        })
      }
    } catch (installError) {
      log.error('Standard template install failed:', installError)
      // Fall through to returning whatever we already have, or defaults below.
    }

    if (hydratedTemplates.length > 0) {
      return NextResponse.json({
        success: true,
        templates: hydratedTemplates,
        count: hydratedTemplates.length
      })
    }

    const templateService = DocumentTemplateService.getInstance()
    const defaults = templateService.getDefaultTemplates()
    const slugify = (value: string) => value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    const fallbackTemplates = defaults.map((template) => {
      const templateName = template.name || 'Template'
      const slug = slugify(templateName)
      const documentType = template.documentType || slug || 'template_document'
      const inferredRequiresSignature = templateName.toLowerCase().includes('draft')
        ? false
        : DocumentGenerationRouter.requiresSignature(documentType)
      return {
        id: slug || documentType,
        name: templateName,
        description: template.description || null,
        assessment_type: documentType || null,
        document_type: documentType || null,
        requires_signature: inferredRequiresSignature,
        is_default: true,
        is_active: true,
        firm_id: firmId,
        source: 'default'
      }
    })

    return NextResponse.json({
      success: true,
      templates: fallbackTemplates,
      count: fallbackTemplates.length,
      source: 'default'
    })
  } catch (error) {
    log.error('Error in all templates route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

// ================================================================
// FILE: /api/documents/templates/all/route.ts
// PURPOSE: Get all active document templates regardless of assessment type
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { DocumentTemplateService } from '@/services/documentTemplateService'
import { DocumentGenerationRouter } from '@/services/DocumentGenerationRouter'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const supabase = getSupabaseServiceClient()

    // Fetch all active templates
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true)
      .eq('firm_id', firmId)
      .order('assessment_type')
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      log.error('Error fetching all templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    const hydratedTemplates = templates || []
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

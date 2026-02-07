// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 4: /api/documents/templates/[assessmentType]/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'

interface Params {
  params: {
    assessmentType: string
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) return permissionError

    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const supabase = getSupabaseServiceClient()

    const { assessmentType } = params

    // Validate assessment type
    const validTypes = ['suitability', 'atr', 'cfl', 'vulnerability', 'combined']
    if (!validTypes.includes(assessmentType)) {
      return NextResponse.json(
        { error: 'Invalid assessment type' },
        { status: 400 }
      )
    }

    // Fetch templates
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('assessment_type', assessmentType)
      .eq('is_active', true)
      .eq('firm_id', firmId)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      log.error('Error fetching templates', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      templates: templates || [],
      count: templates?.length || 0
    })
  } catch (error) {
    log.error('Error in templates route', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

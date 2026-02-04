export const dynamic = 'force-dynamic'

// ================================================================
// FILE: /api/documents/templates/all/route.ts
// PURPOSE: Get all active document templates regardless of assessment type
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'

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

    return NextResponse.json({
      success: true,
      templates: templates || [],
      count: templates?.length || 0
    })
  } catch (error) {
    log.error('Error in all templates route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

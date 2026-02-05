// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 5: /api/documents/preview/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'

export async function POST(request: NextRequest) {
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

    const body = await parseRequestBody(request)
    const { templateId, variables } = body

    if (!templateId || !variables) {
      return NextResponse.json(
        { error: 'templateId and variables are required' },
        { status: 400 }
      )
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .eq('firm_id', firmId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Simple template population for preview
    let content = template.template_content ?? ''
    Object.entries(variables).forEach(([key, value]) => {
      const safeValue = String(value ?? '')
      const curlyRegex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
      const bracketRegex = new RegExp(`\\[${key}\\]`, 'g')
      const dollarRegex = new RegExp(`\\$\\{${key}\\}`, 'g')
      content = content.replace(curlyRegex, safeValue)
      content = content.replace(bracketRegex, safeValue)
      content = content.replace(dollarRegex, safeValue)
    })

    return NextResponse.json({
      success: true,
      preview: {
        title: template.name,
        content,
        variables
      }
    })
  } catch (error) {
    log.error('Error in preview', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

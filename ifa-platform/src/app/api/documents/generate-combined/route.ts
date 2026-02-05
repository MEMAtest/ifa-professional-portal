// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 2: /api/documents/generate-combined/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { enhancedDocumentService } from '@/services/EnhancedDocumentGenerationService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'
import { rateLimit } from '@/lib/security/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, 'api')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'reports:generate')
    if (permissionError) {
      return permissionError
    }

    const body = await parseRequestBody(request)
    const { clientId, assessmentIds, templateId, reportType } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()
    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    // Generate combined report
    const result = await enhancedDocumentService.generateCombinedReport({
      clientId,
      assessmentIds: assessmentIds || [],
      templateId,
      reportType: reportType || 'annual_review'
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate combined report' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      documentUrl: result.documentUrl,
      metadata: result.metadata
    })
  } catch (error) {
    log.error('Error in generate-combined', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

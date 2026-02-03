// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 2: /api/documents/generate-combined/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { enhancedDocumentService } from '@/services/EnhancedDocumentGenerationService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await parseRequestBody(request)
    const { clientId, assessmentIds, templateId, reportType } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      )
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

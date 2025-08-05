// ================================================================
// FILE 2: /api/documents/generate-combined/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'
import { enhancedDocumentService } from '@/services/EnhancedDocumentGenerationService'

export async function POST(request: NextRequest) {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
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
    console.error('Error in generate-combined:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

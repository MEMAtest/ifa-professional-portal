// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 3: /api/documents/generate-batch/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { enhancedDocumentService } from '@/services/EnhancedDocumentGenerationService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext } from '@/lib/auth/apiAuth'

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

    const body = await request.json()
    const { clientIds, documentTypes, options } = body

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'clientIds array is required' },
        { status: 400 }
      )
    }

    if (!documentTypes || !Array.isArray(documentTypes) || documentTypes.length === 0) {
      return NextResponse.json(
        { error: 'documentTypes array is required' },
        { status: 400 }
      )
    }

    // Generate batch
    const results = await enhancedDocumentService.generateBatch({
      clientIds,
      documentTypes,
      options
    })

    const successful = results.filter((r: any) => r.success).length
    const failed = results.filter((r: any) => !r.success).length

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        successful,
        failed
      },
      results
    })
  } catch (error) {
    log.error('Error in generate-batch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 3: /api/documents/generate-batch/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { enhancedDocumentService } from '@/services/EnhancedDocumentGenerationService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
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

    const supabase = getSupabaseServiceClient()

    const body = await parseRequestBody(request)
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

    for (const clientId of clientIds) {
      const access = await requireClientAccess({
        supabase,
        clientId,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }
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

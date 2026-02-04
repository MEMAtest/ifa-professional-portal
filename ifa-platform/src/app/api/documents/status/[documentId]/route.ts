// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 6: /api/documents/status/[documentId]/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'

interface StatusParams {
  params: {
    documentId: string
  }
}

export async function PUT(request: NextRequest, { params }: StatusParams) {
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

    const { documentId } = params
    const body = await parseRequestBody(request)
    const { status, signatureRequestId, signedAt, metadata } = body

    // Validate status
    const validStatuses = ['active', 'pending', 'reviewed', 'archived', 'signed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Update document
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (signatureRequestId) updateData.signature_request_id = signatureRequestId
    if (signedAt) updateData.signed_at = signedAt
    if (metadata) updateData.metadata = metadata

    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('firm_id', firmId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document
    })
  } catch (error) {
    log.error('Error in status update', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

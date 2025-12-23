// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 6: /api/documents/status/[documentId]/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/logging/structured'

interface StatusParams {
  params: {
    documentId: string
  }
}

export async function PUT(request: NextRequest, { params }: StatusParams) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { documentId } = params
    const body = await request.json()
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
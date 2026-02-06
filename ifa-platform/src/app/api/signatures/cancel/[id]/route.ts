// ================================================================
// UNIFIED SIGNATURE API - CANCEL SIGNATURE REQUEST
// Cancels a pending signature request
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/services/SignatureService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  log.info('CANCEL SIGNATURE: API endpoint called')

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const firmId = firmResult.firmId

    const signatureRequestId = params.id

    if (!signatureRequestId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request ID is required'
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    // Get the signature request from database
    const { data: signatureRequest, error: signatureError } = await supabase
      .from('signature_requests')
      .select('*')
      .eq('id', signatureRequestId)
      .eq('firm_id', firmId)
      .single()

    if (signatureError || !signatureRequest) {
      log.error('CANCEL SIGNATURE: Signature request not found', signatureError)
      return NextResponse.json(
        {
          success: false,
          error: 'Signature request not found'
        },
        { status: 404 }
      )
    }

    // Can only cancel if not already completed
    if (['completed', 'signed'].includes(signatureRequest.status || '')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot cancel - document has already been signed'
        },
        { status: 400 }
      )
    }

    // Update signature request status
    const { error: updateError } = await supabase
      .from('signature_requests')
      .update({
        status: 'cancelled',
        signing_token_used: true, // Invalidate the token
        opensign_metadata: {
          ...(typeof signatureRequest.opensign_metadata === 'object' && signatureRequest.opensign_metadata !== null ? signatureRequest.opensign_metadata : {}),
          cancelled_at: new Date().toISOString(),
          cancelled_by: auth.context.userId
        } as any
      })
      .eq('id', signatureRequestId)
      .eq('firm_id', firmId)

    if (updateError) {
      log.error('CANCEL SIGNATURE: Database update error', updateError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to cancel signature request'
        },
        { status: 500 }
      )
    }

    // Log audit event
    await signatureService.logAuditEvent(signatureRequestId, 'cancelled', {
      cancelledBy: auth.context.userId
    })

    log.info('CANCEL SIGNATURE: Success', { signatureRequestId })
    return NextResponse.json({
      success: true,
      signatureRequestId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      message: 'Signature request cancelled successfully'
    })

  } catch (error) {
    log.error('CANCEL SIGNATURE: Error', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel signature request'
      },
      { status: 500 }
    )
  }
}

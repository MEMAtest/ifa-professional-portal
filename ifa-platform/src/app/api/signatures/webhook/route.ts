// ================================================================
// UNIFIED SIGNATURE API - OPENSIGN WEBHOOK HANDLER
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createRequestLogger } from '@/lib/logging/structured'
import { notifySignatureCompleted } from '@/lib/notifications/notificationService'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic'

interface OpenSignWebhookEvent {
  event: string
  data: {
    id: string
    status: string
    name: string
    download_url?: string
    certificate_url?: string
    signers?: Array<{
      email: string
      name: string
      status: string
      signed_at?: string
    }>
    [key: string]: any
  }
  timestamp: string
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request)
  logger.info('OpenSign webhook received')

  try {
    const body: OpenSignWebhookEvent = await request.json()
    logger.debug('Webhook event data', { event: body.event, documentId: body.data?.id })

    const { event, data } = body

    if (!event || !data || !data.id) {
      logger.warn('Invalid webhook payload', { event, hasData: !!data })
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid webhook payload'
        },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    // Process the webhook using the database function
    logger.debug('Processing webhook via database function', { event, documentId: data.id })
    const { data: result, error: processError } = await (supabase as any)
      .rpc('process_signature_webhook', {
        p_opensign_document_id: data.id,
        p_event_type: event,
        p_event_data: data
      })

    if (processError) {
      logger.error('Webhook processing error', processError, { event, documentId: data.id })
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process webhook',
          details: processError.message
        },
        { status: 500 }
      )
    }

    logger.debug('Webhook processing result', { result })

    if (!result.success) {
      logger.warn('Webhook processing unsuccessful', { error: result.error, event })
      return NextResponse.json({
        success: true, // Return success to OpenSign to prevent retries
        message: 'Webhook received but not processed',
        reason: result.error
      })
    }

    // Additional processing for specific events
    if (event === 'document.completed' && result.signature_request_id) {
      logger.info('Document completed, performing final updates', {
        signatureRequestId: result.signature_request_id
      })

      // Update the related generated_document status
      const { error: docUpdateError } = await supabase
        .from('generated_documents')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('signature_request_id', result.signature_request_id)

      if (docUpdateError) {
        logger.error('Failed to update document status', docUpdateError, {
          signatureRequestId: result.signature_request_id
        })
      }

      // Send notification for signature completion
      try {
        // Fetch the signature request to get client and advisor info
        const { data: sigRequest } = await (supabase
          .from('signature_requests') as any)
          .select('client_id, document_id, documents(name), clients(first_name, last_name, advisor_id)')
          .eq('id', result.signature_request_id)
          .single()

        if (sigRequest?.clients?.advisor_id) {
          const clientName = `${sigRequest.clients.first_name || ''} ${sigRequest.clients.last_name || ''}`.trim() || 'Client'
          const documentName = (sigRequest.documents as any)?.name || data.name || 'Document'
          await notifySignatureCompleted(
            sigRequest.clients.advisor_id,
            sigRequest.client_id,
            clientName,
            sigRequest.document_id || result.signature_request_id,
            documentName
          )
        }
      } catch (notifyError) {
        logger.warn('Could not send signature notification', { error: notifyError instanceof Error ? notifyError.message : 'Unknown' })
      }
    }

    logger.info('Webhook processed successfully', {
      event,
      signatureRequestId: result.signature_request_id,
      newStatus: result.new_status
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      result: {
        signature_request_id: result.signature_request_id,
        webhook_event_id: result.webhook_event_id,
        new_status: result.new_status
      }
    })

  } catch (error) {
    logger.error('Webhook error', error)

    // Return success to prevent OpenSign from retrying
    return NextResponse.json({
      success: true,
      message: 'Webhook received but failed to process',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Handle preflight requests for CORS
// Note: Webhooks from OpenSign are server-to-server and don't require CORS
// Security comes from signature verification, not CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-signature',
    'Access-Control-Max-Age': '86400'
  }

  // Only allow specific origins, not wildcard
  if (origin) {
    if (appUrl && origin === appUrl) {
      headers['Access-Control-Allow-Origin'] = origin
    } else if (process.env.NODE_ENV === 'development') {
      // In development, allow localhost origins for testing
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        headers['Access-Control-Allow-Origin'] = origin
      }
    }
  }

  return new NextResponse(null, { status: 204, headers })
}
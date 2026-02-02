// ================================================================
// UNIFIED SIGNATURE API - CREATE SIGNATURE REQUEST
// Supports both documentId and clientId flows
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendNotificationEmail } from '@/services/emailService'
import { createRequestLogger } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

interface SignerInfo {
  email: string
  name: string
  role?: string
}

interface CreateSignatureRequest {
  documentId?: string
  clientId?: string
  templateId?: string
  signers: SignerInfo[]
  options?: {
    expiryDays?: number
    autoReminder?: boolean
    remindOnceInEvery?: number
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request)
  logger.info('CREATE SIGNATURE: API endpoint called')

  try {
    const body: CreateSignatureRequest = await request.json()
    logger.debug('CREATE SIGNATURE: Request body', { documentId: body.documentId, clientId: body.clientId, signerCount: body.signers?.length })

    const { documentId, clientId, templateId, signers, options = {} } = body

    // Validate required fields
    if (!signers || signers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signers are required'
        },
        { status: 400 }
      )
    }

    // Need either documentId OR clientId
    if (!documentId && !clientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either Document ID or Client ID is required'
        },
        { status: 400 }
      )
    }

    // Validate signers
    for (const signer of signers) {
      if (!signer.email || !signer.name) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each signer must have email and name'
          },
          { status: 400 }
        )
      }
    }

    // Create service client for database access
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Calculate expiry date
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + (options.expiryDays || 30))

    // Create signature request record using basic schema
    // (using recipient_name/recipient_email instead of signers JSONB)
    const signatureRequestData: any = {
      client_id: clientId || null,
      document_id: documentId || null,
      recipient_name: signers[0]?.name || '',
      recipient_email: signers[0]?.email || '',
      status: 'pending'
    }

    logger.debug('CREATE SIGNATURE: Creating signature request', { clientId: signatureRequestData.client_id, documentId: signatureRequestData.document_id })

    const { data: signatureRequest, error: insertError } = await (supabase
      .from('signature_requests') as any)
      .insert(signatureRequestData)
      .select()
      .single()

    if (insertError) {
      logger.error('CREATE SIGNATURE: Database insert failed', insertError)

      // Check if table doesn't exist
      if (insertError.message.includes('does not exist') || insertError.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: 'Signature requests table not yet created. Please run database setup.',
          code: 'TABLE_NOT_FOUND'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: false,
        error: insertError.message || 'Failed to create signature request'
      }, { status: 500 })
    }

    logger.info('CREATE SIGNATURE: Success, created request', { requestId: signatureRequest?.id })

    // Send email notification to signer
    try {
      logger.debug('CREATE SIGNATURE: Attempting to send email', { email: signatureRequest.recipient_email })

      await sendNotificationEmail(
        'documentSent',
        signatureRequest.recipient_email,
        {
          clientName: signatureRequest.recipient_name,
          documentName: `Signature Request #${signatureRequest.id.substring(0, 8)}`,
          documentLink: `${process.env.NEXT_PUBLIC_APP_URL}/sign/${signatureRequest.id}`
        }
      )

      logger.info('CREATE SIGNATURE: Email sent successfully')

      // Update signature request status to 'sent' after successful email
      const { error: updateError } = await (supabase
        .from('signature_requests') as any)
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', signatureRequest.id)

      if (updateError) {
        logger.warn('CREATE SIGNATURE: Failed to update status to sent', { error: updateError.message })
        // Don't throw - email was sent successfully
      } else {
        signatureRequest.status = 'sent'
        signatureRequest.sent_at = new Date().toISOString()
      }

    } catch (emailError) {
      // Log error but don't fail the signature request creation
      logger.warn('CREATE SIGNATURE: Email send failed (non-blocking)', { error: emailError instanceof Error ? emailError.message : 'Unknown' })
      // Signature request still created successfully, just email failed
    }

    return NextResponse.json({
      success: true,
      signatureRequest: {
        id: signatureRequest.id,
        client_id: signatureRequest.client_id,
        status: signatureRequest.status,
        recipient_name: signatureRequest.recipient_name,
        recipient_email: signatureRequest.recipient_email,
        created_at: signatureRequest.created_at
      },
      message: 'Signature request created successfully'
    })

  } catch (error) {
    logger.error('CREATE SIGNATURE: Error', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

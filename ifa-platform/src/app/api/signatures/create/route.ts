// ================================================================
// UNIFIED SIGNATURE API - CREATE SIGNATURE REQUEST
// Supports both documentId and clientId flows
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendNotificationEmail } from '@/services/emailService'
import { createRequestLogger } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'

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

const signerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().optional(),
})

const requestSchema = z.object({
  documentId: z.string().optional(),
  clientId: z.string().optional(),
  templateId: z.string().optional(),
  signers: z.array(signerSchema).min(1),
  options: z.object({
    expiryDays: z.number().int().min(1).max(365).optional(),
    autoReminder: z.boolean().optional(),
    remindOnceInEvery: z.number().int().min(1).max(30).optional(),
  }).optional()
})

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request)
  logger.info('CREATE SIGNATURE: API endpoint called')

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'documents:sign')
    if (permissionError) {
      return permissionError
    }
    const { firmId } = firmResult

    let body: CreateSignatureRequest
    try {
      body = await parseRequestBody(request, requestSchema)
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }
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

    let supabase: any
    try {
      supabase = getSupabaseServiceClient()
    } catch (serviceError) {
      logger.warn('CREATE SIGNATURE: Service role unavailable, falling back to user client', {
        error: serviceError instanceof Error ? serviceError.message : 'Unknown'
      })
      supabase = await createClient()
    }

    if (clientId) {
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

    if (documentId) {
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .select('id, client_id, firm_id')
        .eq('id', documentId)
        .eq('firm_id', firmId)
        .maybeSingle()

      if (documentError || !document) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
      }
    }

    // Calculate expiry date
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + (options.expiryDays || 30))

    // Create signature request record using basic schema
    // (using recipient_name/recipient_email instead of signers JSONB)
    const primaryPayload: any = {
      client_id: clientId || null,
      document_id: documentId || null,
      firm_id: firmId,
      created_by: auth.context.userId,
      recipient_name: signers[0]?.name || '',
      recipient_email: signers[0]?.email || '',
      recipient_role: signers[0]?.role || 'Client',
      expires_at: expiryDate.toISOString(),
      status: 'pending'
    }

    const fallbackPayloads: any[] = [
      {
        firm_id: firmId,
        client_id: clientId || null,
        document_id: documentId || null,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'pending'
      },
      {
        firm_id: firmId,
        document_id: documentId || null,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'pending'
      },
      {
        firm_id: firmId,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'pending'
      },
      {
        client_id: clientId || null,
        document_id: documentId || null,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'pending'
      },
      {
        document_id: documentId || null,
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'pending'
      },
      {
        recipient_name: signers[0]?.name || '',
        recipient_email: signers[0]?.email || '',
        status: 'pending'
      }
    ]

    const attemptInsert = async (payload: any) => {
      return await (supabase
        .from('signature_requests') as any)
        .insert(payload)
        .select()
        .single()
    }

    const stripMissingColumn = (payload: Record<string, any>, error: any) => {
      const message = error?.message || ''
      const match = message.match(/column \"(.+?)\" does not exist/i)
      if (!match) return null
      const column = match[1]
      if (!Object.prototype.hasOwnProperty.call(payload, column)) return null
      const next = { ...payload }
      delete next[column]
      return next
    }

    const attemptWithAdaptivePayload = async (payload: Record<string, any>) => {
      let current = { ...payload }
      let result = await attemptInsert(current)
      let error = result.error

      for (let i = 0; i < 5 && error; i += 1) {
        const stripped = stripMissingColumn(current, error)
        if (!stripped) break
        current = stripped
        result = await attemptInsert(current)
        error = result.error
      }

      return result
    }

    logger.debug('CREATE SIGNATURE: Creating signature request', { clientId, documentId })

    let insertResult = await attemptWithAdaptivePayload(primaryPayload)
    let insertError = insertResult.error

    if (insertError && (insertError.message?.includes('does not exist') || insertError.code === '42P01')) {
      return NextResponse.json({
        success: false,
        error: 'Signature requests table not yet created.',
        code: 'TABLE_NOT_FOUND'
      }, { status: 500 })
    }

    if (insertError && (insertError.code === '42703' || insertError.message?.includes('column') || insertError.message?.includes('schema cache'))) {
      logger.warn('CREATE SIGNATURE: Falling back to legacy schema', { error: insertError.message })

      for (const payload of fallbackPayloads) {
        insertResult = await attemptWithAdaptivePayload(payload)
        insertError = insertResult.error
        if (!insertError) break
      }
    }

    const signatureRequest = insertResult.data

    if (insertError) {
      logger.error('CREATE SIGNATURE: Database insert failed', insertError)

      // Check if table doesn't exist
      if (insertError.message.includes('does not exist') || insertError.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: 'Signature requests table not yet created.',
          code: 'TABLE_NOT_FOUND'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to create signature request',
        details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
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
        error: 'Failed to create signature request'
      },
      { status: 500 }
    )
  }
}

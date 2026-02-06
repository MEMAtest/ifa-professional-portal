// ================================================================
// PUBLIC SIGNING API - SUBMIT SIGNATURE
// No authentication required - token-based access
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { signatureService } from '@/services/SignatureService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { sendEmail } from '@/lib/email/emailService'
import { EMAIL_TEMPLATES } from '@/lib/email/emailTemplates'

export const dynamic = 'force-dynamic'

// Rate limiting map (in production, use Redis)
const submitRateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkSubmitRateLimit(ip: string, limit: number = 3, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = submitRateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    submitRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

const submitSchema = z.object({
  signatureDataUrl: z.string().min(1),
  consentGiven: z.boolean(),
  consentTimestamp: z.string()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token

  // Get client info
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Rate limiting (stricter for submissions)
  if (!checkSubmitRateLimit(ip)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many submission attempts. Please wait a moment.',
        errorCode: 'RATE_LIMIT'
      },
      {
        status: 429,
        headers: { 'Retry-After': '60' }
      }
    )
  }

  try {
    // Parse and validate request body
    let body: z.infer<typeof submitSchema>
    try {
      const rawBody = await request.json()
      body = submitSchema.parse(rawBody)
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          errorCode: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Validate consent
    if (!body.consentGiven) {
      return NextResponse.json(
        {
          success: false,
          error: 'Consent is required to sign the document',
          errorCode: 'CONSENT_REQUIRED'
        },
        { status: 400 }
      )
    }

    // Validate signature data URL format
    if (!body.signatureDataUrl.startsWith('data:image/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid signature format',
          errorCode: 'INVALID_SIGNATURE'
        },
        { status: 400 }
      )
    }

    // Validate the token
    const validation = await signatureService.validateSigningToken(token)

    if (!validation.valid || !validation.signatureRequest) {
      log.warn('Signature submission with invalid token', {
        token: token.substring(0, 8),
        errorCode: validation.errorCode
      })
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid signing link',
          errorCode: validation.errorCode || 'INVALID_TOKEN'
        },
        { status: 400 }
      )
    }

    const request_data = validation.signatureRequest

    // Log consent event
    await signatureService.logAuditEvent(request_data.id, 'consent_given', {
      ipAddress: ip,
      userAgent,
      consentTimestamp: body.consentTimestamp
    })

    // Process the signature
    log.info('Processing signature submission', { requestId: request_data.id })

    const result = await signatureService.processSignature(request_data.id, {
      signatureDataUrl: body.signatureDataUrl,
      ipAddress: ip,
      userAgent,
      consentTimestamp: body.consentTimestamp
    })

    if (!result.success) {
      log.error('Signature processing failed', { requestId: request_data.id, error: result.error })
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to process signature',
          errorCode: 'PROCESSING_ERROR'
        },
        { status: 500 }
      )
    }

    // Send notification to advisor
    try {
      await notifyAdvisor(request_data)
    } catch (notifyError) {
      // Log but don't fail the request
      log.error('Failed to notify advisor', notifyError instanceof Error ? notifyError : undefined)
    }

    // Create in-app notification
    try {
      await createInAppNotification(request_data)
    } catch (notifyError) {
      log.error('Failed to create in-app notification', notifyError instanceof Error ? notifyError : undefined)
    }

    log.info('Signature completed successfully', { requestId: request_data.id })

    return NextResponse.json({
      success: true,
      message: 'Document signed successfully',
      completedAt: new Date().toISOString()
    })

  } catch (error) {
    log.error('Error processing signature submission', error instanceof Error ? error : undefined)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit signature. Please try again.',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

async function notifyAdvisor(request_data: {
  id: string
  documentName: string
  recipientName: string
  recipientEmail: string
  advisorName: string
  firmId: string
}): Promise<void> {
  const supabase = getSupabaseServiceClient()

  // Get the signature request (separate queries - no FK joins)
  const { data: signatureRequest } = await supabase
    .from('signature_requests')
    .select('id, created_by')
    .eq('id', request_data.id)
    .single()

  if (!signatureRequest?.created_by) {
    log.warn('Could not find signature request for notification', { requestId: request_data.id })
    return
  }

  // Fetch advisor profile separately
  const { data: advisor } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', signatureRequest.created_by)
    .maybeSingle()

  if (!advisor?.email) {
    log.warn('No advisor email for notification', { requestId: request_data.id })
    return
  }

  // Get firm info
  const { data: firm } = await supabase
    .from('firms')
    .select('name, settings')
    .eq('id', request_data.firmId)
    .single()

  const firmName = firm?.name || 'Your Firm'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.plannetic.com'

  // Build email
  const template = EMAIL_TEMPLATES.signatureCompleted(
    advisor.full_name || 'Advisor',
    request_data.recipientName,
    request_data.documentName
  )

  await sendEmail({
    to: advisor.email,
    subject: template.subject,
    html: template.html
  })

  log.info('Advisor notification sent', { advisorEmail: advisor.email, requestId: request_data.id })
}

async function createInAppNotification(request_data: {
  id: string
  documentName: string
  recipientName: string
  clientId: string | null
  firmId: string
}): Promise<void> {
  const supabase = getSupabaseServiceClient()

  // Get the signature request with advisor info
  const { data: signatureRequest } = await supabase
    .from('signature_requests')
    .select('created_by')
    .eq('id', request_data.id)
    .single()

  if (!signatureRequest?.created_by) {
    return
  }

  // Create notification
  await supabase
    .from('notifications')
    .insert({
      user_id: signatureRequest.created_by,
      firm_id: request_data.firmId,
      type: 'signature_completed',
      title: 'Document Signed',
      message: `${request_data.recipientName} has signed ${request_data.documentName}`,
      data: {
        signature_request_id: request_data.id,
        client_id: request_data.clientId,
        document_name: request_data.documentName,
        signer_name: request_data.recipientName
      },
      read: false
    })
}

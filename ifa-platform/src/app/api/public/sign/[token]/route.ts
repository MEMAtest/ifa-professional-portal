// ================================================================
// PUBLIC SIGNING API - VALIDATE TOKEN
// No authentication required - token-based access
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/services/SignatureService'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

export const dynamic = 'force-dynamic'

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token

  // Get client IP for rate limiting and audit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        errorCode: 'RATE_LIMIT'
      },
      {
        status: 429,
        headers: { 'Retry-After': '60' }
      }
    )
  }

  try {
    // Validate the token
    const validation = await signatureService.validateSigningToken(token)

    if (!validation.valid || !validation.signatureRequest) {
      log.warn('Invalid signing token attempted', { token: token.substring(0, 8), errorCode: validation.errorCode })
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

    // Log access event
    await signatureService.markTokenAccessed(request_data.id, ip, userAgent)

    // Get firm info for branding
    let firmName = 'Your Advisor'
    try {
      const supabase = getSupabaseServiceClient()
      const { data: firm } = await supabase
        .from('firms')
        .select('name')
        .eq('id', request_data.firmId)
        .single()

      if (firm?.name) {
        firmName = firm.name
      }
    } catch {
      // Ignore firm lookup errors
    }

    return NextResponse.json({
      success: true,
      signingInfo: {
        id: request_data.id,
        documentName: request_data.documentName,
        recipientName: request_data.recipientName,
        recipientEmail: request_data.recipientEmail,
        advisorName: request_data.advisorName,
        firmName,
        expiresAt: request_data.expiresAt,
        status: request_data.status,
        hasDocument: !!request_data.originalDocumentPath,
        documentId: request_data.documentId
      }
    })

  } catch (error) {
    log.error('Error validating signing token', error instanceof Error ? error : undefined)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate signing link',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

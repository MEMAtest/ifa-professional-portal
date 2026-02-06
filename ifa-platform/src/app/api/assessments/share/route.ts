// src/app/api/assessments/share/route.ts
// API for creating and listing assessment share tokens
// Phase 2: Added Zod validation for type safety

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { ShareAssessmentInputSchema, formatValidationErrors } from '@/lib/validation/schemas'
import { logger, getErrorMessage } from '@/lib/errors'
import { createAuditLogger } from '@/lib/audit'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/security/rateLimit'
import { parseRequestBody } from '@/app/api/utils'
import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { EMAIL_TEMPLATES } from '@/lib/email/emailTemplates'
import { getSESClient } from '@/lib/email/sesClient'
import { applyBrandColors, getBrandedSender, getFirmBranding, wrapWithBranding } from '@/lib/email/brandingHelper'

export const dynamic = 'force-dynamic'

// Assessment type labels for emails
const ASSESSMENT_LABELS: Record<string, string> = {
  atr: 'Attitude to Risk (ATR)',
  cfl: 'Capacity for Loss (CFL)',
  investor_persona: 'Investor Persona'
}

// Generate a cryptographically secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// POST: Create a new assessment share
export async function POST(request: NextRequest) {
  // Rate limit: 100 requests per minute per IP
  const rateLimitResponse = await rateLimit(request, 'api')
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Authenticate using proper auth context (provides firm_id scoping)
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(authResult.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult
    const { userId } = authResult.context

    // Cast to any: users/assessment_shares tables not yet in generated Supabase types
    const supabase: any = getSupabaseServiceClient()

    const body = await parseRequestBody(request)

    // Validate input using Zod schema
    const validationResult = ShareAssessmentInputSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        formatValidationErrors(validationResult.error),
        { status: 400 }
      )
    }

    // Use validated and typed data
    const {
      clientId,
      assessmentType,
      clientEmail,
      clientName,
      expiryDays,
      customMessage,
      sendEmail
    } = validationResult.data

    // SECURITY: Verify client belongs to the advisor's firm
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .maybeSingle()

    if (clientError || !clientRecord) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Generate secure token
    const token = generateToken()

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    // Get advisor info for email
    const { data: advisor } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    // Get client info if not provided
    let finalClientName = clientName
    if (!finalClientName) {
      const { data: client } = await supabase
        .from('clients')
        .select('personal_details')
        .eq('id', clientId)
        .single()

      if (client?.personal_details) {
        const pd = client.personal_details as { firstName?: string; lastName?: string; first_name?: string; last_name?: string }
        const firstName = pd.firstName || pd.first_name || ''
        const lastName = pd.lastName || pd.last_name || ''
        finalClientName = `${firstName} ${lastName}`.trim() || 'Client'
      }
    }

    // Create the share record with firm_id scoping
    const { data: share, error: insertError } = await supabase
      .from('assessment_shares')
      .insert({
        token,
        assessment_type: assessmentType,
        client_id: clientId,
        advisor_id: userId,
        firm_id: firmId,
        client_email: clientEmail,
        client_name: finalClientName,
        expires_at: expiresAt.toISOString(),
        custom_message: customMessage,
        metadata: {
          advisor_name: advisor?.full_name || 'Your Financial Advisor',
          advisor_email: advisor?.email
        }
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Error creating share', insertError, { clientId, assessmentType })
      return NextResponse.json(
        { error: 'Failed to create assessment share' },
        { status: 500 }
      )
    }

    // Audit log the share creation
    const auditLogger = createAuditLogger(supabase)
    await auditLogger.logShareCreated(
      share.id,
      clientId,
      userId,
      assessmentType,
      clientEmail
    )

    logger.info('Assessment share created', { shareId: share.id, clientId, assessmentType })

    // Generate the share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin')
    if (!baseUrl) {
      logger.error('NEXT_PUBLIC_APP_URL not configured')
      return NextResponse.json(
        { error: 'Application URL not configured' },
        { status: 500 }
      )
    }
    const shareUrl = `${baseUrl}/client/assessment/${token}`

    // Send email if requested
    if (sendEmail) {
      try {
        const emailData = {
          clientName: finalClientName,
          advisorName: advisor?.full_name || 'Your Financial Advisor',
          assessmentType: ASSESSMENT_LABELS[assessmentType] || assessmentType,
          link: shareUrl,
          expiryDate: expiresAt.toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          customMessage
        }

        const emailContent = EMAIL_TEMPLATES.assessmentInvite(emailData)
        const branding = await getFirmBranding(firmId)
        let finalHtml = emailContent.html
        if (branding) {
          finalHtml = applyBrandColors(finalHtml, branding)
          finalHtml = wrapWithBranding(finalHtml, branding, { includeHeader: true, includeFooter: true })
        }

        const fromAddress = branding
          ? getBrandedSender(branding)
          : `IFA Platform <noreply@${process.env.EMAIL_FROM_DOMAIN || 'plannetic.com'}>`

        const client = getSESClient()
        const command = new SendEmailCommand({
          FromEmailAddress: fromAddress,
          Destination: { ToAddresses: [clientEmail] },
          Content: {
            Simple: {
              Subject: { Data: emailContent.subject, Charset: 'UTF-8' },
              Body: { Html: { Data: finalHtml, Charset: 'UTF-8' } }
            }
          }
        })

        await client.send(command)
      } catch (emailError) {
        logger.warn('Failed to send share email', { clientEmail, error: getErrorMessage(emailError) })
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        token,
        shareUrl,
        assessmentType,
        clientEmail,
        clientName: finalClientName,
        expiresAt: expiresAt.toISOString(),
        status: 'pending'
      }
    })

  } catch (error) {
    logger.error('Error in POST /api/assessments/share', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: List assessment shares for current user or specific client
export async function GET(request: NextRequest) {
  try {
    // Authenticate using proper auth context
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(authResult.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult
    const { userId } = authResult.context

    // Cast to any: assessment_shares table not yet in generated Supabase types
    const supabase: any = getSupabaseServiceClient()

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')

    // Build query scoped to authenticated advisor
    let query = supabase
      .from('assessment_shares')
      .select('*')
      .eq('advisor_id', userId)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: shares, error: queryError } = await query

    if (queryError) {
      logger.error('Error fetching shares', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch assessment shares' },
        { status: 500 }
      )
    }

    // Update expired shares
    const now = new Date()
    const updatedShares = shares?.map((share: any) => {
      if (share.status === 'pending' && new Date(share.expires_at) < now) {
        return { ...share, status: 'expired' }
      }
      return share
    }) || []

    return NextResponse.json({
      success: true,
      shares: updatedShares
    })

  } catch (error) {
    logger.error('Error in GET /api/assessments/share', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

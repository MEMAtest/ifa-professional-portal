// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/notifications/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { log } from '@/lib/logging/structured'
import { rateLimit } from '@/lib/security/rateLimit'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { isPlatformAdminUser } from '@/lib/auth/platformAdmin'
import {
  getFirmBranding,
  wrapWithBranding,
  applyBrandColors,
  getBrandedSender,
  type EmailBranding
} from '@/lib/email/brandingHelper'
import { parseRequestBody } from '@/app/api/utils'
import { getSESClient } from '@/lib/email/sesClient'
import { buildRawMimeMessage } from '@/lib/email/mime'
import { EMAIL_TEMPLATES } from '@/lib/email/emailTemplates'

// Email templates extracted to lib/email/emailTemplates.ts

// Maximum attachment size (5MB base64 encoded)
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  return typeof email === 'string' && EMAIL_REGEX.test(email)
}

// Validate and process attachment
function validateAttachment(att: unknown): { filename: string; content: string } | null {
  if (!att || typeof att !== 'object') return null

  const attachment = att as Record<string, unknown>

  // Validate filename
  if (typeof attachment.filename !== 'string' || !attachment.filename.trim()) {
    return null
  }

  // Validate content
  if (typeof attachment.content !== 'string' || !attachment.content) {
    return null
  }

  // Check size limit
  if (attachment.content.length > MAX_ATTACHMENT_SIZE) {
    log.warn('[send-email] Attachment too large', {
      filename: attachment.filename,
      size: attachment.content.length
    })
    return null
  }

  // Extract base64 content (handle both with and without data URI prefix)
  let content = attachment.content
  if (content.includes(',')) {
    const parts = content.split(',')
    // Validate MIME type if present
    const mimeMatch = parts[0].match(/data:([^;]+)/)
    if (mimeMatch && !ALLOWED_MIME_TYPES.includes(mimeMatch[1])) {
      log.warn('[send-email] Invalid attachment MIME type', {
        filename: attachment.filename,
        mimeType: mimeMatch[1]
      })
      return null
    }
    content = parts[1] || ''
  }

  if (!content) {
    return null
  }

  return {
    filename: attachment.filename.trim(),
    content
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per hour per IP
  const rateLimitResponse = await rateLimit(request, 'invite')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const isPlatformAdmin = isPlatformAdminUser(auth.context)

    const body = await parseRequestBody(request)
    const { type, recipient, cc, data, firmId } = body

    // Validate required fields
    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid email type' },
        { status: 400 }
      )
    }

    if (!recipient) {
      return NextResponse.json(
        { error: 'Missing recipient' },
        { status: 400 }
      )
    }

    // Validate recipients
    const recipients = Array.isArray(recipient) ? recipient : [recipient]
    const invalidRecipients = recipients.filter(r => !isValidEmail(r))
    if (invalidRecipients.length > 0) {
      return NextResponse.json(
        { error: 'Invalid email address', invalid: invalidRecipients },
        { status: 400 }
      )
    }

    // Validate CC if provided
    if (cc) {
      const ccList = Array.isArray(cc) ? cc : [cc]
      const invalidCc = ccList.filter(r => !isValidEmail(r))
      if (invalidCc.length > 0) {
        return NextResponse.json(
          { error: 'Invalid CC email address', invalid: invalidCc },
          { status: 400 }
        )
      }
    }

    let emailContent: { subject: string; html: string }
    let attachments: { filename: string; content: string }[] = []

    const firmResult = requireFirmId(auth.context)
    let resolvedFirmId: string | null = null
    if ('firmId' in firmResult) {
      resolvedFirmId = firmResult.firmId
    }

    if (firmId) {
      if (resolvedFirmId && firmId !== resolvedFirmId && !isPlatformAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      resolvedFirmId = firmId
    }

    if (!resolvedFirmId) {
      return NextResponse.json({ error: 'Firm context required' }, { status: 403 })
    }

    // Fetch firm branding if firmId provided
    let branding: EmailBranding | null = null
    if (resolvedFirmId && typeof resolvedFirmId === 'string') {
      branding = await getFirmBranding(resolvedFirmId)
      if (!branding) {
        log.warn('[send-email] Could not load branding for firm', { firmId: resolvedFirmId })
      }
    }

    // Handle different email types
    switch (type) {
      case 'documentSent':
        if (!data?.clientName || !data?.documentName) {
          return NextResponse.json({ error: 'Missing required data for documentSent' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.documentSent(data.clientName, data.documentName, data.documentLink)
        break
      case 'signatureCompleted':
        if (!data?.advisorName || !data?.clientName || !data?.documentName) {
          return NextResponse.json({ error: 'Missing required data for signatureCompleted' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.signatureCompleted(data.advisorName, data.clientName, data.documentName)
        break
      case 'weeklyReport':
        if (!data?.advisorName || !data?.stats) {
          return NextResponse.json({ error: 'Missing required data for weeklyReport' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.weeklyReport(data.advisorName, data.stats)
        break
      case 'reminder':
        if (!data?.clientName || !data?.documentName || data?.daysLeft === undefined) {
          return NextResponse.json({ error: 'Missing required data for reminder' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.reminder(data.clientName, data.documentName, data.daysLeft)
        break
      case 'reportWithAttachment':
        if (!data?.subject || !data?.message) {
          return NextResponse.json({ error: 'Missing required data for reportWithAttachment' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.reportWithAttachment(data)
        // Handle attachments with validation
        if (data.attachments && Array.isArray(data.attachments)) {
          for (const att of data.attachments) {
            const validated = validateAttachment(att)
            if (validated) {
              attachments.push(validated)
            }
          }
        }
        break
      case 'assessmentInvite':
        if (!data?.clientName || !data?.advisorName || !data?.link) {
          return NextResponse.json({ error: 'Missing required data for assessmentInvite' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.assessmentInvite(data)
        break
      case 'assessmentCompleted':
        if (!data?.clientName || !data?.advisorName || !data?.assessmentType) {
          return NextResponse.json({ error: 'Missing required data for assessmentCompleted' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.assessmentCompleted(data)
        break
      case 'userInvitation':
        if (!data?.inviteeEmail || !data?.firmName || !data?.inviteUrl) {
          return NextResponse.json({ error: 'Missing required data for userInvitation' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.userInvitation(data)
        break
      case 'welcome':
        emailContent = EMAIL_TEMPLATES.welcome({
          userName: data?.userName || '',
          firmName: data?.firmName || '',
        })
        break
      case 'welcomePreLogin':
        if (!data?.email) {
          return NextResponse.json({ error: 'Missing required data for welcomePreLogin' }, { status: 400 })
        }
        emailContent = EMAIL_TEMPLATES.welcomePreLogin({
          userName: data?.userName || '',
          firmName: data?.firmName || '',
          email: data.email,
          loginUrl: data?.loginUrl || 'https://www.plannetic.com/login',
          tempPassword: data?.tempPassword,
        })
        break
      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

    // Determine recipients
    const to = Array.isArray(recipient) ? recipient : [recipient]
    const ccRecipients = cc || []

    // Apply firm branding to email content if available
    let finalHtml = emailContent.html
    if (branding) {
      // Apply brand colors to the template
      finalHtml = applyBrandColors(finalHtml, branding)
      // Wrap with branded header and footer (includes email signature)
      finalHtml = wrapWithBranding(finalHtml, branding, {
        includeHeader: true,
        includeFooter: true
      })
    }

    // Send email with Amazon SES
    try {
      // Use branded sender if branding available
      const fromAddress = branding
        ? getBrandedSender(branding)
        : `IFA Platform <noreply@${process.env.EMAIL_FROM_DOMAIN || 'plannetic.com'}>`

      // Check if SES client can be created (credentials configured)
      let client;
      try {
        client = getSESClient()
      } catch (sesInitError) {
        // SES not configured - return graceful error instead of 500
        log.warn('[send-email] SES not configured, email service unavailable', {
          error: sesInitError instanceof Error ? sesInitError.message : String(sesInitError)
        })

        // In development, simulate success
        if (process.env.NODE_ENV === 'development') {
          log.debug('Development mode - Email simulated (SES not configured)', {
            to,
            cc: ccRecipients,
            subject: emailContent.subject,
            attachments: attachments.length
          })

          return NextResponse.json({
            success: true,
            message: 'Email simulated (development mode - SES not configured)',
            emailId: `dev-${Date.now()}`,
            preview: emailContent.subject
          })
        }

        // In production without SES, return informative error with 200 status
        // This allows callers to handle gracefully without causing 500 cascades
        return NextResponse.json({
          success: false,
          error: 'Email service not configured',
          code: 'SES_NOT_CONFIGURED',
          message: 'AWS SES credentials are not configured. Email was not sent.',
          preview: emailContent.subject
        }, { status: 200 })
      }

      let messageId: string | undefined

      if (attachments.length > 0) {
        // Use raw MIME message for emails with attachments
        const rawMessage = buildRawMimeMessage({
          from: fromAddress,
          to,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          subject: emailContent.subject,
          html: finalHtml,
          attachments,
        })

        const command = new SendEmailCommand({
          Content: {
            Raw: {
              Data: new TextEncoder().encode(rawMessage),
            },
          },
        })

        const result = await client.send(command)
        messageId = result.MessageId
      } else {
        // Use simple email for messages without attachments
        const command = new SendEmailCommand({
          FromEmailAddress: fromAddress,
          Destination: {
            ToAddresses: to,
            ...(ccRecipients.length > 0 && { CcAddresses: ccRecipients }),
          },
          Content: {
            Simple: {
              Subject: {
                Data: emailContent.subject,
                Charset: 'UTF-8',
              },
              Body: {
                Html: {
                  Data: finalHtml,
                  Charset: 'UTF-8',
                },
              },
            },
          },
        })

        const result = await client.send(command)
        messageId = result.MessageId
      }

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        emailId: messageId || `ses-${Date.now()}`,
        preview: emailContent.subject
      })

    } catch (sesError) {
      log.error('SES API error', sesError)

      // Fallback for development/testing
      if (process.env.NODE_ENV === 'development') {
        log.debug('Development mode - Email details', {
          to,
          cc: ccRecipients,
          subject: emailContent.subject,
          attachments: attachments.length
        })

        return NextResponse.json({
          success: true,
          message: 'Email simulated (development mode)',
          emailId: `dev-${Date.now()}`,
          preview: emailContent.subject
        })
      }

      // In production, check if this is a credentials/configuration error
      const errorMessage = sesError instanceof Error ? sesError.message : String(sesError)
      const isConfigError = errorMessage.includes('credentials') ||
                           errorMessage.includes('not configured') ||
                           errorMessage.includes('UnrecognizedClientException') ||
                           errorMessage.includes('InvalidClientTokenId')

      if (isConfigError) {
        // Return graceful error for configuration issues
        log.warn('[send-email] SES configuration error in production', { error: errorMessage })
        return NextResponse.json({
          success: false,
          error: 'Email service not configured',
          code: 'SES_NOT_CONFIGURED',
          message: 'AWS SES is not properly configured. Email was not sent.',
          preview: emailContent.subject
        }, { status: 200 })
      }

      throw sesError
    }

  } catch (error) {
    log.error('Email error', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        message: ''
      },
      { status: 500 }
    )
  }
}

// Scheduled job endpoint for weekly reports
export async function GET(request: NextRequest) {
  // This would be called by a cron job (Vercel Cron, etc.)
  
  try {
    // In production, you would:
    // 1. Query your database for all advisors
    // 2. Calculate their weekly stats
    // 3. Send personalized reports
    
    const mockAdvisors = [
      { email: 'advisor1@example.com', name: 'John Advisor', stats: { sent: 12, signed: 8, signatureRate: 67, pending: 4 } },
      { email: 'advisor2@example.com', name: 'Jane Advisor', stats: { sent: 20, signed: 18, signatureRate: 90, pending: 2 } }
    ]

    let sentCount = 0
    
    for (const advisor of mockAdvisors) {
      try {
        await POST(new NextRequest('http://localhost/api/notifications/send-email', {
          method: 'POST',
          body: JSON.stringify({
            type: 'weeklyReport',
            recipient: advisor.email,
            data: {
              advisorName: advisor.name,
              stats: advisor.stats
            }
          })
        }))
        sentCount++
      } catch (error) {
        log.error('Failed to send weekly report', { email: advisor.email, error: '' })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Weekly reports sent',
      count: sentCount
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send weekly reports' },
      { status: 500 }
    )
  }
}

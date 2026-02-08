/**
 * Email Service
 * Simplified email sending using AWS SES
 */

import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { getSESClient } from './sesClient'
import { buildRawMimeMessage } from './mime'
import { getFirmBranding, wrapWithBranding, applyBrandColors, getBrandedSender } from './brandingHelper'
import { log } from '@/lib/logging/structured'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  firmId?: string
  applyBranding?: boolean
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using AWS SES
 * Automatically applies firm branding if firmId is provided
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, cc, firmId, applyBranding = true } = options

  try {
    // Normalize recipients to arrays
    const toAddresses = Array.isArray(to) ? to : [to]
    const ccAddresses = cc ? (Array.isArray(cc) ? cc : [cc]) : []

    // Apply firm branding if firmId provided and branding enabled
    let finalHtml = html
    let fromAddress = `Plannetic <noreply@${(process.env.EMAIL_FROM_DOMAIN || 'plannetic.com').trim()}>`

    if (firmId && applyBranding) {
      const branding = await getFirmBranding(firmId)
      if (branding) {
        finalHtml = applyBrandColors(finalHtml, branding)
        finalHtml = wrapWithBranding(finalHtml, branding, {
          includeHeader: true,
          includeFooter: true
        })
        fromAddress = getBrandedSender(branding)
      }
    }

    // Get SES client
    let client
    try {
      client = getSESClient()
    } catch (sesInitError) {
      log.warn('SES not configured, email service unavailable', {
        error: sesInitError instanceof Error ? sesInitError.message : String(sesInitError)
      })

      // In development, simulate success
      if (process.env.NODE_ENV === 'development') {
        log.debug('Development mode - Email simulated (SES not configured)', {
          to: toAddresses,
          subject
        })
        return {
          success: true,
          messageId: `dev-${Date.now()}`
        }
      }

      return {
        success: false,
        error: 'Email service not configured'
      }
    }

    // Send the email
    const command = new SendEmailCommand({
      FromEmailAddress: fromAddress,
      Destination: {
        ToAddresses: toAddresses,
        ...(ccAddresses.length > 0 && { CcAddresses: ccAddresses })
      },
      Content: {
        Simple: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: finalHtml,
              Charset: 'UTF-8'
            }
          }
        }
      }
    })

    const result = await client.send(command)

    log.info('Email sent successfully', {
      to: toAddresses,
      subject,
      messageId: result.MessageId
    })

    return {
      success: true,
      messageId: result.MessageId
    }

  } catch (error) {
    log.error('Failed to send email', error instanceof Error ? error : undefined)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

export interface EmailAttachment {
  filename: string
  content: string // base64 encoded
}

export interface SendEmailWithAttachmentOptions {
  to: string | string[]
  subject: string
  html: string
  attachments: EmailAttachment[]
  cc?: string | string[]
  firmId?: string
  applyBranding?: boolean
}

/**
 * Send an email with file attachments using AWS SES raw MIME
 * Uses Content.Raw for MIME message with attachments
 */
export async function sendEmailWithAttachment(options: SendEmailWithAttachmentOptions): Promise<SendEmailResult> {
  const { to, subject, html, attachments, cc, firmId, applyBranding = true } = options

  try {
    const toAddresses = Array.isArray(to) ? to : [to]
    const ccAddresses = cc ? (Array.isArray(cc) ? cc : [cc]) : []

    let finalHtml = html
    let fromAddress = `Plannetic <noreply@${(process.env.EMAIL_FROM_DOMAIN || 'plannetic.com').trim()}>`

    if (firmId && applyBranding) {
      const branding = await getFirmBranding(firmId)
      if (branding) {
        finalHtml = applyBrandColors(finalHtml, branding)
        finalHtml = wrapWithBranding(finalHtml, branding, {
          includeHeader: true,
          includeFooter: true
        })
        fromAddress = getBrandedSender(branding)
      }
    }

    let client
    try {
      client = getSESClient()
    } catch (sesInitError) {
      log.warn('SES not configured, email service unavailable', {
        error: sesInitError instanceof Error ? sesInitError.message : String(sesInitError)
      })

      if (process.env.NODE_ENV === 'development') {
        log.debug('Development mode - Email with attachment simulated', {
          to: toAddresses,
          subject,
          attachmentCount: attachments.length
        })
        return { success: true, messageId: `dev-${Date.now()}` }
      }

      return { success: false, error: 'Email service not configured' }
    }

    // Build raw MIME message with attachments
    const rawMessage = buildRawMimeMessage({
      from: fromAddress,
      to: toAddresses,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      subject,
      html: finalHtml,
      attachments
    })

    // SESv2 Content.Raw: SES sends the MIME message as-is.
    // Do NOT include FromEmailAddress/Destination — that causes SES to
    // double-wrap the message (our MIME headers become body text).
    // The From/To/Subject are already in the MIME headers with proper RFC 5322 quoting.
    const command = new SendEmailCommand({
      Content: {
        Raw: {
          Data: new TextEncoder().encode(rawMessage)
        }
      }
    })

    const result = await client.send(command)

    log.info('Email with attachment sent successfully', {
      to: toAddresses,
      subject,
      attachmentCount: attachments.length,
      messageId: result.MessageId
    })

    return { success: true, messageId: result.MessageId }

  } catch (error) {
    log.error('Failed to send email with attachment', error instanceof Error ? error : undefined)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email with attachment'
    }
  }
}

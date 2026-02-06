/**
 * Email Service
 * Simplified email sending using AWS SES
 */

import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { getSESClient } from './sesClient'
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
    let fromAddress = `Plannetic <noreply@${process.env.EMAIL_FROM_DOMAIN || 'plannetic.com'}>`

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

    // In development, simulate success on error
    if (process.env.NODE_ENV === 'development') {
      log.debug('Development mode - Email simulated despite error', {
        to: Array.isArray(to) ? to : [to],
        subject
      })
      return {
        success: true,
        messageId: `dev-${Date.now()}`
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

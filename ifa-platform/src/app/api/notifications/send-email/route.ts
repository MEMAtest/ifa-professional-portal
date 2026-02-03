// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/notifications/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { log } from '@/lib/logging/structured'
import { rateLimit } from '@/lib/security/rateLimit'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import {
  getFirmBranding,
  wrapWithBranding,
  applyBrandColors,
  getBrandedSender,
  type EmailBranding
} from '@/lib/email/brandingHelper'
import { parseRequestBody } from '@/app/api/utils'

// Lazy initialize SES client to avoid build-time errors
let sesClient: SESv2Client | null = null

function getSESClient(): SESv2Client {
  if (!sesClient) {
    const region = process.env.AWS_SES_REGION || 'eu-west-2'
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS SES credentials are not configured (AWS_SES_ACCESS_KEY_ID / AWS_SES_SECRET_ACCESS_KEY)')
    }

    sesClient = new SESv2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }
  return sesClient
}

/**
 * Build a raw MIME message for emails with attachments.
 */
function buildRawMimeMessage(options: {
  from: string
  to: string[]
  cc?: string[]
  subject: string
  html: string
  attachments?: { filename: string; content: string }[]
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const lines: string[] = []

  lines.push(`From: ${options.from}`)
  lines.push(`To: ${options.to.join(', ')}`)
  if (options.cc && options.cc.length > 0) {
    lines.push(`Cc: ${options.cc.join(', ')}`)
  }
  lines.push(`Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`)
  lines.push('MIME-Version: 1.0')
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
  lines.push('')

  // HTML body part
  lines.push(`--${boundary}`)
  lines.push('Content-Type: text/html; charset=UTF-8')
  lines.push('Content-Transfer-Encoding: base64')
  lines.push('')
  lines.push(Buffer.from(options.html).toString('base64'))
  lines.push('')

  // Attachment parts
  if (options.attachments) {
    for (const att of options.attachments) {
      const mimeType = att.filename.endsWith('.pdf') ? 'application/pdf'
        : att.filename.endsWith('.png') ? 'image/png'
        : att.filename.endsWith('.jpg') || att.filename.endsWith('.jpeg') ? 'image/jpeg'
        : 'application/octet-stream'

      lines.push(`--${boundary}`)
      lines.push(`Content-Type: ${mimeType}; name="${att.filename}"`)
      lines.push('Content-Transfer-Encoding: base64')
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`)
      lines.push('')
      lines.push(att.content)
      lines.push('')
    }
  }

  lines.push(`--${boundary}--`)
  return lines.join('\r\n')
}

// Email templates (keeping existing ones)
const EMAIL_TEMPLATES = {
  documentSent: (clientName: string, documentName: string, documentLink?: string) => ({
    subject: `Document Ready for Signature: ${documentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Document Ready for Review</h2>
        <p>Dear ${clientName},</p>
        <p>Your ${documentName} is ready for review and signature.</p>
        <div style="margin: 30px 0;">
          <a href="${documentLink || '#'}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Review & Sign Document
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          This document will expire in 30 days. Please review and sign at your earliest convenience.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          If the button doesn't work, copy and paste this link:<br>
          <a href="${documentLink || '#'}" style="color: #3b82f6;">${documentLink || 'Link not available'}</a>
        </p>
      </div>
    `
  }),

  signatureCompleted: (advisorName: string, clientName: string, documentName: string) => ({
    subject: `Document Signed: ${documentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Document Successfully Signed</h2>
        <p>Dear ${advisorName},</p>
        <p>${clientName} has successfully signed the ${documentName}.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Client:</strong> ${clientName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Document:</strong> ${documentName}</p>
          <p style="margin: 5px 0 0 0;"><strong>Signed at:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>The signed document is now available in your dashboard.</p>
      </div>
    `
  }),

  weeklyReport: (advisorName: string, stats: any) => ({
    subject: 'Your Weekly Document Activity Report',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Weekly Activity Summary</h2>
        <p>Dear ${advisorName},</p>
        <p>Here's your document activity for the past week:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Key Metrics</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">Documents Sent:</td>
              <td style="text-align: right; font-weight: bold;">${stats.sent}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Documents Signed:</td>
              <td style="text-align: right; font-weight: bold; color: #059669;">${stats.signed}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Signature Rate:</td>
              <td style="text-align: right; font-weight: bold;">${stats.signatureRate}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Pending Signatures:</td>
              <td style="text-align: right; font-weight: bold; color: #d97706;">${stats.pending}</td>
            </tr>
          </table>
        </div>

        <p>
          <a href="#" style="color: #3b82f6;">View Full Report in Dashboard →</a>
        </p>
      </div>
    `
  }),

  reminder: (clientName: string, documentName: string, daysLeft: number) => ({
    subject: `Reminder: ${documentName} awaiting signature`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">Document Signature Reminder</h2>
        <p>Dear ${clientName},</p>
        <p>This is a friendly reminder that your ${documentName} is still awaiting your signature.</p>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">⚠️ This document will expire in ${daysLeft} days</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="#" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Sign Document Now
          </a>
        </div>
      </div>
    `
  }),

  // NEW: Report with attachment template
  reportWithAttachment: (data: any) => ({
    subject: data.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${data.message.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          This email was sent from your IFA Platform. Please find the attached report.
        </p>
      </div>
    `
  }),

  // Assessment invitation email
  assessmentInvite: (data: any) => ({
    subject: `${data.advisorName} has requested you complete an assessment`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; margin: 0;">Assessment Request</h1>
        </div>

        <p style="color: #374151; font-size: 16px;">Dear ${data.clientName},</p>

        <p style="color: #374151; font-size: 16px;">
          Your financial advisor <strong>${data.advisorName}</strong> has requested you complete a
          <strong>${data.assessmentType}</strong> assessment.
        </p>

        ${data.customMessage ? `
          <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #374151; font-style: italic;">"${data.customMessage}"</p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">- ${data.advisorName}</p>
          </div>
        ` : ''}

        <p style="color: #374151; font-size: 16px;">
          This assessment helps us understand your financial needs and preferences better,
          allowing us to provide you with more personalised advice.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.link}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Complete Assessment
          </a>
        </div>

        <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>⏰ Please note:</strong> This link will expire on ${data.expiryDate}
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #6b7280; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${data.link}" style="color: #3b82f6; word-break: break-all;">${data.link}</a>
        </p>

        <p style="color: #6b7280; font-size: 12px;">
          If you have any questions, please contact your advisor directly.
        </p>
      </div>
    `
  }),

  // Assessment completed notification to advisor
  assessmentCompleted: (data: any) => ({
    subject: `${data.clientName} has completed their ${data.assessmentType} assessment`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: #dcfce7; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <span style="font-size: 30px;">✓</span>
          </div>
          <h1 style="color: #059669; margin: 0;">Assessment Completed</h1>
        </div>

        <p style="color: #374151; font-size: 16px;">Dear ${data.advisorName},</p>

        <p style="color: #374151; font-size: 16px;">
          Great news! <strong>${data.clientName}</strong> has completed their
          <strong>${data.assessmentType}</strong> assessment.
        </p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Client:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${data.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Assessment Type:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${data.assessmentType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Completed:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${new Date().toLocaleString('en-GB')}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.reviewLink}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Review Responses
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          The client's responses have been saved to their profile and are ready for your review.
        </p>
      </div>
    `
  }),

  // Welcome email sent on onboarding completion
  welcome: (data: { userName: string; firmName: string }) => {
    const siteUrl = 'https://www.plannetic.com'
    const appUrl = 'https://www.plannetic.com'
    const logoUrl = `${siteUrl}/logo.png`
    const screenshotSuitability = `${siteUrl}/blog/suitability.png`
    const screenshotDashboard = `${siteUrl}/blog/consumer-duty.png`
    const screenshotAnalysis = `${siteUrl}/blog/monte-carlo.png`
    // Escape user-provided values for XSS prevention
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const firstName = esc(data.userName || 'there')
    const firmName = esc(data.firmName || 'your firm')

    return {
      subject: `Welcome to Plannetic \u2014 let\u2019s get you started`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header with logo -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 32px; text-align: center;">
            <img src="${logoUrl}" alt="Plannetic" style="max-width: 200px; height: auto;" />
            <p style="color: #5eead4; font-size: 13px; margin: 12px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;">
              Turning Plans into Performance
            </p>
          </div>

          <!-- Welcome greeting -->
          <div style="padding: 40px 32px 20px 32px;">
            <h1 style="color: #0f172a; font-size: 26px; font-weight: 700; margin: 0 0 16px 0;">
              Welcome aboard, ${firstName}.
            </h1>
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
              Your account for <strong style="color: #0f172a;">${firmName}</strong> is now live on Plannetic.
              Everything you need to manage clients, run assessments, and stay compliant is ready for you.
            </p>
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0;">
              Here are five things you can do on the platform right away.
            </p>
          </div>

          <!-- Divider -->
          <div style="padding: 0 32px;">
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0 32px 0;" />
          </div>

          <!-- Feature 1: Client Profiles -->
          <div style="padding: 0 32px 28px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
              <tr>
                <td style="width: 52px; vertical-align: top; padding-right: 16px;">
                  <div style="width: 48px; height: 48px; border-radius: 12px; background: #ecfdf5; text-align: center; line-height: 48px; font-size: 22px;">
                    &#x1F465;
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="color: #0f172a; font-size: 17px; font-weight: 600; margin: 0 0 6px 0;">
                    Build your client book
                  </h3>
                  <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0;">
                    Create detailed client profiles with personal information, financial goals, and risk preferences
                    \u2014 all in one secure place. You can add clients individually or import them in bulk to get
                    started quickly.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Feature 2: Suitability Assessments -->
          <div style="padding: 0 32px 28px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
              <tr>
                <td style="width: 52px; vertical-align: top; padding-right: 16px;">
                  <div style="width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; text-align: center; line-height: 48px; font-size: 22px;">
                    &#x1F4CA;
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="color: #0f172a; font-size: 17px; font-weight: 600; margin: 0 0 6px 0;">
                    Run suitability assessments
                  </h3>
                  <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0;">
                    Our guided assessment workflow captures attitude-to-risk, capacity for loss, and investment
                    objectives. Share assessments directly with clients via email and receive completed responses
                    straight into their profile.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Screenshot: Suitability -->
          <div style="padding: 0 32px 32px 32px;">
            <div style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <img src="${screenshotSuitability}" alt="Suitability assessment workflow" style="width: 100%; height: auto; display: block;" />
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 8px 0 0 0;">
              The suitability assessment workflow in Plannetic
            </p>
          </div>

          <!-- Feature 3: Documents -->
          <div style="padding: 0 32px 28px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
              <tr>
                <td style="width: 52px; vertical-align: top; padding-right: 16px;">
                  <div style="width: 48px; height: 48px; border-radius: 12px; background: #fefce8; text-align: center; line-height: 48px; font-size: 22px;">
                    &#x1F4C4;
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="color: #0f172a; font-size: 17px; font-weight: 600; margin: 0 0 6px 0;">
                    Organise and share documents
                  </h3>
                  <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0;">
                    Upload client documents, generate branded reports, and send files for e-signature \u2014
                    all with a full audit trail. Every document is stored securely and linked to the
                    relevant client record.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Feature 4: Cash-Flow Modelling -->
          <div style="padding: 0 32px 28px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
              <tr>
                <td style="width: 52px; vertical-align: top; padding-right: 16px;">
                  <div style="width: 48px; height: 48px; border-radius: 12px; background: #f3e8ff; text-align: center; line-height: 48px; font-size: 22px;">
                    &#x1F4C8;
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="color: #0f172a; font-size: 17px; font-weight: 600; margin: 0 0 6px 0;">
                    Model cash-flow projections
                  </h3>
                  <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0;">
                    Run Monte Carlo simulations and sequence-of-returns analysis to stress-test retirement plans
                    and investment strategies. Present clients with clear, visual projections they can understand
                    and trust.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Screenshot: Dashboard -->
          <div style="padding: 0 32px 32px 32px;">
            <div style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <img src="${screenshotDashboard}" alt="Compliance dashboard overview" style="width: 100%; height: auto; display: block;" />
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 8px 0 0 0;">
              Stay on top of compliance with real-time dashboards
            </p>
          </div>

          <!-- Feature 5: Compliance Reviews -->
          <div style="padding: 0 32px 28px 32px;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
              <tr>
                <td style="width: 52px; vertical-align: top; padding-right: 16px;">
                  <div style="width: 48px; height: 48px; border-radius: 12px; background: #fce7f3; text-align: center; line-height: 48px; font-size: 22px;">
                    &#x1F6E1;
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="color: #0f172a; font-size: 17px; font-weight: 600; margin: 0 0 6px 0;">
                    Stay on top of compliance
                  </h3>
                  <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0;">
                    Track upcoming client reviews, monitor Consumer Duty obligations, and keep a complete audit
                    trail of every interaction. Plannetic flags overdue reviews so nothing slips through the cracks.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Screenshot: Analysis -->
          <div style="padding: 0 32px 32px 32px;">
            <div style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0;">
              <img src="${screenshotAnalysis}" alt="Monte Carlo risk analysis" style="width: 100%; height: auto; display: block;" />
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 8px 0 0 0;">
              Advanced cash-flow modelling and risk analysis tools
            </p>
          </div>

          <!-- CTA -->
          <div style="padding: 12px 32px 40px 32px; text-align: center;">
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
              Your dashboard is ready. Sign in below to start working with your first client.
            </p>
            <a href="${appUrl}/dashboard"
               style="display: inline-block; background: #0d9488; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
              Go to your dashboard
            </a>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 28px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
              This email was sent because you completed onboarding on Plannetic.<br />
              If you did not create this account, please disregard this message.
            </p>
            <p style="color: #cbd5e1; font-size: 12px; margin: 0;">
              Plannetic Ltd &middot; Turning Plans into Performance
            </p>
          </div>

        </div>
      `
    }
  },

  // Pre-login welcome email — sent immediately on account creation, before first login
  welcomePreLogin: (data: { userName: string; firmName: string; email: string; loginUrl: string; tempPassword?: string }) => {
    const siteUrl = 'https://www.plannetic.com'
    const logoUrl = `${siteUrl}/logo.png`
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const firstName = esc(data.userName || 'there')
    const firmName = esc(data.firmName || 'your firm')
    const userEmail = esc(data.email || '')
    const loginUrl = data.loginUrl || 'https://www.plannetic.com/login'

    return {
      subject: `Your Plannetic account is ready`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header with logo -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 32px; text-align: center;">
            <img src="${logoUrl}" alt="Plannetic" style="max-width: 200px; height: auto;" />
            <p style="color: #5eead4; font-size: 13px; margin: 12px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;">
              Turning Plans into Performance
            </p>
          </div>

          <!-- Greeting -->
          <div style="padding: 40px 32px 20px 32px;">
            <h1 style="color: #0f172a; font-size: 26px; font-weight: 700; margin: 0 0 16px 0;">
              Thank you for choosing Plannetic.
            </h1>
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
              Hi ${firstName}, we\u2019re pleased to confirm that your account for
              <strong style="color: #0f172a;">${firmName}</strong> has been created successfully.
              You\u2019re now part of a growing community of independent financial advisers who use
              Plannetic to manage clients, evidence suitability, and stay ahead of compliance obligations.
            </p>
          </div>

          <!-- Login details card -->
          <div style="padding: 0 32px 28px 32px;">
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px;">
              <h3 style="color: #0c4a6e; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
                &#x1F511;&nbsp; Your login details
              </h3>
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 14px; width: 100px;">Platform</td>
                  <td style="padding: 6px 0; font-size: 14px;">
                    <a href="${loginUrl}" style="color: #0369a1; font-weight: 600; text-decoration: none;">${loginUrl}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Email</td>
                  <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Password</td>
                  <td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${data.tempPassword ? `<strong>${esc(data.tempPassword)}</strong> <span style="color: #64748b;">(please change on first login)</span>` : 'Use the password you created during sign-up'}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- What to expect -->
          <div style="padding: 0 32px 20px 32px;">
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
              When you first sign in, a short onboarding wizard will walk you through setting up your
              firm details, verifying your FCA registration, and configuring your branding. The whole
              process only needs to be done once and ensures the platform is tailored to your practice.
            </p>
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0;">
              Once onboarding is complete, you\u2019ll have full access to client management, suitability
              assessments, document generation, cash-flow modelling, and compliance tracking \u2014
              all designed specifically for UK-regulated financial advisers.
            </p>
          </div>

          <!-- CTA -->
          <div style="padding: 12px 32px 40px 32px; text-align: center;">
            <a href="${loginUrl}"
               style="display: inline-block; background: #0d9488; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
              Sign in to Plannetic
            </a>
          </div>

          <!-- Support note -->
          <div style="padding: 0 32px 28px 32px;">
            <div style="background: #f8fafc; border-radius: 10px; padding: 20px; text-align: center;">
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions or need assistance getting started, reply to this email
                or reach out to our support team. We\u2019re here to help.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 28px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
              This email was sent because an account was created for you on Plannetic.<br />
              If you did not request this, please disregard this message or contact support.
            </p>
            <p style="color: #cbd5e1; font-size: 12px; margin: 0;">
              Plannetic Ltd &middot; Turning Plans into Performance
            </p>
          </div>

        </div>
      `
    }
  },

  // User invitation email
  userInvitation: (data: { inviteeEmail: string; firmName: string; role: string; inviterName: string; inviteUrl: string; expiresAt: string }) => {
    const siteUrl = 'https://www.plannetic.com'
    const logoUrl = `${siteUrl}/logo.png`
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const firmName = esc(data.firmName || 'a firm')
    const inviterName = esc(data.inviterName || 'Your administrator')
    const roleName = esc(data.role || 'team member')

    const roleDescriptions: Record<string, string> = {
      advisor: 'As an <strong>Advisor</strong>, you\u2019ll be able to manage your own clients, run suitability assessments, generate reports, and track reviews.',
      compliance: 'As a <strong>Compliance Officer</strong>, you\u2019ll be able to review and approve suitability assessments, monitor Consumer Duty obligations, and access all client records across the firm.',
      admin: 'As an <strong>Administrator</strong>, you\u2019ll have full access to manage firm settings, invite and remove team members, configure billing, and oversee all platform activity.',
    }
    const roleDescription = roleDescriptions[data.role] || `As a <strong>${roleName}</strong>, you\u2019ll have access to the platform tools relevant to your role.`

    return {
      subject: `${inviterName} has invited you to join ${firmName} on Plannetic`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff;">

          <!-- Header with logo -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 32px; text-align: center;">
            <img src="${logoUrl}" alt="Plannetic" style="max-width: 200px; height: auto;" />
            <p style="color: #5eead4; font-size: 13px; margin: 12px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600;">
              Turning Plans into Performance
            </p>
          </div>

          <!-- Invitation greeting -->
          <div style="padding: 40px 32px 20px 32px;">
            <h1 style="color: #0f172a; font-size: 26px; font-weight: 700; margin: 0 0 16px 0;">
              You\u2019ve been invited to join ${firmName}.
            </h1>
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">
              <strong style="color: #0f172a;">${inviterName}</strong> has invited you to join
              <strong style="color: #0f172a;">${firmName}</strong> on Plannetic \u2014 the practice management
              platform built for UK independent financial advisers.
            </p>
          </div>

          <!-- Role card -->
          <div style="padding: 0 32px 28px 32px;">
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px;">
              <h3 style="color: #0c4a6e; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                &#x1F464;&nbsp; Your role
              </h3>
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0;">
                ${roleDescription}
              </p>
            </div>
          </div>

          <!-- What you'll get access to -->
          <div style="padding: 0 32px 28px 32px;">
            <h3 style="color: #0f172a; font-size: 17px; font-weight: 600; margin: 0 0 16px 0;">
              What\u2019s included on the platform
            </h3>

            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
              <tr>
                <td style="padding: 0 0 16px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                      <td style="width: 40px; vertical-align: top; padding-right: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 8px; background: #ecfdf5; text-align: center; line-height: 36px; font-size: 16px;">&#x1F465;</div>
                      </td>
                      <td style="vertical-align: top;">
                        <p style="margin: 0 0 2px 0; color: #0f172a; font-size: 14px; font-weight: 600;">Client management</p>
                        <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">Create and manage client profiles, financial goals, and risk preferences</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 0 16px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                      <td style="width: 40px; vertical-align: top; padding-right: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 8px; background: #eff6ff; text-align: center; line-height: 36px; font-size: 16px;">&#x1F4CA;</div>
                      </td>
                      <td style="vertical-align: top;">
                        <p style="margin: 0 0 2px 0; color: #0f172a; font-size: 14px; font-weight: 600;">Suitability assessments</p>
                        <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">Run guided assessments for attitude-to-risk, capacity for loss, and investment objectives</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 0 16px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                      <td style="width: 40px; vertical-align: top; padding-right: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 8px; background: #fefce8; text-align: center; line-height: 36px; font-size: 16px;">&#x1F4C4;</div>
                      </td>
                      <td style="vertical-align: top;">
                        <p style="margin: 0 0 2px 0; color: #0f172a; font-size: 14px; font-weight: 600;">Documents and reports</p>
                        <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">Generate branded reports, store documents securely, and send files for e-signature</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 0;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                      <td style="width: 40px; vertical-align: top; padding-right: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 8px; background: #fce7f3; text-align: center; line-height: 36px; font-size: 16px;">&#x1F6E1;</div>
                      </td>
                      <td style="vertical-align: top;">
                        <p style="margin: 0 0 2px 0; color: #0f172a; font-size: 14px; font-weight: 600;">Compliance tracking</p>
                        <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">Monitor Consumer Duty obligations, track review deadlines, and maintain a full audit trail</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>

          <!-- CTA -->
          <div style="padding: 12px 32px 32px 32px; text-align: center;">
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
              Click the button below to create your account and join the team.
            </p>
            <a href="${data.inviteUrl}"
               style="display: inline-block; background: #0d9488; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">
              Accept Invitation
            </a>
          </div>

          <!-- Expiry notice -->
          <div style="padding: 0 32px 28px 32px;">
            <div style="background: #fef3c7; border-radius: 10px; padding: 16px 20px; text-align: center;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                This invitation expires on <strong>${esc(data.expiresAt)}</strong>. After that, you\u2019ll need to request a new one.
              </p>
            </div>
          </div>

          <!-- Fallback link -->
          <div style="padding: 0 32px 28px 32px;">
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0;">
              If the button doesn\u2019t work, copy and paste this link into your browser:<br />
              <a href="${data.inviteUrl}" style="color: #0369a1; word-break: break-all;">${data.inviteUrl}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 28px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
              This invitation was sent by ${inviterName} at ${firmName}.<br />
              If you weren\u2019t expecting this, you can safely ignore this email.
            </p>
            <p style="color: #cbd5e1; font-size: 12px; margin: 0;">
              Plannetic Ltd &middot; Turning Plans into Performance
            </p>
          </div>

        </div>
      `
    }
  }
}

// Maximum attachment size (5MB base64 encoded)
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validate email address
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

    // Fetch firm branding if firmId provided
    let branding: EmailBranding | null = null
    if (firmId && typeof firmId === 'string') {
      branding = await getFirmBranding(firmId)
      if (!branding) {
        log.warn('[send-email] Could not load branding for firm', { firmId })
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

      const client = getSESClient()

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

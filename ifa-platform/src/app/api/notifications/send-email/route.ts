import { createClient } from "@/lib/supabase/server"
// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/notifications/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { log } from '@/lib/logging/structured'

// Lazy initialize Resend to avoid build-time errors
let resend: Resend | null = null

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
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
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, recipient, cc, data } = body

    let emailContent: { subject: string; html: string }
    let attachments: any[] = []

    // Handle different email types
    switch (type) {
      case 'documentSent':
        emailContent = EMAIL_TEMPLATES.documentSent(data.clientName, data.documentName, data.documentLink)
        break
      case 'signatureCompleted':
        emailContent = EMAIL_TEMPLATES.signatureCompleted(data.advisorName, data.clientName, data.documentName)
        break
      case 'weeklyReport':
        emailContent = EMAIL_TEMPLATES.weeklyReport(data.advisorName, data.stats)
        break
      case 'reminder':
        emailContent = EMAIL_TEMPLATES.reminder(data.clientName, data.documentName, data.daysLeft)
        break
      case 'reportWithAttachment':
        emailContent = EMAIL_TEMPLATES.reportWithAttachment(data)
        // Handle attachments
        if (data.attachments && data.attachments.length > 0) {
          attachments = data.attachments.map((att: any) => ({
            filename: att.filename,
            content: att.content.split(',')[1] // Remove data:application/pdf;base64, prefix
          }))
        }
        break
      case 'assessmentInvite':
        emailContent = EMAIL_TEMPLATES.assessmentInvite(data)
        break
      case 'assessmentCompleted':
        emailContent = EMAIL_TEMPLATES.assessmentCompleted(data)
        break
      default:
        throw new Error('Invalid email type')
    }

    // Determine recipients
    const to = Array.isArray(recipient) ? recipient : [recipient]
    const ccRecipients = cc || []

    // Send email with Resend
    try {
      const emailData: any = {
        from: 'IFA Platform <onboarding@resend.dev>', // Replace with your verified domain
        to,
        subject: emailContent.subject,
        html: emailContent.html,
      }

      if (ccRecipients.length > 0) {
        emailData.cc = ccRecipients
      }

      if (attachments.length > 0) {
        emailData.attachments = attachments
      }

      const { data: resendData, error } = await getResendClient().emails.send(emailData)

      if (error) {
        log.error('Resend error', { message: error.message, name: error.name })
        throw new Error(error.message || 'Failed to send email')
      }

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        emailId: resendData?.id || `demo-${Date.now()}`,
        preview: emailContent.subject
      })

    } catch (resendError) {
      log.error('Resend API error', resendError)

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

      throw resendError
    }

  } catch (error) {
    log.error('Email error', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error'
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
        log.error('Failed to send weekly report', { email: advisor.email, error: error instanceof Error ? error.message : 'Unknown' })
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
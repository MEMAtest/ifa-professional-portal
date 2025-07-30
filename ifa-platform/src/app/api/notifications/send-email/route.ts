// File: src/app/api/notifications/send-email/route.ts
// Email notifications using Resend (or SendGrid as alternative)

import { NextRequest, NextResponse } from 'next/server'

// Install: npm install resend
// import { Resend } from 'resend'
// const resend = new Resend(process.env.RESEND_API_KEY)

// Email templates
const EMAIL_TEMPLATES = {
  documentSent: (clientName: string, documentName: string) => ({
    subject: `Document Ready for Signature: ${documentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Document Ready for Review</h2>
        <p>Dear ${clientName},</p>
        <p>Your ${documentName} is ready for review and signature.</p>
        <div style="margin: 30px 0;">
          <a href="#" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Review Document
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          This document will expire in 7 days. Please review and sign at your earliest convenience.
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
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, recipient, data } = body

    let emailContent
    switch (type) {
      case 'documentSent':
        emailContent = EMAIL_TEMPLATES.documentSent(data.clientName, data.documentName)
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
      default:
        throw new Error('Invalid email type')
    }

    // In production, uncomment and use:
    // const email = await resend.emails.send({
    //   from: 'noreply@yourcompany.com',
    //   to: recipient,
    //   subject: emailContent.subject,
    //   html: emailContent.html,
    // })

    // For demo, simulate success
    console.log('Sending email:', {
      to: recipient,
      subject: emailContent.subject,
      type
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: `demo-${Date.now()}`,
      preview: emailContent.subject
    })

  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

// Scheduled job endpoint for weekly reports
export async function GET(request: NextRequest) {
  // This would be called by a cron job (Vercel Cron, etc.)
  
  try {
    // Get all advisors and their weekly stats
    // Send weekly report emails
    
    return NextResponse.json({
      success: true,
      message: 'Weekly reports sent',
      count: 0 // Number of reports sent
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send weekly reports' },
      { status: 500 }
    )
  }
}
import { createClient } from "@/lib/supabase/client"
// src/services/emailService.ts

// Helper to get base URL for server-side fetch calls
function getBaseUrl(): string {
  // In browser context
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // In server context
  // 1. Production: Use NEXT_PUBLIC_SITE_URL or VERCEL_URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 2. Development: Use localhost with correct port
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
}

export interface EmailPayload {
  to: string[]
  cc?: string[]
  subject: string
  message: string
  attachments?: {
    filename: string
    content: string // base64
  }[]
}

export async function sendReportEmail(payload: EmailPayload): Promise<void> {
  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/notifications/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'reportWithAttachment',
        recipient: payload.to,
        cc: payload.cc,
        data: {
          subject: payload.subject,
          message: payload.message,
          attachments: payload.attachments
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send email')
    }
  } catch (error) {
    console.error('Email send error:', error)
    throw error
  }
}

// Helper function to send notification emails (without attachments)
export async function sendNotificationEmail(
  type: 'documentSent' | 'signatureCompleted' | 'reminder',
  recipient: string,
  data: {
    clientName?: string
    documentName?: string
    documentLink?: string
    advisorName?: string
    daysLeft?: number
  }
): Promise<void> {
  const baseUrl = getBaseUrl()
  const response = await fetch(`${baseUrl}/api/notifications/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type,
      recipient,
      data
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to send notification')
  }
}
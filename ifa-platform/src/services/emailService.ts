// src/services/emailService.ts
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
    const response = await fetch('/api/notifications/send-email', {
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
  data: any
): Promise<void> {
  const response = await fetch('/api/notifications/send-email', {
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
    throw new Error('Failed to send notification')
  }
}
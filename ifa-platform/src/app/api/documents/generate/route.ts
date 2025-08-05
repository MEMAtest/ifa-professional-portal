// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// File: src/app/api/documents/send-signature/route.ts

import { NextRequest, NextResponse } from 'next/server'

const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY || '2GCP4Wrrp3vEH7bqVDD2DvUZAo674CS7HKFiM3vDxAT'

// Using your actual DocuSeal template ID
const DOCUSEAL_TEMPLATE_ID = '194082'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientEmail, clientName, templateName } = body

    console.log('Sending document via DocuSeal:', {
      clientEmail,
      clientName,
      templateName,
      templateId: DOCUSEAL_TEMPLATE_ID
    })

    // Create submission in DocuSeal
    const docusealPayload = {
      template_id: DOCUSEAL_TEMPLATE_ID,
      send_email: true,
      send_sms: false,
      submitters: [
        {
          email: clientEmail,
          name: clientName,
          role: 'Client'
        }
      ]
    }

    try {
      const response = await fetch('https://api.docuseal.co/v1/submissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DOCUSEAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(docusealPayload)
      })

      const responseText = await response.text()
      console.log('DocuSeal response:', response.status, responseText)

      if (response.ok) {
        const result = JSON.parse(responseText)
        
        return NextResponse.json({
          success: true,
          message: 'Document sent successfully via DocuSeal!',
          signatureRequestId: result.id,
          submissionId: result.id,
          docusealResponse: result
        })
      } else {
        console.error('DocuSeal API error:', responseText)
        
        return NextResponse.json({
          success: false,
          message: 'Failed to send via DocuSeal',
          error: responseText
        }, { status: 400 })
      }
    } catch (apiError) {
      console.error('DocuSeal API call failed:', apiError)
      
      return NextResponse.json({
        success: false,
        message: 'DocuSeal API connection failed',
        error: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Signature API error:', error)
    return NextResponse.json(
      { error: 'Failed to process signature request' },
      { status: 500 }
    )
  }
}
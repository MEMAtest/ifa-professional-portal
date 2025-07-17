// ===================================================================
// FIXED API ROUTE: Send for Signature
// File: src/app/api/documents/send-signature/route.ts
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ FIXED: Add supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, documentUrl, clientEmail, clientName, templateName } = body

    // Validate required fields
    if (!documentId || !documentUrl || !clientEmail || !clientName) {
      return NextResponse.json(
        { error: 'Missing required fields for signature request' },
        { status: 400 }
      )
    }

    // Check if DocuSeal is configured
    const docuSealApiKey = process.env.NEXT_PUBLIC_DOCUSEAL_API_KEY
    if (!docuSealApiKey) {
      // Fallback: Just save as completed without signature
      console.log('DocuSeal not configured, marking document as completed')
      
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          status: 'active',
          signature_status: 'not_required',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      if (updateError) {
        console.error('Failed to update document status:', updateError)
      }

      return NextResponse.json({
        success: true,
        message: 'Document completed (signature not configured)',
        signature_required: false
      })
    }

    // Create DocuSeal template and send for signature
    try {
      const docuSealResponse = await fetch('https://api.docuseal.co/templates', {
        method: 'POST',
        headers: {
          'X-Auth-Token': docuSealApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${templateName} - ${clientName}`,
          documents: [{
            name: templateName,
            file_url: documentUrl
          }],
          fields: [{
            name: 'signature',
            type: 'signature',
            required: true,
            areas: [{
              x: 100,
              y: 700,
              w: 200,
              h: 60,
              page: 0
            }]
          }]
        })
      })

      if (!docuSealResponse.ok) {
        throw new Error(`DocuSeal template creation failed: ${docuSealResponse.statusText}`)
      }

      const template = await docuSealResponse.json()

      // Send for signature
      const submissionResponse = await fetch('https://api.docuseal.co/submissions', {
        method: 'POST',
        headers: {
          'X-Auth-Token': docuSealApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: template.id,
          send_email: true,
          submitters: [{
            email: clientEmail,
            name: clientName,
            role: 'Client'
          }]
        })
      })

      if (!submissionResponse.ok) {
        throw new Error(`DocuSeal submission failed: ${submissionResponse.statusText}`)
      }

      const submission = await submissionResponse.json()

      // Save signature request to database
      await supabase.from('signature_requests').insert({
        document_id: documentId,
        docuseal_template_id: template.id,
        docuseal_submission_id: submission.id,
        client_ref: body.clientRef,
        recipient_email: clientEmail,
        recipient_name: clientName,
        status: 'sent',
        subject: `Please sign: ${templateName}`,
        message: 'Please review and sign the attached document.'
      })

      // Update document status
      await supabase
        .from('documents')
        .update({ 
          signature_status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      return NextResponse.json({
        success: true,
        message: 'Document sent for signature successfully',
        signature_required: true,
        submission_id: submission.id
      })

    } catch (docuSealError) {
      console.error('DocuSeal error:', docuSealError)
      
      // Fallback: Mark as completed without signature
      await supabase
        .from('documents')
        .update({ 
          status: 'active',
          signature_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      return NextResponse.json({
        success: true,
        message: 'Document generated successfully (signature service unavailable)',
        signature_required: false,
        warning: 'Signature service temporarily unavailable'
      })
    }

  } catch (error) {
    console.error('API Send signature error:', error)
    return NextResponse.json(
      { error: 'Failed to process signature request' },
      { status: 500 }
    )
  }
}
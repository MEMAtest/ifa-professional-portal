// ===================================================================
// FIXED WEBHOOK ROUTE: DocuSeal Status Updates
// File: src/app/api/docuseal/webhook/route.ts
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
    const { event_type, data } = body

    console.log(`DocuSeal webhook received: ${event_type}`, data)

    if (event_type === 'submission.completed') {
      // Update signature request status
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          docuseal_status: data.status
        })
        .eq('docuseal_submission_id', data.id)

      if (updateError) {
        console.error('Error updating signature request:', updateError)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      // Update the associated document
      const { data: signatureRequest } = await supabase
        .from('signature_requests')
        .select('document_id')
        .eq('docuseal_submission_id', data.id)
        .single()

      if (signatureRequest?.document_id) {
        await supabase
          .from('documents')
          .update({
            signature_status: 'completed',
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', signatureRequest.document_id)
      }

      console.log(`Signature completed for submission ${data.id}`)
    }

    return NextResponse.json({ success: true, processed: event_type })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'DocuSeal webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}
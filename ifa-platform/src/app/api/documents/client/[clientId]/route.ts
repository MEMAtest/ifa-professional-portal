// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// FIXED API ROUTE: Get Client Documents
// File: src/app/api/documents/client/[clientId]/route.ts
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ FIXED: Add supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Get client documents with signature status
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        *,
        signature_requests (
          id,
          status,
          docuseal_submission_id,
          sent_at,
          completed_at
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    // ✅ FIXED: Add proper typing for doc parameter
    const transformedDocuments = (documents || []).map((doc: any) => ({
      ...doc,
      signature_status: doc.signature_requests?.[0]?.status || null,
      signature_request_id: doc.signature_requests?.[0]?.id || null,
      sent_at: doc.signature_requests?.[0]?.sent_at || null,
      completed_at: doc.signature_requests?.[0]?.completed_at || null
    }))

    return NextResponse.json({
      success: true,
      documents: transformedDocuments,
      count: transformedDocuments.length
    })

  } catch (error) {
    console.error('API Get documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
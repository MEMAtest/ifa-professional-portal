// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// FIXED API ROUTE: Get Client Documents with Assessment Filtering
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

    // ✅ ADDED: Extract query parameters for filtering
    const searchParams = request.nextUrl.searchParams
    const assessmentId = searchParams.get('assessmentId')
    const assessmentType = searchParams.get('assessmentType')
    const assessmentVersion = searchParams.get('version')

    console.log('Document fetch params:', { 
      clientId, 
      assessmentId, 
      assessmentType, 
      assessmentVersion 
    })

    // Start building the query
    let query = supabase
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

    // ✅ ADDED: Apply filters based on query parameters
    if (assessmentId) {
      // Filter by specific assessment ID (most specific)
      query = query.eq('assessment_id', assessmentId)
      console.log('Filtering by assessment_id:', assessmentId)
    } else if (assessmentType && assessmentVersion) {
      // Filter by assessment type and version (e.g., ATR version 3)
      query = query
        .eq('document_type', `${assessmentType}_report`)
        .eq('assessment_version', assessmentVersion)
      console.log('Filtering by type and version:', assessmentType, assessmentVersion)
    } else if (assessmentType) {
      // Filter by assessment type only (e.g., all ATR documents)
      query = query.eq('document_type', `${assessmentType}_report`)
      console.log('Filtering by type only:', assessmentType)
    }

    // Execute query with ordering
    query = query.order('created_at', { ascending: false })

    const { data: documents, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch documents',
          details: error.message 
        },
        { status: 500 }
      )
    }

    // ✅ Handle case where no documents found (not an error, just empty)
    if (!documents || documents.length === 0) {
      console.log('No documents found for criteria:', { 
        clientId, 
        assessmentId, 
        assessmentType 
      })
      
      return NextResponse.json({
        success: true,
        documents: [],
        count: 0,
        message: assessmentId 
          ? 'No document found for this assessment version' 
          : 'No documents found for this client'
      })
    }

    // ✅ FIXED: Add proper typing for doc parameter
    const transformedDocuments = documents.map((doc: any) => ({
      ...doc,
      signature_status: doc.signature_requests?.[0]?.status || null,
      signature_request_id: doc.signature_requests?.[0]?.id || null,
      sent_at: doc.signature_requests?.[0]?.sent_at || null,
      completed_at: doc.signature_requests?.[0]?.completed_at || null,
      // ✅ ADDED: Include assessment info for debugging
      assessment_info: {
        assessment_id: doc.assessment_id,
        assessment_version: doc.assessment_version,
        document_type: doc.document_type
      }
    }))

    // ✅ ADDED: If filtering by assessmentId, return single document object for convenience
    if (assessmentId && transformedDocuments.length === 1) {
      return NextResponse.json({
        success: true,
        document: transformedDocuments[0],  // Singular for single assessment
        documents: transformedDocuments,     // Keep array for compatibility
        count: 1
      })
    }

    return NextResponse.json({
      success: true,
      documents: transformedDocuments,
      count: transformedDocuments.length,
      filters: {
        clientId,
        assessmentId,
        assessmentType,
        assessmentVersion
      }
    })

  } catch (error) {
    console.error('API Get documents error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
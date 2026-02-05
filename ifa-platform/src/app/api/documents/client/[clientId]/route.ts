// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// API ROUTE: Get Client Documents with Assessment Filtering
// File: src/app/api/documents/client/[clientId]/route.ts
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { log } from '@/lib/logging/structured'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'documents:read')
    if (permissionError) {
      return permissionError
    }
    const { firmId } = firmResult

    const { clientId } = params

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const assessmentId = searchParams.get('assessmentId')
    const assessmentType = searchParams.get('assessmentType')
    const assessmentVersion = searchParams.get('version')
    const summaryOnly = searchParams.get('summary') === '1' || searchParams.get('summary') === 'true'

    log.debug('Document fetch params', {
      clientId,
      assessmentId,
      assessmentType,
      assessmentVersion
    })

    const supabase = getSupabaseServiceClient()

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    if (summaryOnly) {
      const { data: statusRows, error: statusError } = await supabase
        .from('documents')
        .select('status')
        .eq('client_id', clientId)
        .eq('firm_id', firmId)

      if (statusError) {
        log.error('Database error fetching document summary', statusError)
        return NextResponse.json({ error: 'Failed to fetch document summary' }, { status: 500 })
      }

      const statuses = statusRows || []
      const analyzedCount = statuses.filter((row: any) => row.status === 'analyzed').length
      const pendingCount = statuses.filter((row: any) => row.status === 'pending' || row.status === 'active' || !row.status).length
      const failedCount = statuses.filter((row: any) => row.status === 'failed' || row.status === 'extracted').length

      return NextResponse.json({
        success: true,
        count: statuses.length,
        analyzedCount,
        pendingCount,
        failedCount
      })
    }

    // ---------------------------------------------------------------
    // Two-step query: First get all matching IDs (lightweight), then
    // fetch full document data. This avoids a known issue where
    // select('*') on rows with large JSONB metadata can silently
    // drop rows from the PostgREST response.
    // ---------------------------------------------------------------

    // Step 1: Get all matching document IDs with a lightweight query
    let idQuery = supabase
      .from('documents')
      .select('id')
      .eq('client_id', clientId)
      .eq('firm_id', firmId)

    // Apply assessment filters to the ID query too
    if (assessmentId) {
      idQuery = idQuery.eq('assessment_id', assessmentId)
    } else if (assessmentType && assessmentVersion) {
      idQuery = idQuery
        .eq('document_type', `${assessmentType}_report`)
        .eq('assessment_version', Number(assessmentVersion))
    } else if (assessmentType) {
      idQuery = idQuery.eq('document_type', `${assessmentType}_report`)
    }

    const { data: idRows, error: idError } = await idQuery

    if (idError) {
      log.error('Database error fetching document IDs', idError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    const allIds = idRows?.map((r: any) => r.id) || []

    if (allIds.length === 0) {
      log.debug('No documents found for criteria', {
        clientId, assessmentId, assessmentType
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

    // Step 2: Fetch full document data using the known IDs
    // Use .in('id', ids) instead of .eq('client_id', ...) to ensure
    // we get exactly the documents we know exist.
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .in('id', allIds)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('Database error fetching document details', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    // Step 3: Check for missing documents and fetch them individually
    let allDocuments = documents || []

    if (allDocuments.length < allIds.length) {
      const foundIds = new Set(allDocuments.map((d: any) => d.id))
      const missingIds = allIds.filter(id => !foundIds.has(id))

      log.warn('Some documents missing from bulk query, fetching individually', {
        expected: allIds.length,
        got: allDocuments.length,
        missingCount: missingIds.length
      })

      // Fetch missing documents one by one (they may have large metadata)
      for (const missingId of missingIds) {
        const { data: doc, error: singleError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', missingId)
          .eq('firm_id', firmId)
          .single()

        if (doc && !singleError) {
          allDocuments.push(doc)
        } else {
          log.warn('Could not fetch individual document', {
            id: missingId,
            error: singleError?.message
          })
        }
      }

      // Re-sort after adding individually fetched docs
      allDocuments.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })
    }

    // Transform documents
    const transformedDocuments = allDocuments.map((doc: any) => ({
      ...doc,
      signature_status: doc.signature_requests?.[0]?.status || null,
      signature_request_id: doc.signature_requests?.[0]?.id || null,
      sent_at: doc.signature_requests?.[0]?.sent_at || null,
      completed_at: doc.signature_requests?.[0]?.completed_at || null,
      assessment_info: {
        assessment_id: doc.assessment_id,
        assessment_version: doc.assessment_version,
        document_type: doc.document_type
      }
    }))

    // If filtering by assessmentId, return single document object for convenience
    if (assessmentId && transformedDocuments.length === 1) {
      return NextResponse.json({
        success: true,
        document: transformedDocuments[0],
        documents: transformedDocuments,
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
    log.error('API Get documents error', error)
    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

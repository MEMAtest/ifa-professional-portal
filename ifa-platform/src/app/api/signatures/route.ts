// ================================================================
// GET /api/signatures - List signature requests for the user's firm
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Require firm_id for multi-tenant isolation
    const firmIdResult = requireFirmId(auth.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }
    const firmId = firmIdResult.firmId

    const supabase = await createClient()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query with firm_id filter for multi-tenant isolation
    let query = supabase
      .from('signature_requests')
      .select(`
        *,
        clients:client_id (
          id,
          client_ref,
          personal_details
        )
      `)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: signatureRequests, error } = await query

    if (error) {
      log.error('Error fetching signature requests:', error)

      // Check if it's a table not found error
      if (error.message.includes('does not exist') || error.code === '42P01') {
        // Return empty array if table doesn't exist yet
        return NextResponse.json({
          success: true,
          signatureRequests: [],
          total: 0,
          message: 'Signature requests table not yet created'
        })
      }

      throw error
    }

    // Transform the data for the frontend
    // Using direct recipient_name/recipient_email columns (basic schema)
    const transformedRequests = (signatureRequests || []).map((request: any) => ({
      id: request.id,
      document_id: request.document_id,
      client_id: request.client_id,
      status: request.status,
      recipient_name: request.recipient_name || 'Unknown',
      recipient_email: request.recipient_email || '',
      document: request.document_id ? {
        id: request.document_id,
        title: `Document ${request.document_id.substring(0, 8)}...`
      } : null,
      client: request.clients ? {
        id: request.clients.id,
        ref: request.clients.client_ref,
        name: getClientName(request.clients.personal_details)
      } : null,
      created_at: request.created_at,
      updated_at: request.updated_at,
      sent_at: request.sent_at,
      viewed_at: request.viewed_at,
      completed_at: request.completed_at,
      expires_at: request.expires_at
    }))

    return NextResponse.json({
      success: true,
      signatureRequests: transformedRequests,
      total: transformedRequests.length
    })

  } catch (error) {
    log.error('Signatures API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch signature requests',
        message: error instanceof Error ? error.message : 'Unknown error',
        signatureRequests: []
      },
      { status: 500 }
    )
  }
}

// Helper function to get client display name
function getClientName(personalDetails: any): string {
  if (!personalDetails) return 'Unknown'
  const title = personalDetails.title ? `${personalDetails.title} ` : ''
  const firstName = personalDetails.firstName || personalDetails.first_name || ''
  const lastName = personalDetails.lastName || personalDetails.last_name || ''
  return `${title}${firstName} ${lastName}`.trim() || 'Unknown'
}

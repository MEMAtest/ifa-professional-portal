// ================================================================
// GET /api/signatures - List all signature requests
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get auth context (optional - don't block if not authenticated for now)
    const auth = await getAuthContext(request)

    // Use service role for better access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query - only select columns that exist
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    // If authenticated, filter by advisor's clients (optional)
    // For now, return all to make testing easier

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

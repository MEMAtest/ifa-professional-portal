// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import type { SearchResult, SearchResponse } from '@/types/search'

// Type definitions for database query results
interface ClientRow {
  id: string
  client_ref: string | null
  personal_details: {
    firstName?: string
    lastName?: string
  } | null
  contact_info: {
    email?: string
  } | null
}

interface DocumentRow {
  id: string
  name: string | null
  description: string | null
  file_name: string | null
  status: string | null
  clients: {
    id: string
    personal_details: {
      firstName?: string
      lastName?: string
    } | null
  } | null
}

interface AssessmentRow {
  id: string
  status: string | null
  created_at: string | null
  risk_score?: number | null
  risk_category?: string | null
  total_score?: number | null
  clients: {
    id: string
    personal_details: {
      firstName?: string
      lastName?: string
    } | null
    client_ref: string | null
  } | null
}

/**
 * GET /api/search
 * Unified search across clients, documents, and assessments
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth.success) {
    return auth.response!
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q')?.trim() || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

  if (!query || query.length < 2) {
    return NextResponse.json({
      clients: [],
      documents: [],
      assessments: [],
      total: 0,
      query: ''
    } as SearchResponse)
  }

  try {
    // Search all entities in parallel
    const [clientsResult, documentsResult, assessmentsResult] = await Promise.all([
      searchClients(supabase, query, limit),
      searchDocuments(supabase, query, limit),
      searchAssessments(supabase, query, limit)
    ])

    const response: SearchResponse = {
      clients: clientsResult,
      documents: documentsResult,
      assessments: assessmentsResult,
      total: clientsResult.length + documentsResult.length + assessmentsResult.length,
      query
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function searchClients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  // First try: fetch all clients and filter in memory (debugging approach)
  const { data: allClients, error: fetchError } = await supabase
    .from('clients')
    .select('id, client_ref, personal_details, contact_info')
    .limit(100)

  if (fetchError) {
    console.error('Client fetch error:', fetchError)
    return []
  }

  // Filter in memory for now to debug
  const searchLower = query.toLowerCase()
  const filteredClients = (allClients || []).filter((client: ClientRow) => {
    const firstName = (client.personal_details?.firstName || '').toLowerCase()
    const lastName = (client.personal_details?.lastName || '').toLowerCase()
    const clientRef = (client.client_ref || '').toLowerCase()
    const email = (client.contact_info?.email || '').toLowerCase()

    return (
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      clientRef.includes(searchLower) ||
      email.includes(searchLower)
    )
  }).slice(0, limit)

  const data = filteredClients
  const error = null

  return ((data || []) as ClientRow[]).map((client) => {
    const firstName = client.personal_details?.firstName || ''
    const lastName = client.personal_details?.lastName || ''
    const email = client.contact_info?.email || ''

    return {
      id: client.id,
      type: 'client' as const,
      title: `${firstName} ${lastName}`.trim() || client.client_ref || 'Unknown Client',
      subtitle: email || client.client_ref || undefined,
      url: `/clients/${client.id}`,
      metadata: {
        client_ref: client.client_ref,
        email
      }
    }
  })
}

async function searchDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const orFilter = [
    `name.ilike.%${query}%`,
    `description.ilike.%${query}%`,
    `file_name.ilike.%${query}%`
  ].join(',')

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      name,
      description,
      file_name,
      status,
      clients(
        id,
        personal_details
      )
    `)
    .eq('is_archived', false)
    .or(orFilter)
    .limit(limit)

  if (error) {
    console.error('Document search error:', error)
    return []
  }

  return ((data || []) as DocumentRow[]).map((doc) => {
    const clientName = doc.clients
      ? `${doc.clients.personal_details?.firstName || ''} ${doc.clients.personal_details?.lastName || ''}`.trim()
      : ''

    return {
      id: doc.id,
      type: 'document' as const,
      title: doc.name || doc.file_name || 'Untitled Document',
      subtitle: clientName || doc.description || doc.status || undefined,
      url: `/documents/view/${doc.id}`,
      metadata: {
        status: doc.status,
        file_name: doc.file_name,
        client_name: clientName
      }
    }
  })
}

async function searchAssessments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  // Search suitability assessments - fetch more records for filtering
  const { data: suitabilityData, error: suitabilityError } = await supabase
    .from('suitability_assessments')
    .select(`
      id,
      status,
      created_at,
      clients(
        id,
        personal_details,
        client_ref
      )
    `)
    .limit(100)

  if (suitabilityError) {
    console.error('Suitability assessment search error:', suitabilityError)
  }

  // Filter suitability assessments by client name matching
  const suitabilityResults: SearchResult[] = ((suitabilityData || []) as AssessmentRow[])
    .filter((assessment) => {
      if (!assessment.clients) return false
      const firstName = assessment.clients.personal_details?.firstName || ''
      const lastName = assessment.clients.personal_details?.lastName || ''
      const clientRef = assessment.clients.client_ref || ''
      const fullName = `${firstName} ${lastName}`.toLowerCase()
      const searchLower = query.toLowerCase()
      return fullName.includes(searchLower) || clientRef.toLowerCase().includes(searchLower)
    })
    .slice(0, limit)
    .map((assessment) => {
      const firstName = assessment.clients?.personal_details?.firstName || ''
      const lastName = assessment.clients?.personal_details?.lastName || ''
      const clientName = `${firstName} ${lastName}`.trim()

      return {
        id: assessment.id,
        type: 'assessment' as const,
        title: `Suitability Assessment - ${clientName || 'Unknown'}`,
        subtitle: `Status: ${assessment.status || 'In Progress'}`,
        url: assessment.clients?.id ? `/assessments/suitability/results/${assessment.clients.id}` : `/assessments/suitability`,
        metadata: {
          assessment_type: 'suitability',
          status: assessment.status,
          client_id: assessment.clients?.id
        }
      }
    })

  // Search ATR assessments - fetch more records for filtering
  const { data: atrData, error: atrError } = await supabase
    .from('atr_assessments')
    .select(`
      id,
      risk_category,
      total_score,
      created_at,
      clients(
        id,
        personal_details,
        client_ref
      )
    `)
    .limit(100)

  if (atrError) {
    console.error('ATR assessment search error:', atrError)
  }

  // Filter ATR assessments by client name matching
  const atrResults: SearchResult[] = ((atrData || []) as AssessmentRow[])
    .filter((assessment) => {
      if (!assessment.clients) return false
      const firstName = assessment.clients.personal_details?.firstName || ''
      const lastName = assessment.clients.personal_details?.lastName || ''
      const clientRef = assessment.clients.client_ref || ''
      const fullName = `${firstName} ${lastName}`.toLowerCase()
      const searchLower = query.toLowerCase()
      return fullName.includes(searchLower) || clientRef.toLowerCase().includes(searchLower)
    })
    .slice(0, limit)
    .map((assessment) => {
      const firstName = assessment.clients?.personal_details?.firstName || ''
      const lastName = assessment.clients?.personal_details?.lastName || ''
      const clientName = `${firstName} ${lastName}`.trim()

      return {
        id: assessment.id,
        type: 'assessment' as const,
        title: `Risk Assessment (ATR) - ${clientName || 'Unknown'}`,
        subtitle: assessment.total_score ? `Score: ${assessment.total_score}` : `Category: ${assessment.risk_category || 'In Progress'}`,
        url: assessment.clients?.id ? `/assessments/atr/results/${assessment.clients.id}` : `/assessments/atr`,
        metadata: {
          assessment_type: 'atr',
          risk_category: assessment.risk_category,
          total_score: assessment.total_score,
          client_id: assessment.clients?.id
        }
      }
    })

  // Combine and limit results
  return [...suitabilityResults, ...atrResults].slice(0, limit)
}

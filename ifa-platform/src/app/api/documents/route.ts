// ===================================================================
// src/app/api/documents/route.ts - REAL DATA from Your Supabase Database
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ REAL: Connect to your actual Supabase database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper function to get user context (from your existing pattern)
async function getCurrentUserContext() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw new Error('Authentication required')
    }

    // Try multiple sources for firm_id (from your existing code)
    let firmId: string | null = null
    
    if (user.user_metadata?.firm_id) {
      firmId = user.user_metadata.firm_id
    }
    
    if (!firmId && user.user_metadata?.firmId) {
      firmId = user.user_metadata.firmId
    }
    
    // For development/testing - use a default firm_id
    if (!firmId) {
      console.warn('No firm_id found in user metadata, using default for development')
      firmId = '12345678-1234-1234-1234-123456789012'
    }

    return { 
      user, 
      firmId: firmId as string,
      userId: user.id 
    }
  } catch (error) {
    console.error('getCurrentUserContext error:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category_id = searchParams.get('category_id')
    const client_id = searchParams.get('client_id')
    const status = searchParams.get('status')
    const compliance_status = searchParams.get('compliance_status')
    const search = searchParams.get('search')
    const sort_by = searchParams.get('sort_by') || 'created_at'
    const sort_order = searchParams.get('sort_order') || 'desc'
    
    // Get filter arrays
    const categories = searchParams.getAll('categories')
    const statuses = searchParams.getAll('statuses')
    const compliance_statuses = searchParams.getAll('compliance_statuses')

    // ✅ REAL: Get user context for firm filtering
    const { firmId } = await getCurrentUserContext()

    // ✅ REAL: Build Supabase query with your actual schema
    let query = supabase
      .from('documents')
      .select(`
        *,
        document_categories(
          id,
          name,
          icon,
          color,
          requires_signature,
          compliance_level
        ),
        clients(
          id,
          client_ref,
          personal_details,
          contact_info
        )
      `)
      .eq('firm_id', firmId)
      .eq('is_archived', false)

    // Apply filters based on your schema
    if (category_id) {
      query = query.eq('category_id', category_id)
    }
    
    if (categories.length > 0) {
      query = query.in('category_id', categories)
    }
    
    if (client_id) {
      query = query.eq('client_id', client_id)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (statuses.length > 0) {
      query = query.in('status', statuses)
    }
    
    if (compliance_status) {
      query = query.eq('compliance_status', compliance_status)
    }
    
    if (compliance_statuses.length > 0) {
      query = query.in('compliance_status', compliance_statuses)
    }
    
    // Search across multiple fields
    if (search) {
      query = query.or(`
        name.ilike.%${search}%,
        description.ilike.%${search}%,
        file_name.ilike.%${search}%
      `)
    }

    // Apply sorting
    const ascending = sort_order === 'asc'
    query = query.order(sort_by, { ascending })

    // Get total count for pagination
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .eq('is_archived', false)

    // Apply pagination
    const start = (page - 1) * limit
    query = query.range(start, start + limit - 1)

    // Execute query
    const { data: documents, error } = await query

    if (error) {
      console.error('Database query error:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }

    // ✅ REAL: Transform your database structure to match frontend expectations
    const transformedDocuments = (documents || []).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      category: doc.document_categories ? {
        id: doc.document_categories.id,
        name: doc.document_categories.name,
        icon: doc.document_categories.icon || 'FileText',
        color: doc.document_categories.color || '#6B7280',
        requires_signature: doc.document_categories.requires_signature || false,
        compliance_level: doc.document_categories.compliance_level || 'standard'
      } : null,
      client_name: doc.clients ? getClientDisplayName(doc.clients) : 'Unknown Client',
      client_id: doc.client_id,
      status: doc.status || 'pending',
      compliance_status: doc.compliance_status || 'pending',
      file_name: doc.file_name,
      file_size: doc.file_size,
      file_type: doc.file_type || 'application/pdf',
      file_path: doc.file_path,
      upload_progress: 100,
      tags: doc.tags || [],
      metadata: doc.metadata || {},
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      created_by: doc.created_by || 'system',
      updated_by: doc.updated_by || 'system',
      expiry_date: doc.expiry_date,
      signature_required: doc.signature_required || false,
      signature_status: doc.signature_status || 'pending',
      compliance_notes: doc.compliance_notes,
      access_level: doc.access_level || 'private',
      review_date: doc.review_date,
      archived: doc.is_archived || false
    }))

    // Calculate pagination info
    const total = count || 0
    const total_pages = Math.ceil(total / limit)

    return NextResponse.json({
      documents: transformedDocuments,
      total,
      page,
      limit,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1
    })

  } catch (error) {
    console.error('Documents API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to get client display name from your client structure
function getClientDisplayName(client: any): string {
  if (!client) return 'Unknown Client'
  
  const personalDetails = client.personal_details || {}
  const title = personalDetails.title ? `${personalDetails.title} ` : ''
  const firstName = personalDetails.firstName || personalDetails.first_name || ''
  const lastName = personalDetails.lastName || personalDetails.last_name || ''
  
  return `${title}${firstName} ${lastName}`.trim() || client.client_ref || 'Unknown Client'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firmId, userId } = await getCurrentUserContext()
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Document name is required' },
        { status: 400 }
      )
    }

    // ✅ REAL: Insert into your actual documents table
    const { data: newDocument, error } = await supabase
      .from('documents')
      .insert({
        name: body.name,
        description: body.description || '',
        category_id: body.category_id,
        client_id: body.client_id,
        firm_id: firmId,
        file_name: body.file_name || 'document.pdf',
        file_size: body.file_size || 0,
        file_type: body.file_type || 'application/pdf',
        file_path: body.file_path || '',
        status: 'pending',
        compliance_status: 'pending',
        tags: body.tags || [],
        metadata: body.metadata || {},
        created_by: userId,
        updated_by: userId,
        signature_required: body.signature_required || false,
        access_level: body.access_level || 'private',
        expiry_date: body.expiry_date,
        review_date: body.review_date
      })
      .select()
      .single()

    if (error) {
      console.error('Document creation error:', error)
      throw new Error(`Failed to create document: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      document: newDocument,
      message: 'Document created successfully'
    })

  } catch (error) {
    console.error('Document creation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create document',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
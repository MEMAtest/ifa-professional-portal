// src/app/api/documents/[id]/route.ts
// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logging/structured'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - Fetch single document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    log.info('Fetching document', { documentId })

    // Fetch document with related data
    const { data: document, error } = await supabase
      .from('documents')
      .select(`
        *,
        clients (
          id,
          client_ref,
          personal_details,
          contact_info
        )
      `)
      .eq('id', documentId)
      .single()

    if (error || !document) {
      log.error('Document fetch error:', error)
      return NextResponse.json(
        { 
          error: 'Document not found',
          details: error?.message 
        },
        { status: 404 }
      )
    }

    // Transform the response to ensure all required fields
    const transformedDocument = {
      id: document.id,
      name: document.name || 'Untitled Document',
      client_name: document.client_name || getClientName(document.clients),
      client_id: document.client_id,
      file_name: document.file_name,
      file_path: document.file_path,
      storage_path: document.storage_path,
      file_size: document.file_size || 0,
      file_type: document.file_type || 'pdf',
      mime_type: document.mime_type || 'application/pdf',
      type: document.type || document.document_type || 'document',
      category: document.category || 'General',
      document_type: document.document_type,
      status: document.status || 'completed',
      compliance_status: document.compliance_status || 'pending',
      created_at: document.created_at,
      updated_at: document.updated_at,
      metadata: document.metadata || {},
      description: document.description,
      assessment_version: document.assessment_version,
      version_number: document.version_number || 1,
      requires_signature: document.requires_signature || false,
      signature_status: document.signature_status,
      is_archived: document.is_archived || false,
      is_template: document.is_template || false,
      tags: document.tags || [],
      client: document.clients || null
    }

    log.info('Document fetched successfully', { documentId })
    return NextResponse.json(transformedDocument)

  } catch (error) {
    log.error('Document fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id
    const updates = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    log.info('Updating document', { documentId })

    // Remove fields that shouldn't be updated
    const { id, created_at, ...updateData } = updates

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      log.error('Document update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update document',
          details: error.message 
        },
        { status: 500 }
      )
    }

    log.info('Document updated successfully', { documentId })
    return NextResponse.json({
      success: true,
      document: document,
      message: 'Document updated successfully'
    })

  } catch (error) {
    log.error('Document update error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    log.info('Deleting document', { documentId })

    // First, get the document to find the file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path, storage_path')
      .eq('id', documentId)
      .single()

    if (fetchError) {
      log.error('Document fetch error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Document not found',
          details: fetchError.message 
        },
        { status: 404 }
      )
    }

    // Delete from storage if file exists
    if (document?.file_path) {
      try {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.file_path])
        
        if (storageError) {
          log.warn('Storage deletion error (non-critical)', { error: storageError })
        } else {
          log.info('File removed from storage', { documentId })
        }
      } catch (storageError) {
        log.warn('Storage deletion error (non-critical)', { error: storageError })
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      log.error('Document deletion error:', deleteError)
      return NextResponse.json(
        { 
          error: 'Failed to delete document',
          details: deleteError.message 
        },
        { status: 500 }
      )
    }

    log.info('Document deleted successfully', { documentId })
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    log.error('Document deletion error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to get client name
function getClientName(client: any): string {
  if (!client) return 'Unknown Client'
  
  const personalDetails = client.personal_details || {}
  const firstName = personalDetails.firstName || personalDetails.first_name || ''
  const lastName = personalDetails.lastName || personalDetails.last_name || ''
  const title = personalDetails.title || ''
  
  const fullName = `${title} ${firstName} ${lastName}`.trim()
  
  return fullName || client.client_ref || 'Unknown Client'
}
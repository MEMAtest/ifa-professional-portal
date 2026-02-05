// src/app/api/documents/[id]/route.ts
// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'

// GET - Fetch single document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const documentId = params.id
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    log.info('Fetching document', { documentId })

    const supabase = getSupabaseServiceClient()

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
      .eq('firm_id', firmId)
      .single()

    if (error || !document) {
      log.error('Document fetch error:', error)
      return NextResponse.json(
        { 
          error: 'Document not found'
        },
        { status: 404 }
      )
    }

    const doc = document as any

    // Transform the response to ensure all required fields
    const transformedDocument = {
      id: doc.id,
      name: doc.name || 'Untitled Document',
      client_name: doc.client_name || getClientName(doc.clients),
      client_id: doc.client_id,
      file_name: doc.file_name,
      file_path: doc.file_path,
      storage_path: doc.storage_path,
      file_size: doc.file_size || 0,
      file_type: doc.file_type || 'pdf',
      mime_type: doc.mime_type || 'application/pdf',
      type: doc.type || doc.document_type || 'document',
      category: doc.category || 'General',
      document_type: doc.document_type,
      status: doc.status || 'completed',
      compliance_status: doc.compliance_status || 'pending',
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      metadata: doc.metadata || {},
      description: doc.description,
      assessment_version: doc.assessment_version,
      version_number: doc.version_number || 1,
      requires_signature: doc.requires_signature || false,
      signature_status: doc.signature_status,
      is_archived: doc.is_archived || false,
      is_template: doc.is_template || false,
      tags: doc.tags || [],
      client: doc.clients || null
    }

    log.info('Document fetched successfully', { documentId })
    return NextResponse.json(transformedDocument)

  } catch (error) {
    log.error('Document fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch document'
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
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) {
      return permissionError
    }
    const { firmId } = firmResult

    const documentId = params.id
    const updates = await parseRequestBody(request)

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    log.info('Updating document', { documentId })

    const supabase = getSupabaseServiceClient()

    // Remove fields that shouldn't be updated
    const { id, created_at, firm_id, ...updateData } = updates

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('firm_id', firmId)
      .select()
      .single()

    if (error) {
      log.error('Document update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update document'
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
        error: 'Failed to update document'
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
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'documents:delete')
    if (permissionError) {
      return permissionError
    }
    const { firmId } = firmResult

    const documentId = params.id

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    log.info('Deleting document', { documentId })

    const supabase = getSupabaseServiceClient()

    // First, get the document to find the file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path, storage_path')
      .eq('id', documentId)
      .eq('firm_id', firmId)
      .single()

    if (fetchError) {
      log.error('Document fetch error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Document not found'
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
      .eq('firm_id', firmId)

    if (deleteError) {
      log.error('Document deletion error:', deleteError)
      return NextResponse.json(
        { 
          error: 'Failed to delete document'
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
        error: 'Failed to delete document'
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

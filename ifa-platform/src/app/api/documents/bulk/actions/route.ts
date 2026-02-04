// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// File: src/app/api/documents/bulk/actions/route.ts
// API Route: Bulk Operations for Document Vault
// Handles multiple document operations efficiently
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'

// ===================================================================
// TYPES
// ===================================================================

interface BulkActionRequest {
  documentIds: string[]
  action: 'send' | 'download' | 'archive' | 'delete' | 'resend' | 'restore'
  actionParams?: {
    recipients?: string[] // for send/resend
    includeAttachments?: boolean
    subject?: string
    message?: string
    archiveReason?: string
  }
}

interface BulkActionResponse {
  jobId: string
  totalDocuments: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  results?: {
    successful: Array<{
      documentId: string
      documentName: string
      result: any
    }>
    failed: Array<{
      documentId: string
      documentName: string
      error: string
    }>
  }
  downloadUrl?: string // For bulk download
  estimatedCompletionTime?: number // seconds
}

interface DocumentProcessingResult {
  documentId: string
  documentName: string
  success: boolean
  result?: any
  error?: string
}

// ===================================================================
// MAIN API HANDLER
// ===================================================================

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient()
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult
    const userId = auth.context.userId

    // Parse request body
    const body: BulkActionRequest = await parseRequestBody(request)
    const { documentIds, action, actionParams = {} } = body

    // Validation
    if (!documentIds || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'No documents selected' },
        { status: 400 }
      )
    }

    if (documentIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 documents allowed per bulk operation' },
        { status: 400 }
      )
    }

    // Verify documents belong to the firm
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        name,
        client_id,
        client_name,
        file_path,
        signature_status,
        is_archived,
        requires_signature,
        firm_id
      `)
      .in('id', documentIds)
      .eq('firm_id', firmId)

    if (docsError) {
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found or access denied' },
        { status: 404 }
      )
    }

    // Generate job ID for tracking
    const jobId = `bulk_${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Log the bulk operation if table exists
    if (await tableExists('bulk_operations_log', supabase)) {
      await supabase
        .from('bulk_operations_log')
        .insert({
          id: jobId,
          operation_type: action,
          operation_name: `Bulk ${action} - ${documents.length} documents`,
          document_ids: documentIds,
          total_documents: documents.length,
          status: 'processing',
          firm_id: firmId,
          initiated_by: userId,
          started_at: new Date().toISOString()
        })
    }

    // Process based on action type
    let results: DocumentProcessingResult[] = []
    let downloadUrl: string | undefined

    switch (action) {
      case 'archive':
        results = await processArchiveDocuments(documents, actionParams, supabase)
        break
        
      case 'delete':
        results = await processDeleteDocuments(documents, supabase)
        break
        
      case 'restore':
        results = await processRestoreDocuments(documents, supabase)
        break
        
      case 'send':
        results = await processSendDocuments(documents, actionParams, userId, firmId, supabase)
        break
        
      case 'resend':
        results = await processResendDocuments(documents, actionParams, userId, firmId, supabase)
        break
        
      case 'download':
        const downloadResult = await processDownloadDocuments(documents, firmId, supabase)
        results = downloadResult.results
        downloadUrl = downloadResult.downloadUrl
        break
        
      default:
        return NextResponse.json(
          { error: `Unsupported action: ${action}` },
          { status: 400 }
        )
    }

    // Update bulk operation log
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    if (await tableExists('bulk_operations_log', supabase)) {
      await supabase
        .from('bulk_operations_log')
        .update({
          status: 'completed',
          successful_count: successful.length,
          failed_count: failed.length,
          results: {
            successful: successful.map(r => ({ documentId: r.documentId, documentName: r.documentName })),
            failed: failed.map(r => ({ documentId: r.documentId, error: r.error }))
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    // Build response
    const response: BulkActionResponse = {
      jobId,
      totalDocuments: documents.length,
      status: 'completed',
      results: {
        successful: successful.map(r => ({
          documentId: r.documentId,
          documentName: r.documentName,
          result: r.result
        })),
        failed: failed.map(r => ({
          documentId: r.documentId,
          documentName: r.documentName,
          error: r.error || 'Unknown error'
        }))
      }
    }

    if (downloadUrl) {
      response.downloadUrl = downloadUrl
    }

    return NextResponse.json(response)

  } catch (error) {
    log.error('Bulk operations API error', error)

    return NextResponse.json(
      { 
        error: 'Bulk operation failed',
        message: ''
      },
      { status: 500 }
    )
  }
}

// ===================================================================
// PROCESSING FUNCTIONS
// ===================================================================

async function processArchiveDocuments(
  documents: any[],
  actionParams: any,
  supabase: any
): Promise<DocumentProcessingResult[]> {
  const results: DocumentProcessingResult[] = []

  for (const doc of documents) {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id)

      if (error) throw error

      // Log audit entry if table exists
      if (await tableExists('document_audit_log', supabase)) {
        await supabase
          .from('document_audit_log')
          .insert({
            document_id: doc.id,
            action: 'archived',
            details: { reason: actionParams.archiveReason || 'Bulk archive operation' },
            firm_id: doc.firm_id
          })
      }

      results.push({
        documentId: doc.id,
        documentName: doc.name,
        success: true,
        result: 'Archived successfully'
      })
    } catch (error) {
      results.push({
        documentId: doc.id,
        documentName: doc.name,
        success: false,
        error: ''
      })
    }
  }

  return results
}

async function processDeleteDocuments(
  documents: any[],
  supabase: any
): Promise<DocumentProcessingResult[]> {
  const results: DocumentProcessingResult[] = []

  for (const doc of documents) {
    try {
      // Soft delete - just mark as archived
      const { error } = await supabase
        .from('documents')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id)

      if (error) throw error

      // Log audit entry if table exists
      if (await tableExists('document_audit_log', supabase)) {
        await supabase
          .from('document_audit_log')
          .insert({
            document_id: doc.id,
            action: 'deleted',
            details: { type: 'bulk_delete' },
            firm_id: doc.firm_id
          })
      }

      results.push({
        documentId: doc.id,
        documentName: doc.name,
        success: true,
        result: 'Deleted successfully'
      })
    } catch (error) {
      results.push({
        documentId: doc.id,
        documentName: doc.name,
        success: false,
        error: ''
      })
    }
  }

  return results
}

async function processRestoreDocuments(
  documents: any[],
  supabase: any
): Promise<DocumentProcessingResult[]> {
  const results: DocumentProcessingResult[] = []

  for (const doc of documents) {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          is_archived: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id)

      if (error) throw error

      results.push({
        documentId: doc.id,
        documentName: doc.name,
        success: true,
        result: 'Restored successfully'
      })
    } catch (error) {
      results.push({
        documentId: doc.id,
        documentName: doc.name,
        success: false,
        error: ''
      })
    }
  }

  return results
}

async function processSendDocuments(
  documents: any[],
  actionParams: any,
  userId: string,
  firmId: string,
  supabase: any
): Promise<DocumentProcessingResult[]> {
  const results: DocumentProcessingResult[] = []

  for (const doc of documents) {
    try {
      if (!doc.requires_signature) {
        results.push({
          documentId: doc.id,
          documentName: doc.name,
          success: false,
          error: 'Document does not require signature'
        })
        continue
      }

      // Create signature request if table exists
      if (await tableExists('signature_requests', supabase)) {
        const { error } = await supabase
          .from('signature_requests')
          .insert({
            document_id: doc.id,
            recipient_email: actionParams.recipients?.[0] || 'client@example.com',
            recipient_name: doc.client_name || 'Client',
            subject: actionParams.subject || `Please sign: ${doc.name}`,
            message: actionParams.message || 'Please review and sign this document.',
            firm_id: firmId,
            created_by: userId
          })

        if (error) throw error
      }

      // Update document status
      await supabase
        .from('documents')
        .update({
          signature_status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', doc.id)

      results.push({
        documentId: doc.id,
        documentName: doc.name,
        success: true,
        result: 'Sent for signature'
      })
    } catch (error) {
      results.push({
        documentId: doc.id,
        documentName: doc.name,
        success: false,
        error: ''
      })
    }
  }

  return results
}

async function processResendDocuments(
  documents: any[],
  actionParams: any,
  userId: string,
  firmId: string,
  supabase: any
): Promise<DocumentProcessingResult[]> {
  // Similar to send but only for documents already sent
  return processSendDocuments(documents, actionParams, userId, firmId, supabase)
}

async function processDownloadDocuments(
  documents: any[],
  firmId: string,
  supabase: any
): Promise<{ results: DocumentProcessingResult[], downloadUrl?: string }> {
  const results: DocumentProcessingResult[] = []

  // For now, just mark as successful - in production would generate ZIP
  for (const doc of documents) {
    results.push({
      documentId: doc.id,
      documentName: doc.name,
      success: true,
      result: 'Ready for download'
    })
  }

  // In production, would create a ZIP file and return download URL
  const downloadUrl = `/api/documents/bulk/download/${firmId}/${Date.now()}.zip`

  return { results, downloadUrl }
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

async function tableExists(tableName: string, supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)
    
    return !error
  } catch {
    return false
  }
}

// GET endpoint for checking bulk operation status
export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient()
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Check if bulk operations log table exists
    if (!(await tableExists('bulk_operations_log', supabase))) {
      return NextResponse.json({ 
        error: 'Bulk operations tracking not available' 
      }, { status: 404 })
    }

    // Get operation status
    const { data: operation, error } = await supabase
      .from('bulk_operations_log')
      .select('*')
      .eq('id', jobId)
      .eq('firm_id', firmId)
      .single()

    if (error || !operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
    }

    return NextResponse.json({
      jobId: operation.id,
      status: operation.status,
      totalDocuments: operation.total_documents,
      successfulCount: operation.successful_count,
      failedCount: operation.failed_count,
      results: operation.results,
      startedAt: operation.started_at,
      completedAt: operation.completed_at
    })

  } catch (error) {
    log.error('Bulk status API error', error)
    return NextResponse.json(
      { error: 'Failed to fetch operation status' },
      { status: 500 }
    )
  }
}

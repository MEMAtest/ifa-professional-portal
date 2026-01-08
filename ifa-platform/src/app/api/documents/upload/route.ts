// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { log } from '@/lib/logging/structured'

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file types for upload
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif'
]

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthContext(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const firmId = auth.context?.firmId
    const userId = auth.context?.userId

    // If no firmId, allow upload but log warning
    if (!firmId) {
      log.warn('Document upload without firmId', { userId })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string | null
    const description = formData.get('description') as string | null
    const categoryId = formData.get('category_id') as string | null
    const clientId = formData.get('client_id') as string | null
    const complianceLevel = formData.get('compliance_level') as string | null
    const tagsStr = formData.get('tags') as string | null
    const metadataStr = formData.get('metadata') as string | null

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Document name is required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type (server-side security)
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type '${file.type}' is not allowed. Allowed types: PDF, DOC, DOCX, TXT, PNG, JPG, GIF` },
        { status: 400 }
      )
    }

    // Parse optional JSON fields
    let tags: string[] = []
    let metadata: Record<string, unknown> = {}

    if (tagsStr) {
      try {
        tags = JSON.parse(tagsStr)
      } catch {
        // Ignore parse errors, use empty array
      }
    }

    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr)
      } catch {
        // Ignore parse errors, use empty object
      }
    }

    // Create Supabase client
    const supabase = await createClient()

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = firmId
      ? `firms/${firmId}/documents/${timestamp}-${sanitizedFileName}`
      : `uploads/${userId || 'anonymous'}/${timestamp}-${sanitizedFileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      })

    if (uploadError) {
      log.error('Document upload to storage failed', { error: uploadError.message, filePath })
      return NextResponse.json(
        { success: false, error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Determine document type from mime type
    const getDocumentType = (mimeType: string): string => {
      if (mimeType.includes('pdf')) return 'pdf'
      if (mimeType.includes('word') || mimeType.includes('document')) return 'word'
      if (mimeType.includes('image')) return 'image'
      if (mimeType.includes('text')) return 'text'
      return 'upload'
    }

    const documentType = getDocumentType(file.type || '')

    // Create document record in database - using minimal columns that exist
    const documentData: Record<string, unknown> = {
      name,
      description: description || '',
      category: documentType,
      category_id: categoryId || null,
      client_id: clientId || null,
      firm_id: firmId || null,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      file_path: filePath,
      type: documentType,
      document_type: documentType,
      status: 'pending',
      compliance_status: complianceLevel || 'pending',
      tags,
      metadata,
      created_by: userId
    }

    const { data: newDocument, error: dbError } = await supabase
      .from('documents')
      .insert(documentData)
      .select(`
        *,
        document_categories(
          id,
          name,
          description
        ),
        clients(
          id,
          client_ref,
          personal_details
        )
      `)
      .single()

    if (dbError) {
      log.error('Document record creation failed', { error: dbError.message })

      // Try to clean up the uploaded file
      await supabase.storage.from('documents').remove([filePath])

      return NextResponse.json(
        { success: false, error: `Failed to create document record: ${dbError.message}` },
        { status: 500 }
      )
    }

    // Transform response to match frontend expectations
    const document = {
      id: newDocument.id,
      name: newDocument.name,
      description: newDocument.description,
      category: newDocument.document_categories || null,
      type: newDocument.document_categories?.name || 'other',
      client_name: getClientDisplayName(newDocument.clients),
      client_id: newDocument.client_id,
      status: newDocument.status,
      compliance_status: newDocument.compliance_status,
      file_name: newDocument.file_name,
      file_size: newDocument.file_size,
      file_type: newDocument.file_type,
      file_path: newDocument.file_path,
      file_url: urlData?.publicUrl,
      upload_progress: 100,
      tags: newDocument.tags || [],
      metadata: newDocument.metadata || {},
      created_at: newDocument.created_at,
      updated_at: newDocument.updated_at,
      created_by: newDocument.created_by
    }

    log.info('Document uploaded successfully', {
      documentId: newDocument.id,
      fileName: file.name,
      fileSize: file.size
    })

    return NextResponse.json({
      success: true,
      document,
      message: 'Document uploaded successfully'
    })

  } catch (error) {
    log.error('Document upload error', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      },
      { status: 500 }
    )
  }
}

// Helper function to get client display name
function getClientDisplayName(client: Record<string, unknown> | null): string {
  if (!client) return ''

  const personalDetails = (client.personal_details || {}) as Record<string, string>
  const title = personalDetails.title ? `${personalDetails.title} ` : ''
  const firstName = personalDetails.firstName || personalDetails.first_name || ''
  const lastName = personalDetails.lastName || personalDetails.last_name || ''

  return `${title}${firstName} ${lastName}`.trim() || (client.client_ref as string) || ''
}

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { log } from '@/lib/logging/structured'

// Max file size: 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024

// Allowed file types for upload
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-outlook',
  'message/rfc822',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif'
]

// File extensions allowed when MIME type is application/octet-stream
// (browsers often can't detect MIME for these formats)
const ALLOWED_EXTENSIONS_FOR_OCTET_STREAM = [
  '.msg', '.eml', '.doc', '.docx', '.xlsx', '.pdf', '.txt'
]

function resolveEffectiveMimeType(file: File): string {
  const mime = file.type || 'application/octet-stream'
  if (mime === 'application/octet-stream' && file.name) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    const extToMime: Record<string, string> = {
      '.msg': 'application/vnd.ms-outlook',
      '.eml': 'message/rfc822',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    }
    return extToMime[ext] || mime
  }
  return mime
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // TODO: Add requirePermission(auth.context, 'documents:write') once RLS
    // and profile resolution are fixed. Currently the profiles table is
    // unreadable via RLS and the auth user ID may not match a profile row,
    // so role is always null. The rest of the app has the same limitation.

    const firmId = auth.context.firmId
    const userId = auth.context.userId

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

    // Resolve effective MIME type (handles octet-stream for .msg, etc.)
    const effectiveMimeType = resolveEffectiveMimeType(file)

    // Validate file type (server-side security)
    if (effectiveMimeType && effectiveMimeType !== 'application/octet-stream' && !ALLOWED_MIME_TYPES.includes(effectiveMimeType)) {
      return NextResponse.json(
        { success: false, error: `File type '${effectiveMimeType}' is not allowed. Allowed types: PDF, DOC, DOCX, XLSX, MSG, EML, TXT, PNG, JPG, GIF` },
        { status: 400 }
      )
    }

    // Reject octet-stream files without a recognized extension
    if (effectiveMimeType === 'application/octet-stream') {
      const ext = file.name ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
      if (!ALLOWED_EXTENSIONS_FOR_OCTET_STREAM.includes(ext)) {
        return NextResponse.json(
          { success: false, error: `File type could not be determined and extension '${ext}' is not allowed. Allowed types: PDF, DOC, DOCX, XLSX, MSG, EML, TXT, PNG, JPG, GIF` },
          { status: 400 }
        )
      }
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

    // Use service client to bypass storage/RLS restrictions
    const supabase = getSupabaseServiceClient()

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
        contentType: effectiveMimeType,
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
      if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet'
      if (mimeType.includes('outlook') || mimeType.includes('msg') || mimeType.includes('rfc822')) return 'email'
      if (mimeType.includes('text')) return 'text'
      return 'upload'
    }

    const documentType = getDocumentType(effectiveMimeType)

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
      file_type: effectiveMimeType,
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
      .insert(documentData as any)
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
    const doc = newDocument as any
    const document = {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      category: doc.document_categories || null,
      type: doc.document_categories?.name || 'other',
      client_name: getClientDisplayName(doc.clients),
      client_id: doc.client_id,
      status: doc.status,
      compliance_status: doc.compliance_status,
      file_name: doc.file_name,
      file_size: doc.file_size,
      file_type: doc.file_type,
      file_path: doc.file_path,
      file_url: urlData?.publicUrl,
      upload_progress: 100,
      tags: doc.tags || [],
      metadata: doc.metadata || {},
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      created_by: doc.created_by
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

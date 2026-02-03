// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requirePermission } from '@/lib/auth/apiAuth'
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

function sniffMagic(buffer: Buffer): 'pdf' | 'png' | 'jpeg' | 'gif' | 'zip' | 'ole' | null {
  if (buffer.length < 4) return null
  const b0 = buffer[0]
  const b1 = buffer[1]
  const b2 = buffer[2]
  const b3 = buffer[3]

  // PDF: %PDF-
  if (b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46) return 'pdf'
  // PNG: 89 50 4E 47
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return 'png'
  // JPEG: FF D8 FF
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return 'jpeg'
  // GIF: GIF8
  if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46 && b3 === 0x38) return 'gif'
  // ZIP (docx/xlsx): 50 4B 03 04
  if (b0 === 0x50 && b1 === 0x4b && b2 === 0x03 && b3 === 0x04) return 'zip'
  // OLE compound (doc/msg): D0 CF 11 E0
  if (b0 === 0xd0 && b1 === 0xcf && b2 === 0x11 && b3 === 0xe0) return 'ole'

  return null
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

    const permissionError = requirePermission(auth.context, 'documents:write')
    if (permissionError) {
      return permissionError
    }

    const firmId = auth.context.firmId
    const userId = auth.context.userId

    // Firm context is mandatory for document uploads
    if (!firmId) {
      log.warn('Document upload blocked: missing firmId', { userId })
      return NextResponse.json(
        { success: false, error: 'Firm context required' },
        { status: 403 }
      )
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

    // Magic-byte validation for common types
    const magic = sniffMagic(buffer)
    const extension = file.name ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
    const isDocxOrXlsx = extension === '.docx' || extension === '.xlsx'
    const isDocOrMsg = extension === '.doc' || extension === '.msg'

    if (effectiveMimeType === 'application/pdf' && magic !== 'pdf') {
      return NextResponse.json({ success: false, error: 'File signature does not match PDF format' }, { status: 400 })
    }
    if (effectiveMimeType === 'image/png' && magic !== 'png') {
      return NextResponse.json({ success: false, error: 'File signature does not match PNG format' }, { status: 400 })
    }
    if ((effectiveMimeType === 'image/jpeg' || effectiveMimeType === 'image/jpg') && magic !== 'jpeg') {
      return NextResponse.json({ success: false, error: 'File signature does not match JPEG format' }, { status: 400 })
    }
    if (effectiveMimeType === 'image/gif' && magic !== 'gif') {
      return NextResponse.json({ success: false, error: 'File signature does not match GIF format' }, { status: 400 })
    }
    if (
      (effectiveMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        effectiveMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        isDocxOrXlsx) &&
      magic !== 'zip'
    ) {
      return NextResponse.json({ success: false, error: 'File signature does not match Office Open XML format' }, { status: 400 })
    }
    if ((effectiveMimeType === 'application/msword' || effectiveMimeType === 'application/vnd.ms-outlook' || isDocOrMsg) && magic !== 'ole') {
      return NextResponse.json({ success: false, error: 'File signature does not match legacy Office format' }, { status: 400 })
    }

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
        { success: false, error: 'Failed to upload file' },
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
        { success: false, error: 'Failed to create document record' },
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
        error: 'Upload failed'
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

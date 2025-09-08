// services/documentService.ts
// FIXED: Uses the correct client-side Supabase helper and types.

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// Type aliases for better readability
type Tables = Database['public']['Tables']
type DocumentRow = Tables['documents']['Row']
type DocumentInsert = Tables['documents']['Insert']
type DocumentUpdate = Tables['documents']['Update']
type CategoryRow = Tables['document_categories']['Row']
type SignatureRequestRow = Tables['signature_requests']['Row']
type SignatureRequestInsert = Tables['signature_requests']['Insert']

// Don't extend DocumentRow directly to avoid conflicts
// Create a clean interface that represents what we actually work with
export interface Document {
  // All fields from DocumentRow
  id: string
  assessment_id: string | null
  assessment_version: number | null
  category: string  // This stays as string from the database
  category_id: string | null
  client_id: string | null
  client_name: string | null
  compliance_status: string | null
  created_at: string | null
  created_by: string | null
  description: string | null
  document_type: string | null
  docuseal_submission_id: string | null
  docuseal_template_id: string | null
  file_name: string
  file_path: string | null
  file_size: number | null
  file_type: string | null
  firm_id: string
  is_archived: boolean | null
  is_template: boolean | null
  last_modified_by: string | null
  metadata: any
  mime_type: string | null
  name: string
  requires_signature: boolean | null
  signature_request_id: string | null
  signature_status: string | null
  signed_at: string | null
  storage_path: string
  tags: string[] | null
  type: string
  updated_at: string | null
  version_number: number | null
  
  // Joined data - this is the actual joined category data
  document_categories?: CategoryRow | null
}

export interface DocumentCategory extends CategoryRow {}

export interface DocumentUpload {
  file: File
  title: string
  description?: string
  clientId?: string
  clientName?: string
  categoryId?: string
  tags?: string[]
}

export interface SignatureRequest extends SignatureRequestRow {}

export interface DocumentAnalytics {
  totalDocuments: number
  pendingSignatures: number
  completedSignatures: number
  documentsThisMonth: number
  complianceScore: number
  storageUsed: number
  recentActivity: Array<{
    id: string
    action: string
    document_title: string
    user_name: string
    created_at: string
  }>
}

export class DocumentService {
  private supabase: SupabaseClient<Database>

  constructor() {
    this.supabase = createClient()
  }

  // ROBUST authentication and firm context handling
  private async getCurrentUserContext() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) {
        console.error('Auth error:', error)
        throw new Error(`Authentication error: ${error.message}`)
      }

      if (!user) {
        throw new Error('No authenticated user found. Please log in.')
      }

      // Try multiple sources for firm_id
      let firmId: string | null = null
      
      // 1. Check user metadata
      if (user.user_metadata?.firm_id) {
        firmId = user.user_metadata.firm_id
      }
      
      // 2. Check raw user metadata
      if (!firmId && user.user_metadata?.firmId) {
        firmId = user.user_metadata.firmId
      }
      
      // 3. Check profiles table
      if (!firmId) {
        const { data: profile } = await this.supabase
          .from('profiles')
          .select('firm_id')
          .eq('id', user.id)
          .single()
        
        if (profile?.firm_id) {
          firmId = profile.firm_id
        }
      }
      
      // 4. For development/testing - use a default firm_id
      if (!firmId) {
        console.warn('No firm_id found, using default for development')
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

  // Get documents with proper error handling
  async getDocuments(): Promise<Document[]> {
    try {
      console.log('Getting documents...')
      const { user, firmId } = await this.getCurrentUserContext()
      console.log('User context:', { userId: user.id, firmId })

      const { data, error } = await this.supabase
        .from('documents')
        .select(`
          *,
          document_categories!category_id (
            id,
            name,
            requires_signature,
            compliance_level
          )
        `)
        .eq('firm_id', firmId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Supabase query error:', error)
        throw new Error(`Database query failed: ${error.message}`)
      }

      console.log(`Successfully fetched ${data?.length || 0} documents`)
      // Cast as any first to bypass the type checking, then to Document[]
      return (data as any) || []
    } catch (error) {
      console.error('Get documents error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      throw new Error(`Failed to fetch documents: ${errorMessage}`)
    }
  }

  // Get document categories
  async getDocumentCategories(): Promise<DocumentCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('document_categories')
        .select('*')
        .order('name')

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }

      return (data || []) as DocumentCategory[]
    } catch (error) {
      console.error('Get categories error:', error)
      throw error
    }
  }

  // Upload document with robust error handling
  async uploadDocument(uploadData: DocumentUpload): Promise<Document> {
    try {
      console.log('Starting document upload...')
      const { user, firmId } = await this.getCurrentUserContext()
      
      // 1. Upload file to Supabase storage
      const fileName = `${Date.now()}-${uploadData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${firmId}/${fileName}`

      console.log('Uploading file to storage:', filePath)
      const { data: uploadResult, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, uploadData.file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`File upload failed: ${uploadError.message}`)
      }

      console.log('File uploaded successfully:', uploadResult.path)

      // 2. Create document record - matching database schema exactly
      const documentData: DocumentInsert = {
        name: uploadData.title,  // 'name' is required
        type: uploadData.file.type || 'document',  // 'type' is required
        category: 'general',  // 'category' is required (string)
        storage_path: uploadResult.path,  // 'storage_path' is required
        description: uploadData.description || null,
        file_path: uploadResult.path,
        file_name: uploadData.file.name,
        file_size: uploadData.file.size,
        file_type: uploadData.file.type,
        client_id: uploadData.clientId || null,
        client_name: uploadData.clientName || null,
        category_id: uploadData.categoryId || null,
        firm_id: firmId,
        created_by: user.id,
        tags: uploadData.tags || [],
        compliance_status: 'pending',
        is_archived: false,
        metadata: {}
      }

      console.log('Creating document record:', documentData)
      const { data: document, error: dbError } = await this.supabase
        .from('documents')
        .insert(documentData)
        .select(`
          *,
          document_categories!category_id (
            id,
            name,
            requires_signature,
            compliance_level
          )
        `)
        .single()

      if (dbError) {
        console.error('Database insert error:', dbError)
        // Clean up uploaded file if database insert fails
        await this.supabase.storage
          .from('documents')
          .remove([uploadResult.path])
        
        throw new Error(`Database insert failed: ${dbError.message}`)
      }

      console.log('Document created successfully:', document.id)

      // 3. Log audit trail (don't fail if this fails)
      try {
        await this.logAuditEvent(document.id, 'created', {
          file_name: uploadData.file.name,
          file_size: uploadData.file.size,
          client_name: uploadData.clientName
        })
      } catch (auditError) {
        console.warn('Audit log failed:', auditError)
      }

      return document as any
    } catch (error) {
      console.error('Upload document error:', error)
      throw error
    }
  }

  // Get document by ID
  async getDocument(id: string): Promise<Document> {
    try {
      const { firmId } = await this.getCurrentUserContext()

      const { data, error } = await this.supabase
        .from('documents')
        .select(`
          *,
          document_categories!category_id (
            id,
            name,
            requires_signature,
            compliance_level
          )
        `)
        .eq('id', id)
        .eq('firm_id', firmId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch document: ${error.message}`)
      }

      if (!data) {
        throw new Error('Document not found')
      }

      return data as any
    } catch (error) {
      console.error('Get document error:', error)
      throw error
    }
  }

  // Update document
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    try {
      const { firmId } = await this.getCurrentUserContext()

      // Filter out joined data and non-updatable fields
      const { document_categories, ...updateData } = updates

      const documentUpdate: DocumentUpdate = {
        ...updateData,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('documents')
        .update(documentUpdate)
        .eq('id', id)
        .eq('firm_id', firmId)
        .select(`
          *,
          document_categories!category_id (
            id,
            name,
            requires_signature,
            compliance_level
          )
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update document: ${error.message}`)
      }

      // Log audit trail
      try {
        await this.logAuditEvent(id, 'updated', updateData)
      } catch (auditError) {
        console.warn('Audit log failed:', auditError)
      }

      return data as any
    } catch (error) {
      console.error('Update document error:', error)
      throw error
    }
  }

  // Delete document (soft delete)
  async deleteDocument(id: string): Promise<void> {
    try {
      const { firmId } = await this.getCurrentUserContext()

      const updateData: DocumentUpdate = {
        is_archived: true,
        updated_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('documents')
        .update(updateData)
        .eq('id', id)
        .eq('firm_id', firmId)

      if (error) {
        throw new Error(`Failed to delete document: ${error.message}`)
      }

      // Log audit trail
      try {
        await this.logAuditEvent(id, 'deleted', {})
      } catch (auditError) {
        console.warn('Audit log failed:', auditError)
      }
    } catch (error) {
      console.error('Delete document error:', error)
      throw error
    }
  }

  // Get download URL for document
  async getDownloadUrl(filePath: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600) // 1 hour expiry

      if (error) {
        throw new Error(`Failed to create download URL: ${error.message}`)
      }

      return data.signedUrl
    } catch (error) {
      console.error('Get download URL error:', error)
      throw error
    }
  }

  // Get signature requests for a document
  async getSignatureRequests(documentId?: string): Promise<SignatureRequest[]> {
    try {
      const { firmId } = await this.getCurrentUserContext()

      let query = this.supabase
        .from('signature_requests')
        .select('*')
        .eq('firm_id', firmId)

      if (documentId) {
        query = query.eq('document_id', documentId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch signature requests: ${error.message}`)
      }

      return (data || []) as SignatureRequest[]
    } catch (error) {
      console.error('Get signature requests error:', error)
      throw error
    }
  }

  // Create signature request
  async createSignatureRequest(request: {
    documentId: string
    recipientEmail: string
    recipientName: string
    templateId?: string
    expiresInDays?: number
  }): Promise<SignatureRequest> {
    try {
      const { user, firmId } = await this.getCurrentUserContext()

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (request.expiresInDays || 30))

      const signatureData: SignatureRequestInsert = {
        document_id: request.documentId,
        recipient_email: request.recipientEmail,
        recipient_name: request.recipientName,
        docuseal_template_id: request.templateId,
        expires_at: expiresAt.toISOString(),
        firm_id: firmId,
        created_by: user.id
      }

      const { data, error } = await this.supabase
        .from('signature_requests')
        .insert(signatureData)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create signature request: ${error.message}`)
      }

      // TODO: Integrate with DocuSeal API here

      return data as SignatureRequest
    } catch (error) {
      console.error('Create signature request error:', error)
      throw error
    }
  }

  // Get analytics data for dashboard
  async getDocumentAnalytics(): Promise<DocumentAnalytics> {
    try {
      const { firmId } = await this.getCurrentUserContext()

      // Get basic document counts
      const { data: documents, error: docsError } = await this.supabase
        .from('documents')
        .select('id, created_at, compliance_status')
        .eq('firm_id', firmId)
        .eq('is_archived', false)

      if (docsError) {
        throw new Error(`Failed to fetch document analytics: ${docsError.message}`)
      }

      // Get signature request counts
      const { data: signatures, error: sigsError } = await this.supabase
        .from('signature_requests')
        .select('id, docuseal_status')
        .eq('firm_id', firmId)

      if (sigsError) {
        console.warn('Failed to fetch signature analytics:', sigsError)
      }

      const currentMonth = new Date()
      currentMonth.setDate(1)

      const documentsThisMonth = documents?.filter((doc) => 
        new Date(doc.created_at!) >= currentMonth
      ).length || 0

      const pendingSignatures = signatures?.filter((sig) => 
        sig.docuseal_status === 'pending' || sig.docuseal_status === 'sent'
      ).length || 0

      const completedSignatures = signatures?.filter((sig) => 
        sig.docuseal_status === 'completed'
      ).length || 0

      // Calculate compliance score (simplified)
      const totalDocs = documents?.length || 0
      const reviewedDocs = documents?.filter((doc) => 
        doc.compliance_status === 'approved'
      ).length || 0
      const complianceScore = totalDocs > 0 ? Math.round((reviewedDocs / totalDocs) * 100) : 100

      // Get recent activity
      let recentActivity: any[] = []
      try {
        const { data: activity } = await this.supabase
          .from('document_audit_log')
          .select('id, action, created_at, document_id')
          .eq('firm_id', firmId)
          .order('created_at', { ascending: false })
          .limit(5)

        recentActivity = (activity || []).map((item) => ({
          id: item.id,
          action: item.action,
          document_title: 'Document',
          user_name: 'User',
          created_at: item.created_at!
        }))
      } catch (activityError) {
        console.warn('Failed to fetch recent activity:', activityError)
      }

      return {
        totalDocuments: totalDocs,
        pendingSignatures,
        completedSignatures,
        documentsThisMonth,
        complianceScore,
        storageUsed: 0, // TODO: Calculate from file sizes
        recentActivity
      }
    } catch (error) {
      console.error('Get analytics error:', error)
      throw error
    }
  }

  // Search documents
  async searchDocuments(query: string, filters?: {
    categoryId?: string
    clientId?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<Document[]> {
    try {
      const { firmId } = await this.getCurrentUserContext()

      let queryBuilder = this.supabase
        .from('documents')
        .select(`
          *,
          document_categories!category_id (
            id,
            name,
            requires_signature,
            compliance_level
          )
        `)
        .eq('firm_id', firmId)
        .eq('is_archived', false)

      // Text search
      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%,client_name.ilike.%${query}%`)
      }

      // Apply filters
      if (filters?.categoryId) {
        queryBuilder = queryBuilder.eq('category_id', filters.categoryId)
      }
      if (filters?.clientId) {
        queryBuilder = queryBuilder.eq('client_id', filters.clientId)
      }
      if (filters?.status) {
        queryBuilder = queryBuilder.eq('compliance_status', filters.status)
      }
      if (filters?.dateFrom) {
        queryBuilder = queryBuilder.gte('created_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        queryBuilder = queryBuilder.lte('created_at', filters.dateTo)
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        throw new Error(`Search failed: ${error.message}`)
      }

      return (data as any) || []
    } catch (error) {
      console.error('Search documents error:', error)
      throw error
    }
  }

  // Log audit events (non-critical)
  private async logAuditEvent(documentId: string, action: string, details: Record<string, any>): Promise<void> {
    try {
      const { user, firmId } = await this.getCurrentUserContext()

      // Using the correct table structure from database.types
      const auditData = {
        document_id: documentId,
        action,
        details,
        user_id: user.id,
        firm_id: firmId,
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      }

      await this.supabase
        .from('document_audit_log')
        .insert(auditData)
    } catch (error) {
      // Don't throw on audit log failures, just log them
      console.error('Audit log error:', error)
    }
  }
}

// Create singleton instance
export const documentService = new DocumentService()
export default documentService
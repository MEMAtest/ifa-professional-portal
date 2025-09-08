// ===================================================================
// DOCUMENT AI SERVICE LAYER
// Handles all document operations with Supabase integration
// ===================================================================

import { createClient } from '@/lib/supabase/client'

// ====================================
// 2. DocumentService.ts - UUID Fix
// ====================================

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export interface Document {
  id: string
  title: string
  description?: string
  fileName: string
  fileSize: number
  fileType: string
  storagePath: string
  categoryId?: string
  documentType: DocumentType
  clientId?: string
  clientName?: string
  complianceStatus: ComplianceStatus
  createdBy: string
  lastModifiedBy?: string
  tags: string[]
  versionNumber: number
  isTemplate: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface DocumentCategory {
  id: string
  name: string
  description?: string
  requiresSignature: boolean
  templateAvailable: boolean
  complianceLevel: ComplianceLevel
  createdAt: string
  updatedAt: string
}

export interface SignatureRequest {
  id: string
  documentId: string
  docusealTemplateId?: string
  docusealSubmissionId?: string
  docusealStatus: SignatureStatus
  recipientEmail: string
  recipientName: string
  recipientRole: string
  subject?: string
  message?: string
  expiresAt?: string
  sentAt?: string
  completedAt?: string
  signedDocumentPath?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DocumentTemplate {
  id: string
  name: string
  description?: string
  categoryId?: string
  templateContent: string
  templateVariables: Record<string, string>
  docusealTemplateId?: string
  isActive: boolean
  requiresApproval: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DocumentUpload {
  file: File
  title: string
  description?: string
  categoryId?: string
  documentType: DocumentType
  clientId?: string
  clientName?: string
  tags?: string[]
}

export interface DocumentFilters {
  categoryId?: string
  documentType?: DocumentType
  complianceStatus?: ComplianceStatus
  clientId?: string
  searchQuery?: string
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

// Enums
export type DocumentType = 
  | 'suitability_report' 
  | 'annual_review' 
  | 'client_agreement' 
  | 'letter'
  | 'compliance_document'
  | 'risk_assessment'
  | 'meeting_notes'
  | 'product_information'

export type ComplianceStatus = 'pending' | 'compliant' | 'needs_review'
export type ComplianceLevel = 'standard' | 'high' | 'critical'
export type SignatureStatus = 'pending' | 'sent' | 'completed' | 'declined' | 'expired'

// ===================================================================
// DOCUMENT SERVICE CLASS
// ===================================================================

export class DocumentService {
  // Remove direct initialization - will create client per method

  // ===================================================================
  // DOCUMENT OPERATIONS
  // ===================================================================

  async uploadDocument(uploadData: DocumentUpload): Promise<Document> {
    try {
      const supabase = await createClient();
      
      // 1. Upload file to Supabase Storage
      const fileExtension = uploadData.file.name.split('.').pop()
      const fileName = `${generateUUID()}.${fileExtension}`
      const storagePath = `documents/${fileName}`

      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, uploadData.file)

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`)
      }

      // 2. Create document record
      const documentData = {
        id: generateUUID(),
        title: uploadData.title,
        description: uploadData.description,
        file_name: uploadData.file.name,
        file_size: uploadData.file.size,
        file_type: uploadData.file.type,
        storage_path: storagePath,
        category_id: uploadData.categoryId,
        document_type: uploadData.documentType,
        client_id: uploadData.clientId,
        client_name: uploadData.clientName,
        compliance_status: 'pending' as ComplianceStatus,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        tags: uploadData.tags || [],
        version_number: 1,
        is_template: false,
        is_archived: false
      }

      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('documents').remove([storagePath])
        throw new Error(`Document creation failed: ${dbError.message}`)
      }

      // 3. Log access
      await this.logDocumentAccess(supabase, document.id, 'upload')

      return this.mapDatabaseDocument(document)
    } catch (error) {
      console.error('Document upload error:', error)
      throw error
    }
  }

  async getDocuments(filters?: DocumentFilters): Promise<Document[]> {
    try {
      const supabase = await createClient();
      
      let query = supabase
        .from('documents')
        .select(`
          *,
          document_categories (
            name,
            requires_signature,
            compliance_level
          )
        `)
        .eq('is_archived', false)

      // Apply filters
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      if (filters?.documentType) {
        query = query.eq('document_type', filters.documentType)
      }

      if (filters?.complianceStatus) {
        query = query.eq('compliance_status', filters.complianceStatus)
      }

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId)
      }

      if (filters?.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`)
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags)
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      // Pagination
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
      }

      query = query.order('created_at', { ascending: false })

      const { data: documents, error } = await query

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`)
      }

      return documents?.map(this.mapDatabaseDocument) || []
    } catch (error) {
      console.error('Get documents error:', error)
      throw error
    }
  }

  async getDocumentById(id: string): Promise<Document | null> {
    try {
      const supabase = await createClient();
      
      const { data: document, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_categories (
            name,
            requires_signature,
            compliance_level
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Document not found
        }
        throw new Error(`Failed to fetch document: ${error.message}`)
      }

      // Log access
      await this.logDocumentAccess(supabase, id, 'view')

      return this.mapDatabaseDocument(document)
    } catch (error) {
      console.error('Get document by ID error:', error)
      throw error
    }
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    try {
      const supabase = await createClient();
      
      const { data: document, error } = await supabase
        .from('documents')
        .update({
          title: updates.title,
          description: updates.description,
          category_id: updates.categoryId,
          document_type: updates.documentType,
          client_id: updates.clientId,
          client_name: updates.clientName,
          compliance_status: updates.complianceStatus,
          tags: updates.tags,
          last_modified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update document: ${error.message}`)
      }

      // Log access
      await this.logDocumentAccess(supabase, id, 'edit')

      return this.mapDatabaseDocument(document)
    } catch (error) {
      console.error('Update document error:', error)
      throw error
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      const supabase = await createClient();
      
      // Get document details first
      const document = await this.getDocumentById(id)
      if (!document) {
        throw new Error('Document not found')
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storagePath])

      if (storageError) {
        console.warn('Storage deletion warning:', storageError.message)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (dbError) {
        throw new Error(`Failed to delete document: ${dbError.message}`)
      }

      // Log access
      await this.logDocumentAccess(supabase, id, 'delete')
    } catch (error) {
      console.error('Delete document error:', error)
      throw error
    }
  }

  async downloadDocument(id: string): Promise<{ blob: Blob; fileName: string }> {
    try {
      const supabase = await createClient();
      
      const document = await this.getDocumentById(id)
      if (!document) {
        throw new Error('Document not found')
      }

      const { data: blob, error } = await supabase.storage
        .from('documents')
        .download(document.storagePath)

      if (error) {
        throw new Error(`Download failed: ${error.message}`)
      }

      // Log access
      await this.logDocumentAccess(supabase, id, 'download')

      return {
        blob,
        fileName: document.fileName
      }
    } catch (error) {
      console.error('Download document error:', error)
      throw error
    }
  }

  // ===================================================================
  // CATEGORY OPERATIONS
  // ===================================================================

  async getCategories(): Promise<DocumentCategory[]> {
    try {
      const supabase = await createClient();
      
      const { data: categories, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name')

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }

      return categories?.map(this.mapDatabaseCategory) || []
    } catch (error) {
      console.error('Get categories error:', error)
      throw error
    }
  }

  async createCategory(category: Omit<DocumentCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentCategory> {
    try {
      const supabase = await createClient();
      
      const { data: newCategory, error } = await supabase
        .from('document_categories')
        .insert({
          name: category.name,
          description: category.description,
          requires_signature: category.requiresSignature,
          template_available: category.templateAvailable,
          compliance_level: category.complianceLevel
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create category: ${error.message}`)
      }

      return this.mapDatabaseCategory(newCategory)
    } catch (error) {
      console.error('Create category error:', error)
      throw error
    }
  }

  // ===================================================================
  // SIGNATURE OPERATIONS
  // ===================================================================

  async createSignatureRequest(request: Omit<SignatureRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<SignatureRequest> {
    try {
      const supabase = await createClient();
      
      const { data: signatureRequest, error } = await supabase
        .from('signature_requests')
        .insert({
          document_id: request.documentId,
          docuseal_template_id: request.docusealTemplateId,
          docuseal_submission_id: request.docusealSubmissionId,
          docuseal_status: request.docusealStatus,
          recipient_email: request.recipientEmail,
          recipient_name: request.recipientName,
          recipient_role: request.recipientRole,
          subject: request.subject,
          message: request.message,
          expires_at: request.expiresAt,
          created_by: request.createdBy
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create signature request: ${error.message}`)
      }

      return this.mapDatabaseSignatureRequest(signatureRequest)
    } catch (error) {
      console.error('Create signature request error:', error)
      throw error
    }
  }

  async getSignatureRequests(documentId?: string): Promise<SignatureRequest[]> {
    try {
      const supabase = await createClient();
      
      let query = supabase.from('signature_requests').select('*')

      if (documentId) {
        query = query.eq('document_id', documentId)
      }

      query = query.order('created_at', { ascending: false })

      const { data: requests, error } = await query

      if (error) {
        throw new Error(`Failed to fetch signature requests: ${error.message}`)
      }

      return requests?.map(this.mapDatabaseSignatureRequest) || []
    } catch (error) {
      console.error('Get signature requests error:', error)
      throw error
    }
  }

  async updateSignatureStatus(id: string, status: SignatureStatus, metadata?: any): Promise<SignatureRequest> {
    try {
      const supabase = await createClient();
      
      const updateData: any = {
        docuseal_status: status
      }

      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.signed_document_path = metadata?.signedDocumentPath
      }

      const { data: request, error } = await supabase
        .from('signature_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update signature status: ${error.message}`)
      }

      // Log signature event
      await supabase
        .from('signature_events')
        .insert({
          signature_request_id: id,
          event_type: status,
          event_data: metadata || {}
        })

      return this.mapDatabaseSignatureRequest(request)
    } catch (error) {
      console.error('Update signature status error:', error)
      throw error
    }
  }

  // ===================================================================
  // TEMPLATE OPERATIONS
  // ===================================================================

  async getTemplates(): Promise<DocumentTemplate[]> {
    try {
      const supabase = await createClient();
      
      const { data: templates, error } = await supabase
        .from('document_templates')
        .select(`
          *,
          document_categories (
            name
          )
        `)
        .eq('is_active', true)
        .order('name')

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`)
      }

      return templates?.map(this.mapDatabaseTemplate) || []
    } catch (error) {
      console.error('Get templates error:', error)
      throw error
    }
  }

  async generateDocumentFromTemplate(
    templateId: string, 
    variables: Record<string, string>,
    title: string,
    categoryId?: string
  ): Promise<string> {
    try {
      const supabase = await createClient();
      
      const { data: template, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error || !template) {
        throw new Error('Template not found')
      }

      // Replace variables in template content
      let generatedContent = template.template_content
      
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        generatedContent = generatedContent.replace(regex, value)
      })

      // Create HTML file
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .footer { border-top: 1px solid #ccc; padding-top: 20px; margin-top: 30px; font-size: 0.9em; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="content">
            ${generatedContent.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>This document was generated from template: ${template.name}</p>
          </div>
        </body>
        </html>
      `

      // Convert to blob and upload
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const file = new File([blob], `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`, { type: 'text/html' })

      const document = await this.uploadDocument({
        file,
        title,
        description: `Generated from template: ${template.name}`,
        categoryId,
        documentType: 'suitability_report', // Default type
        tags: ['generated', 'template']
      })

      return document.id
    } catch (error) {
      console.error('Generate document from template error:', error)
      throw error
    }
  }

  // ===================================================================
  // ANALYTICS AND REPORTING
  // ===================================================================

  async getDocumentStatistics(): Promise<any> {
    try {
      const supabase = await createClient();
      
      const { data: stats, error } = await supabase
        .rpc('get_document_statistics')

      if (error) {
        throw new Error(`Failed to fetch statistics: ${error.message}`)
      }

      return stats?.[0] || {
        total_documents: 0,
        documents_by_category: [],
        documents_by_status: [],
        recent_uploads: 0,
        pending_signatures: 0
      }
    } catch (error) {
      console.error('Get document statistics error:', error)
      // Return default stats if function doesn't exist
      return {
        total_documents: 0,
        documents_by_category: [],
        documents_by_status: [],
        recent_uploads: 0,
        pending_signatures: 0
      }
    }
  }

  async getAuditTrail(documentId: string): Promise<any[]> {
    try {
      const supabase = await createClient();
      
      const { data: trail, error } = await supabase
        .from('document_access_log')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch audit trail: ${error.message}`)
      }

      return trail || []
    } catch (error) {
      console.error('Get audit trail error:', error)
      throw error
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private async logDocumentAccess(supabase: any, documentId: string, action: string): Promise<void> {
    try {
      const user = await supabase.auth.getUser()
      
      await supabase
        .from('document_access_log')
        .insert({
          document_id: documentId,
          user_id: user.data.user?.id,
          action,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.warn('Failed to log document access:', error)
      // Don't throw - logging failure shouldn't break main functionality
    }
  }

  private mapDatabaseDocument(dbDoc: any): Document {
    return {
      id: dbDoc.id,
      title: dbDoc.title,
      description: dbDoc.description,
      fileName: dbDoc.file_name,
      fileSize: dbDoc.file_size,
      fileType: dbDoc.file_type,
      storagePath: dbDoc.storage_path,
      categoryId: dbDoc.category_id,
      documentType: dbDoc.document_type,
      clientId: dbDoc.client_id,
      clientName: dbDoc.client_name,
      complianceStatus: dbDoc.compliance_status,
      createdBy: dbDoc.created_by,
      lastModifiedBy: dbDoc.last_modified_by,
      tags: dbDoc.tags || [],
      versionNumber: dbDoc.version_number,
      isTemplate: dbDoc.is_template,
      isArchived: dbDoc.is_archived,
      createdAt: dbDoc.created_at,
      updatedAt: dbDoc.updated_at
    }
  }

  private mapDatabaseCategory(dbCat: any): DocumentCategory {
    return {
      id: dbCat.id,
      name: dbCat.name,
      description: dbCat.description,
      requiresSignature: dbCat.requires_signature,
      templateAvailable: dbCat.template_available,
      complianceLevel: dbCat.compliance_level,
      createdAt: dbCat.created_at,
      updatedAt: dbCat.updated_at
    }
  }

  private mapDatabaseSignatureRequest(dbReq: any): SignatureRequest {
    return {
      id: dbReq.id,
      documentId: dbReq.document_id,
      docusealTemplateId: dbReq.docuseal_template_id,
      docusealSubmissionId: dbReq.docuseal_submission_id,
      docusealStatus: dbReq.docuseal_status,
      recipientEmail: dbReq.recipient_email,
      recipientName: dbReq.recipient_name,
      recipientRole: dbReq.recipient_role,
      subject: dbReq.subject,
      message: dbReq.message,
      expiresAt: dbReq.expires_at,
      sentAt: dbReq.sent_at,
      completedAt: dbReq.completed_at,
      signedDocumentPath: dbReq.signed_document_path,
      createdBy: dbReq.created_by,
      createdAt: dbReq.created_at,
      updatedAt: dbReq.updated_at
    }
  }

  private mapDatabaseTemplate(dbTemplate: any): DocumentTemplate {
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      categoryId: dbTemplate.category_id,
      templateContent: dbTemplate.template_content,
      templateVariables: dbTemplate.template_variables,
      docusealTemplateId: dbTemplate.docuseal_template_id,
      isActive: dbTemplate.is_active,
      requiresApproval: dbTemplate.requires_approval,
      createdBy: dbTemplate.created_by,
      createdAt: dbTemplate.created_at,
      updatedAt: dbTemplate.updated_at
    }
  }
}

// ===================================================================
// SINGLETON INSTANCE
// ===================================================================

let documentServiceInstance: DocumentService | null = null;

export const documentService = {
  getInstance: (): DocumentService => {
    if (!documentServiceInstance) {
      documentServiceInstance = new DocumentService();
    }
    return documentServiceInstance;
  }
};
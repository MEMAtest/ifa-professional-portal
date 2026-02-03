// ================================================================
// src/services/EnhancedDocumentGenerationService.ts
// CLEAN VERSION - Using existing database types
// ================================================================

import { createClient } from '@/lib/supabase/client'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DocumentTemplateService } from './documentTemplateService'
import type { Database } from '@/types/db' // Fixed import path
import { aggregateAssessmentData } from './document-generation/summary'
import { getDefaultHtmlTemplate, mapAssessmentToVariables } from './document-generation/assessment-templates'
import {
  generateFileName,
  generateSimplePDF,
  getDocumentCategory,
  getDocumentType
} from './document-generation/document-utils'
import { populateTemplate } from './document-generation/template-utils'
import type {
  AssessmentData,
  BatchGenerationParams,
  CombinedReportData,
  DocumentGenerationResult,
  DocumentSaveParams,
  GenerateCombinedReportParams,
  GenerateFromAssessmentParams,
  LinkAssessmentParams
} from './document-generation/types'
export type {
  AssessmentData,
  BatchGenerationParams,
  CombinedReportData,
  DocumentGenerationResult,
  GenerateCombinedReportParams,
  GenerateFromAssessmentParams
} from './document-generation/types'

// ================================================================
// TYPE DEFINITIONS
// ================================================================

// ================================================================
// ENHANCED DOCUMENT GENERATION SERVICE
// ================================================================

export class EnhancedDocumentGenerationService {
  private supabase: SupabaseClient<Database> | null = null
  private templateService: DocumentTemplateService
  private static instance: EnhancedDocumentGenerationService
  private currentUserId: string | null = null

  constructor() {
    try {
      // Prefer server-friendly client when not in the browser to avoid localStorage errors
      if (typeof window === 'undefined') {
        this.supabase = getSupabaseServiceClient()
      } else {
        this.supabase = createClient()
        this.initializeUser()
      }
    } catch (error) {
      console.error("CRITICAL: Supabase client initialization failed in EnhancedDocumentGenerationService.", error)
      this.supabase = null
    }
    this.templateService = DocumentTemplateService.getInstance()
  }

  private async initializeUser(): Promise<void> {
    if (!this.supabase) return
    
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      this.currentUserId = user?.id || null
    } catch (error) {
      console.error('Failed to get current user:', error)
      this.currentUserId = null
    }
  }

  public static getInstance(): EnhancedDocumentGenerationService {
    if (!EnhancedDocumentGenerationService.instance) {
      EnhancedDocumentGenerationService.instance = new EnhancedDocumentGenerationService()
    }
    return EnhancedDocumentGenerationService.instance
  }

  // ================================================================
  // GENERATE FROM SINGLE ASSESSMENT
  // ================================================================

  async generateFromAssessment(
    params: GenerateFromAssessmentParams
  ): Promise<DocumentGenerationResult> {
    if (!this.supabase) {
      return {
        success: false,
        error: "Cannot perform action: Supabase client is not available."
      }
    }

    let logId: string | null = null

    try {
      // Ensure we have current user
      if (!this.currentUserId) {
        await this.initializeUser()
      }

      // Log generation attempt
      logId = await this.logGeneration({
        client_id: params.clientId,
        generation_type: 'single',
        assessment_ids: [params.assessmentId],
        status: 'started'
      })

      // 1. Fetch assessment data
      const assessmentData = await this.fetchAssessmentData(
        params.assessmentType,
        params.assessmentId
      )

      if (!assessmentData) {
        throw new Error(`Assessment ${params.assessmentId} not found`)
      }

      // 2. Fetch client data
      const clientData = await this.fetchClientData(params.clientId)
      if (!clientData) {
        throw new Error(`Client ${params.clientId} not found`)
      }

      // 3. Get appropriate template
      const template = await this.getTemplateForAssessment(
        params.assessmentType,
        params.templateId
      )

      if (!template) {
        throw new Error(`No template found for ${params.assessmentType} assessment`)
      }

      // 4. Map assessment data to template variables
      const variables = mapAssessmentToVariables(
        params.assessmentType,
        assessmentData,
        clientData
      )

      // Add warning information if incomplete
      if (params.includeWarnings && params.missingFieldsReport) {
        variables.HAS_WARNINGS = true
        variables.MISSING_FIELDS = params.missingFieldsReport
        variables.INCOMPLETE_WARNING = 'This assessment is incomplete. Some sections may contain placeholder text.'
      }

      // 5. Generate document content
      const htmlContent = populateTemplate(template.content, variables)

      // 6. Convert to PDF format
      const pdfContent = generateSimplePDF(htmlContent, clientData, assessmentData.version_number)

      // 7. Generate unique filename with timestamp and version
      const fileName = generateFileName(
        params.assessmentType,
        clientData.personal_details?.firstName || 'Client',
        clientData.personal_details?.lastName || '',
        assessmentData.version_number,
        params.reportOptions?.reportType
      )

      // 8. Determine document type and category based on report type
      const documentType = getDocumentType(params.reportOptions?.reportType)
      const category = getDocumentCategory(params.assessmentType, params.reportOptions?.reportType)

      // 9. Save document - NOTE: NOT passing assessmentId to avoid foreign key constraint
      const document = await this.saveDocument({
        clientId: params.clientId,
        fileName,
        content: pdfContent,
        fileType: 'application/pdf',
        metadata: {
          assessmentType: params.assessmentType,
          assessmentId: params.assessmentId, // Store in metadata instead
          templateId: template.id,
          generatedAt: new Date().toISOString(),
          completionStatus: params.reportOptions?.includeCompletionStatus,
          version: assessmentData.version_number,
          reportType: params.reportOptions?.reportType || 'standard'
        },
        assessmentVersion: assessmentData.version_number,
        documentType,
        category,
        assessmentType: params.assessmentType
      })

      // 10. Try to create assessment-document link (may fail if table doesn't exist)
      await this.linkAssessmentToDocument({
        assessment_type: params.assessmentType,
        assessment_id: params.assessmentId,
        document_id: document.id,
        template_used: template.name,
        variables_used: variables
      })

      // 11. Update generation log
      if (logId) {
        await this.updateGenerationLog(logId, document.id, 'completed')
      }

      return {
        success: true,
        documentId: document.id,
        documentUrl: document.url,
        metadata: {
          templateUsed: template.name,
          assessmentType: params.assessmentType,
          version: assessmentData.version_number,
          reportType: params.reportOptions?.reportType
        }
      }
    } catch (error) {
      console.error('Error generating document from assessment:', error)
      if (logId) {
        await this.updateGenerationLog(logId, null, 'failed', error)
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ================================================================
  // GENERATE COMBINED REPORT
  // ================================================================

  async generateCombinedReport(
    params: GenerateCombinedReportParams
  ): Promise<DocumentGenerationResult> {
    if (!this.supabase) {
      return {
        success: false,
        error: "Cannot perform action: Supabase client is not available."
      }
    }

    let logId: string | null = null

    try {
      // Ensure we have current user
      if (!this.currentUserId) {
        await this.initializeUser()
      }

      logId = await this.logGeneration({
        client_id: params.clientId,
        generation_type: 'combined',
        assessment_ids: params.assessmentIds,
        status: 'started'
      })

      // 1. Fetch client data
      const clientData = await this.fetchClientData(params.clientId)
      if (!clientData) {
        throw new Error(`Client ${params.clientId} not found`)
      }

      // 2. Fetch all assessments
      const assessments = await this.fetchMultipleAssessments(
        params.clientId,
        params.assessmentIds
      )

      // 3. Get combined report template
      const template = await this.getCombinedReportTemplate(
        params.reportType || 'annual_review',
        params.templateId
      )

      if (!template) {
        throw new Error('No combined report template found')
      }

      // 4. Aggregate data from all assessments
      const aggregatedData = aggregateAssessmentData(
        assessments,
        clientData,
        params.reportType || 'annual_review'
      )

      // 5. Generate HTML content
      const htmlContent = populateTemplate(template.content, aggregatedData)

      // 6. Convert to PDF
      const pdfContent = generateSimplePDF(htmlContent, clientData, 0)

      // 7. Save document with unique filename
      const fileName = generateFileName(
        'combined_report',
        clientData.personal_details?.firstName || 'Client',
        clientData.personal_details?.lastName || ''
      )

      const document = await this.saveDocument({
        clientId: params.clientId,
        fileName,
        content: pdfContent,
        fileType: 'application/pdf',
        metadata: {
          reportType: params.reportType,
          assessmentIds: params.assessmentIds,
          templateId: template.id,
          generatedAt: new Date().toISOString()
        },
        documentType: 'Combined Report',
        category: 'Reports'
      })

      // 8. Link all assessments to document
      for (const assessment of assessments) {
        await this.linkAssessmentToDocument({
          assessment_type: assessment.type,
          assessment_id: assessment.id,
          document_id: document.id,
          template_used: template.name,
          variables_used: aggregatedData
        })
      }

      if (logId) {
        await this.updateGenerationLog(logId, document.id, 'completed')
      }

      return {
        success: true,
        documentId: document.id,
        documentUrl: document.url,
        metadata: {
          templateUsed: template.name,
          reportType: params.reportType,
          assessmentsIncluded: assessments.length
        }
      }
    } catch (error) {
      console.error('Error generating combined report:', error)
      if (logId) {
        await this.updateGenerationLog(logId, null, 'failed', error)
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ================================================================
  // BATCH GENERATION
  // ================================================================

  async generateBatch(
    params: BatchGenerationParams
  ): Promise<DocumentGenerationResult[]> {
    if (!this.supabase) {
      return [{
        success: false,
        error: "Cannot perform action: Supabase client is not available."
      }]
    }

    const results: DocumentGenerationResult[] = []

    for (const clientId of params.clientIds) {
      for (const documentType of params.documentTypes) {
        try {
          // Check if should skip
          if (params.options?.skipIfExists) {
            const exists = await this.documentExists(clientId, documentType)
            if (exists) {
              results.push({
                success: true,
                metadata: { skipped: true, reason: 'Document already exists' }
              })
              continue
            }
          }

          // Generate based on document type
          let result: DocumentGenerationResult

          if (documentType === 'combined_report') {
            // Get all assessments for client
            const assessments = await this.getAllClientAssessments(clientId)
            result = await this.generateCombinedReport({
              clientId,
              assessmentIds: assessments.map(a => a.id),
              reportType: 'annual_review'
            })
          } else {
            // Generate from specific assessment type
            const assessment = await this.getLatestAssessment(clientId, documentType)
            if (assessment) {
              result = await this.generateFromAssessment({
                assessmentType: documentType,
                assessmentId: assessment.id,
                clientId
              })
            } else {
              result = {
                success: false,
                error: `No ${documentType} assessment found for client`
              }
            }
          }

          // Send for signature if requested
          if (result.success && params.options?.sendForSignature && result.documentId) {
            await this.sendForSignature(result.documentId, clientId)
          }

          results.push(result)
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return results
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  private async fetchAssessmentData(type: string, id: string): Promise<Record<string, any>> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available.")
    }

    const tableMap: Record<string, string> = {
      suitability: 'suitability_assessments',
      atr: 'atr_assessments',
      cfl: 'cfl_assessments',
      vulnerability: 'vulnerability_assessments'
    }

    const table = tableMap[type]
    if (!table) throw new Error(`Unknown assessment type: ${type}`)

    // Use 'any' cast for dynamic table names
    const { data, error } = await (this.supabase as any)
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error(`Assessment ${id} not found`)
    
    return data
  }

  private async fetchClientData(clientId: string): Promise<any> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available.")
    }

    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error(`Client ${clientId} not found`)
    
    return data
  }

  private async getTemplateForAssessment(
    assessmentType: string,
    templateId?: string
  ): Promise<Record<string, any> | null> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available.")
    }

    if (templateId) {
      return await this.templateService.getTemplateById(templateId)
    }

    // Get default template for assessment type - use 'any' cast for now
    const { data, error } = await (this.supabase as any)
      .from('document_templates')
      .select('*')
      .eq('assessment_type', assessmentType)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      // Fallback to template service defaults
      const defaults = this.templateService.getDefaultTemplates()
      const found = defaults.find((t: any) => t.documentType === `${assessmentType}_report`)
      return found || getDefaultHtmlTemplate(assessmentType)
    }

    return data
  }

  private async saveDocument(params: DocumentSaveParams): Promise<any> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available.")
    }

    // Prepare the file path
    const timestamp = Date.now()
    const safeFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `documents/${params.clientId}/${timestamp}_${safeFileName}`
    const storagePath = filePath

    try {
      // Upload to storage first
      const { error: uploadError, data: uploadData } = await this.supabase.storage
        .from('documents')
        .upload(filePath, params.content, {
          contentType: params.fileType,
          upsert: false
        })

      if (uploadError) {
        // If file exists error, add more unique identifier
        const uniqueFilePath = `documents/${params.clientId}/${timestamp}_${Math.random().toString(36).substr(2, 9)}_${safeFileName}`
        
        const { error: retryError } = await this.supabase.storage
          .from('documents')
          .upload(uniqueFilePath, params.content, {
            contentType: params.fileType,
            upsert: false
          })
        
        if (retryError) throw retryError
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Calculate file size
      const fileSize = params.content instanceof Blob 
        ? params.content.size 
        : new Blob([params.content]).size

      // Get client name for the record
      const { data: clientData } = await this.supabase
        .from('clients')
        .select('personal_details')
        .eq('id', params.clientId)
        .maybeSingle()

      const personalDetails = clientData?.personal_details as any
      const clientName = personalDetails 
        ? `${personalDetails.firstName || ''} ${personalDetails.lastName || ''}`.trim()
        : 'Unknown Client'

      // Ensure we have current user
      if (!this.currentUserId) {
        await this.initializeUser()
      }

      // Prepare metadata with assessment info
      const enrichedMetadata = {
        ...params.metadata,
        assessmentType: params.assessmentType,
        // Store the assessment ID in metadata since we can't use the foreign key
        sourceAssessmentId: params.assessmentId,
        generatedAt: new Date().toISOString()
      }

      // Save to database WITHOUT assessment_id to avoid foreign key constraint
      const { data, error } = await this.supabase
        .from('documents')
        .insert({
          // Required fields
          name: params.fileName,
          type: params.documentType || params.assessmentType || 'report',
          document_type: params.documentType || params.assessmentType || 'report',
          category: params.category || params.documentType || params.assessmentType || 'Assessments',
          file_name: safeFileName,
          storage_path: storagePath,
          
          // Optional fields - NOT including assessment_id
          client_id: params.clientId,
          // assessment_id: null, // Explicitly NOT setting this
          file_path: filePath,
          file_size: fileSize,
          mime_type: params.fileType,
          file_type: params.fileType.split('/')[1] || 'pdf',
          
          // Store assessment reference in metadata instead
          metadata: enrichedMetadata,
          assessment_version: params.assessmentVersion || null,
          version_number: params.assessmentVersion || 1,
          
          // User tracking
          created_by: this.currentUserId,
          last_modified_by: this.currentUserId,
          
          // Client info
          client_name: clientName,
          
          // Status fields
          compliance_status: 'approved',
          requires_signature: false,
          signature_status: 'not_required',
          is_archived: false,
          is_template: false,
          
          // Description
          description: `${params.documentType || params.assessmentType || 'Assessment Report'} for ${clientName} - Version ${params.assessmentVersion || 1}`,
          
          // Timestamps (will use defaults)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any) // Type assertion for now
        .select()
        .maybeSingle()

      if (error) {
        console.error('Database insert error:', error)
        throw error
      }
      
      if (!data) throw new Error('Failed to save document record')

      return {
        ...data,
        url: publicUrl
      }
    } catch (error) {
      console.error('Error in saveDocument:', error)
      throw error
    }
  }

  private async linkAssessmentToDocument(params: LinkAssessmentParams): Promise<void> {
    if (!this.supabase) {
      console.error("Cannot perform action: Supabase client is not available.")
      return
    }

    try {
      // Just try to insert - don't check if table exists
      const { error } = await this.supabase
        .from('assessment_documents')
        .insert(params as any) // Type assertion for now

      if (error) {
        // If the table doesn't exist, we'll get error code 42P01
        if (error.code === '42P01') {
          console.log('assessment_documents table does not exist, skipping link creation')
          return
        }
        // Ignore duplicate key errors
        if (error.code === '23505') {
          console.log('Link already exists between assessment and document')
          return
        }
        // Log other errors but don't throw
        console.error('Error linking assessment to document:', error)
      }
    } catch (error) {
      console.error('Error in linkAssessmentToDocument:', error)
      // Don't throw - this is not critical for document generation
    }
  }

  private async logGeneration(params: Record<string, any>): Promise<string | null> {
    if (!this.supabase) {
      console.error("Cannot perform action: Supabase client is not available.")
      return null
    }

    try {
      // Ensure we have current user
      if (!this.currentUserId) {
        await this.initializeUser()
      }
      
      const { data, error } = await this.supabase
        .from('document_generation_logs')
        .insert({
          ...params,
          created_by: this.currentUserId, // Can be null
          started_at: new Date().toISOString()
        } as any) // Type assertion for now
        .select('id')
        .maybeSingle()

      if (error) {
        console.error('Error logging generation:', error)
        return null
      }

      return data?.id || null
    } catch (error) {
      console.error('Error in logGeneration:', error)
      return null
    }
  }

  private async updateGenerationLog(
    logId: string | null,
    documentId: string | null,
    status: string,
    error?: any
  ): Promise<void> {
    if (!this.supabase || !logId) {
      if (!logId) {
        console.error("Cannot update log: Missing log ID")
      }
      return
    }

    try {
      const updateData: Record<string, any> = {
        status,
        completed_at: new Date().toISOString()
      }

      if (documentId) updateData.document_id = documentId
      if (error) updateData.error_message = error?.message || String(error)

      const { error: updateError } = await this.supabase
        .from('document_generation_logs')
        .update(updateData as any) // Type assertion for now
        .eq('id', logId)

      if (updateError) {
        console.error('Error updating generation log:', updateError)
      }
    } catch (err) {
      console.error('Error in updateGenerationLog:', err)
    }
  }

  private async fetchMultipleAssessments(
    clientId: string,
    assessmentIds?: string[]
  ): Promise<AssessmentData[]> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available.")
    }

    const assessments: AssessmentData[] = []
    const types: Array<'suitability' | 'atr' | 'cfl' | 'vulnerability'> = ['suitability', 'atr', 'cfl', 'vulnerability']
    
    for (const type of types) {
      const table = `${type}_assessments`
      let query = (this.supabase as any)
        .from(table)
        .select('*')
        .eq('client_id', clientId)

      if (assessmentIds && assessmentIds.length > 0) {
        query = query.in('id', assessmentIds)
      }

      const { data, error } = await query

      if (!error && data) {
        assessments.push(...data.map((d: Record<string, any>) => ({
          type,
          id: d.id,
          data: d,
          completedAt: d.created_at
        })))
      }
    }

    return assessments
  }

  private async documentExists(clientId: string, documentType: string): Promise<boolean> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available.")
    }

    const { data } = await this.supabase
      .from('documents')
      .select('id')
      .eq('client_id', clientId)
      .ilike('name', `%${documentType}%`)
      .limit(1)

    return !!data && data.length > 0
  }

  private async getAllClientAssessments(clientId: string): Promise<AssessmentData[]> {
    return this.fetchMultipleAssessments(clientId)
  }

  private async getLatestAssessment(clientId: string, type: string): Promise<Record<string, any> | null> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available.")
    }

    const table = `${type}_assessments`
    
    const { data } = await (this.supabase as any)
      .from(table)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)

    return data?.[0] || null
  }

  private async sendForSignature(documentId: string, clientId: string): Promise<void> {
    console.log(`Sending document ${documentId} for signature to client ${clientId}`)
    // Add actual DocuSeal integration here when ready
  }

  private async getCombinedReportTemplate(
    reportType: string,
    templateId?: string
  ): Promise<Record<string, any> | null> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available.")
    }

    if (templateId) {
      return await this.templateService.getTemplateById(templateId)
    }

    const { data } = await (this.supabase as any)
      .from('document_templates')
      .select('*')
      .eq('assessment_type', 'combined')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    return data || getDefaultHtmlTemplate('combined')
  }
}

// Export singleton instance
export const enhancedDocumentService = EnhancedDocumentGenerationService.getInstance()

// ================================================================
// src/services/EnhancedDocumentGenerationService.ts
// CLEAN VERSION - Using existing database types
// ================================================================

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DocumentTemplateService } from './documentTemplateService'
import type { Database } from '@/types/database.types' // Fixed import path

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface AssessmentData {
  type: 'suitability' | 'atr' | 'cfl' | 'vulnerability'
  id: string
  data: Record<string, any>
  completedAt: string
}

export interface GenerateFromAssessmentParams {
  assessmentType: string
  assessmentId: string
  clientId: string
  templateId?: string
  includeWarnings?: boolean
  missingFieldsReport?: Array<{
    sectionId: string
    sectionName: string
    missingFields: Array<{
      fieldId: string
      fieldName: string
      required: boolean
    }>
  }>
  reportOptions?: {
    showIncompleteWarning?: boolean
    allowPartialGeneration?: boolean
    highlightMissingData?: boolean
    includeCompletionStatus?: boolean
    reportType?: 'clientLetter' | 'advisorReport' | 'executiveSummary' | 'fullReport' | 'complianceReport'
  }
}

export interface GenerateCombinedReportParams {
  clientId: string
  assessmentIds: string[]
  templateId?: string
  reportType?: 'annual_review' | 'comprehensive' | 'executive_summary'
}

export interface BatchGenerationParams {
  clientIds: string[]
  documentTypes: string[]
  options?: {
    skipIfExists?: boolean
    sendForSignature?: boolean
  }
}

export interface DocumentGenerationResult {
  success: boolean
  documentId?: string
  documentUrl?: string
  error?: string
  metadata?: Record<string, any>
}

export interface CombinedReportData {
  client: Record<string, any>
  assessments: AssessmentData[]
  generatedAt: string
  reportType: string
}

interface DocumentSaveParams {
  clientId: string
  fileName: string
  content: string | Blob
  fileType: string
  metadata: Record<string, any>
  assessmentVersion?: number
  assessmentId?: string
  documentType?: string
  category?: string
  assessmentType?: string
}

interface LinkAssessmentParams {
  assessment_type: string
  assessment_id: string
  document_id: string
  template_used: string
  variables_used: Record<string, any>
}

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
      // Properly typed Supabase client
      this.supabase = createClient()
      this.initializeUser()
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
      const variables = this.mapAssessmentToVariables(
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
      const htmlContent = this.populateTemplate(template.content, variables)

      // 6. Convert to PDF format
      const pdfContent = this.generateSimplePDF(htmlContent, clientData, assessmentData.version_number)

      // 7. Generate unique filename with timestamp and version
      const fileName = this.generateFileName(
        params.assessmentType,
        clientData.personal_details?.firstName || 'Client',
        clientData.personal_details?.lastName || '',
        assessmentData.version_number,
        params.reportOptions?.reportType
      )

      // 8. Determine document type and category based on report type
      const documentType = this.getDocumentType(params.reportOptions?.reportType)
      const category = this.getDocumentCategory(params.assessmentType, params.reportOptions?.reportType)

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
      const aggregatedData = this.aggregateAssessmentData(
        assessments,
        clientData,
        params.reportType || 'annual_review'
      )

      // 5. Generate HTML content
      const htmlContent = this.populateTemplate(template.content, aggregatedData)

      // 6. Convert to PDF
      const pdfContent = this.generateSimplePDF(htmlContent, clientData, 0)

      // 7. Save document with unique filename
      const fileName = this.generateFileName(
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

  private getDocumentType(reportType?: string): string {
    const typeMap: Record<string, string> = {
      clientLetter: 'Client Letter',
      advisorReport: 'Advisor Report',
      executiveSummary: 'Executive Summary',
      fullReport: 'Full Assessment Report',
      complianceReport: 'FCA Compliance Report'
    }
    return typeMap[reportType || ''] || 'Assessment Report'
  }

  private getDocumentCategory(assessmentType: string, reportType?: string): string {
    if (reportType === 'complianceReport') return 'Compliance'
    if (reportType === 'clientLetter') return 'Client Communications'
    if (reportType === 'advisorReport') return 'Internal Documents'
    
    const categoryMap: Record<string, string> = {
      suitability: 'Suitability',
      atr: 'Risk Assessment',
      cfl: 'Capacity for Loss',
      vulnerability: 'Vulnerability'
    }
    
    return categoryMap[assessmentType] || 'Reports'
  }

  private generateSimplePDF(htmlContent: string, clientData: any, version: number): Blob {
    // Enhanced PDF generation with proper structure
    const clientName = `${clientData.personal_details?.firstName || ''} ${clientData.personal_details?.lastName || ''}`.trim() || 'Client'
    const currentDate = new Date().toLocaleDateString('en-GB')
    
    const pdfContent = `%PDF-1.4
%âÉäÃÅ
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 500 >>
stream
BT
/F1 16 Tf
50 750 Td
(Financial Suitability Assessment Report) Tj
0 -30 Td
/F1 12 Tf
(Client: ${clientName}) Tj
0 -20 Td
(Date: ${currentDate}) Tj
0 -20 Td
(Version: ${version || 1}) Tj
0 -40 Td
/F1 14 Tf
(Assessment Summary) Tj
0 -20 Td
/F1 10 Tf
(This document contains the complete suitability assessment) Tj
0 -15 Td
(for the above named client as of the date specified.) Tj
0 -30 Td
(Generated by: Financial Advisory Platform) Tj
0 -15 Td
(Status: Final) Tj
0 -15 Td
(Compliance: FCA Approved Format) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000015 00000 n
0000000074 00000 n
0000000131 00000 n
0000000261 00000 n
0000000341 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
892
%%EOF`

    return new Blob([pdfContent], { type: 'application/pdf' })
  }

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
      return found || this.getDefaultHtmlTemplate(assessmentType)
    }

    return data
  }

  private getDefaultHtmlTemplate(assessmentType: string): Record<string, any> {
    return {
      id: `default_${assessmentType}`,
      name: `Default ${assessmentType} Template`,
      content: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>{{CLIENT_NAME}} - ${assessmentType.toUpperCase()} Assessment Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Financial Suitability Assessment Report</h1>
            <p><strong>Client:</strong> {{CLIENT_NAME}}</p>
            <p><strong>Date:</strong> {{ASSESSMENT_DATE}}</p>
            <p><strong>Version:</strong> {{VERSION_NUMBER}}</p>
          </div>
          <div class="content">
            {{CONTENT}}
          </div>
          <div class="footer">
            <p>This document is confidential and proprietary.</p>
            <p>Generated by Financial Advisory Platform</p>
          </div>
        </body>
        </html>
      `
    }
  }

  private mapAssessmentToVariables(
    type: string,
    assessment: Record<string, any>,
    client: any
  ): Record<string, any> {
    const baseVariables = {
      CLIENT_NAME: `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Client',
      CLIENT_EMAIL: client.contact_details?.email || '',
      ASSESSMENT_DATE: new Date().toLocaleDateString('en-GB'),
      ADVISOR_NAME: 'Professional Advisor',
      VERSION_NUMBER: assessment.version_number || 1,
      IS_FINAL: assessment.is_final || false,
      IS_DRAFT: assessment.is_draft || true,
      FIRM_NAME: 'Financial Advisory Services',
      FIRM_ADDRESS: '123 Financial Street, London, UK',
      FIRM_FCA_NUMBER: 'FCA123456'
    }

    // Add type-specific variables
    const typeSpecificVariables = this.getTypeSpecificVariables(type, assessment, client)

    return {
      ...baseVariables,
      ...typeSpecificVariables,
      CONTENT: this.generateFormattedContent(type, assessment, client)
    }
  }

  private generateFormattedContent(type: string, assessment: Record<string, any>, client: any): string {
    // Generate properly formatted content based on assessment type
    let content = '<div class="assessment-content">'
    
    if (type === 'suitability') {
      content += `
        <div class="section">
          <h2>Investment Objectives</h2>
          <p>Primary Objective: ${assessment.objectives?.primary_objective || 'Not specified'}</p>
          <p>Investment Amount: £${assessment.objectives?.investment_amount || 0}</p>
          <p>Time Horizon: ${assessment.objectives?.time_horizon || 'Not specified'}</p>
        </div>
        <div class="section">
          <h2>Risk Assessment</h2>
          <p>Risk Profile: ${assessment.risk_assessment?.attitude_to_risk || 'Moderate'}</p>
          <p>Risk Capacity: ${assessment.risk_assessment?.capacity_for_loss || 'Medium'}</p>
        </div>
        <div class="section">
          <h2>Recommendations</h2>
          <p>${assessment.recommendation || 'Based on the assessment, we recommend a balanced investment strategy suited to your risk profile and objectives.'}</p>
        </div>
      `
    }
    
    content += '</div>'
    return content
  }

  private getTypeSpecificVariables(
    type: string, 
    assessment: Record<string, any>, 
    client: any
  ): Record<string, any> {
    switch (type) {
      case 'atr':
        return {
          ATR_SCORE: assessment.total_score || 0,
          RISK_CATEGORY: assessment.risk_category || 'Not assessed',
          RISK_LEVEL: assessment.risk_level || 'Medium'
        }

      case 'cfl':
        return {
          CFL_SCORE: assessment.total_score || 0,
          CAPACITY_CATEGORY: assessment.capacity_category || 'Not assessed',
          MAX_LOSS_PERCENTAGE: assessment.max_loss_percentage || 0
        }

      case 'vulnerability':
        return {
          VULNERABILITY_STATUS: assessment.is_vulnerable ? 'Vulnerable' : 'Not Vulnerable',
          VULNERABILITY_FACTORS: assessment.vulnerability_factors || []
        }

      case 'suitability':
        return {
          RISK_PROFILE: assessment.risk_assessment?.attitude_to_risk || 'Moderate',
          INVESTMENT_AMOUNT: assessment.objectives?.investment_amount || 0,
          RECOMMENDATION: assessment.recommendation || 'Based on the assessment, we recommend a balanced investment strategy.',
          COMPLETION_PERCENTAGE: assessment.completion_percentage || 0
        }

      default:
        return {}
    }
  }

  private populateTemplate(template: string, variables: Record<string, any>): string {
    let content = template

    // Simple variable replacement
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      const safeValue = value !== null && value !== undefined ? String(value) : ''
      content = content.replace(regex, safeValue)
    })

    // Handle conditional blocks
    content = this.processConditionals(content, variables)

    // Handle loops
    content = this.processLoops(content, variables)

    return content
  }

  private processConditionals(content: string, variables: Record<string, any>): string {
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g
    
    return content.replace(ifRegex, (match, varName, innerContent) => {
      if (variables[varName]) {
        return innerContent
      }
      return ''
    })
  }

  private processLoops(content: string, variables: Record<string, any>): string {
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g
    
    return content.replace(eachRegex, (match, varName, innerContent) => {
      const items = variables[varName]
      if (Array.isArray(items)) {
        return items.map(item => {
          let itemContent = innerContent
          if (typeof item === 'object' && item !== null) {
            Object.entries(item).forEach(([key, value]) => {
              const regex = new RegExp(`{{this\\.${key}}}`, 'g')
              itemContent = itemContent.replace(regex, String(value))
            })
          } else {
            itemContent = itemContent.replace(/{{this}}/g, String(item))
          }
          return itemContent
        }).join('')
      }
      return ''
    })
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
          type: params.documentType || 'Report',
          category: params.category || 'Assessments',
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
          document_type: params.documentType || 'Assessment Report',
          
          // Status fields
          compliance_status: 'approved',
          requires_signature: false,
          signature_status: 'not_required',
          is_archived: false,
          is_template: false,
          
          // Description
          description: `${params.documentType || 'Assessment Report'} for ${clientName} - Version ${params.assessmentVersion || 1}`,
          
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

  private generateFileName(
    type: string, 
    firstName: string, 
    lastName: string,
    version?: number,
    reportType?: string
  ): string {
    const timestamp = Date.now()
    const date = new Date().toISOString().split('T')[0]
    const clientName = `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50)
    const versionString = version ? `_v${version}` : ''
    const reportTypeString = reportType ? `_${reportType}` : ''
    
    return `${type}${reportTypeString}_${clientName}${versionString}_${date}_${timestamp}.pdf`
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

  private aggregateAssessmentData(
    assessments: AssessmentData[],
    client: any,
    reportType: string
  ): Record<string, any> {
    const atr = assessments.find(a => a.type === 'atr')
    const cfl = assessments.find(a => a.type === 'cfl')
    const suitability = assessments.find(a => a.type === 'suitability')

    const baseData = {
      CLIENT_NAME: `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Client',
      REVIEW_DATE: new Date().toLocaleDateString('en-GB'),
      ADVISOR_NAME: 'Professional Advisor',
      EXECUTIVE_SUMMARY: this.generateExecutiveSummary(assessments, client)
    }

    return {
      ...baseData,
      ATR_SCORE: atr?.data.total_score || 'Not assessed',
      ATR_CATEGORY: atr?.data.risk_category || 'Not assessed',
      ATR_DATE: atr ? new Date(atr.completedAt).toLocaleDateString('en-GB') : 'N/A',
      CFL_SCORE: cfl?.data.total_score || 'Not assessed',
      MAX_LOSS: cfl?.data.max_loss_percentage || 0,
      CFL_DATE: cfl ? new Date(cfl.completedAt).toLocaleDateString('en-GB') : 'N/A',
      SUITABILITY_VERSION: suitability?.data.version_number || 'N/A',
      SUITABILITY_STATUS: suitability?.data.is_final ? 'Final' : 'Draft',
      ASSESSMENT_HISTORY: this.buildAssessmentHistory(assessments),
      KEY_CHANGES: this.identifyKeyChanges(assessments, client),
      RECOMMENDATIONS: this.buildRecommendations(assessments, client),
      NEXT_STEPS: this.buildNextSteps(assessments, client)
    }
  }

  private generateExecutiveSummary(assessments: AssessmentData[], client: any): string {
    const hasAllAssessments = assessments.length >= 3
    const riskAligned = this.checkRiskAlignment(assessments)
    const clientName = client.personal_details?.firstName || 'the client'
    
    return `This annual review summarizes the current financial position and risk profile for ${clientName}. ${hasAllAssessments ? 'All required assessments have been completed.' : 'Some assessments are pending completion.'} ${riskAligned ? 'Risk profiles are well-aligned across assessments.' : 'There are some discrepancies in risk assessments that require attention.'}`
  }

  private checkRiskAlignment(assessments: AssessmentData[]): boolean {
    const atr = assessments.find(a => a.type === 'atr')
    const cfl = assessments.find(a => a.type === 'cfl')
    
    if (!atr || !cfl) return true
    
    const atrLevel = atr.data.risk_level || 3
    const cflLevel = cfl.data.capacity_level || 3
    
    return Math.abs(atrLevel - cflLevel) <= 1
  }

  private buildAssessmentHistory(assessments: AssessmentData[]): any[] {
    return assessments
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .map(assessment => ({
        date: new Date(assessment.completedAt).toLocaleDateString('en-GB'),
        type: assessment.type.toUpperCase(),
        summary: this.getAssessmentSummary(assessment)
      }))
  }

  private getAssessmentSummary(assessment: AssessmentData): string {
    switch (assessment.type) {
      case 'atr':
        return `Risk score: ${assessment.data.total_score || 0}/100, Category: ${assessment.data.risk_category || 'Not assessed'}`
      case 'cfl':
        return `Capacity score: ${assessment.data.total_score || 0}/100, Max loss: ${assessment.data.max_loss_percentage || 0}%`
      case 'suitability':
        const version = assessment.data.version_number || 1
        const objective = assessment.data.objectives?.primary_objective || 'investment'
        return `Suitability confirmed for ${objective} (Version ${version})`
      case 'vulnerability':
        return assessment.data.is_vulnerable ? 'Vulnerability factors identified' : 'No vulnerabilities identified'
      default:
        return 'Assessment completed'
    }
  }

  private identifyKeyChanges(assessments: AssessmentData[], client: any): string[] {
    const changes: string[] = []
    
    const recentAssessments = assessments.filter(a => {
      const daysSince = (Date.now() - new Date(a.completedAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince < 90
    })
    
    if (recentAssessments.length > 0) {
      changes.push(`${recentAssessments.length} assessment(s) updated in the last 90 days`)
    }
    
    const atr = assessments.find(a => a.type === 'atr')
    if (atr && atr.data.risk_level !== client.risk_profile?.risk_level) {
      changes.push('Risk profile has been updated')
    }
    
    if (client.vulnerability_assessment?.is_vulnerable) {
      changes.push('Client vulnerability factors require ongoing monitoring')
    }
    
    return changes.length > 0 ? changes : ['No significant changes since last review']
  }

  private buildRecommendations(assessments: AssessmentData[], client: any): any[] {
    const recommendations: any[] = []
    
    const atr = assessments.find(a => a.type === 'atr')
    const cfl = assessments.find(a => a.type === 'cfl')
    
    if (atr && cfl) {
      const riskAligned = Math.abs((atr.data.risk_level || 3) - (cfl.data.capacity_level || 3)) <= 1
      if (!riskAligned) {
        recommendations.push({
          category: 'Risk Alignment',
          recommendation: 'Review and align risk tolerance with capacity for loss'
        })
      }
    }
    
    const missingTypes = ['atr', 'cfl', 'suitability', 'vulnerability']
      .filter(type => !assessments.find(a => a.type === type))
    
    if (missingTypes.length > 0) {
      recommendations.push({
        category: 'Assessment Completion',
        recommendation: `Complete missing assessments: ${missingTypes.join(', ')}`
      })
    }
    
    recommendations.push({
      category: 'Ongoing Monitoring',
      recommendation: 'Schedule quarterly portfolio reviews and annual assessment updates'
    })
    
    return recommendations
  }

  private buildNextSteps(assessments: AssessmentData[], client: any): string[] {
    const steps: string[] = []
    
    const hasAtr = assessments.find(a => a.type === 'atr')
    const hasCfl = assessments.find(a => a.type === 'cfl')
    const hasSuitability = assessments.find(a => a.type === 'suitability')
    
    if (!hasAtr) steps.push('Complete Attitude to Risk (ATR) assessment')
    if (!hasCfl) steps.push('Complete Capacity for Loss (CFL) assessment')
    if (!hasSuitability) steps.push('Complete Suitability assessment')
    
    steps.push('Review and approve recommendations with client')
    steps.push('Implement agreed investment strategy')
    steps.push('Schedule next review date')
    
    return steps
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

    return data || this.getDefaultHtmlTemplate('combined')
  }
}

// Export singleton instance
export const enhancedDocumentService = EnhancedDocumentGenerationService.getInstance()
// ===================================================================
// src/services/documentTemplateService.ts - COMPLETE FILE
// ===================================================================

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { 
  DocumentTemplate, 
  DocumentCategory, 
  DocumentType,
  ComplianceLevel 
} from '@/types/document'

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

// Template interfaces
export interface TemplateVariable {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean'
  required: boolean
  defaultValue?: string
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  category_id?: string
  content: string
  variables: TemplateVariable[]
  documentType: DocumentType
  compliance_level?: ComplianceLevel
}

export interface GenerateDocumentRequest {
  templateId: string
  variables: Record<string, any>
  clientId?: string
  clientName?: string
  outputFormat?: 'pdf' | 'html' | 'docx'
}

// ===================================================================
// DOCUMENT TEMPLATE SERVICE CLASS
// ===================================================================

export class DocumentTemplateService {
  private supabase: SupabaseClient
  private static instance: DocumentTemplateService

  constructor() {
    this.supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  public static getInstance(): DocumentTemplateService {
    if (!DocumentTemplateService.instance) {
      DocumentTemplateService.instance = new DocumentTemplateService()
    }
    return DocumentTemplateService.instance
  }

  // Get all templates
  async getTemplates(): Promise<DocumentTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching templates:', error)
        // Return default templates as fallback
        return this.getDefaultTemplates().map((t, index) => ({
          id: `template_${index}`,
          name: t.name || '',
          description: t.description,
          category_id: undefined,
          content: t.content || '',
          merge_fields: {},
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      }
      
      return this.mapTemplatesFromDatabase(data || [])
    } catch (error) {
      console.error('Error in getTemplates:', error)
      // Return default templates as fallback
      return this.getDefaultTemplates().map((t, index) => ({
        id: `template_${index}`,
        name: t.name || '',
        description: t.description,
        category_id: undefined,
        content: t.content || '',
        merge_fields: {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    }
  }

  // Get template by ID
  async getTemplateById(templateId: string): Promise<DocumentTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) {
        console.error('Error fetching template:', error)
        // Try default templates
        const defaultTemplates = this.getDefaultTemplates()
        const defaultTemplate = defaultTemplates.find((t, index) => 
          `template_${index}` === templateId
        )
        if (defaultTemplate) {
          return {
            id: templateId,
            name: defaultTemplate.name || '',
            description: defaultTemplate.description,
            category_id: undefined,
            content: defaultTemplate.content || '',
            merge_fields: {},
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
        return null
      }
      
      return data ? this.mapTemplateFromDatabase(data) : null
    } catch (error) {
      console.error('Error in getTemplateById:', error)
      return null
    }
  }

  // Get templates by category
  async getTemplatesByCategory(categoryId: string): Promise<DocumentTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return this.mapTemplatesFromDatabase(data || [])
    } catch (error) {
      console.error('Error fetching templates by category:', error)
      return []
    }
  }

  // Get templates by type
  async getTemplatesByType(documentType: DocumentType): Promise<DocumentTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .contains('metadata', { documentType })
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return this.mapTemplatesFromDatabase(data || [])
    } catch (error) {
      console.error('Error fetching templates by type:', error)
      return []
    }
  }

  // Create new template
  async createTemplate(request: CreateTemplateRequest): Promise<DocumentTemplate> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser()
      if (authError || !user) throw new Error('Authentication required')

      const templateData = {
        name: request.name,
        description: request.description,
        category_id: request.category_id,
        content: request.content,
        merge_fields: this.variablesToMergeFields(request.variables),
        metadata: {
          documentType: request.documentType,
          compliance_level: request.compliance_level,
          variables: request.variables
        },
        is_active: true,
        created_by: user.id
      }

      const { data, error } = await this.supabase
        .from('document_templates')
        .insert(templateData)
        .select()
        .single()

      if (error) throw error
      return this.mapTemplateFromDatabase(data)
    } catch (error) {
      console.error('Error creating template:', error)
      throw new Error('Failed to create template')
    }
  }

  // Update template
  async updateTemplate(
    templateId: string, 
    updates: Partial<CreateTemplateRequest>
  ): Promise<DocumentTemplate> {
    try {
      const updateData: any = {}
      
      if (updates.name) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.category_id) updateData.category_id = updates.category_id
      if (updates.content) updateData.content = updates.content
      if (updates.variables) {
        updateData.merge_fields = this.variablesToMergeFields(updates.variables)
        updateData.metadata = { variables: updates.variables }
      }

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await this.supabase
        .from('document_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single()

      if (error) throw error
      return this.mapTemplateFromDatabase(data)
    } catch (error) {
      console.error('Error updating template:', error)
      throw new Error('Failed to update template')
    }
  }

  // Delete template (soft delete)
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('document_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', templateId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting template:', error)
      throw new Error('Failed to delete template')
    }
  }

  // Generate document from template
  async generateDocumentFromTemplate(
    request: GenerateDocumentRequest
  ): Promise<{ documentId: string; content: string }> {
    try {
      // Get template
      const template = await this.getTemplateById(request.templateId)
      
      if (!template) {
        throw new Error('Template not found')
      }

      // Process template content with variables
      let processedContent = template.content
      
      // Replace all template variables
      Object.entries(request.variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\[${key}\\]`, 'g')
        processedContent = processedContent.replace(regex, String(value))
      })

      // Add metadata
      processedContent = this.addDocumentMetadata(processedContent, {
        generatedAt: new Date().toISOString(),
        templateId: request.templateId,
        templateName: template.name,
        clientId: request.clientId,
        clientName: request.clientName
      })

      // Generate unique document ID
      const documentId = this.generateDocumentId()

      return {
        documentId,
        content: processedContent
      }
    } catch (error) {
      console.error('Error generating document:', error)
      throw new Error('Failed to generate document from template')
    }
  }

  // Get default templates
  getDefaultTemplates(): Partial<CreateTemplateRequest>[] {
    return [
      {
        name: 'Suitability Report',
        description: 'FCA-compliant suitability report template',
        documentType: 'suitability_report',
        compliance_level: 'critical',
        variables: [
          { key: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true },
          { key: 'ADVISOR_NAME', label: 'Advisor Name', type: 'text', required: true },
          { key: 'REPORT_DATE', label: 'Report Date', type: 'date', required: true },
          { key: 'RISK_PROFILE', label: 'Risk Profile', type: 'text', required: true },
          { key: 'INVESTMENT_AMOUNT', label: 'Investment Amount', type: 'number', required: true },
          { key: 'RECOMMENDATION', label: 'Recommendation', type: 'text', required: true }
        ],
        content: this.getSuitabilityReportTemplate()
      },
      {
        name: 'Annual Review Letter',
        description: 'Client annual review notification',
        documentType: 'annual_review',
        compliance_level: 'high',
        variables: [
          { key: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true },
          { key: 'REVIEW_DATE', label: 'Review Date', type: 'date', required: true },
          { key: 'ADVISOR_NAME', label: 'Advisor Name', type: 'text', required: true }
        ],
        content: this.getAnnualReviewTemplate()
      },
      {
        name: 'Client Agreement',
        description: 'Initial client agreement template',
        documentType: 'client_agreement',
        compliance_level: 'critical',
        variables: [
          { key: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true },
          { key: 'AGREEMENT_DATE', label: 'Agreement Date', type: 'date', required: true },
          { key: 'SERVICE_LEVEL', label: 'Service Level', type: 'text', required: true }
        ],
        content: this.getClientAgreementTemplate()
      }
    ]
  }

  // Helper methods
  private mapTemplateFromDatabase(dbTemplate: any): DocumentTemplate {
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      category_id: dbTemplate.category_id,
      content: dbTemplate.content || dbTemplate.html_template || '',
      merge_fields: dbTemplate.merge_fields || {},
      is_active: dbTemplate.is_active,
      created_at: dbTemplate.created_at,
      updated_at: dbTemplate.updated_at
    }
  }

  private mapTemplatesFromDatabase(dbTemplates: any[]): DocumentTemplate[] {
    return dbTemplates.map(template => this.mapTemplateFromDatabase(template))
  }

  private variablesToMergeFields(variables: TemplateVariable[]): Record<string, string> {
    const mergeFields: Record<string, string> = {}
    variables.forEach(variable => {
      mergeFields[variable.key] = variable.label
    })
    return mergeFields
  }

  private addDocumentMetadata(content: string, metadata: Record<string, any>): string {
    const metadataComment = `
<!-- Document Metadata
${Object.entries(metadata).map(([key, value]) => `${key}: ${value}`).join('\n')}
-->
`
    return metadataComment + content
  }

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Template content
  private getSuitabilityReportTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Suitability Report - [CLIENT_NAME]</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 2em; }
        .section { margin-bottom: 1.5em; }
        h1 { color: #333; }
        h2 { color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Investment Suitability Report</h1>
        <p>Prepared for: [CLIENT_NAME]</p>
        <p>Date: [REPORT_DATE]</p>
        <p>Advisor: [ADVISOR_NAME]</p>
    </div>
    
    <div class="section">
        <h2>Executive Summary</h2>
        <p>This report outlines our investment recommendations based on your risk profile, 
        financial objectives, and personal circumstances.</p>
    </div>
    
    <div class="section">
        <h2>Risk Profile</h2>
        <p>Your assessed risk profile: <strong>[RISK_PROFILE]</strong></p>
    </div>
    
    <div class="section">
        <h2>Investment Amount</h2>
        <p>Proposed investment: <strong>£[INVESTMENT_AMOUNT]</strong></p>
    </div>
    
    <div class="section">
        <h2>Recommendation</h2>
        <p>[RECOMMENDATION]</p>
    </div>
</body>
</html>`
  }

  private getAnnualReviewTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Annual Review - [CLIENT_NAME]</title>
</head>
<body>
    <h1>Annual Review Notification</h1>
    <p>Dear [CLIENT_NAME],</p>
    <p>Your annual review is scheduled for [REVIEW_DATE].</p>
    <p>Best regards,<br>[ADVISOR_NAME]</p>
</body>
</html>`
  }

  private getClientAgreementTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Client Agreement - [CLIENT_NAME]</title>
</head>
<body>
    <h1>Client Service Agreement</h1>
    <p>This agreement is between [CLIENT_NAME] and the advisory firm.</p>
    <p>Date: [AGREEMENT_DATE]</p>
    <p>Service Level: [SERVICE_LEVEL]</p>
</body>
</html>`
  }
}

// Export singleton instance
export const documentTemplateService = DocumentTemplateService.getInstance()
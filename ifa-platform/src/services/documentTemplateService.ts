// ===================================================================
// FILE: src/services/documentTemplateService.ts - FULLY FIXED VERSION
// ===================================================================
import { createClient } from '@/lib/supabase/client'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { Database, DbInsert, DbRow, DbUpdate } from '@/types/db'
import type { SupabaseClient } from '@supabase/supabase-js'
import clientLogger from '@/lib/logging/clientLogger'

// Type aliases for database tables
type DocumentTemplateRow = DbRow<'document_templates'>;
type DocumentTemplateInsert = DbInsert<'document_templates'>;
type DocumentTemplateUpdate = DbUpdate<'document_templates'>;

// Use existing types or define them
export type DocumentType = string
export type ComplianceLevel = 'critical' | 'high' | 'medium' | 'low'

// Template interfaces
export interface TemplateVariable {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean'
  required: boolean
  defaultValue?: string
}

export interface DocumentTemplate {
  id: string
  name: string
  description?: string | null
  category_id?: string | null
  content: string
  merge_fields?: Record<string, any>
  template_content?: string | null
  template_variables?: any
  is_active?: boolean | null
  firm_id?: string
  created_at?: string | null
  updated_at?: string | null
}

export interface DocumentCategory {
  id: string
  name: string
  description?: string | null
  requires_signature?: boolean | null
  compliance_level?: string | null
  template_available?: boolean | null
  created_at?: string | null
  updated_at?: string | null
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

// =====================================================
// ✅ ENHANCED: Template name to ID mapping
// =====================================================
const TEMPLATE_NAME_MAPPING: Record<string, string> = {
  'draft_report': 'draft_report',
  'suitability_report': 'suitability_report',
  'annual_review': 'annual_review',
  'client_agreement': 'client_agreement',
  'risk_assessment': 'risk_assessment_report',
  'investment_proposal': 'investment_proposal',
  'compliance_report': 'compliance_report'
}

const slugifyTemplateName = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// ===================================================================
// ENHANCED DOCUMENT TEMPLATE SERVICE CLASS
// ===================================================================
export class DocumentTemplateService {
  private _supabase: SupabaseClient<Database> | null = null
  private _supabaseInitialized = false
  private static instance: DocumentTemplateService
  private templateCache: Map<string, DocumentTemplate> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Lazy initialization - supabase client created on first access
  }

  private get supabase(): SupabaseClient<Database> | null {
    if (!this._supabaseInitialized) {
      this._supabaseInitialized = true
      try {
        if (typeof window === 'undefined') {
          this._supabase = getSupabaseServiceClient()
        } else {
          this._supabase = createClient()
        }
      } catch (error) {
        clientLogger.error("CRITICAL: Supabase client initialization failed in DocumentTemplateService. Check environment variables.", error)
        this._supabase = null
      }
    }
    return this._supabase
  }

  public static getInstance(): DocumentTemplateService {
    if (!DocumentTemplateService.instance) {
      DocumentTemplateService.instance = new DocumentTemplateService()
    }
    return DocumentTemplateService.instance
  }

  // Get current user context for firm_id
  private async getCurrentUserContext() {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error || !user) {
      throw new Error('User not authenticated')
    }

    // Get firm_id from user metadata or profiles table
    let firmId = user.user_metadata?.firm_id || user.user_metadata?.firmId

    if (!firmId) {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single()
      
      firmId = profile?.firm_id
    }

    // Firm ID is required - no hardcoded fallbacks for security
    if (!firmId) {
      throw new Error('Firm ID not configured. Your account must be associated with a firm.')
    }

    return { user, firmId }
  }

  // =====================================================
  // ✅ ENHANCED: Get template by ID with caching
  // =====================================================
  async getTemplateById(templateId: string): Promise<DocumentTemplate | null> {
    if (!this.supabase) {
      clientLogger.error("Action failed: Supabase client is not available in getTemplateById.")
      return this.getDefaultTemplateById(templateId)
    }

    try {
      // Check if it's a template name that needs mapping
      const mappedId = TEMPLATE_NAME_MAPPING[templateId] || templateId

      // Check cache first
      const cached = this.getCachedTemplate(mappedId)
      if (cached) {
        return cached
      }

      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let query;

      if (uuidRegex.test(mappedId)) {
        // It's a valid UUID, search by ID
        query = this.supabase
          .from('document_templates')
          .select('*')
          .eq('id', mappedId)
      } else {
        // It's a name, search by name
        query = this.supabase
          .from('document_templates')
          .select('*')
          .eq('name', mappedId)
      }

      const { data, error } = await query.single()

      if (error) {
        clientLogger.error('Error fetching template by ID/name:', error)
        // If not found in DB, try by name
        const templateByName = await this.getTemplateByName(templateId)
        if (templateByName) {
          return templateByName
        }
        // Finally, try default templates
        return this.getDefaultTemplateById(mappedId)
      }

      const template = data ? this.mapTemplateFromDatabase(data) : null
      if (template) {
        this.cacheTemplate(mappedId, template)
      }

      return template
    } catch (error) {
      clientLogger.error('Error in getTemplateById:', error)
      return this.getDefaultTemplateById(templateId)
    }
  }

  // =====================================================
  // ✅ NEW: Get template by name
  // =====================================================
  async getTemplateByName(templateName: string): Promise<DocumentTemplate | null> {
    if (!this.supabase) {
      clientLogger.error("Action failed: Supabase client is not available in getTemplateByName.")
      return this.getDefaultTemplateByName(templateName)
    }

    try {
      // Check mapping first
      const mappedName = TEMPLATE_NAME_MAPPING[templateName] || templateName

      // Check cache
      const cached = this.getCachedTemplate(mappedName)
      if (cached) {
        return cached
      }

      // Try to fetch by name
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('name', templateName)
        .eq('is_active', true)
        .single()

      if (error) {
        clientLogger.error('Error fetching template by name:', error)
        // Try default templates
        return this.getDefaultTemplateByName(templateName)
      }

      const template = data ? this.mapTemplateFromDatabase(data) : null
      if (template) {
        this.cacheTemplate(mappedName, template)
      }

      return template
    } catch (error) {
      clientLogger.error('Error in getTemplateByName:', error)
      return this.getDefaultTemplateByName(templateName)
    }
  }

  // =====================================================
  // ✅ ENHANCED: Get all templates with caching
  // =====================================================
  async getTemplates(): Promise<DocumentTemplate[]> {
    if (!this.supabase) {
      clientLogger.error("Action failed: Supabase client is not available in getTemplates.")
      return this.getDefaultTemplatesAsList()
    }

    try {
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        clientLogger.error('Error fetching templates:', error)
        return this.getDefaultTemplatesAsList()
      }

      const templates = this.mapTemplatesFromDatabase(data || [])

      // Cache all templates
      templates.forEach(template => {
        this.cacheTemplate(template.id, template)
      })

      return templates
    } catch (error) {
      clientLogger.error('Error in getTemplates:', error)
      return this.getDefaultTemplatesAsList()
    }
  }

  // =====================================================
  // ✅ NEW: Cache management methods
  // =====================================================
  private cacheTemplate(id: string, template: DocumentTemplate): void {
    this.templateCache.set(id, template)
    this.cacheExpiry.set(id, Date.now() + this.CACHE_DURATION)
  }

  private getCachedTemplate(id: string): DocumentTemplate | null {
    const expiry = this.cacheExpiry.get(id)
    if (!expiry || Date.now() > expiry) {
      this.templateCache.delete(id)
      this.cacheExpiry.delete(id)
      return null
    }
    return this.templateCache.get(id) || null
  }

  clearCache(): void {
    this.templateCache.clear()
    this.cacheExpiry.clear()
  }

  // =====================================================
  // ✅ ENHANCED: Get default template by ID
  // =====================================================
  private getDefaultTemplateById(templateId: string): DocumentTemplate | null {
    const mappedId = TEMPLATE_NAME_MAPPING[templateId] || templateId
    const defaultTemplates = this.getDefaultTemplates()
    const template = defaultTemplates.find(t => {
      const templateName = t.name ? slugifyTemplateName(t.name) : ''
      return templateName === mappedId || t.documentType === mappedId
    })

    if (template) {
      return {
        id: mappedId,
        name: template.name || '',
        description: template.description,
        category_id: undefined,
        content: template.content || '',
        merge_fields: this.variablesToMergeFields(template.variables || []),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    return null
  }

  // =====================================================
  // ✅ NEW: Get default template by name
  // =====================================================
  private getDefaultTemplateByName(templateName: string): DocumentTemplate | null {
    const defaultTemplates = this.getDefaultTemplates()
    const normalized = templateName.toLowerCase()
    const template = defaultTemplates.find(t => {
      const candidate = t.name ? slugifyTemplateName(t.name) : ''
      return t.name?.toLowerCase() === normalized || candidate === normalized
    })

    if (template) {
      return {
        id: templateName.toLowerCase().replace(/\s+/g, '_'),
        name: template.name || '',
        description: template.description,
        category_id: undefined,
        content: template.content || '',
        merge_fields: this.variablesToMergeFields(template.variables || []),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    return null
  }

  // =====================================================
  // ✅ ENHANCED: Get default templates as list
  // =====================================================
  private getDefaultTemplatesAsList(): DocumentTemplate[] {
    return this.getDefaultTemplates().map((t, index) => {
      const fallbackName = t.name || `Template ${index + 1}`
      const slug = slugifyTemplateName(fallbackName)
      const id = slug || t.documentType || `template_${index}`
      return {
        id,
        name: t.name || '',
        description: t.description,
        category_id: undefined,
        content: t.content || '',
        merge_fields: this.variablesToMergeFields(t.variables || []),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })
  }

  // Get templates by category
  async getTemplatesByCategory(categoryId: string): Promise<DocumentTemplate[]> {
    if (!this.supabase) {
      clientLogger.error("Action failed: Supabase client is not available in getTemplatesByCategory.")
      return []
    }

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
      clientLogger.error('Error fetching templates by category:', error)
      return []
    }
  }

  // Get templates by type
  async getTemplatesByType(documentType: DocumentType): Promise<DocumentTemplate[]> {
    if (!this.supabase) {
      clientLogger.error("Action failed: Supabase client is not available in getTemplatesByType.")
      return []
    }

    try {
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('assessment_type', documentType) // Using assessment_type from schema
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return this.mapTemplatesFromDatabase(data || [])
    } catch (error) {
      clientLogger.error('Error fetching templates by type:', error)
      return []
    }
  }

  // Create new template - FIXED: Convert to plain JSON
  async createTemplate(request: CreateTemplateRequest): Promise<DocumentTemplate> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available in createTemplate.")
    }

    try {
      const { user, firmId } = await this.getCurrentUserContext()

      // FIX: Convert variables to plain JSON objects
      const templateData: DocumentTemplateInsert = {
        name: request.name,
        description: request.description,
        category_id: request.category_id,
        template_content: request.content,
        template_variables: JSON.parse(JSON.stringify({
          variables: request.variables,
          merge_fields: this.variablesToMergeFields(request.variables)
        })), // Convert to plain JSON
        assessment_type: request.documentType,
        is_active: true,
        firm_id: firmId,
        created_by: user.id
      }

      const { data, error } = await this.supabase
        .from('document_templates')
        .insert(templateData)
        .select()
        .single()

      if (error) throw error

      const template = this.mapTemplateFromDatabase(data)
      this.cacheTemplate(template.id, template)
      return template
    } catch (error) {
      clientLogger.error('Error creating template:', error)
      throw new Error('Failed to create template: ' + (error as Error).message)
    }
  }

  // Update template - FIXED: Convert to plain JSON
  async updateTemplate(
    templateId: string,
    updates: Partial<CreateTemplateRequest>
  ): Promise<DocumentTemplate> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available in updateTemplate.")
    }

    try {
      const updateData: DocumentTemplateUpdate = {}
      
      if (updates.name) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.category_id) updateData.category_id = updates.category_id
      if (updates.content) updateData.template_content = updates.content
      if (updates.documentType) updateData.assessment_type = updates.documentType
      if (updates.variables) {
        // FIX: Convert to plain JSON
        updateData.template_variables = JSON.parse(JSON.stringify({
          variables: updates.variables,
          merge_fields: this.variablesToMergeFields(updates.variables)
        }))
      }
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await this.supabase
        .from('document_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single()

      if (error) throw error

      const template = this.mapTemplateFromDatabase(data)
      // Update cache
      this.cacheTemplate(template.id, template)
      return template
    } catch (error) {
      clientLogger.error('Error updating template:', error)
      throw new Error('Failed to update template: ' + (error as Error).message)
    }
  }

  // Delete template (soft delete)
  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error("Cannot perform action: Supabase client is not available in deleteTemplate.")
    }

    try {
      const updateData: DocumentTemplateUpdate = {
        is_active: false,
        updated_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('document_templates')
        .update(updateData)
        .eq('id', templateId)

      if (error) throw error

      // Remove from cache
      this.templateCache.delete(templateId)
      this.cacheExpiry.delete(templateId)
    } catch (error) {
      clientLogger.error('Error deleting template:', error)
      throw new Error('Failed to delete template: ' + (error as Error).message)
    }
  }

  // =====================================================
  // ✅ ENHANCED: Generate document from template
  // =====================================================
  async generateDocumentFromTemplate(
    request: GenerateDocumentRequest
  ): Promise<{ documentId: string; content: string }> {
    try {
      // Get template - will handle name mapping automatically
      const template = await this.getTemplateById(request.templateId) ||
                      await this.getTemplateByName(request.templateId)

      if (!template) {
        throw new Error(`Template not found: ${request.templateId}`)
      }

      // Process template content with variables
      let processedContent = template.content || template.template_content || ''

      // Replace all template variables (both formats)
      Object.entries(request.variables).forEach(([key, value]) => {
        // Handle [KEY] format
        const bracketRegex = new RegExp(`\\[${key}\\]`, 'g')
        processedContent = processedContent.replace(bracketRegex, String(value))

        // Handle {{KEY}} format
        const curlyRegex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
        processedContent = processedContent.replace(curlyRegex, String(value))

        // Handle ${KEY} format
        const dollarRegex = new RegExp(`\\$\\{${key}\\}`, 'g')
        processedContent = processedContent.replace(dollarRegex, String(value))
      })

      // Add metadata
      processedContent = this.addDocumentMetadata(processedContent, {
        generatedAt: new Date().toISOString(),
        templateId: template.id,
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
      clientLogger.error('Error generating document:', error)
      throw new Error('Failed to generate document from template: ' + (error as Error).message)
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
          { key: 'FIRM_NAME', label: 'Firm Name', type: 'text', required: false },
          { key: 'FIRM_FCA_NUMBER', label: 'FCA Number', type: 'text', required: false },
          { key: 'FIRM_ADDRESS', label: 'Firm Address', type: 'text', required: false },
          { key: 'RISK_PROFILE', label: 'Risk Profile', type: 'text', required: true },
          { key: 'INVESTMENT_AMOUNT', label: 'Investment Amount', type: 'number', required: true },
          { key: 'RECOMMENDATION', label: 'Recommendation', type: 'text', required: true }
        ],
        content: this.getSuitabilityReportTemplate()
      },
      {
        name: 'Draft Report',
        description: 'Draft suitability assessment report',
        documentType: 'suitability_report',
        compliance_level: 'high',
        variables: [
          { key: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true },
          { key: 'ASSESSMENT_DATE', label: 'Assessment Date', type: 'date', required: true },
          { key: 'FIRM_NAME', label: 'Firm Name', type: 'text', required: false },
          { key: 'FIRM_FCA_NUMBER', label: 'FCA Number', type: 'text', required: false },
          { key: 'FIRM_ADDRESS', label: 'Firm Address', type: 'text', required: false },
          { key: 'COMPLETION_PERCENTAGE', label: 'Completion %', type: 'number', required: true }
        ],
        content: this.getDraftReportTemplate()
      },
      {
        name: 'Annual Review Letter',
        description: 'Client annual review notification',
        documentType: 'annual_review',
        compliance_level: 'high',
        variables: [
          { key: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true },
          { key: 'REVIEW_DATE', label: 'Review Date', type: 'date', required: true },
          { key: 'FIRM_NAME', label: 'Firm Name', type: 'text', required: false },
          { key: 'FIRM_FCA_NUMBER', label: 'FCA Number', type: 'text', required: false },
          { key: 'FIRM_ADDRESS', label: 'Firm Address', type: 'text', required: false },
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
          { key: 'FIRM_NAME', label: 'Firm Name', type: 'text', required: false },
          { key: 'FIRM_FCA_NUMBER', label: 'FCA Number', type: 'text', required: false },
          { key: 'FIRM_ADDRESS', label: 'Firm Address', type: 'text', required: false },
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
      content: dbTemplate.template_content || dbTemplate.html_template || '',
      merge_fields: dbTemplate.merge_fields || {},
      template_content: dbTemplate.template_content,
      template_variables: dbTemplate.template_variables,
      is_active: dbTemplate.is_active,
      firm_id: dbTemplate.firm_id,
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
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { text-align: center; margin-bottom: 2em; background: #f8f9fa; padding: 2em; }
    .section { margin-bottom: 2em; page-break-inside: avoid; }
    .section h2 { color: #2c5282; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5em; }
    .field { margin: 1em 0; }
    .field-label { font-weight: bold; color: #4a5568; }
    .field-value { margin-left: 1em; }
    .footer { margin-top: 3em; padding-top: 2em; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; }
    @media print {
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Investment Suitability Report</h1>
    <p>Prepared for: <strong>[CLIENT_NAME]</strong></p>
    <p>Date: <strong>[REPORT_DATE]</strong></p>
    <p>Advisor: <strong>[ADVISOR_NAME]</strong></p>
    <p>Firm: <strong>[FIRM_NAME]</strong> <span style="color:#718096;">(FCA [FIRM_FCA_NUMBER])</span></p>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <p>This report outlines our investment recommendations based on your risk profile,
    financial objectives, and personal circumstances. Our assessment ensures compliance with
    FCA regulations and is designed to deliver good outcomes aligned with your needs.</p>
  </div>

  <div class="section">
    <h2>Risk Profile Assessment</h2>
    <div class="field">
      <span class="field-label">Risk Profile:</span>
      <span class="field-value">[RISK_PROFILE]</span>
    </div>
    <p>Your risk profile has been carefully assessed considering both your attitude to risk
    and capacity for loss. This ensures our recommendations are suitable for your circumstances.</p>
  </div>

  <div class="section">
    <h2>Investment Recommendation</h2>
    <div class="field">
      <span class="field-label">Recommended Investment Amount:</span>
      <span class="field-value">£[INVESTMENT_AMOUNT]</span>
    </div>
    <div class="field">
      <span class="field-label">Recommendation Details:</span>
      <div class="field-value">[RECOMMENDATION]</div>
    </div>
  </div>

  <div class="section">
    <h2>Next Steps</h2>
    <ol>
      <li>Review this report carefully</li>
      <li>Contact us with any questions</li>
      <li>Schedule a follow-up meeting to proceed</li>
      <li>Regular reviews will be conducted annually</li>
    </ol>
  </div>

  <div class="footer">
    <p>This report is confidential and prepared specifically for [CLIENT_NAME]</p>
    <p>© 2024 Financial Advisory Services. All rights reserved.</p>
  </div>
</body>
</html>`
  }

  // =====================================================
  // ✅ NEW: Draft report template
  // =====================================================
  private getDraftReportTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Draft Suitability Assessment - [CLIENT_NAME]</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #fffbeb; border: 2px solid #f59e0b; padding: 2em; margin-bottom: 2em; }
    .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 1em; margin: 1em 0; }
    .progress { background: #f3f4f6; border-radius: 8px; padding: 1em; margin: 2em 0; }
    .section { margin-bottom: 2em; }
    h1 { color: #1f2937; }
    h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5em; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚠️ DRAFT - Suitability Assessment Report</h1>
    <p><strong>This is a draft document and not yet finalized</strong></p>
    <p>Client: <strong>[CLIENT_NAME]</strong></p>
    <p>Assessment Date: <strong>[ASSESSMENT_DATE]</strong></p>
  </div>

  <div class="warning">
    <strong>Important:</strong> This draft report is for review purposes only.
    The assessment is [COMPLETION_PERCENTAGE]% complete.
    All sections must be completed before final submission.
  </div>

  <div class="progress">
    <h3>Assessment Progress</h3>
    <p>Completion: <strong>[COMPLETION_PERCENTAGE]%</strong></p>
    <p>Status: <strong>DRAFT</strong></p>
  </div>

  <div class="section">
    <h2>Sections Requiring Completion</h2>
    <p>Please complete all required sections before finalizing this assessment.</p>
  </div>

  <div class="section">
    <h2>Next Steps</h2>
    <ol>
      <li>Complete all remaining sections</li>
      <li>Review and validate all information</li>
      <li>Submit for compliance review</li>
      <li>Generate final report</li>
    </ol>
  </div>
</body>
</html>`
  }

  private getAnnualReviewTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Annual Review - [CLIENT_NAME]</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; color: #2d3748; max-width: 800px; margin: 0 auto; padding: 2em; }
    .letterhead { text-align: right; margin-bottom: 3em; color: #718096; }
    .greeting { margin: 2em 0; }
    .content { margin: 2em 0; }
    .signature { margin-top: 3em; }
  </style>
</head>
<body>
  <div class="letterhead">
    <p><strong>[FIRM_NAME]</strong></p>
    <p>[FIRM_ADDRESS]</p>
    <p>FCA: [FIRM_FCA_NUMBER]</p>
    <p>[REVIEW_DATE]</p>
  </div>

  <div class="greeting">
    <p>Dear [CLIENT_NAME],</p>
  </div>

  <div class="content">
    <p>I hope this letter finds you well. As part of our ongoing commitment to your financial wellbeing,
    it's time for your annual investment review.</p>

    <p>This review is an important opportunity to:</p>
    <ul>
      <li>Assess the performance of your investments</li>
      <li>Review your financial objectives and circumstances</li>
      <li>Ensure your portfolio remains aligned with your goals</li>
      <li>Discuss any changes in regulations or opportunities</li>
    </ul>

    <p>Your annual review is scheduled for <strong>[REVIEW_DATE]</strong>.
    Please contact us if you need to reschedule.</p>
  </div>

  <div class="signature">
    <p>Best regards,</p>
    <p><strong>[ADVISOR_NAME]</strong></p>
    <p>Your Financial Advisor</p>
  </div>
</body>
</html>`
  }

  private getClientAgreementTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Client Service Agreement - [CLIENT_NAME]</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #1a202c; }
    .agreement-header { text-align: center; margin-bottom: 3em; }
    .section { margin: 2em 0; }
    .section h2 { color: #2d3748; border-bottom: 2px solid #cbd5e0; padding-bottom: 0.5em; }
    .terms { background: #f7fafc; padding: 1.5em; border-left: 4px solid #4299e1; margin: 1em 0; }
    .signature-section { margin-top: 4em; border-top: 1px solid #cbd5e0; padding-top: 2em; }
    .signature-box { display: inline-block; width: 45%; margin: 1em 0; }
  </style>
</head>
<body>
  <div class="agreement-header">
    <h1>Client Service Agreement</h1>
    <p>This agreement is made on <strong>[AGREEMENT_DATE]</strong></p>
    <p>Between the advisory firm and <strong>[CLIENT_NAME]</strong></p>
    <p><strong>[FIRM_NAME]</strong> — FCA [FIRM_FCA_NUMBER]</p>
    <p>[FIRM_ADDRESS]</p>
  </div>

  <div class="section">
    <h2>1. Services</h2>
    <p>We agree to provide financial advisory services at the <strong>[SERVICE_LEVEL]</strong> level.</p>
    <div class="terms">
      <p>This includes:</p>
      <ul>
        <li>Initial financial planning and analysis</li>
        <li>Investment recommendations</li>
        <li>Ongoing portfolio management</li>
        <li>Regular reviews and rebalancing</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>2. Client Responsibilities</h2>
    <p>The client agrees to:</p>
    <ul>
      <li>Provide accurate and complete information</li>
      <li>Notify us of any material changes in circumstances</li>
      <li>Review and respond to our communications promptly</li>
    </ul>
  </div>

  <div class="section">
    <h2>3. Fees and Charges</h2>
    <p>Our fees are structured according to the <strong>[SERVICE_LEVEL]</strong> service level
    as detailed in the separate fee schedule.</p>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <p>Client Signature:</p>
      <p>_______________________</p>
      <p>[CLIENT_NAME]</p>
      <p>Date: [AGREEMENT_DATE]</p>
    </div>
    <div class="signature-box">
      <p>Advisor Signature:</p>
      <p>_______________________</p>
      <p>Authorized Representative</p>
      <p>Date: [AGREEMENT_DATE]</p>
    </div>
  </div>
</body>
</html>`
  }
}

// Export singleton instance
export const documentTemplateService = DocumentTemplateService.getInstance()
export default documentTemplateService

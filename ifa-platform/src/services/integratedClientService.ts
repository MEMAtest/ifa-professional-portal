// ===================================================================
// INTEGRATED CLIENT SERVICE - Works with Your Existing Structure
// File: src/services/integratedClientService.ts
// ===================================================================

import { createBrowserClient } from '@supabase/ssr'
import type { ClientProfile } from '@/types'

// Extend your existing ClientProfile interface for document integration
export interface ExtendedClientProfile extends ClientProfile {
  // Add document-specific fields that might be missing
  riskProfile?: {
    riskTolerance?: string
    attitudeToRisk?: number
  }
  financialProfile?: {
    investmentAmount?: number
    netWorth?: number
    annualIncome?: number
  }
  contactDetails: {
    phone: string
    email: string
    preferredContact: 'phone' | 'email' | 'post'
  }
}

export class IntegratedClientService {
  private supabase

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Get real clients from your existing database structure
  async getClients(): Promise<ExtendedClientProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the database client format to your ClientProfile format
      return (data || []).map(this.transformToClientProfile)
    } catch (error) {
      console.error('Error fetching clients:', error)
      return []
    }
  }

  async getClientById(id: string): Promise<ExtendedClientProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return this.transformToClientProfile(data)
    } catch (error) {
      console.error('Error fetching client:', error)
      return null
    }
  }

  // Transform database client to your ClientProfile interface
  private transformToClientProfile(dbClient: any): ExtendedClientProfile {
    const personalDetails = dbClient.personal_details || {}
    const contactInfo = dbClient.contact_info || {}
    const financialProfile = dbClient.financial_profile || {}
    const riskProfile = dbClient.risk_profile || {}

    return {
      id: dbClient.id,
      clientRef: dbClient.client_ref || `CLI${dbClient.id.slice(-4)}`,
      title: personalDetails.title || '',
      firstName: personalDetails.firstName || personalDetails.first_name || '',
      lastName: personalDetails.lastName || personalDetails.last_name || '',
      dateOfBirth: personalDetails.dateOfBirth || personalDetails.date_of_birth || '',
      age: this.calculateAge(personalDetails.dateOfBirth || personalDetails.date_of_birth),
      occupation: personalDetails.occupation || '',
      maritalStatus: personalDetails.maritalStatus || personalDetails.marital_status || '',
      dependents: personalDetails.dependents || 0,
      address: {
        street: contactInfo.address?.line1 || '',
        city: contactInfo.address?.city || '',
        postcode: contactInfo.address?.postcode || '',
        country: contactInfo.address?.country || 'UK'
      },
      contactDetails: {
        phone: contactInfo.phone || '',
        email: contactInfo.email || '',
        preferredContact: contactInfo.preferredContact || 'email'
      },
      createdAt: dbClient.created_at,
      updatedAt: dbClient.updated_at,
      
      // Add financial and risk profile for document generation
      financialProfile: {
        investmentAmount: financialProfile.investmentAmount || financialProfile.netWorth || 0,
        netWorth: financialProfile.netWorth || 0,
        annualIncome: financialProfile.annualIncome || 0
      },
      riskProfile: {
        riskTolerance: riskProfile.riskTolerance || 'Moderate',
        attitudeToRisk: riskProfile.attitudeToRisk || 5
      }
    }
  }

  private calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0
    const today = new Date()
    const birth = new Date(dateOfBirth)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Helper function to get client display name
  getClientDisplayName(client: ExtendedClientProfile): string {
    const title = client.title ? `${client.title} ` : ''
    return `${title}${client.firstName} ${client.lastName}`.trim()
  }
}

// ===================================================================
// DOCUMENT GENERATION SERVICE - Integrated with Your Client Types
// File: src/services/integratedDocumentService.ts
// ===================================================================

import { DocumentGenerationService } from './documentGenerationService'
import { DocuSealService } from './docuSealService'
import { DocumentTemplateService } from './documentTemplateService'

export interface DocumentTemplate {
  id: string
  name: string
  description?: string
  template_content: string
  requires_signature: boolean
  template_variables: Record<string, string>
  created_at: string
}

export interface GenerateDocumentParams {
  templateId: string
  clientId: string
  customVariables?: Record<string, any>
}

export class IntegratedDocumentService {
  private supabase
  private documentGeneration: DocumentGenerationService
  private docuSeal: DocuSealService
  private templateService: DocumentTemplateService

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    this.documentGeneration = new DocumentGenerationService()
    this.docuSeal = new DocuSealService()
    this.templateService = new DocumentTemplateService()
  }

  async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching templates:', error)
      return []
    }
  }

  async generateDocument(params: GenerateDocumentParams, client: ExtendedClientProfile): Promise<{
    success: boolean
    document?: any
    error?: string
  }> {
    try {
      // Get template
      const template = await this.getTemplateById(params.templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      // Prepare variables for template processing
      const variables = {
        CLIENT_NAME: new IntegratedClientService().getClientDisplayName(client),
        CLIENT_EMAIL: client.contactDetails.email || '',
        CLIENT_REF: client.clientRef || '',
        ADVISOR_NAME: 'Professional Advisor', // TODO: Get from auth context
        REPORT_DATE: new Date().toLocaleDateString('en-GB'),
        RISK_PROFILE: client.riskProfile?.riskTolerance || 'Not assessed',
        INVESTMENT_AMOUNT: client.financialProfile?.investmentAmount || 0,
        NET_WORTH: client.financialProfile?.netWorth || 0,
        ANNUAL_INCOME: client.financialProfile?.annualIncome || 0,
        RECOMMENDATION: 'Based on your risk profile and financial objectives...',
        ...params.customVariables
      }

      // Process template content
      let processedContent = template.template_content
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        processedContent = processedContent.replace(regex, String(value))
      })

      // Generate PDF document
      const result = await this.documentGeneration.generateDocument({
        content: processedContent,
        title: `${template.name} - ${variables.CLIENT_NAME}`,
        clientId: client.id,
        templateId: template.id,
        metadata: {
          templateName: template.name,
          clientRef: client.clientRef,
          generatedAt: new Date().toISOString()
        }
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      // If template requires signature and client has email, send for signature
      if (template.requires_signature && client.contactDetails.email) {
        try {
          await this.sendForSignature(result.document!.id, client, template)
        } catch (signatureError) {
          console.error('Signature request failed:', signatureError)
          // Document is still generated, just signature failed
        }
      }

      return result
    } catch (error) {
      console.error('Document generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed'
      }
    }
  }

  private async getTemplateById(templateId: string): Promise<DocumentTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching template:', error)
      return null
    }
  }

  private async sendForSignature(documentId: string, client: ExtendedClientProfile, template: DocumentTemplate) {
    // Get document URL
    const { data: document } = await this.supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single()

    if (!document) return

    // Get public URL for the document
    const { data: { publicUrl } } = this.supabase.storage
      .from('documents')
      .getPublicUrl(document.file_path)

    // Create DocuSeal template
    const docuSealTemplate = await this.docuSeal.createTemplateFromDocument(
      publicUrl,
      `${template.name} - ${client.clientRef}`
    )

    // Send for signature
    const signatureRequest = await this.docuSeal.sendForSignature({
      templateId: docuSealTemplate.id,
      signerEmail: client.contactDetails.email,
      signerName: new IntegratedClientService().getClientDisplayName(client),
      metadata: {
        documentId,
        clientId: client.id,
        templateId: template.id
      }
    })

    // Save signature request to database
    await this.supabase.from('signature_requests').insert({
      document_id: documentId,
      docuseal_submission_id: signatureRequest.id,
      client_id: client.id,
      client_ref: client.clientRef,
      recipient_email: client.contactDetails.email,
      recipient_name: new IntegratedClientService().getClientDisplayName(client),
      status: 'sent',
      subject: `Please sign: ${template.name}`,
      message: 'Please review and sign the attached document.'
    })
  }

  // Get client documents
  async getClientDocuments(clientId: string) {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select(`
          *,
          signature_requests (
            id,
            status,
            docuseal_submission_id,
            sent_at,
            completed_at
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(doc => ({
        ...doc,
        signature_status: doc.signature_requests?.[0]?.status || null,
        signature_request_id: doc.signature_requests?.[0]?.id || null
      }))
    } catch (error) {
      console.error('Error fetching client documents:', error)
      return []
    }
  }
}

// ===================================================================
// WORKFLOW ENGINE INTEGRATION - Enhanced with Real Data
// File: src/services/integratedWorkflowEngine.ts
// ===================================================================

export type DocumentType = 
  | 'client_agreement'
  | 'fact_find'
  | 'suitability_assessment' 
  | 'suitability_report'
  | 'investment_recommendation'
  | 'annual_review'
  | 'risk_assessment'
  | 'ongoing_service_agreement'
  | 'withdrawal_form'
  | 'portfolio_review'
  | 'compliance_declaration'

export interface RequiredDocument {
  type: DocumentType
  title: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  dueDate?: string
  canAutoGenerate: boolean
  templateId?: string
}

export class IntegratedWorkflowEngine {
  private clientService: IntegratedClientService
  private documentService: IntegratedDocumentService

  constructor() {
    this.clientService = new IntegratedClientService()
    this.documentService = new IntegratedDocumentService()
  }

  async getClientWorkflow(clientId: string) {
    const client = await this.clientService.getClientById(clientId)
    if (!client) return null

    const documents = await this.documentService.getClientDocuments(clientId)
    const templates = await this.documentService.getDocumentTemplates()

    const completedTypes = new Set(
      documents.map(d => this.getDocumentTypeFromName(d.name))
    )

    const requiredDocuments = this.getRequiredDocuments(client, completedTypes)
    const suggestedDocuments = this.getSuggestedDocuments(client, completedTypes)

    return {
      client,
      documents,
      templates,
      requiredDocuments,
      suggestedDocuments,
      completionStatus: this.calculateCompletionStatus(completedTypes)
    }
  }

  private getRequiredDocuments(client: ExtendedClientProfile, completed: Set<DocumentType>): RequiredDocument[] {
    const required: RequiredDocument[] = []

    // Client Agreement (always first)
    if (!completed.has('client_agreement')) {
      required.push({
        type: 'client_agreement',
        title: 'Client Service Agreement',
        description: 'Initial service agreement outlining terms and fees',
        urgency: 'high',
        canAutoGenerate: true,
        templateId: this.findTemplateByName('Client Service Agreement')
      })
    }

    // Suitability Report (after agreement)
    if (completed.has('client_agreement') && !completed.has('suitability_report')) {
      required.push({
        type: 'suitability_report',
        title: 'Suitability Report',
        description: 'Comprehensive suitability assessment report',
        urgency: 'high',
        canAutoGenerate: true,
        templateId: this.findTemplateByName('Suitability Report')
      })
    }

    // Annual Review (if more than 12 months)
    const clientAge = this.getClientAgeInMonths(client.createdAt)
    if (clientAge >= 12 && !this.hasRecentAnnualReview(completed)) {
      required.push({
        type: 'annual_review',
        title: 'Annual Review',
        description: 'Mandatory annual client review and portfolio assessment',
        urgency: 'medium',
        canAutoGenerate: true,
        templateId: this.findTemplateByName('Annual Review Report')
      })
    }

    return required
  }

  private getSuggestedDocuments(client: ExtendedClientProfile, completed: Set<DocumentType>) {
    const suggestions = []

    // High-value client suggestions
    if (client.financialProfile?.investmentAmount && client.financialProfile.investmentAmount > 250000) {
      if (!completed.has('portfolio_review')) {
        suggestions.push({
          type: 'portfolio_review',
          title: 'Portfolio Review',
          reason: 'High-value client - recommend detailed portfolio analysis',
          canAutoGenerate: true
        })
      }
    }

    return suggestions
  }

  private findTemplateByName(name: string): string | undefined {
    // This would be populated with actual template IDs from the database
    // For now, return undefined - the templates will be loaded dynamically
    return undefined
  }

  private getDocumentTypeFromName(name: string): DocumentType {
    // Map document names to types
    if (name.toLowerCase().includes('agreement')) return 'client_agreement'
    if (name.toLowerCase().includes('suitability')) return 'suitability_report'
    if (name.toLowerCase().includes('annual')) return 'annual_review'
    return 'client_agreement' // Default
  }

  private getClientAgeInMonths(createdAt: string): number {
    const created = new Date(createdAt)
    const now = new Date()
    return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30)
  }

  private hasRecentAnnualReview(completed: Set<DocumentType>): boolean {
    // This would check for recent annual reviews in the database
    return completed.has('annual_review')
  }

  private calculateCompletionStatus(completed: Set<DocumentType>) {
    const requiredTypes = ['client_agreement', 'suitability_report']
    const completedRequired = requiredTypes.filter(type => completed.has(type as DocumentType))
    return {
      completed: completedRequired.length,
      total: requiredTypes.length,
      percentage: Math.round((completedRequired.length / requiredTypes.length) * 100)
    }
  }
}

// ===================================================================
// EXPORT SINGLETON INSTANCES
// ===================================================================

export const integratedClientService = new IntegratedClientService()
export const integratedDocumentService = new IntegratedDocumentService()
export const integratedWorkflowEngine = new IntegratedWorkflowEngine()
// ===================================================================
// REAL INTEGRATED SERVICES - FIXED VERSION WITH MISSING METHODS
// File: src/services/realIntegratedServices.ts
// ===================================================================

import { createClient } from '@/lib/supabase/client'
import type { Client, ClientListResponse } from '@/types/client'
import { DocumentGenerationService } from './documentGenerationService'
import { DocumentTemplateService } from './documentTemplateService'
import { clientService } from './ClientService'
import type { GeneratedDocument } from '@/types/document'
import { OpenSignService, type SignerInfo, type SignatureRequestOptions } from './OpenSignService'
import clientLogger from '@/lib/logging/clientLogger'

// ===================================================================
// INTERFACES
// ===================================================================

export interface IntegrationResult {
  success: boolean
  data?: any
  error?: string
  message?: string
}

export interface DocumentGenerationResult {
  success: boolean
  document?: any
  url?: string
  error?: string
}

// Extended Client type for integration
export interface ExtendedClient extends Client {
  integrationStatus?: {
    hasAssessment: boolean
    hasScenario: boolean
    hasDocuments: boolean
    hasMonteCarlo: boolean
    lastUpdated: string
  }
}

// ===================================================================
// REAL CLIENT SERVICE - Works with your actual database
// ===================================================================

export class RealClientService {
  private supabase
  
  constructor() {
    this.supabase = createClient()
  }

  async getAllClients(): Promise<Client[]> {
    try {
      const response: ClientListResponse = await clientService.getAllClients()
      return response.clients // Extract the clients array from the response
    } catch (error) {
      clientLogger.error('Error fetching clients:', error)
      return []
    }
  }

  async getClientById(id: string): Promise<Client | null> {
    try {
      const client = await clientService.getClientById(id)
      return client
    } catch (error) {
      clientLogger.error('Error fetching client:', error)
      return null
    }
  }

  getClientDisplayName(client: Client): string {
    const title = client.personalDetails?.title ? `${client.personalDetails.title} ` : ''
    return `${title}${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`.trim()
  }
}

// ===================================================================
// REAL DOCUMENT SERVICE - Enhanced with missing methods
// ===================================================================

export class RealDocumentService {
  private supabase
  private documentService: DocumentGenerationService
  private templateService: DocumentTemplateService
  private openSignService: OpenSignService | null = null

  constructor() {
    this.supabase = createClient()
    this.documentService = new DocumentGenerationService()
    this.templateService = new DocumentTemplateService()

    // Initialize OpenSign service if API key is available
    try {
      const apiKey = process.env.OPENSIGN_API_KEY || process.env.NEXT_PUBLIC_OPENSIGN_API_KEY
      if (apiKey) {
        this.openSignService = new OpenSignService({ apiKey })
      }
    } catch (error) {
      console.warn('OpenSign service not available:', error)
    }
  }

  async getTemplates() {
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  async generateDocument(templateId: string, clientId: string, client: Client): Promise<DocumentGenerationResult> {
    try {
      // Get template
      const { data: template } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (!template) throw new Error('Template not found')

      // Process template variables
      const variables = {
        CLIENT_NAME: new RealClientService().getClientDisplayName(client),
        CLIENT_EMAIL: client.contactInfo?.email || '',
        CLIENT_REF: client.clientRef || '',
        ADVISOR_NAME: 'Professional Advisor',
        REPORT_DATE: new Date().toLocaleDateString('en-GB'),
        RISK_PROFILE: client.riskProfile?.attitudeToRisk || 'Moderate',
        INVESTMENT_AMOUNT: client.financialProfile?.liquidAssets || 0,
        ANNUAL_INCOME: client.financialProfile?.annualIncome || 0,
        NET_WORTH: client.financialProfile?.netWorth || 0,
        RECOMMENDATION: 'Based on your financial situation and objectives...'
      }

      // Replace template variables
      let htmlContent = template.template_content || template.content || ''
      Object.entries(variables).forEach(([key, value]) => {
        htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      })

      // Create a GeneratedDocument object that matches the expected return type
      const generatedDoc: GeneratedDocument = {
        id: `doc_${Date.now()}`,
        name: `${template.name} - ${variables.CLIENT_NAME}`,
        file_path: '',
        file_size: 0,
        file_type: 'pdf',
        category_id: template.category_id,
        client_id: clientId,
        advisor_id: '',
        firm_id: '',
        status: 'active',
        compliance_status: 'pending',
        compliance_level: 'standard',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        template_id: templateId,
        variable_values: variables,
        generated_at: new Date().toISOString()
      }

      // For now, return a success result with the generated document
      // In production, you would call your PDF generation service here
      return {
        success: true,
        document: generatedDoc,
        url: `/api/documents/${generatedDoc.id}/download`,
        error: undefined
      }
    } catch (error) {
      clientLogger.error('Real document generation error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Generation failed' 
      }
    }
  }

  // ===================================================================
  // FIX 1: Add missing createClientWorkflow method
  // ===================================================================
  async createClientWorkflow(clientId: string, workflowType: string): Promise<any> {
    // For now, return a mock workflow object
    // In production, implement actual workflow creation
    const workflow = {
      id: `workflow_${Date.now()}`,
      clientId,
      type: workflowType,
      status: 'created',
      createdAt: new Date().toISOString(),
      steps: [
        {
          id: 'step1',
          name: 'Initial Assessment',
          status: 'pending',
          order: 1
        },
        {
          id: 'step2',
          name: 'Document Generation',
          status: 'pending',
          order: 2
        },
        {
          id: 'step3',
          name: 'Client Review',
          status: 'pending',  
          order: 3
        }
      ]
    }

    // Optionally store in database
    try {
      await this.supabase
        .from('client_workflows')
        .insert({
          id: workflow.id,
          client_id: clientId,
          workflow_type: workflowType,
          status: 'created',
          metadata: workflow,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.warn('Could not store workflow in database:', error)
    }
    
    return workflow
  }

  async generateDocumentWithSignature(
    templateId: string,
    clientId: string,
    client: Client,
    customData?: any
  ): Promise<IntegrationResult> {
    try {
      const docResult = await this.generateDocument(templateId, clientId, client)

      if (!docResult.success || !docResult.document) {
        return { success: false, error: docResult.error }
      }

      // Prepare signer info
      const clientName = new RealClientService().getClientDisplayName(client)
      const clientEmail = client.contactInfo?.email

      if (!clientEmail) {
        return {
          success: true,
          data: {
            document: docResult.document,
            signatureRequest: null,
            message: 'Document generated but signature skipped - no client email'
          }
        }
      }

      // Build signers list
      const signers: SignerInfo[] = [{
        email: clientEmail,
        name: clientName,
        role: 'Client'
      }]

      // Add additional signers if provided
      if (customData?.additionalSigners) {
        signers.push(...customData.additionalSigners)
      }

      // Signature request options
      const signatureOptions: SignatureRequestOptions = {
        expiryDays: customData?.expiryDays || 30,
        autoReminder: customData?.autoReminder ?? true,
        remindOnceInEvery: customData?.reminderDays || 3,
        mergeCertificate: true
      }

      // If OpenSign service is available, use it
      if (this.openSignService) {
        try {
          // Get the PDF buffer from the document
          // For now, we'll create a simple PDF buffer from the HTML content
          // In production, this should be the actual PDF from the document generation
          const pdfBuffer = await this.getPdfBufferForDocument(docResult.document)

          if (pdfBuffer) {
            // Create document in OpenSign
            const openSignResult = await this.openSignService.createDocument(
              pdfBuffer,
              `${docResult.document.name || 'Document'}.pdf`,
              signers,
              signatureOptions
            )

            if (openSignResult.success && openSignResult.documentId) {
              // Send for signature
              const sendResult = await this.openSignService.sendForSignature(
                openSignResult.documentId,
                signers,
                signatureOptions
              )

              // Store signature request in database
              const { data: signatureRequest, error: sigError } = await this.supabase
                .from('signature_requests')
                .insert({
                  document_id: docResult.document.id,
                  client_id: clientId,
                  template_id: templateId,
                  status: sendResult.success ? 'sent' : 'pending',
                  opensign_document_id: openSignResult.documentId,
                  signers: signers,
                  opensign_metadata: {
                    ...openSignResult.metadata,
                    sendResult: sendResult.metadata
                  },
                  created_at: new Date().toISOString()
                })
                .select()
                .single()

              if (sigError) {
                console.warn('Could not store signature request:', sigError)
              }

              return {
                success: true,
                data: {
                  document: docResult.document,
                  signatureRequest: signatureRequest || null,
                  openSignDocumentId: openSignResult.documentId,
                  signatureStatus: sendResult.success ? 'sent' : 'created'
                },
                message: sendResult.success
                  ? 'Document sent for signature'
                  : 'Document created, pending signature send'
              }
            }
          }
        } catch (openSignError) {
          clientLogger.error('OpenSign integration error:', openSignError)
          // Fall through to database-only storage
        }
      }

      // Fallback: Store signature request in database without OpenSign
      const submissionData = {
        send_email: true,
        submitters: signers.map(signer => ({
          role: signer.role || 'Client',
          email: signer.email,
          name: signer.name,
          fields: customData?.fields || []
        }))
      }

      const { data: signatureRequest, error: sigError } = await this.supabase
        .from('signature_requests')
        .insert({
          document_id: docResult.document.id,
          client_id: clientId,
          template_id: templateId,
          status: 'pending',
          signers: signers,
          submission_data: submissionData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (sigError) {
        console.warn('Could not create signature request:', sigError)
      }

      return {
        success: true,
        data: {
          document: docResult.document,
          signatureRequest: signatureRequest || null
        },
        message: this.openSignService
          ? 'Document generated, OpenSign pending configuration'
          : 'Document generated, e-signature pending setup'
      }

    } catch (error) {
      clientLogger.error('Real document with signature error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed'
      }
    }
  }

  /**
   * Get PDF buffer for a document - helper for OpenSign integration
   */
  private async getPdfBufferForDocument(document: any): Promise<Buffer | null> {
    try {
      // If document has a file_path, try to download it from storage
      if (document.file_path) {
        const { data, error } = await this.supabase.storage
          .from('documents')
          .download(document.file_path)

        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer()
          return Buffer.from(arrayBuffer)
        }
      }

      // If no file path or download failed, generate a simple PDF
      // In production, this should use a proper PDF generation service
      console.warn('PDF buffer not available for document, using placeholder')
      return null
    } catch (error) {
      clientLogger.error('Error getting PDF buffer:', error)
      return null
    }
  }

  /**
   * Check signature status for a document
   */
  async checkSignatureStatus(signatureRequestId: string): Promise<IntegrationResult> {
    try {
      // Get signature request from database
      const { data: request, error } = await this.supabase
        .from('signature_requests')
        .select('*')
        .eq('id', signatureRequestId)
        .single()

      if (error || !request) {
        return { success: false, error: 'Signature request not found' }
      }

      // If we have an OpenSign document ID, check with OpenSign
      if (this.openSignService && request.opensign_document_id) {
        const openSignStatus = await this.openSignService.getDocumentStatus(request.opensign_document_id)

        if (openSignStatus) {
          // Update local status if different
          if (openSignStatus.status !== request.status) {
            await this.supabase
              .from('signature_requests')
              .update({
                status: openSignStatus.status,
                updated_at: new Date().toISOString(),
                opensign_metadata: {
                  ...request.opensign_metadata,
                  lastSync: new Date().toISOString(),
                  openSignStatus: openSignStatus
                }
              })
              .eq('id', signatureRequestId)
          }

          return {
            success: true,
            data: {
              requestId: signatureRequestId,
              status: openSignStatus.status,
              signers: openSignStatus.signers,
              downloadUrl: openSignStatus.downloadUrl,
              certificateUrl: openSignStatus.certificateUrl,
              lastUpdated: openSignStatus.updatedAt
            }
          }
        }
      }

      // Return local status
      return {
        success: true,
        data: {
          requestId: signatureRequestId,
          status: request.status,
          signers: request.signers,
          lastUpdated: request.updated_at || request.created_at
        }
      }
    } catch (error) {
      clientLogger.error('Error checking signature status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check status'
      }
    }
  }

  /**
   * Download signed document
   */
  async downloadSignedDocument(signatureRequestId: string): Promise<{ data: Buffer | null; error?: string }> {
    try {
      const { data: request } = await this.supabase
        .from('signature_requests')
        .select('opensign_document_id, status')
        .eq('id', signatureRequestId)
        .single()

      if (!request?.opensign_document_id) {
        return { data: null, error: 'No OpenSign document ID found' }
      }

      if (request.status !== 'completed' && request.status !== 'signed') {
        return { data: null, error: 'Document is not yet signed' }
      }

      if (this.openSignService) {
        const buffer = await this.openSignService.downloadSignedDocument(request.opensign_document_id)
        return { data: buffer }
      }

      return { data: null, error: 'OpenSign service not available' }
    } catch (error) {
      clientLogger.error('Error downloading signed document:', error)
      return { data: null, error: error instanceof Error ? error.message : 'Download failed' }
    }
  }

  /**
   * Get all signature requests for a client
   */
  async getClientSignatureRequests(clientId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('signature_requests')
        .select('*, generated_documents(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) {
        clientLogger.error('Error fetching signature requests:', error)
        return []
      }

      return data || []
    } catch (error) {
      clientLogger.error('Error fetching signature requests:', error)
      return []
    }
  }

  /**
   * Resend signature request email
   */
  async resendSignatureRequest(signatureRequestId: string): Promise<IntegrationResult> {
    try {
      const { data: request } = await this.supabase
        .from('signature_requests')
        .select('*')
        .eq('id', signatureRequestId)
        .single()

      if (!request) {
        return { success: false, error: 'Signature request not found' }
      }

      if (this.openSignService && request.opensign_document_id) {
        // Get the first signer's email
        const signers = request.signers as SignerInfo[]
        if (signers && signers.length > 0) {
          const result = await this.openSignService.resendMail(
            request.opensign_document_id,
            signers[0].email
          )

          if (result) {
            return {
              success: true,
              message: 'Signature request resent successfully'
            }
          }
        }
      }

      return {
        success: false,
        error: 'Could not resend signature request'
      }
    } catch (error) {
      clientLogger.error('Error resending signature request:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resend failed'
      }
    }
  }
}

// ===================================================================
// AUTO-SAVE SERVICE - FIXED VERSION WITH MISSING METHODS
// ===================================================================

export class AutoSaveService {
  private saveQueue = new Map<string, any>()
  private saveTimeout: NodeJS.Timeout | null = null
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  queueSave(clientId: string, data: any) {
    this.saveQueue.set(clientId, {
      ...this.saveQueue.get(clientId),
      ...data,
      lastModified: new Date().toISOString()
    })

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    // Set new timeout for batch save
    this.saveTimeout = setTimeout(() => {
      this.processSaveQueue()
    }, 2000) // 2 second debounce
  }

  // ===================================================================
  // FIX 2: Add missing saveDraft method (wrapper for queueSave)
  // ===================================================================
  async saveDraft(type: string, id: string, data: any): Promise<void> {
    // Use the existing queueSave method for backward compatibility
    this.queueSave(id, data)
  }

  // ===================================================================
  // FIX 3: Add missing loadDraft method
  // ===================================================================
  async loadDraft(type: string, id: string): Promise<any> {
    // Return null - no persistent draft functionality in current implementation
    // Could be enhanced to actually load draft data from database
    return null
  }

  // ===================================================================
  // FIX 4: Add missing clearDraft method
  // ===================================================================
  async clearDraft(type: string, id: string): Promise<void> {
    // No-op - no persistent draft functionality
    // Could be enhanced to actually clear draft data from database
    return
  }

  private async processSaveQueue() {
    const updates = Array.from(this.saveQueue.entries())
    this.saveQueue.clear()

    for (const [clientId, data] of updates) {
      try {
        await this.saveClientData(clientId, data)
      } catch (error) {
        clientLogger.error(`Failed to auto-save client ${clientId}:`, error)
        // Re-queue failed saves
        this.queueSave(clientId, data)
      }
    }
  }

  private async saveClientData(clientId: string, data: any) {
    // Instead of draft_data, save directly to the client record
    // Map the data to appropriate client fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Map common fields from the data object
    if (data.personalDetails) {
      updateData.personal_details = data.personalDetails
    }
    if (data.contactInfo) {
      updateData.contact_info = data.contactInfo
    }
    if (data.financialProfile) {
      updateData.financial_profile = data.financialProfile
    }
    if (data.riskProfile) {
      updateData.risk_profile = data.riskProfile
    }
    if (data.occupation) {
      updateData.occupation = data.occupation
    }
    if (data.investment_amount !== undefined) {
      updateData.investment_amount = data.investment_amount
    }
    if (data.fees !== undefined) {
      updateData.fees = data.fees
    }
    if (data.monthly_savings !== undefined) {
      updateData.monthly_savings = data.monthly_savings
    }
    if (data.target_retirement_age !== undefined) {
      updateData.target_retirement_age = data.target_retirement_age
    }

    const { error } = await this.supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)

    if (error) throw error
    
  }

  // Force save all pending changes
  async flush() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    await this.processSaveQueue()
  }
}

// ===================================================================
// EXPORT SINGLETON INSTANCES
// ===================================================================

export const realClientService = new RealClientService()
export const realDocumentService = new RealDocumentService()
export const autoSaveService = new AutoSaveService()

// ===================================================================
// INTEGRATION HELPERS
// ===================================================================

export async function generateClientDocument(
  clientId: string,
  templateId: string,
  options?: {
    sendForSignature?: boolean
    customData?: any
  }
): Promise<IntegrationResult> {
  try {
    // Get client data
    const client = await realClientService.getClientById(clientId)
    if (!client) {
      return { success: false, error: 'Client not found' }
    }

    // Generate document
    if (options?.sendForSignature) {
      return await realDocumentService.generateDocumentWithSignature(
        templateId,
        clientId,
        client,
        options.customData
      )
    } else {
      const result = await realDocumentService.generateDocument(
        templateId,
        clientId,
        client
      )
      
      return {
        success: result.success,
        data: result.document,
        error: result.error
      }
    }
  } catch (error) {
    clientLogger.error('Document generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Generation failed'
    }
  }
}

// ===================================================================
// REACT HOOKS INTEGRATION
// ===================================================================

export function useAutoSave(clientId: string) {
  const save = (data: any) => {
    autoSaveService.queueSave(clientId, data)
  }

  const flush = async () => {
    await autoSaveService.flush()
  }

  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    const handleBeforeUnload = () => {
      autoSaveService.flush()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Return cleanup function
    return {
      save,
      flush,
      cleanup: () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }

  return { save, flush }
}

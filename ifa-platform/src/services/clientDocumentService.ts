// services/clientDocumentService.ts
// FIXED: Uses the correct client-side Supabase helper with type assertions

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import clientLogger from '@/lib/logging/clientLogger'

// Extended types for client document management
export interface ClientDocumentStatus {
  id: string
  clientId: string
  clientName: string
  portfolioValue: number
  riskProfile: 1 | 2 | 3 | 4 | 5
  riskProfileLabel: string
  documentsRequired: DocumentRequirement[]
  documentsCompleted: number
  documentsPending: number
  documentsOverdue: number
  nextReviewDate: string
  lastDocumentDate: string | null
  complianceScore: number
  tags: string[]
  status: 'up-to-date' | 'action-required' | 'overdue'
  firmId: string
}

export interface DocumentRequirement {
  id: string
  categoryId: string
  categoryName: string
  templateId?: string
  isRequired: boolean
  frequency: 'once' | 'annual' | 'biannual' | 'quarterly'
  lastCompletedDate?: string
  nextDueDate?: string
  status: 'completed' | 'pending' | 'overdue' | 'not-required'
}

export interface ClientDocumentTemplate {
  id: string
  name: string
  description: string
  categoryId: string
  templateContent: string
  templateVariables: Record<string, any>
  requiresSignature: boolean
  isActive: boolean
}

export interface ClientDocumentWorkflow {
  clientId: string
  workflowId: string
  status: 'not-started' | 'in-progress' | 'completed'
  currentStep: number
  totalSteps: number
  steps: WorkflowStep[]
  startedAt?: string
  completedAt?: string
}

export interface WorkflowStep {
  stepNumber: number
  name: string
  description: string
  documentCategoryId?: string
  templateId?: string
  status: 'pending' | 'in-progress' | 'completed' | 'skipped'
  completedAt?: string
  completedBy?: string
}

// Use any-typed Supabase client to bypass type checking
type AnySupabaseClient = SupabaseClient<any, any, any>

export class ClientDocumentService {
  private supabase: AnySupabaseClient

  constructor() {
    this.supabase = createClient() as AnySupabaseClient
  }

  // Get user context with firm ID
  private async getUserContext() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error || !user) throw new Error('Authentication required')
    
    const firmId = user.user_metadata?.firm_id || user.user_metadata?.firmId
    if (!firmId) throw new Error('Firm association required')
    
    return { user, firmId }
  }

  // Get all clients with document status
  async getClientsWithDocumentStatus(): Promise<ClientDocumentStatus[]> {
    try {
      const { firmId } = await this.getUserContext()

      // First, get all clients (this would come from Client AI when available)
      // For now, we'll use documents to derive client information
      const { data: documents, error: docsError } = await this.supabase
        .from('documents')
        .select(`
          id,
          client_id,
          client_name,
          category_id,
          status,
          created_at,
          updated_at,
          document_categories(
            id,
            name,
            requires_signature,
            compliance_level
          )
        `)
        .eq('firm_id', firmId)
        .eq('is_archived', false)

      if (docsError) throw docsError

      // Cast documents to any to access properties
      const docs = documents as any[]

      // Group documents by client
      const clientMap = new Map<string, any[]>()
      
      docs?.forEach(doc => {
        const clientKey = doc.client_id || doc.client_name || 'Unknown'
        if (!clientMap.has(clientKey)) {
          clientMap.set(clientKey, [])
        }
        clientMap.get(clientKey)?.push(doc)
      })

      // Get document requirements (categories)
      const { data: categories } = await this.supabase
        .from('document_categories')
        .select('*')
        .order('name')

      const cats = categories as any[]

      // Build client status objects
      const clientStatuses: ClientDocumentStatus[] = []

      for (const [clientKey, clientDocs] of clientMap.entries()) {
        const mostRecentDoc = clientDocs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        // Calculate document metrics
        const completedDocs = clientDocs.filter(d => d.status === 'completed' || d.status === 'signed')
        const pendingDocs = clientDocs.filter(d => d.status === 'pending' || d.status === 'draft')
        
        // Determine compliance score (simplified calculation)
        const requiredCategories = cats?.filter(c => c.compliance_level === 'required').length || 8
        const completedCategories = new Set(completedDocs.map(d => d.category_id)).size
        const complianceScore = Math.round((completedCategories / requiredCategories) * 100)

        // Determine status
        let status: ClientDocumentStatus['status'] = 'up-to-date'
        if (complianceScore < 50) {
          status = 'overdue'
        } else if (complianceScore < 80 || pendingDocs.length > 0) {
          status = 'action-required'
        }

        // Create document requirements
        const requirements: DocumentRequirement[] = cats?.map(cat => {
          const categoryDocs = clientDocs.filter(d => d.category_id === cat.id)
          const latestDoc = categoryDocs.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]

          return {
            id: cat.id,
            categoryId: cat.id,
            categoryName: cat.name,
            isRequired: cat.compliance_level === 'required',
            frequency: 'annual' as const, // Would be determined by category settings
            lastCompletedDate: latestDoc?.created_at,
            nextDueDate: this.calculateNextDueDate(latestDoc?.created_at, 'annual'),
            status: latestDoc ? 
              (latestDoc.status === 'completed' || latestDoc.status === 'signed' ? 'completed' : 'pending') : 
              (cat.compliance_level === 'required' ? 'overdue' : 'not-required')
          }
        }) || []

        clientStatuses.push({
          id: clientKey,
          clientId: clientKey,
          clientName: mostRecentDoc.client_name || clientKey,
          portfolioValue: Math.floor(Math.random() * 5000000), // Would come from Client AI
          riskProfile: (Math.floor(Math.random() * 5) + 1) as any, // Would come from Assessment AI
          riskProfileLabel: this.getRiskProfileLabel((Math.floor(Math.random() * 5) + 1) as any),
          documentsRequired: requirements,
          documentsCompleted: completedDocs.length,
          documentsPending: pendingDocs.length,
          documentsOverdue: requirements.filter(r => r.status === 'overdue').length,
          nextReviewDate: this.calculateNextDueDate(mostRecentDoc.created_at, 'annual'),
          lastDocumentDate: mostRecentDoc.created_at,
          complianceScore,
          tags: [], // Would come from Client AI
          status,
          firmId
        })
      }

      return clientStatuses.sort((a, b) => a.clientName.localeCompare(b.clientName))
    } catch (error) {
      clientLogger.error('Error getting client document status:', error)
      throw error
    }
  }

  // Get document requirements for a specific client
  async getClientDocumentRequirements(clientId: string): Promise<DocumentRequirement[]> {
    try {
      const { firmId } = await this.getUserContext()

      // Get all document categories
      const { data: categories } = await this.supabase
        .from('document_categories')
        .select('*')
        .order('name')

      const cats = categories as any[]

      // Get client's existing documents
      const { data: documents } = await this.supabase
        .from('documents')
        .select('*')
        .eq('firm_id', firmId)
        .eq('client_id', clientId)
        .eq('is_archived', false)

      const docs = documents as any[]

      // Map categories to requirements
      const requirements: DocumentRequirement[] = cats?.map(cat => {
        const categoryDocs = docs?.filter(d => d.category_id === cat.id) || []
        const latestDoc = categoryDocs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        const frequency = this.getCategoryFrequency(cat.name)
        const nextDueDate = this.calculateNextDueDate(latestDoc?.created_at, frequency)

        return {
          id: cat.id,
          categoryId: cat.id,
          categoryName: cat.name,
          isRequired: cat.compliance_level === 'required',
          frequency,
          lastCompletedDate: latestDoc?.created_at,
          nextDueDate,
          status: this.determineRequirementStatus(latestDoc, cat, nextDueDate)
        }
      }) || []

      return requirements
    } catch (error) {
      clientLogger.error('Error getting client document requirements:', error)
      throw error
    }
  }

  // Get available templates for document generation
  async getDocumentTemplates(categoryId?: string): Promise<ClientDocumentTemplate[]> {
    try {
      let query = this.supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query.order('name')
      if (error) throw error

      const templates = data as any[]

      return templates?.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        categoryId: t.category_id,
        templateContent: t.template_content,
        templateVariables: t.template_variables || {},
        requiresSignature: t.requires_signature,
        isActive: t.is_active
      })) || []
    } catch (error) {
      clientLogger.error('Error getting document templates:', error)
      throw error
    }
  }

  // Generate document from template
  async generateDocumentFromTemplate(
    templateId: string,
    clientId: string,
    variables: Record<string, any>
  ): Promise<{ documentId: string; requiresSignature: boolean }> {
    try {
      const { user, firmId } = await this.getUserContext()

      // Get template
      const { data: template, error: templateError } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError || !template) throw new Error('Template not found')

      const tmpl = template as any

      // Replace variables in template content
      let content = tmpl.template_content
      Object.entries(variables).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      })

      // Create document
      const { data: document, error: docError } = await this.supabase
        .from('documents')
        .insert({
          title: `${tmpl.name} - ${variables.CLIENT_NAME || clientId}`,
          description: tmpl.description,
          category_id: tmpl.category_id,
          client_id: clientId,
          client_name: variables.CLIENT_NAME,
          status: 'draft',
          firm_id: firmId,
          created_by: user.id,
          metadata: {
            generated_from_template: templateId,
            template_variables: variables,
            content // Store generated content
          }
        } as any)
        .select()
        .single()

      if (docError || !document) throw new Error('Failed to create document')

      const doc = document as any

      return {
        documentId: doc.id,
        requiresSignature: tmpl.requires_signature
      }
    } catch (error) {
      clientLogger.error('Error generating document from template:', error)
      throw error
    }
  }

  // Get client workflow status
  async getClientWorkflow(clientId: string, workflowType: string): Promise<ClientDocumentWorkflow | null> {
    try {
      const { firmId } = await this.getUserContext()

      // This would be stored in a workflows table
      // For now, we'll generate a sample workflow
      const workflow: ClientDocumentWorkflow = {
        clientId,
        workflowId: `workflow-${clientId}-${workflowType}`,
        status: 'in-progress',
        currentStep: 2,
        totalSteps: 5,
        steps: [
          {
            stepNumber: 1,
            name: 'Client Information',
            description: 'Gather basic client information',
            documentCategoryId: 'client-info',
            status: 'completed',
            completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            stepNumber: 2,
            name: 'Risk Assessment',
            description: 'Complete risk profiling questionnaire',
            documentCategoryId: 'risk-assessment',
            templateId: 'risk-assessment-template',
            status: 'in-progress'
          },
          {
            stepNumber: 3,
            name: 'Suitability Report',
            description: 'Generate and review suitability report',
            documentCategoryId: 'suitability-reports',
            templateId: 'suitability-report-template',
            status: 'pending'
          },
          {
            stepNumber: 4,
            name: 'Client Agreement',
            description: 'Client signs service agreement',
            documentCategoryId: 'agreements',
            status: 'pending'
          },
          {
            stepNumber: 5,
            name: 'Compliance Check',
            description: 'Final compliance review',
            documentCategoryId: 'compliance',
            status: 'pending'
          }
        ],
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      return workflow
    } catch (error) {
      clientLogger.error('Error getting client workflow:', error)
      return null
    }
  }

  // Helper methods
  private getRiskProfileLabel(risk: 1 | 2 | 3 | 4 | 5): string {
    const labels = {
      1: 'Conservative',
      2: 'Moderately Conservative',
      3: 'Balanced',
      4: 'Growth',
      5: 'Aggressive'
    }
    return labels[risk]
  }

  private calculateNextDueDate(lastDate: string | undefined, frequency: string): string {
    if (!lastDate) {
      return new Date().toISOString() // Due immediately if never completed
    }

    const last = new Date(lastDate)
    const next = new Date(last)

    switch (frequency) {
      case 'annual':
        next.setFullYear(next.getFullYear() + 1)
        break
      case 'biannual':
        next.setMonth(next.getMonth() + 6)
        break
      case 'quarterly':
        next.setMonth(next.getMonth() + 3)
        break
      default:
        next.setFullYear(next.getFullYear() + 1)
    }

    return next.toISOString()
  }

  private getCategoryFrequency(categoryName: string): DocumentRequirement['frequency'] {
    // This would be configured per category in the database
    const frequencies: Record<string, DocumentRequirement['frequency']> = {
      'Annual Reviews': 'annual',
      'Suitability Reports': 'annual',
      'Risk Assessments': 'biannual',
      'Compliance Documents': 'quarterly',
      'Client Agreements': 'once',
      'Identity Verification': 'once'
    }

    return frequencies[categoryName] || 'annual'
  }

  private determineRequirementStatus(
    latestDoc: any,
    category: any,
    nextDueDate: string
  ): DocumentRequirement['status'] {
    if (!latestDoc && category.compliance_level === 'required') {
      return 'overdue'
    }

    if (!latestDoc) {
      return 'not-required'
    }

    if (latestDoc.status === 'completed' || latestDoc.status === 'signed') {
      const now = new Date()
      const due = new Date(nextDueDate)
      
      if (due < now) {
        return 'overdue'
      }
      
      return 'completed'
    }

    return 'pending'
  }
}

// Create singleton instance
export const clientDocumentService = new ClientDocumentService()
export default clientDocumentService
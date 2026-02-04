import { createClient } from "@/lib/supabase/client"
// ===================================================================
// src/services/documentWorkflowEngine.ts - COMPLETE FILE
// ===================================================================

import { 
  DocumentType, 
  DocumentStatus,
  ComplianceStatus,
  ComplianceLevel
} from '@/types/document'

// Workflow interfaces
export interface WorkflowStep {
  id: string
  name: string
  description: string
  order: number
  required: boolean
  documentTypes?: DocumentType[]
  conditions?: WorkflowCondition[]
  actions: WorkflowAction[]
  nextSteps?: string[]
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}

export interface WorkflowAction {
  type: 'create_document' | 'send_notification' | 'request_signature' | 'update_status' | 'schedule_review'
  parameters: Record<string, any>
}

export interface ClientWorkflowSuggestion {
  workflowId: string
  workflowName: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  estimatedDuration: string
  requiredDocuments: DocumentType[]
  nextActions: string[]
}

export interface WorkflowInstance {
  id: string
  workflowId: string
  clientId: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  currentStep: string
  startedAt: string
  completedAt?: string
  metadata: Record<string, any>
}

// Client interfaces for workflow suggestions
export interface ClientProfile {
  id: string
  name: string
  status: 'prospect' | 'active' | 'inactive'
  onboardingDate?: string
  lastReviewDate?: string
  riskProfile?: number
  hasAnnualReview?: boolean
  documentsCount: number
  complianceScore?: number
}

// Workflow definition interface
interface WorkflowDefinition {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
}



// ===================================================================
// DOCUMENT WORKFLOW ENGINE CLASS
// ===================================================================

export class DocumentWorkflowEngine {
  private static instance: DocumentWorkflowEngine
  private workflows: Map<string, WorkflowDefinition> = new Map()

  constructor() {
    this.initializeWorkflows()
  }

  public static getInstance(): DocumentWorkflowEngine {
    if (!DocumentWorkflowEngine.instance) {
      DocumentWorkflowEngine.instance = new DocumentWorkflowEngine()
    }
    return DocumentWorkflowEngine.instance
  }

  // ===================================================================
  // WORKFLOW SUGGESTIONS
  // ===================================================================

  suggestWorkflowsForClient(client: ClientProfile): ClientWorkflowSuggestion[] {
    const suggestions: ClientWorkflowSuggestion[] = []

    // New client onboarding
    if (client.status === 'prospect' || !client.onboardingDate) {
      suggestions.push({
        workflowId: 'client_onboarding',
        workflowName: 'New Client Onboarding',
        priority: 'high',
        reason: 'Complete onboarding process for new client',
        estimatedDuration: '2-3 days',
        requiredDocuments: ['client_agreement', 'risk_assessment', 'suitability_report'] as DocumentType[],
        nextActions: [
          'Collect client information',
          'Complete risk assessment',
          'Generate client agreement',
          'Prepare suitability report'
        ]
      })
    }

    // Annual review due
    if (client.lastReviewDate) {
      const lastReview = new Date(client.lastReviewDate)
      const monthsSinceReview = this.getMonthsDifference(lastReview, new Date())
      
      if (monthsSinceReview >= 11) {
        suggestions.push({
          workflowId: 'annual_review',
          workflowName: 'Annual Client Review',
          priority: monthsSinceReview >= 12 ? 'high' : 'medium',
          reason: `Annual review ${monthsSinceReview >= 12 ? 'overdue' : 'due soon'}`,
          estimatedDuration: '1-2 days',
          requiredDocuments: ['annual_review', 'suitability_report'] as DocumentType[],
          nextActions: [
            'Schedule review meeting',
            'Update client circumstances',
            'Review investment performance',
            'Generate review documentation'
          ]
        })
      }
    } else {
      // If no last review date, suggest annual review anyway
      suggestions.push({
        workflowId: 'annual_review',
        workflowName: 'Annual Client Review',
        priority: 'medium',
        reason: 'Regular review cycle recommended',
        estimatedDuration: '1-2 days',
        requiredDocuments: ['annual_review', 'suitability_report'] as DocumentType[],
        nextActions: [
          'Schedule review meeting',
          'Update client circumstances',
          'Review investment performance',
          'Generate review documentation'
        ]
      })
    }

    // Compliance documentation
    if (!client.complianceScore || client.complianceScore < 80) {
      suggestions.push({
        workflowId: 'compliance_update',
        workflowName: 'Compliance Documentation Update',
        priority: 'medium',
        reason: 'Improve compliance score with updated documentation',
        estimatedDuration: '1 day',
        requiredDocuments: ['compliance_document', 'risk_assessment'] as DocumentType[],
        nextActions: [
          'Review existing documentation',
          'Identify compliance gaps',
          'Update required documents',
          'Submit for compliance review'
        ]
      })
    }

    // Risk profile update
    if (client.riskProfile === undefined) {
      suggestions.push({
        workflowId: 'risk_assessment',
        workflowName: 'Risk Profile Assessment',
        priority: 'high',
        reason: 'No risk profile on record',
        estimatedDuration: '1 day',
        requiredDocuments: ['risk_assessment'] as DocumentType[],
        nextActions: [
          'Complete risk questionnaire',
          'Analyze responses',
          'Document risk profile',
          'Update investment strategy'
        ]
      })
    }

    // Sort by priority
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  // ===================================================================
  // WORKFLOW EXECUTION
  // ===================================================================

  async startWorkflow(
    workflowId: string, 
    clientId: string, 
    initialData?: Record<string, any>
  ): Promise<WorkflowInstance> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    const instance: WorkflowInstance = {
      id: this.generateInstanceId(),
      workflowId,
      clientId,
      status: 'active',
      currentStep: workflow.steps[0].id,
      startedAt: new Date().toISOString(),
      metadata: initialData || {}
    }

    // Execute first step
    await this.executeStep(instance, workflow.steps[0])

    return instance
  }

  async executeStep(instance: WorkflowInstance, step: WorkflowStep): Promise<void> {
    // Check conditions
    if (step.conditions && !this.evaluateConditions(step.conditions, instance)) {
      // Skip to next step if conditions not met
      const nextStepId = step.nextSteps?.[0]
      if (nextStepId) {
        instance.currentStep = nextStepId
      }
      return
    }

    // Execute actions
    for (const action of step.actions) {
      await this.executeAction(action, instance)
    }

    // Update instance
    if (step.nextSteps && step.nextSteps.length > 0) {
      instance.currentStep = step.nextSteps[0]
    } else {
      instance.status = 'completed'
      instance.completedAt = new Date().toISOString()
    }
  }

  // ===================================================================
  // WORKFLOW DEFINITIONS
  // ===================================================================

  private initializeWorkflows(): void {
    // Client Onboarding Workflow
    this.workflows.set('client_onboarding', {
      id: 'client_onboarding',
      name: 'New Client Onboarding',
      description: 'Complete onboarding process for new clients',
      steps: [
        {
          id: 'collect_information',
          name: 'Collect Client Information',
          description: 'Gather all required client details',
          order: 1,
          required: true,
          actions: [
            {
              type: 'create_document',
              parameters: { 
                documentType: 'client_agreement',
                templateId: 'client_agreement_template'
              }
            }
          ],
          nextSteps: ['risk_assessment']
        },
        {
          id: 'risk_assessment',
          name: 'Conduct Risk Assessment',
          description: 'Complete risk profiling questionnaire',
          order: 2,
          required: true,
          documentTypes: ['risk_assessment'] as DocumentType[],
          actions: [
            {
              type: 'create_document',
              parameters: { 
                documentType: 'risk_assessment',
                templateId: 'risk_assessment_template'
              }
            }
          ],
          nextSteps: ['suitability_report']
        },
        {
          id: 'suitability_report',
          name: 'Generate Suitability Report',
          description: 'Create personalized suitability report',
          order: 3,
          required: true,
          documentTypes: ['suitability_report'] as DocumentType[],
          actions: [
            {
              type: 'create_document',
              parameters: { 
                documentType: 'suitability_report',
                templateId: 'suitability_report_template'
              }
            },
            {
              type: 'request_signature',
              parameters: { 
                documentType: 'suitability_report',
                signers: ['client', 'advisor']
              }
            }
          ],
          nextSteps: ['complete_onboarding']
        },
        {
          id: 'complete_onboarding',
          name: 'Complete Onboarding',
          description: 'Finalize onboarding and schedule review',
          order: 4,
          required: true,
          actions: [
            {
              type: 'update_status',
              parameters: { 
                clientStatus: 'active'
              }
            },
            {
              type: 'schedule_review',
              parameters: { 
                reviewType: 'annual',
                daysFromNow: 365
              }
            },
            {
              type: 'send_notification',
              parameters: { 
                type: 'onboarding_complete',
                recipients: ['client', 'advisor']
              }
            }
          ]
        }
      ]
    })

    // Annual Review Workflow
    this.workflows.set('annual_review', {
      id: 'annual_review',
      name: 'Annual Client Review',
      description: 'Conduct annual review for existing clients',
      steps: [
        {
          id: 'schedule_meeting',
          name: 'Schedule Review Meeting',
          description: 'Arrange annual review meeting with client',
          order: 1,
          required: true,
          actions: [
            {
              type: 'send_notification',
              parameters: { 
                type: 'review_reminder',
                recipients: ['client']
              }
            }
          ],
          nextSteps: ['update_information']
        },
        {
          id: 'update_information',
          name: 'Update Client Information',
          description: 'Review and update client circumstances',
          order: 2,
          required: true,
          documentTypes: ['annual_review'] as DocumentType[],
          actions: [
            {
              type: 'create_document',
              parameters: { 
                documentType: 'annual_review',
                templateId: 'annual_review_template'
              }
            }
          ],
          nextSteps: ['review_investments']
        },
        {
          id: 'review_investments',
          name: 'Review Investment Performance',
          description: 'Analyze portfolio performance and suitability',
          order: 3,
          required: true,
          actions: [
            {
              type: 'create_document',
              parameters: { 
                documentType: 'suitability_report',
                templateId: 'annual_suitability_template'
              }
            }
          ],
          nextSteps: ['complete_review']
        },
        {
          id: 'complete_review',
          name: 'Complete Review',
          description: 'Finalize review and schedule next',
          order: 4,
          required: true,
          actions: [
            {
              type: 'update_status',
              parameters: { 
                lastReviewDate: 'current_date'
              }
            },
            {
              type: 'schedule_review',
              parameters: { 
                reviewType: 'annual',
                daysFromNow: 365
              }
            }
          ]
        }
      ]
    })

    // Compliance Update Workflow
    this.workflows.set('compliance_update', {
      id: 'compliance_update',
      name: 'Compliance Documentation Update',
      description: 'Update compliance documentation',
      steps: [
        {
          id: 'review_existing',
          name: 'Review Existing Documentation',
          description: 'Assess current compliance status',
          order: 1,
          required: true,
          actions: [
            {
              type: 'send_notification',
              parameters: { 
                type: 'compliance_review_started',
                recipients: ['advisor']
              }
            }
          ],
          nextSteps: ['update_documents']
        },
        {
          id: 'update_documents',
          name: 'Update Required Documents',
          description: 'Update compliance documentation',
          order: 2,
          required: true,
          documentTypes: ['compliance_document'] as DocumentType[],
          actions: [
            {
              type: 'create_document',
              parameters: { 
                documentType: 'compliance_document',
                templateId: 'compliance_template'
              }
            }
          ],
          nextSteps: ['submit_review']
        },
        {
          id: 'submit_review',
          name: 'Submit for Review',
          description: 'Submit updated documents for compliance review',
          order: 3,
          required: true,
          actions: [
            {
              type: 'update_status',
              parameters: { 
                complianceStatus: 'under_review'
              }
            },
            {
              type: 'send_notification',
              parameters: { 
                type: 'compliance_submitted',
                recipients: ['compliance_team']
              }
            }
          ]
        }
      ]
    })
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  private evaluateConditions(
    conditions: WorkflowCondition[], 
    instance: WorkflowInstance
  ): boolean {
    return conditions.every(condition => {
      const value = this.getValueFromPath(condition.field, instance.metadata)
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value
        case 'not_equals':
          return value !== condition.value
        case 'contains':
          return String(value).includes(String(condition.value))
        case 'greater_than':
          return Number(value) > Number(condition.value)
        case 'less_than':
          return Number(value) < Number(condition.value)
        default:
          return false
      }
    })
  }

  private async executeAction(
    action: WorkflowAction, 
    instance: WorkflowInstance
  ): Promise<void> {
    switch (action.type) {
      case 'create_document':
        // Integration with document service would go here
        break
        
      case 'send_notification':
        // Integration with notification service would go here
        break
        
      case 'request_signature':
        // Integration with DocuSeal would go here
        break
        
      case 'update_status':
        // Update client or document status
        break
        
      case 'schedule_review':
        // Schedule future review
        break
    }
  }

  private getValueFromPath(path: string, obj: any): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj)
  }

  private generateInstanceId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getMonthsDifference(date1: Date, date2: Date): number {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12
    return months + date2.getMonth() - date1.getMonth()
  }
}

// Export singleton instance
export const documentWorkflowEngine = DocumentWorkflowEngine.getInstance()
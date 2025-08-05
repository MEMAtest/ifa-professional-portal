// ================================================================
// src/services/EnhancedDocumentGenerationService.ts
// Complete document generation with multi-assessment support
// ================================================================

import { createBrowserClient } from '@supabase/ssr'
import { DocumentTemplateService } from './documentTemplateService'
import type { Database } from '@/types/database'

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface AssessmentData {
  type: 'suitability' | 'atr' | 'cfl' | 'vulnerability'
  id: string
  data: any
  completedAt: string
}

export interface GenerateFromAssessmentParams {
  assessmentType: string
  assessmentId: string
  clientId: string
  templateId?: string // Optional - will use default if not provided
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
  metadata?: any
}

export interface CombinedReportData {
  client: any
  assessments: AssessmentData[]
  generatedAt: string
  reportType: string
}

// ================================================================
// ENHANCED DOCUMENT GENERATION SERVICE
// ================================================================

export class EnhancedDocumentGenerationService {
  private supabase
  private templateService: DocumentTemplateService
  private static instance: EnhancedDocumentGenerationService

  constructor() {
    this.supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    this.templateService = DocumentTemplateService.getInstance()
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
    try {
      // Log generation attempt
      await this.logGeneration({
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

      // 5. Generate document content
      const content = this.populateTemplate(template.content, variables)

      // 6. Save document
      const fileName = this.generateFileName(
        params.assessmentType,
        clientData.personal_details?.firstName || 'Client',
        clientData.personal_details?.lastName || ''
      )

      const document = await this.saveDocument({
        clientId: params.clientId,
        fileName,
        content,
        fileType: 'text/html',
        metadata: {
          assessmentType: params.assessmentType,
          assessmentId: params.assessmentId,
          templateId: template.id,
          generatedAt: new Date().toISOString()
        }
      })

      // 7. Create assessment-document link
      await this.linkAssessmentToDocument({
        assessment_type: params.assessmentType,
        assessment_id: params.assessmentId,
        document_id: document.id,
        template_used: template.name,
        variables_used: variables
      })

      // 8. Update generation log
      await this.updateGenerationLog(document.id, 'completed')

      return {
        success: true,
        documentId: document.id,
        documentUrl: document.url,
        metadata: {
          templateUsed: template.name,
          assessmentType: params.assessmentType
        }
      }
    } catch (error) {
      console.error('Error generating document from assessment:', error)
      await this.updateGenerationLog(null, 'failed', error)
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
    try {
      await this.logGeneration({
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

      // 5. Generate document
      const content = this.populateTemplate(template.content, aggregatedData)

      // 6. Save document
      const fileName = this.generateFileName(
        'combined_report',
        clientData.personal_details?.firstName || 'Client',
        clientData.personal_details?.lastName || ''
      )

      const document = await this.saveDocument({
        clientId: params.clientId,
        fileName,
        content,
        fileType: 'text/html',
        metadata: {
          reportType: params.reportType,
          assessmentIds: params.assessmentIds,
          templateId: template.id,
          generatedAt: new Date().toISOString()
        }
      })

      // 7. Link all assessments to document
      for (const assessment of assessments) {
        await this.linkAssessmentToDocument({
          assessment_type: assessment.type,
          assessment_id: assessment.id,
          document_id: document.id,
          template_used: template.name,
          variables_used: aggregatedData
        })
      }

      await this.updateGenerationLog(document.id, 'completed')

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
      await this.updateGenerationLog(null, 'failed', error)
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

  private async fetchAssessmentData(type: string, id: string): Promise<any> {
    const tableMap = {
      suitability: 'suitability_assessments',
      atr: 'atr_assessments',
      cfl: 'cfl_assessments',
      vulnerability: 'vulnerability_assessments'
    }

    const table = tableMap[type as keyof typeof tableMap]
    if (!table) throw new Error(`Unknown assessment type: ${type}`)

    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  private async fetchClientData(clientId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error) throw error
    return data
  }

  private async getTemplateForAssessment(
    assessmentType: string,
    templateId?: string
  ): Promise<any> {
    if (templateId) {
      return await this.templateService.getTemplateById(templateId)
    }

    // Get default template for assessment type
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('assessment_type', assessmentType)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (error) {
      // Fallback to template service defaults
      const defaults = this.templateService.getDefaultTemplates()
      return defaults.find(t => t.documentType === `${assessmentType}_report`)
    }

    return data
  }

  private mapAssessmentToVariables(
    type: string,
    assessment: any,
    client: any
  ): Record<string, any> {
    const baseVariables = {
      CLIENT_NAME: `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim(),
      CLIENT_EMAIL: client.contact_details?.email || '',
      ASSESSMENT_DATE: new Date().toLocaleDateString('en-GB'),
      ADVISOR_NAME: 'Professional Advisor' // TODO: Get from user context
    }

    switch (type) {
      case 'atr':
        return {
          ...baseVariables,
          ATR_SCORE: assessment.total_score || 0,
          RISK_CATEGORY: assessment.risk_category || 'Not assessed',
          RISK_LEVEL: assessment.risk_level || 'Medium',
          ATTITUDE_SCORE: assessment.category_scores?.attitude || 0,
          ATTITUDE_ASSESSMENT: this.getScoreAssessment(assessment.category_scores?.attitude),
          EXPERIENCE_SCORE: assessment.category_scores?.experience || 0,
          EXPERIENCE_ASSESSMENT: this.getScoreAssessment(assessment.category_scores?.experience),
          KNOWLEDGE_SCORE: assessment.category_scores?.knowledge || 0,
          KNOWLEDGE_ASSESSMENT: this.getScoreAssessment(assessment.category_scores?.knowledge),
          EMOTIONAL_SCORE: assessment.category_scores?.emotional || 0,
          EMOTIONAL_ASSESSMENT: this.getScoreAssessment(assessment.category_scores?.emotional),
          FINDING_1: 'Risk tolerance aligns with investment objectives',
          FINDING_2: 'Knowledge and experience support proposed strategy',
          FINDING_3: 'Emotional resilience adequate for market volatility',
          RECOMMENDATIONS: assessment.recommendations?.join('\n') || 'Continue with current strategy'
        }

      case 'cfl':
        return {
          ...baseVariables,
          CFL_SCORE: assessment.total_score || 0,
          CAPACITY_CATEGORY: assessment.capacity_category || 'Not assessed',
          MAX_LOSS_PERCENTAGE: assessment.max_loss_percentage || 0,
          CONFIDENCE_LEVEL: assessment.confidence_level || 'Medium',
          MONTHLY_INCOME: assessment.monthly_income || 0,
          MONTHLY_EXPENSES: assessment.monthly_expenses || 0,
          EMERGENCY_FUND: assessment.emergency_fund || 0,
          EMERGENCY_MONTHS: assessment.emergency_fund && assessment.monthly_expenses 
            ? Math.round(assessment.emergency_fund / assessment.monthly_expenses) 
            : 0,
          OTHER_INVESTMENTS: assessment.other_investments || 0,
          INCOME_ASSESSMENT: assessment.monthly_income > assessment.monthly_expenses ? 'Positive cash flow' : 'Negative cash flow',
          EXPENSE_ASSESSMENT: 'Within normal range',
          INVESTMENT_ASSESSMENT: assessment.other_investments > 0 ? 'Diversified portfolio' : 'Limited diversification',
          HAS_WARNING: assessment.capacity_level < 3,
          WARNING_MESSAGE: 'Client has limited capacity for loss. Consider conservative strategies.',
          RECOMMENDATIONS: assessment.recommendations?.join('\n') || 'Monitor capacity regularly'
        }

      case 'vulnerability':
        const vulnerabilityData = client.vulnerability_assessment || {}
        return {
          ...baseVariables,
          VULNERABILITY_STATUS: vulnerabilityData.is_vulnerable ? 'Vulnerable Client Identified' : 'No Vulnerabilities Identified',
          VULNERABILITY_CLASS: vulnerabilityData.is_vulnerable ? 'vulnerable' : 'not-vulnerable',
          STATUS_DESCRIPTION: vulnerabilityData.is_vulnerable 
            ? 'This client has been identified as potentially vulnerable and requires additional support.'
            : 'No vulnerability factors have been identified at this time.',
          HAS_VULNERABILITIES: vulnerabilityData.is_vulnerable || false,
          VULNERABILITY_FACTORS: vulnerabilityData.vulnerability_factors || [],
          SUPPORT_MEASURES: vulnerabilityData.support_measures || [],
          COMMUNICATION_ADJUSTMENTS: vulnerabilityData.communication_adjustments || 'Standard communication methods appropriate',
          NEXT_REVIEW_DATE: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
          REVIEW_FREQUENCY: 'Annual'
        }

      case 'suitability':
        return {
          ...baseVariables,
          REPORT_DATE: new Date().toLocaleDateString('en-GB'),
          RISK_PROFILE: assessment.risk_assessment?.attitude_to_risk || 'Moderate',
          INVESTMENT_AMOUNT: assessment.objectives?.investment_amount || 0,
          RECOMMENDATION: assessment.recommendation || 'Based on the assessment, we recommend a balanced investment strategy.'
        }

      default:
        return baseVariables
    }
  }

  private getScoreAssessment(score: number): string {
    if (score >= 80) return 'Very High'
    if (score >= 60) return 'High'
    if (score >= 40) return 'Medium'
    if (score >= 20) return 'Low'
    return 'Very Low'
  }

  private populateTemplate(template: string, variables: Record<string, any>): string {
    let content = template

    // Simple variable replacement
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      content = content.replace(regex, String(value))
    })

    // Handle conditional blocks (basic implementation)
    content = this.processConditionals(content, variables)

    // Handle loops (basic implementation)
    content = this.processLoops(content, variables)

    return content
  }

  private processConditionals(content: string, variables: Record<string, any>): string {
    // Basic if block processing
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g
    
    return content.replace(ifRegex, (match, varName, innerContent) => {
      if (variables[varName]) {
        return innerContent
      }
      return ''
    })
  }

  private processLoops(content: string, variables: Record<string, any>): string {
    // Basic each block processing
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g
    
    return content.replace(eachRegex, (match, varName, innerContent) => {
      const items = variables[varName]
      if (Array.isArray(items)) {
        return items.map(item => {
          let itemContent = innerContent
          if (typeof item === 'object') {
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

  private async saveDocument(params: {
    clientId: string
    fileName: string
    content: string
    fileType: string
    metadata: any
  }): Promise<any> {
    // Save to storage
    const filePath = `documents/${params.clientId}/${params.fileName}`
    
    const { error: uploadError } = await this.supabase.storage
      .from('documents')
      .upload(filePath, params.content, {
        contentType: params.fileType,
        upsert: false
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Save to database
    const { data, error } = await this.supabase
      .from('documents')
      .insert({
        name: params.fileName,
        client_id: params.clientId,
        file_path: filePath,
        file_type: params.fileType,
        file_size: new Blob([params.content]).size,
        status: 'active',
        metadata: params.metadata
      })
      .select()
      .single()

    if (error) throw error

    return {
      ...data,
      url: publicUrl
    }
  }

  private generateFileName(type: string, firstName: string, lastName: string): string {
    const timestamp = new Date().toISOString().split('T')[0]
    const clientName = `${firstName}_${lastName}`.replace(/\s+/g, '_')
    return `${type}_${clientName}_${timestamp}.html`
  }

  private async linkAssessmentToDocument(params: {
    assessment_type: string
    assessment_id: string
    document_id: string
    template_used: string
    variables_used: any
  }): Promise<void> {
    const { error } = await this.supabase
      .from('assessment_documents')
      .insert(params)

    if (error) {
      console.error('Error linking assessment to document:', error)
    }
  }

  private async logGeneration(params: any): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser()
    
    const { data, error } = await this.supabase
      .from('document_generation_logs')
      .insert({
        ...params,
        created_by: user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error logging generation:', error)
    }

    return data?.id
  }

  private async updateGenerationLog(
    documentId: string | null,
    status: string,
    error?: any
  ): Promise<void> {
    // Update the most recent log entry
    const { data: { user } } = await this.supabase.auth.getUser()
    
    const update: any = {
      status,
      completed_at: new Date().toISOString()
    }

    if (documentId) update.document_id = documentId
    if (error) update.error_message = error.message || String(error)

    await this.supabase
      .from('document_generation_logs')
      .update(update)
      .eq('created_by', user?.id)
      .order('started_at', { ascending: false })
      .limit(1)
  }

  private async fetchMultipleAssessments(
    clientId: string,
    assessmentIds?: string[]
  ): Promise<AssessmentData[]> {
    const assessments: AssessmentData[] = []

    // Fetch each type of assessment
    const types = ['suitability', 'atr', 'cfl', 'vulnerability']
    
    for (const type of types) {
      const table = `${type}_assessments`
      const query = this.supabase
        .from(table)
        .select('*')
        .eq('client_id', clientId)

      if (assessmentIds && assessmentIds.length > 0) {
        query.in('id', assessmentIds)
      }

      const { data, error } = await query

      if (!error && data) {
        assessments.push(...data.map(d => ({
          type: type as any,
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
      CLIENT_NAME: `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim(),
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
      ASSESSMENT_HISTORY: this.buildAssessmentHistory(assessments),
      KEY_CHANGES: this.identifyKeyChanges(assessments, client),
      RECOMMENDATIONS: this.buildRecommendations(assessments, client),
      NEXT_STEPS: this.buildNextSteps(assessments, client)
    }
  }

  private generateExecutiveSummary(assessments: AssessmentData[], client: any): string {
    const hasAllAssessments = assessments.length >= 3
    const riskAligned = this.checkRiskAlignment(assessments)
    
    return `This annual review summarizes the current financial position and risk profile for ${client.personal_details?.firstName || 'the client'}. ${hasAllAssessments ? 'All required assessments have been completed.' : 'Some assessments are pending completion.'} ${riskAligned ? 'Risk profiles are well-aligned across assessments.' : 'There are some discrepancies in risk assessments that require attention.'}`
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
        return `Risk score: ${assessment.data.total_score}/100, Category: ${assessment.data.risk_category}`
      case 'cfl':
        return `Capacity score: ${assessment.data.total_score}/100, Max loss: ${assessment.data.max_loss_percentage}%`
      case 'suitability':
        return `Suitability confirmed for ${assessment.data.objectives?.primary_objective || 'investment'}`
      case 'vulnerability':
        return assessment.data.is_vulnerable ? 'Vulnerability factors identified' : 'No vulnerabilities identified'
      default:
        return 'Assessment completed'
    }
  }

  private identifyKeyChanges(assessments: AssessmentData[], client: any): string[] {
    const changes: string[] = []
    
    // Check for recent assessment updates
    const recentAssessments = assessments.filter(a => {
      const daysSince = (Date.now() - new Date(a.completedAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince < 90
    })
    
    if (recentAssessments.length > 0) {
      changes.push(`${recentAssessments.length} assessment(s) updated in the last 90 days`)
    }
    
    // Check for risk level changes
    const atr = assessments.find(a => a.type === 'atr')
    if (atr && atr.data.risk_level !== client.risk_profile?.risk_level) {
      changes.push('Risk profile has been updated')
    }
    
    // Check vulnerability status
    if (client.vulnerability_assessment?.is_vulnerable) {
      changes.push('Client vulnerability factors require ongoing monitoring')
    }
    
    return changes.length > 0 ? changes : ['No significant changes since last review']
  }

  private buildRecommendations(assessments: AssessmentData[], client: any): any[] {
    const recommendations: any[] = []
    
    // Risk recommendations
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
    
    // Missing assessments
    const missingTypes = ['atr', 'cfl', 'suitability', 'vulnerability']
      .filter(type => !assessments.find(a => a.type === type))
    
    if (missingTypes.length > 0) {
      recommendations.push({
        category: 'Assessment Completion',
        recommendation: `Complete missing assessments: ${missingTypes.join(', ')}`
      })
    }
    
    // Regular review
    recommendations.push({
      category: 'Ongoing Monitoring',
      recommendation: 'Schedule quarterly portfolio reviews and annual assessment updates'
    })
    
    return recommendations
  }

  private buildNextSteps(assessments: AssessmentData[], client: any): string[] {
    const steps: string[] = []
    
    // Check for missing assessments
    const hasAtr = assessments.find(a => a.type === 'atr')
    const hasCfl = assessments.find(a => a.type === 'cfl')
    const hasSuitability = assessments.find(a => a.type === 'suitability')
    
    if (!hasAtr) steps.push('Complete Attitude to Risk (ATR) assessment')
    if (!hasCfl) steps.push('Complete Capacity for Loss (CFL) assessment')
    if (!hasSuitability) steps.push('Complete Suitability assessment')
    
    // Always include review step
    steps.push('Review and approve recommendations with client')
    steps.push('Implement agreed investment strategy')
    steps.push('Schedule next review date')
    
    return steps
  }

  private async documentExists(clientId: string, documentType: string): Promise<boolean> {
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

  private async getLatestAssessment(clientId: string, type: string): Promise<any> {
    const table = `${type}_assessments`
    
    const { data } = await this.supabase
      .from(table)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)

    return data?.[0]
  }

  private async sendForSignature(documentId: string, clientId: string): Promise<void> {
    // This would integrate with your DocuSeal service
    console.log(`Sending document ${documentId} for signature to client ${clientId}`)
  }

  private async getCombinedReportTemplate(
    reportType: string,
    templateId?: string
  ): Promise<any> {
    if (templateId) {
      return await this.templateService.getTemplateById(templateId)
    }

    const { data } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('assessment_type', 'combined')
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    return data
  }
}

// Export singleton instance
export const enhancedDocumentService = EnhancedDocumentGenerationService.getInstance()
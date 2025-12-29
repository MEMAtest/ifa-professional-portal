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

export interface DocumentSaveParams {
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

export interface LinkAssessmentParams {
  assessment_type: string
  assessment_id: string
  document_id: string
  template_used: string
  variables_used: Record<string, any>
}

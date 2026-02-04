export interface DocumentMetadata {
  type?: string
  extracted_text?: string
  extracted_text_length?: number
  extraction_method?: string
  extracted_at?: string
  ai_analysis?: {
    summary: string
    classification: string
    confidence: number
    entities: {
      clientNames?: string[]
      dates?: string[]
      providerNames?: string[]
      policyNumbers?: string[]
      financialAmounts?: { amount: number; currency: string; context: string }[]
      addresses?: string[]
      referenceNumbers?: string[]
    }
  }
  ai_analyzed_at?: string
  ai_provider?: string
  ai_error?: string
  extraction_error?: string
}

export interface UploadedDocument {
  id: string
  name: string
  file_name: string
  file_type: string
  file_size: number
  type: string
  document_type: string
  tags: string[]
  created_at: string
  status: string
  metadata?: DocumentMetadata
}

export interface FileReviewDocument extends UploadedDocument {
  metadata?: DocumentMetadata & {
    type?: string
    reviewMarkdown?: string
    generatedAt?: string
    documentsAnalyzed?: number
    totalDocuments?: number
    aiProvider?: string
    workflow?: {
      steps?: Array<{
        id: string
        label: string
        done: boolean
        completedAt?: string | null
      }>
    }
  }
}

export type DocTypeFilter = 'all' | 'pdf' | 'word' | 'email' | 'spreadsheet' | 'image' | 'text'

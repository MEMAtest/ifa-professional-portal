// src/types/bulk-setup.ts
// Types for the bulk client setup flow

export interface ParsedFile {
  name: string
  file: File
  size: number
  mimeType: string
  isSupported: boolean
}

export interface ParsedClientFolder {
  folderName: string
  files: ParsedFile[]
  suggestedLastName: string
  suggestedClientRef: string
}

export interface ReviewedClient {
  id: string
  lastName: string
  firstName: string
  email: string
  clientRef: string
  files: ParsedFile[]
  errors: Record<string, string>
}

export interface BulkClientRequest {
  clients: {
    clientRef: string
    firstName: string
    lastName: string
    email: string
  }[]
}

export interface BulkClientResult {
  clientRef: string
  clientId: string | null
  success: boolean
  error?: string
}

export interface BulkClientResponse {
  results: BulkClientResult[]
  created: number
  failed: number
}

export type BulkSetupPhase = 'upload' | 'review' | 'processing' | 'analysing' | 'confirm' | 'complete'

export interface ProcessingState {
  phase: 'creating-clients' | 'uploading-files'
  currentClient: string
  currentFile: string
  clientsProcessed: number
  clientsTotal: number
  filesProcessed: number
  filesTotal: number
}

export interface ProcessingError {
  clientRef: string
  fileName?: string
  error: string
  type: 'client-creation' | 'file-upload'
}

export interface CompletedClient {
  clientRef: string
  clientId: string
  filesUploaded: number
  filesFailed: number
  fileNames: string[]
  uploadedDocumentIds: string[]
}

export interface CompletedState {
  clientsCreated: number
  clientsFailed: number
  filesUploaded: number
  filesFailed: number
  completedClients: CompletedClient[]
  errors: ProcessingError[]
}

// ================================================================
// OPENSIGN SERVICE - COMPLETE INTEGRATION
// ================================================================

export interface OpenSignConfig {
  apiKey: string
  apiUrl: string
}

export interface SignerInfo {
  email: string
  name: string
  role?: string
}

export interface SignatureRequestOptions {
  includeCharts?: boolean
  outputFormat?: 'pdf' | 'docx'
  expiryDays?: number
  autoReminder?: boolean
  remindOnceInEvery?: number
  mergeCertificate?: boolean
}

export interface OpenSignDocument {
  id: string
  name: string
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'completed' | 'expired' | 'declined'
  createdAt: string
  updatedAt: string
  downloadUrl?: string
  certificateUrl?: string
  signers: SignerInfo[]
  metadata?: Record<string, any>
}

export interface SignatureRequestResult {
  success: boolean
  documentId?: string
  downloadUrl?: string
  error?: string
  metadata?: {
    service: string
    timestamp: string
    opensignDocumentId?: string
    mockData?: any
  }
}

export class OpenSignService {
  private config: OpenSignConfig
  private mockMode: boolean = false
  private initialized: boolean = false

  constructor(config?: Partial<OpenSignConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.OPENSIGN_API_KEY || '',
      apiUrl: config?.apiUrl || process.env.OPENSIGN_API_URL || 'https://app.opensignlabs.com/api'
    }

    // Enable mock mode if API key starts with 'test.' or 'mock.'
    this.mockMode = this.config.apiKey.startsWith('test.') || this.config.apiKey.startsWith('mock.')

    if (!this.config.apiKey) {
      console.warn('OpenSign API key not configured - service will run in disabled mode')
      this.initialized = false
      return
    }

    this.initialized = true

    if (this.mockMode) {
      console.log('OpenSign Service running in MOCK MODE')
    }
  }

  /**
   * Check if service is initialized and return error result if not
   */
  private getNotInitializedResult(): SignatureRequestResult {
    return {
      success: false,
      error: 'OpenSign service not configured. Please add OPENSIGN_API_KEY to environment.',
      metadata: {
        service: 'opensign',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.apiUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-token': this.config.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenSign API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  /**
   * Create a new document from PDF buffer
   */
  async createDocument(
    pdfBuffer: Buffer,
    name: string,
    signers: SignerInfo[],
    options: SignatureRequestOptions = {}
  ): Promise<SignatureRequestResult> {
    if (!this.initialized) {
      return this.getNotInitializedResult()
    }

    if (this.mockMode) {
      return this.mockCreateDocument(name, signers, options)
    }

    try {
      const formData = new FormData()
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      formData.append('file', blob, name)
      formData.append('name', name)

      // Add signers
      signers.forEach((signer, index) => {
        formData.append(`signers[${index}][email]`, signer.email)
        formData.append(`signers[${index}][name]`, signer.name)
        formData.append(`signers[${index}][role]`, signer.role || 'Client')
      })

      // Add options
      if (options.expiryDays) {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + options.expiryDays)
        formData.append('expiry_date', expiryDate.toISOString())
      }

      if (options.autoReminder) {
        formData.append('auto_reminder', 'true')
      }

      if (options.remindOnceInEvery) {
        formData.append('remind_once_in_every', options.remindOnceInEvery.toString())
      }

      if (options.mergeCertificate) {
        formData.append('merge_certificate', 'true')
      }

      const response = await fetch(`${this.config.apiUrl}/v1/documents`, {
        method: 'POST',
        headers: {
          'x-api-token': this.config.apiKey
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create document: ${errorText}`)
      }

      const result = await response.json()

      return {
        success: true,
        documentId: result.id,
        downloadUrl: result.download_url,
        metadata: {
          service: 'opensign',
          timestamp: new Date().toISOString(),
          opensignDocumentId: result.id
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating document',
        metadata: {
          service: 'opensign',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Mock implementation for testing
   */
  private mockCreateDocument(
    name: string,
    signers: SignerInfo[],
    options: SignatureRequestOptions = {}
  ): SignatureRequestResult {
    const mockId = `mock-doc-${Date.now()}`
    return {
      success: true,
      documentId: mockId,
      downloadUrl: `https://mock.opensign.com/download/${mockId}`,
      metadata: {
        service: 'opensign-mock',
        timestamp: new Date().toISOString(),
        opensignDocumentId: mockId,
        mockData: {
          name,
          signers,
          options
        }
      }
    }
  }

  /**
   * Send document for signature
   */
  async sendForSignature(
    documentId: string,
    signers: SignerInfo[],
    options: SignatureRequestOptions = {}
  ): Promise<SignatureRequestResult> {
    if (!this.initialized) {
      return this.getNotInitializedResult()
    }

    if (this.mockMode) {
      return this.mockSendForSignature(documentId, signers, options)
    }

    try {
      const payload = {
        signers: signers.map(signer => ({
          email: signer.email,
          name: signer.name,
          role: signer.role || 'Client'
        })),
        send_email: true,
        ...options
      }

      const result = await this.makeRequest(`/v1/documents/${documentId}/send`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      return {
        success: true,
        documentId: result.id || documentId,
        downloadUrl: result.download_url,
        metadata: {
          service: 'opensign',
          timestamp: new Date().toISOString(),
          opensignDocumentId: result.id || documentId
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending document',
        metadata: {
          service: 'opensign',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  private mockSendForSignature(
    documentId: string,
    signers: SignerInfo[],
    options: SignatureRequestOptions = {}
  ): SignatureRequestResult {
    return {
      success: true,
      documentId,
      downloadUrl: `https://mock.opensign.com/download/${documentId}`,
      metadata: {
        service: 'opensign-mock',
        timestamp: new Date().toISOString(),
        opensignDocumentId: documentId,
        mockData: {
          action: 'sent',
          signers,
          options
        }
      }
    }
  }

  /**
   * Get document status
   */
  async getDocumentStatus(documentId: string): Promise<OpenSignDocument | null> {
    if (!this.initialized) {
      console.warn('OpenSign service not initialized - cannot get document status')
      return null
    }

    if (this.mockMode) {
      return this.mockGetDocumentStatus(documentId)
    }

    try {
      const result = await this.makeRequest(`/v1/documents/${documentId}`)

      return {
        id: result.id,
        name: result.name,
        status: result.status,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        downloadUrl: result.download_url,
        certificateUrl: result.certificate_url,
        signers: result.signers || [],
        metadata: result.metadata
      }
    } catch (error) {
      console.error('Error getting document status:', error)
      return null
    }
  }

  private mockGetDocumentStatus(documentId: string): OpenSignDocument {
    return {
      id: documentId,
      name: `Mock Document ${documentId}`,
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      downloadUrl: `https://mock.opensign.com/download/${documentId}`,
      certificateUrl: `https://mock.opensign.com/certificate/${documentId}`,
      signers: [
        {
          email: 'test@example.com',
          name: 'Test Signer',
          role: 'Client'
        }
      ],
      metadata: {
        mockDocument: true,
        createdInMockMode: true
      }
    }
  }

  /**
   * Download signed document
   */
  async downloadSignedDocument(documentId: string): Promise<Buffer | null> {
    try {
      const document = await this.getDocumentStatus(documentId)
      if (!document?.downloadUrl) {
        throw new Error('Document not ready for download')
      }

      const response = await fetch(document.downloadUrl, {
        headers: {
          'x-api-token': this.config.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Error downloading document:', error)
      return null
    }
  }

  /**
   * List all documents
   */
  async listDocuments(limit = 10, offset = 0): Promise<OpenSignDocument[]> {
    if (!this.initialized) {
      console.warn('OpenSign service not initialized - cannot list documents')
      return []
    }

    if (this.mockMode) {
      return this.mockListDocuments(limit, offset)
    }

    try {
      const result = await this.makeRequest(`/v1/documents?limit=${limit}&offset=${offset}`)

      return (result.documents || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        status: doc.status,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        downloadUrl: doc.download_url,
        certificateUrl: doc.certificate_url,
        signers: doc.signers || [],
        metadata: doc.metadata
      }))
    } catch (error) {
      console.error('Error listing documents:', error)
      return []
    }
  }

  private mockListDocuments(limit = 10, offset = 0): OpenSignDocument[] {
    const mockDocs: OpenSignDocument[] = []
    for (let i = 0; i < Math.min(limit, 3); i++) {
      const id = `mock-doc-${Date.now()}-${i}`
      mockDocs.push({
        id,
        name: `Mock Document ${i + 1}`,
        status: i === 0 ? 'signed' : i === 1 ? 'sent' : 'draft',
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        downloadUrl: `https://mock.opensign.com/download/${id}`,
        certificateUrl: `https://mock.opensign.com/certificate/${id}`,
        signers: [
          {
            email: 'test@example.com',
            name: 'Test Signer',
            role: 'Client'
          }
        ],
        metadata: {
          mockDocument: true,
          index: i
        }
      })
    }
    return mockDocs
  }

  /**
   * Resend mail for document
   */
  async resendMail(documentId: string, recipientEmail: string): Promise<boolean> {
    try {
      await this.makeRequest(`/documents/${documentId}/resend`, {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: recipientEmail
        })
      })
      return true
    } catch (error) {
      console.error('Error resending mail:', error)
      return false
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/documents/${documentId}`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Error deleting document:', error)
      return false
    }
  }

  /**
   * Get API credits/usage information
   */
  async getCredits(): Promise<{ credits: number; used: number } | null> {
    if (this.mockMode) {
      return {
        credits: 1000,
        used: 45
      }
    }

    try {
      const result = await this.makeRequest('/v1/credits')
      return {
        credits: result.credits || 0,
        used: result.used || 0
      }
    } catch (error) {
      console.error('Error getting credits:', error)
      return null
    }
  }
}

// Export singleton instance
export const openSignService = new OpenSignService()
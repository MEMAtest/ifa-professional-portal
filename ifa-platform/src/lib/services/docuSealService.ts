// ===================================================================
// DOCUSEAL API INTEGRATION SERVICE
// Complete integration with DocuSeal for digital signatures
// ===================================================================

// DocuSeal API Configuration
const DOCUSEAL_API_BASE = 'https://api.docuseal.co'
const DOCUSEAL_API_KEY = 'GFdoJQa8Ceyo1a8yJKk32WCnmFBu6AiojjAZUrByi4M'

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

export interface DocuSealTemplate {
  id: string
  name: string
  created_at: string
  updated_at: string
  schema: DocuSealField[]
}

export interface DocuSealField {
  attachment_uuid: string
  name: string
  type: 'text' | 'signature' | 'initials' | 'date' | 'number' | 'image' | 'checkbox'
  required: boolean
  readonly: boolean
  default_value?: string
  page: number
  area: {
    x: number
    y: number
    w: number
    h: number
  }
}

export interface DocuSealSubmission {
  id: string
  template_id: string
  created_at: string
  updated_at: string
  completed_at?: string
  status: 'pending' | 'completed' | 'expired' | 'declined'
  submitters: DocuSealSubmitter[]
  audit_trail: DocuSealAuditEvent[]
}

export interface DocuSealSubmitter {
  uuid: string
  email: string
  name: string
  phone?: string
  role: string
  completed_at?: string
  opened_at?: string
  sent_at?: string
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'declined'
  metadata?: Record<string, any>
}

export interface DocuSealAuditEvent {
  timestamp: string
  event_type: string
  submitter_uuid?: string
  ip_address?: string
  user_agent?: string
  details: Record<string, any>
}

export interface CreateSubmissionRequest {
  template_id: string
  send_email: boolean
  submitters: Array<{
    role: string
    email: string
    name: string
    phone?: string
    metadata?: Record<string, any>
  }>
  message?: string
  subject?: string
  expires_at?: string
  completed_redirect_url?: string
  decline_redirect_url?: string
}

export interface CreateTemplateRequest {
  name: string
  documents: Array<{
    name: string
    file: File | Blob
  }>
  fields: Array<{
    submitter_role: string
    name: string
    type: string
    required: boolean
    page: number
    area: {
      x: number
      y: number
      w: number
      h: number
    }
    default_value?: string
  }>
}

// ===================================================================
// DOCUSEAL SERVICE CLASS
// ===================================================================

export class DocuSealService {
  private apiKey = DOCUSEAL_API_KEY
  private baseUrl = DOCUSEAL_API_BASE

  // ===================================================================
  // TEMPLATE MANAGEMENT
  // ===================================================================

  async createTemplate(templateData: CreateTemplateRequest): Promise<DocuSealTemplate> {
    try {
      const formData = new FormData()
      
      // Add template metadata
      formData.append('name', templateData.name)
      
      // Add documents
      templateData.documents.forEach((doc, index) => {
        formData.append(`documents[${index}][name]`, doc.name)
        formData.append(`documents[${index}][file]`, doc.file)
      })

      // Add fields
      templateData.fields.forEach((field, index) => {
        formData.append(`fields[${index}][submitter_role]`, field.submitter_role)
        formData.append(`fields[${index}][name]`, field.name)
        formData.append(`fields[${index}][type]`, field.type)
        formData.append(`fields[${index}][required]`, field.required.toString())
        formData.append(`fields[${index}][page]`, field.page.toString())
        formData.append(`fields[${index}][area][x]`, field.area.x.toString())
        formData.append(`fields[${index}][area][y]`, field.area.y.toString())
        formData.append(`fields[${index}][area][w]`, field.area.w.toString())
        formData.append(`fields[${index}][area][h]`, field.area.h.toString())
        
        if (field.default_value) {
          formData.append(`fields[${index}][default_value]`, field.default_value)
        }
      })

      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': this.apiKey
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const template = await response.json()
      return this.mapDocuSealTemplate(template)
    } catch (error) {
      console.error('Create template error:', error)
      throw error
    }
  }

  async getTemplates(): Promise<DocuSealTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const templates = await response.json()
      return templates.map(this.mapDocuSealTemplate)
    } catch (error) {
      console.error('Get templates error:', error)
      throw error
    }
  }

  async getTemplate(templateId: string): Promise<DocuSealTemplate> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const template = await response.json()
      return this.mapDocuSealTemplate(template)
    } catch (error) {
      console.error('Get template error:', error)
      throw error
    }
  }

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'X-Auth-Token': this.apiKey
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Delete template error:', error)
      throw error
    }
  }

  // ===================================================================
  // SUBMISSION MANAGEMENT
  // ===================================================================

  async createSubmission(submissionData: CreateSubmissionRequest): Promise<DocuSealSubmission> {
    try {
      const response = await fetch(`${this.baseUrl}/submissions`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const submission = await response.json()
      return this.mapDocuSealSubmission(submission)
    } catch (error) {
      console.error('Create submission error:', error)
      throw error
    }
  }

  async getSubmissions(): Promise<DocuSealSubmission[]> {
    try {
      const response = await fetch(`${this.baseUrl}/submissions`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const submissions = await response.json()
      return submissions.map(this.mapDocuSealSubmission)
    } catch (error) {
      console.error('Get submissions error:', error)
      throw error
    }
  }

  async getSubmission(submissionId: string): Promise<DocuSealSubmission> {
    try {
      const response = await fetch(`${this.baseUrl}/submissions/${submissionId}`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const submission = await response.json()
      return this.mapDocuSealSubmission(submission)
    } catch (error) {
      console.error('Get submission error:', error)
      throw error
    }
  }

  async cancelSubmission(submissionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: {
          'X-Auth-Token': this.apiKey
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Cancel submission error:', error)
      throw error
    }
  }

  async downloadSignedDocument(submissionId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/submissions/${submissionId}/download`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': this.apiKey
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`DocuSeal API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Download signed document error:', error)
      throw error
    }
  }

  // ===================================================================
  // WEBHOOK HANDLING
  // ===================================================================

  async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      // DocuSeal uses HMAC-SHA256 for webhook verification
      const crypto = await import('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')
      
      return `sha256=${expectedSignature}` === signature
    } catch (error) {
      console.error('Webhook signature verification error:', error)
      return false
    }
  }

  // ===================================================================
  // HIGH-LEVEL INTEGRATION METHODS
  // ===================================================================

  async createStandardSuitabilityTemplate(): Promise<string> {
    try {
      // Create a standard suitability report template with signature fields
      const templateData: CreateTemplateRequest = {
        name: 'IFA Suitability Report Template',
        documents: [
          {
            name: 'Suitability Report Template',
            file: await this.createSuitabilityTemplatePDF()
          }
        ],
        fields: [
          {
            submitter_role: 'client',
            name: 'client_signature',
            type: 'signature',
            required: true,
            page: 0,
            area: { x: 50, y: 750, w: 200, h: 50 }
          },
          {
            submitter_role: 'client',
            name: 'signature_date',
            type: 'date',
            required: true,
            page: 0,
            area: { x: 300, y: 750, w: 100, h: 30 }
          },
          {
            submitter_role: 'advisor',
            name: 'advisor_signature',
            type: 'signature',
            required: true,
            page: 0,
            area: { x: 50, y: 650, w: 200, h: 50 }
          },
          {
            submitter_role: 'advisor',
            name: 'advisor_date',
            type: 'date',
            required: true,
            page: 0,
            area: { x: 300, y: 650, w: 100, h: 30 }
          }
        ]
      }

      const template = await this.createTemplate(templateData)
      return template.id
    } catch (error) {
      console.error('Create standard suitability template error:', error)
      throw error
    }
  }

  async createSignatureRequestForDocument(
    documentId: string,
    templateId: string,
    clientEmail: string,
    clientName: string,
    advisorEmail: string,
    advisorName: string,
    customMessage?: string
  ): Promise<string> {
    try {
      const submissionData: CreateSubmissionRequest = {
        template_id: templateId,
        send_email: true,
        submitters: [
          {
            role: 'client',
            email: clientEmail,
            name: clientName,
            metadata: { document_id: documentId }
          },
          {
            role: 'advisor',
            email: advisorEmail,
            name: advisorName,
            metadata: { document_id: documentId }
          }
        ],
        subject: 'Document Signature Required',
        message: customMessage || `Please sign the attached document. If you have any questions, please contact your advisor.`,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        completed_redirect_url: `${window.location.origin}/documents/${documentId}?signed=true`,
        decline_redirect_url: `${window.location.origin}/documents/${documentId}?declined=true`
      }

      const submission = await this.createSubmission(submissionData)
      return submission.id
    } catch (error) {
      console.error('Create signature request error:', error)
      throw error
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private async createSuitabilityTemplatePDF(): Promise<Blob> {
    // Create a basic PDF template for suitability reports
    // In a real implementation, you might use a PDF library like jsPDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Suitability Report Template</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin: 20px 0; }
          .signature-area { margin-top: 100px; border: 1px solid #ccc; padding: 20px; }
          .signature-box { display: inline-block; width: 250px; height: 80px; border: 1px solid #999; margin: 10px; vertical-align: top; }
          .date-box { display: inline-block; width: 120px; height: 30px; border: 1px solid #999; margin: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Investment Suitability Report</h1>
          <p>Prepared for: [CLIENT_NAME]</p>
          <p>Date: [REPORT_DATE]</p>
        </div>
        
        <div class="section">
          <h2>Executive Summary</h2>
          <p>This report provides our investment recommendations based on your financial circumstances, investment objectives, and risk tolerance.</p>
        </div>
        
        <div class="section">
          <h2>Client Profile</h2>
          <p><strong>Name:</strong> [CLIENT_NAME]</p>
          <p><strong>Risk Profile:</strong> [RISK_LEVEL]</p>
          <p><strong>Investment Objective:</strong> [INVESTMENT_OBJECTIVE]</p>
          <p><strong>Time Horizon:</strong> [TIME_HORIZON]</p>
        </div>
        
        <div class="section">
          <h2>Recommendation</h2>
          <p>[RECOMMENDATION_DETAILS]</p>
        </div>
        
        <div class="signature-area">
          <h3>Signatures</h3>
          <p><strong>Client Signature:</strong></p>
          <div class="signature-box"></div>
          <div class="date-box"></div>
          
          <p><strong>Advisor Signature:</strong></p>
          <div class="signature-box"></div>
          <div class="date-box"></div>
        </div>
      </body>
      </html>
    `

    return new Blob([htmlContent], { type: 'text/html' })
  }

  private mapDocuSealTemplate(template: any): DocuSealTemplate {
    return {
      id: template.id,
      name: template.name,
      created_at: template.created_at,
      updated_at: template.updated_at,
      schema: template.schema || []
    }
  }

  private mapDocuSealSubmission(submission: any): DocuSealSubmission {
    return {
      id: submission.id,
      template_id: submission.template_id,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      completed_at: submission.completed_at,
      status: submission.status,
      submitters: submission.submitters || [],
      audit_trail: submission.audit_trail || []
    }
  }

  // ===================================================================
  // API HEALTH CHECK
  // ===================================================================

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': this.apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return {
          success: true,
          message: 'DocuSeal API connection successful'
        }
      } else {
        return {
          success: false,
          message: `DocuSeal API error: ${response.status} - ${response.statusText}`
        }
      }
    } catch (error: any) {
      return {
        success: false,
        message: `DocuSeal API connection failed: ${error?.message || 'Unknown error'}`
      }
    }
  }
}

// ===================================================================
// SINGLETON INSTANCE
// ===================================================================

export const docuSealService = new DocuSealService()

// ===================================================================
// REACT HOOKS FOR DOCUSEAL INTEGRATION
// ===================================================================

import { useState, useEffect, useCallback } from 'react'

export function useDocuSealTemplates() {
  const [templates, setTemplates] = useState<DocuSealTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fetchedTemplates = await docuSealService.getTemplates()
      setTemplates(fetchedTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates
  }
}

export function useDocuSealSubmissions() {
  const [submissions, setSubmissions] = useState<DocuSealSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fetchedSubmissions = await docuSealService.getSubmissions()
      setSubmissions(fetchedSubmissions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  return {
    submissions,
    loading,
    error,
    refetch: fetchSubmissions
  }
}

export function useDocuSealConnection() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [testing, setTesting] = useState(false)

  const testConnection = useCallback(async () => {
    setTesting(true)
    try {
      const result = await docuSealService.testConnection()
      setConnected(result.success)
      return result
    } catch (error) {
      setConnected(false)
      return {
        success: false,
        message: 'Connection test failed'
      }
    } finally {
      setTesting(false)
    }
  }, [])

  useEffect(() => {
    testConnection()
  }, [testConnection])

  return {
    connected,
    testing,
    testConnection
  }
}
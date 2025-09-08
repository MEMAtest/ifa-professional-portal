import { createClient } from "@/lib/supabase/client"
// ===================================================================
// STEP 2: DocuSeal Service
// File: src/services/docuSealService.ts
// ===================================================================

interface DocuSealConfig {
  apiKey: string
  baseUrl: string
}

interface SignatureRequest {
  template_id?: number
  send_email?: boolean
  submitters: Array<{
    email: string
    name?: string
    role?: string
  }>
  fields?: Array<{
    name: string
    default_value?: string
    validation_pattern?: string
    invalid_message?: string
  }>
  metadata?: Record<string, any>
}

export class DocuSealService {
  private config: DocuSealConfig

  constructor() {
    this.config = {
      apiKey: process.env.NEXT_PUBLIC_DOCUSEAL_API_KEY || 'GFdoJQa8Ceyo1a8yJKk32WCnmFBu6AiojjAZUrByi4M',
      baseUrl: 'https://api.docuseal.co'
    }
  }

  // Upload a document to DocuSeal and create a template
  async createTemplateFromDocument(documentUrl: string, templateName: string) {
    try {
      const response = await fetch(`${this.config.baseUrl}/templates`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: templateName,
          documents: [
            {
              name: templateName,
              file_url: documentUrl
            }
          ],
          fields: [
            {
              name: 'signature',
              type: 'signature',
              required: true,
              areas: [
                {
                  x: 100,
                  y: 700,
                  w: 200,
                  h: 60,
                  page: 0
                }
              ]
            },
            {
              name: 'date',
              type: 'date',
              required: true,
              areas: [
                {
                  x: 350,
                  y: 700,
                  w: 150,
                  h: 40,
                  page: 0
                }
              ]
            }
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`DocuSeal API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('DocuSeal template creation error:', error)
      throw error
    }
  }

  // Send document for signature
  async sendForSignature(params: {
    templateId: number
    signerEmail: string
    signerName: string
    metadata?: Record<string, any>
  }) {
    try {
      const response = await fetch(`${this.config.baseUrl}/submissions`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: params.templateId,
          send_email: true,
          submitters: [
            {
              email: params.signerEmail,
              name: params.signerName,
              role: 'Client'
            }
          ],
          metadata: params.metadata
        })
      })

      if (!response.ok) {
        throw new Error(`DocuSeal API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('DocuSeal signature request error:', error)
      throw error
    }
  }

  // Check signature status
  async getSubmissionStatus(submissionId: string) {
    try {
      const response = await fetch(`${this.config.baseUrl}/submissions/${submissionId}`, {
        headers: {
          'X-Auth-Token': this.config.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`DocuSeal API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('DocuSeal status check error:', error)
      throw error
    }
  }

  // Download signed document
  async downloadSignedDocument(submissionId: string) {
    try {
      const response = await fetch(`${this.config.baseUrl}/submissions/${submissionId}/documents`, {
        headers: {
          'X-Auth-Token': this.config.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`DocuSeal API error: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('DocuSeal download error:', error)
      throw error
    }
  }
}

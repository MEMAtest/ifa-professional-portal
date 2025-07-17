// ===================================================================
// FIXED DOCUMENT GENERATION SERVICE - Proper JSX Syntax
// File: src/services/documentGenerationService.ts
// ===================================================================

import { createBrowserClient } from '@supabase/ssr'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import React from 'react'

// Define proper TypeScript interfaces
interface DocumentGenerationParams {
  content: string
  title: string
  clientId: string
  templateId: string
  metadata?: Record<string, any>
}

interface DocumentGenerationResult {
  success: boolean
  document?: any
  url?: string
  error?: string
}

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica'
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center'
  },
  section: {
    marginBottom: 15
  },
  heading: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  text: {
    marginBottom: 5,
    lineHeight: 1.5
  }
})

// PDF Document Component with proper TypeScript
interface PDFDocumentProps {
  content: string
  title: string
}

const PDFDocument: React.FC<PDFDocumentProps> = ({ content, title }) => {
  // Parse HTML content and convert to React PDF elements
  const sections = content.split('<h2>').filter(Boolean)
  
  return React.createElement(Document, {}, 
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, title),
      ...sections.map((section, index) => {
        const [heading, ...contentParts] = section.split('</h2>')
        const text = contentParts.join('').replace(/<[^>]*>/g, '') // Strip HTML
        
        return React.createElement(View, { key: index, style: styles.section },
          heading && React.createElement(Text, { style: styles.heading }, heading),
          React.createElement(Text, { style: styles.text }, text)
        )
      })
    )
  )
}

export class DocumentGenerationService {
  private supabase

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  async generateDocument(params: DocumentGenerationParams): Promise<DocumentGenerationResult> {
    try {
      // 1. Generate PDF blob using React.createElement
      const pdfBlob = await pdf(
        React.createElement(PDFDocument, { 
          content: params.content, 
          title: params.title 
        })
      ).toBlob()

      // 2. Create file name
      const sanitizedTitle = params.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
      const fileName = `${params.clientId}/${Date.now()}_${sanitizedTitle}.pdf`

      // 3. Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // 4. Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // 5. Create database record
      const { data: document, error: dbError } = await this.supabase
        .from('documents')
        .insert({
          client_id: params.clientId,
          name: params.title, // Use 'name' instead of 'title' to match your schema
          file_path: fileName,
          file_size: pdfBlob.size,
          file_type: 'pdf',
          template_id: params.templateId,
          status: 'active', // Use 'active' instead of 'generated'
          compliance_status: 'pending',
          compliance_level: 'standard',
          metadata: {
            ...params.metadata,
            generated_at: new Date().toISOString(),
            file_size: pdfBlob.size,
            template_id: params.templateId
          }
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error(`Database insert failed: ${dbError.message}`)
      }

      return {
        success: true,
        document,
        url: publicUrl
      }
    } catch (error) {
      console.error('Document generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed'
      }
    }
  }

  // Helper method to get document by ID
  async getDocument(documentId: string) {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching document:', error)
      return null
    }
  }

  // Helper method to get client documents
  async getClientDocuments(clientId: string) {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select(`
          *,
          signature_requests (
            id,
            status,
            docuseal_submission_id,
            sent_at,
            completed_at
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(doc => ({
        ...doc,
        signature_status: doc.signature_requests?.[0]?.status || null,
        signature_request_id: doc.signature_requests?.[0]?.id || null
      }))
    } catch (error) {
      console.error('Error fetching client documents:', error)
      return []
    }
  }
}

// Export singleton instance
export const documentGenerationService = new DocumentGenerationService()
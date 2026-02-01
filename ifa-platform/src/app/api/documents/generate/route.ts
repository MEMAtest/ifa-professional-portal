// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// src/app/api/documents/generate/route.ts - Document Generation from Templates
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { log } from '@/lib/logging/structured'
import { notifyDocumentGenerated } from '@/lib/notifications/notificationService'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

interface GenerateDocumentRequest {
  content: string
  title: string
  clientId?: string
  templateId?: string
  variables?: Record<string, string>
  format?: 'pdf' | 'docx' | 'html'
  metadata?: Record<string, any>
}

interface GenerateDocumentResponse {
  success: boolean
  document?: {
    id: string
    name: string
    file_path: string
    file_type: string
    created_at: string
  }
  url?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateDocumentResponse>> {
  try {
    // Verify authentication
    const auth = await getAuthContext(request)
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase: any = getSupabaseServiceClient()
    const body: GenerateDocumentRequest = await request.json()

    // Validate required fields
    if (!body.content || !body.title) {
      return NextResponse.json(
        { success: false, error: 'Content and title are required' },
        { status: 400 }
      )
    }

    const firmId = auth.context?.firmId
    if (!firmId) {
      return NextResponse.json(
        { success: false, error: 'Firm ID not configured. Please contact support.' },
        { status: 403 }
      )
    }
    const userId = auth.context?.userId

    // Generate unique document ID
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fileName = `${body.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`
    const filePath = `documents/${firmId}/${documentId}/${fileName}`

    const metadata = {
      templateId: body.templateId,
      variables: body.variables,
      generatedAt: new Date().toISOString(),
      source: body.templateId ? 'template-generation' : 'api-generation',
      ...(body.metadata || {}),
    }

    // Create document record in database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        name: body.title,
        description: `Generated document from template`,
        file_name: fileName,
        file_path: filePath,
        storage_path: filePath,
        file_type: 'application/pdf',
        mime_type: 'application/pdf',
        firm_id: firmId,
        client_id: body.clientId || null,
        created_by: userId,
        status: 'active',
        compliance_status: 'pending',
        metadata
      })
      .select()
      .single()

    if (dbError) {
      log.error('Document creation error', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    // Log activity for document generation
    if (body.clientId) {
      try {
        await supabase
          .from('activity_log')
          .insert({
            id: crypto.randomUUID(),
            client_id: body.clientId,
            action: `Document generated: ${body.title}`,
            type: 'document_generated',
            date: new Date().toISOString()
          })
      } catch (activityError) {
        log.warn('Failed to log document generation activity', { clientId: body.clientId, error: activityError })
      }

      // Send bell notification
      const userId = auth.context?.userId
      if (userId) {
        try {
          // Fetch client name for notification
          const { data: clientData } = await supabase
            .from('clients')
            .select('personal_details')
            .eq('id', body.clientId)
            .single()
          const clientName = clientData?.personal_details?.firstName || clientData?.personal_details?.first_name || 'Client'
          await notifyDocumentGenerated(userId, body.clientId, clientName, document.id, body.title)
        } catch (notifyError) {
          log.warn('Failed to send document generation notification', { clientId: body.clientId, error: notifyError })
        }
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        file_path: document.file_path,
        file_type: document.file_type,
        created_at: document.created_at
      },
      url: `/api/documents/preview/${document.id}`
    })

  } catch (error) {
    log.error('Document generation error', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Document generation failed'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Document Generation API',
    endpoints: {
      'POST /': 'Generate document from template content'
    },
    required_fields: ['content', 'title'],
    optional_fields: ['clientId', 'templateId', 'variables', 'format', 'metadata']
  })
}

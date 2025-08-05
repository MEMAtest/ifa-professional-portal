// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/documents/generate-from-assessment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assessmentType, assessmentId, clientId } = body

    console.log('📄 Document generation requested:', { assessmentType, assessmentId, clientId })

    // Validate inputs
    if (!assessmentType || !assessmentId || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1. Fetch assessment data
    const assessmentTable = `${assessmentType}_assessments`
    const { data: assessment, error: assessmentError } = await supabase
      .from(assessmentTable)
      .select('*')
      .eq('id', assessmentId)
      .single()

    if (assessmentError || !assessment) {
      console.error('Assessment error:', assessmentError)
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // 2. Fetch client data - handle different structures
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      console.error('Client error:', clientError)
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // 3. Extract client name safely from your data structure
    let clientName = 'Client'
    let clientEmail = ''
    let clientRef = client.id
    
    // Your data uses personal_details (with underscore)
    if (client.personal_details) {
      const firstName = client.personal_details.firstName || ''
      const lastName = client.personal_details.lastName || ''
      const title = client.personal_details.title || ''
      clientName = `${title} ${firstName} ${lastName}`.trim()
    }
    
    // Get email from contact_info
    if (client.contact_info) {
      clientEmail = client.contact_info.email || ''
    }
    
    // Get client reference
    if (client.client_ref) {
      clientRef = client.client_ref
    }

    // 4. Create document record (without PDF for now)
    const documentId = crypto.randomUUID()
    const documentName = `${assessmentType.toUpperCase()} Assessment Report - ${clientName}`

    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        client_id: clientId,
        assessment_id: assessmentId,
        name: documentName,
        type: `${assessmentType}_assessment`,
        category: 'Assessment Reports',
        document_type: `${assessmentType}_report`,
        client_name: clientName,
        file_name: `${assessmentType}_${clientRef}_${Date.now()}.pdf`,
        mime_type: 'application/pdf',
        file_type: 'pdf',
        compliance_status: 'completed',
        requires_signature: false,
        signature_status: 'not_required',
        description: `${assessmentType.toUpperCase()} assessment report`,
        metadata: {
          assessment_id: assessmentId,
          assessment_type: assessmentType,
          assessment_data: assessment,
          client_data: {
            id: client.id,
            name: clientName,
            ref: clientRef,
            email: clientEmail
          },
          generated_at: new Date().toISOString(),
          generated_by: 'system'
        }
      })
      .select()
      .single()

    if (docError) {
      console.error('Document creation error:', docError)
      return NextResponse.json(
        { error: 'Failed to create document', details: docError.message },
        { status: 500 }
      )
    }

    console.log('✅ Document created successfully:', documentId)

    // 5. Try to link to assessment_documents table (optional)
    try {
      await supabase
        .from('assessment_documents')
        .insert({
          assessment_id: assessmentId,
          document_id: documentId,
          created_at: new Date().toISOString()
        })
    } catch (linkError) {
      console.log('Note: assessment_documents table not available')
    }

    // 6. Return success response
    return NextResponse.json({
      success: true,
      documentId: documentId,
      documentUrl: `/api/documents/preview/${documentId}`,
      pdfUrl: `/api/documents/download/${documentId}`,
      downloadUrl: `/api/documents/download/${documentId}`,
      metadata: {
        assessmentType,
        assessmentId,
        clientId,
        clientName,
        generatedAt: new Date().toISOString()
      },
      message: 'Document created successfully. PDF generation will be added next.'
    })

  } catch (error) {
    console.error('❌ Route error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
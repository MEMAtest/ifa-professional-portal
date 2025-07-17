// ===================================================================
// FIXED API ROUTE: Document Generation
// File: src/app/api/documents/generate/route.ts
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DocumentGenerationService } from '@/services/documentGenerationService'

// ✅ FIXED: Add supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const documentService = new DocumentGenerationService()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, title, clientId, templateId, variables } = body

    // Validate required fields
    if (!content || !title || !clientId || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate the document
    const result = await documentService.generateDocument({
      content,
      title,
      clientId,
      templateId,
      metadata: {
        variables,
        api_generated: true,
        generated_at: new Date().toISOString()
      }
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Document generation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document: result.document,
      url: result.url,
      message: 'Document generated successfully'
    })

  } catch (error) {
    console.error('API Document generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
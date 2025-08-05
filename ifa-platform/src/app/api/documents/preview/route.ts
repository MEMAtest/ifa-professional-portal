// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 5: /api/documents/preview/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { templateId, variables } = body

    if (!templateId || !variables) {
      return NextResponse.json(
        { error: 'templateId and variables are required' },
        { status: 400 }
      )
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Simple template population for preview
    let content = template.template_content
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      content = content.replace(regex, String(value))
    })

    return NextResponse.json({
      success: true,
      preview: {
        title: template.name,
        content,
        variables
      }
    })
  } catch (error) {
    console.error('Error in preview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

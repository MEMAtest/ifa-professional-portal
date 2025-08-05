// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ================================================================
// FILE 4: /api/documents/templates/[assessmentType]/route.ts
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'

interface Params {
  params: {
    assessmentType: string
  }
}

export async function GET(request: NextRequest, { params }: Params) {
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

    const { assessmentType } = params

    // Validate assessment type
    const validTypes = ['suitability', 'atr', 'cfl', 'vulnerability', 'combined']
    if (!validTypes.includes(assessmentType)) {
      return NextResponse.json(
        { error: 'Invalid assessment type' },
        { status: 400 }
      )
    }

    // Fetch templates
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('assessment_type', assessmentType)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      templates: templates || [],
      count: templates?.length || 0
    })
  } catch (error) {
    console.error('Error in templates route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

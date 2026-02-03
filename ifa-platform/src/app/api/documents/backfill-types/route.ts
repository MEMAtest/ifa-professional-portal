export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// Backfill documents.type/document_type using category name where missing
export async function POST(request: NextRequest) {
  try {
    // Allow either authenticated user OR service token header
    const auth = await getAuthContext(request)
    let supabase: any = null
    let firmId: string | null = null

    if (auth.success) {
      supabase = getSupabaseServiceClient()
      firmId = auth.context?.firmId || null

      // SECURITY: Require firm context for user-authenticated requests
      if (!firmId) {
        return NextResponse.json({ error: 'Firm context required' }, { status: 403 })
      }
    } else {
      // Service token fallback - intentional admin operation across all firms
      const token = request.headers.get('x-backfill-token')
      const expected = process.env.BACKFILL_TOKEN
      if (!token || !expected || token !== expected) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      try {
        supabase = getSupabaseServiceClient()
      } catch (error) {
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
      }
    }

    // Fetch documents missing type/document_type (null, empty string, or 'Unknown')
    let query = supabase
      .from('documents')
      .select(`
        id,
        type,
        document_type,
        category,
        document_categories(name)
      `)
      .or('type.is.null,type.eq.,type.ilike.unknown')
      .limit(500)

    // Always scope to firm for user-authenticated requests;
    // service token path (firmId === null) intentionally operates across all firms
    if (firmId) {
      query = query.eq('firm_id', firmId)
    }

    const { data: docs, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to backfill document types' }, { status: 500 })
    }

    if (!docs || docs.length === 0) {
      return NextResponse.json({ success: true, updated: 0 })
    }

    const updates = docs.map((doc: any) => {
      const inferredType =
        doc.document_type ||
        doc.type ||
        doc.document_categories?.name ||
        doc.category ||
        'other'

      return {
        id: doc.id,
        type: inferredType,
        document_type: inferredType
      }
    })

    const { error: updateError } = await supabase
      .from('documents')
      .upsert(updates, { onConflict: 'id' })

    if (updateError) {
      return NextResponse.json({ error: 'Failed to backfill document types' }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

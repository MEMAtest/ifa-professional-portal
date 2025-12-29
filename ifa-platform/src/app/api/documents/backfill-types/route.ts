export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

// Backfill documents.type/document_type using category name where missing
export async function POST(request: NextRequest) {
  try {
    // Allow either authenticated user OR service token header
    const auth = await getAuthContext(request)
    let supabase: any = null
    let firmId: string | null = null

    if (auth.success) {
      supabase = await createClient()
      firmId = auth.context?.firmId || null
    } else {
      // Service token fallback
      const token = request.headers.get('x-backfill-token')
      const expected = process.env.BACKFILL_TOKEN
      if (!token || !expected || token !== expected) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) {
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
      }
      supabase = createServiceClient<Database>(url, key)
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

    if (firmId) {
      query = query.eq('firm_id', firmId)
    }

    const { data: docs, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

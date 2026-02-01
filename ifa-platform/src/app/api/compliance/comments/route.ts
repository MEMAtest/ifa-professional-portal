import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { TaskSourceType } from '@/modules/tasks/types'

export const dynamic = 'force-dynamic'

const ALLOWED_SOURCE_TYPES: TaskSourceType[] = [
  'complaint',
  'breach',
  'vulnerability',
  'file_review',
  'aml_check',
  'consumer_duty',
  'risk_assessment',
]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const url = new URL(request.url)
    const sourceType = url.searchParams.get('sourceType') as TaskSourceType | null
    const sourceId = url.searchParams.get('sourceId')

    if (!sourceType || !sourceId) {
      return NextResponse.json({ error: 'sourceType and sourceId are required' }, { status: 400 })
    }

    if (!ALLOWED_SOURCE_TYPES.includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    }

    if (!isValidUUID(sourceId)) {
      return NextResponse.json({ error: 'Invalid sourceId' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // Verify the source record belongs to this firm
    const sourceTableMap: Record<string, string> = {
      complaint: 'complaint_register',
      breach: 'breach_register',
      vulnerability: 'vulnerability_register',
      file_review: 'file_reviews',
    }
    const sourceTable = sourceTableMap[sourceType]
    if (sourceTable) {
      const { data: sourceRecord } = await supabase
        .from(sourceTable)
        .select('id')
        .eq('id', sourceId)
        .eq('firm_id', firmIdResult.firmId)
        .maybeSingle()
      if (!sourceRecord) {
        return NextResponse.json({ error: 'Source record not found in your firm' }, { status: 403 })
      }
    }

    const { data: comments, error } = await supabase
      .from('compliance_comments_with_user')
      .select('*')
      .eq('firm_id', firmIdResult.firmId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Compliance Comments] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json({ comments: comments || [] })
  } catch (error) {
    console.error('[Compliance Comments] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const body = await request.json()
    const sourceType = body.sourceType as TaskSourceType | undefined
    const sourceId = body.sourceId as string | undefined
    const content = body.content as string | undefined

    if (!sourceType || !sourceId || !content?.trim()) {
      return NextResponse.json({ error: 'sourceType, sourceId, and content are required' }, { status: 400 })
    }

    if (!ALLOWED_SOURCE_TYPES.includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 })
    }

    if (!isValidUUID(sourceId)) {
      return NextResponse.json({ error: 'Invalid sourceId' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment is too long (max 2000 chars)' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // Verify the source record belongs to this firm
    const sourceTableMap: Record<string, string> = {
      complaint: 'complaint_register',
      breach: 'breach_register',
      vulnerability: 'vulnerability_register',
      file_review: 'file_reviews',
    }
    const sourceTable = sourceTableMap[sourceType]
    if (sourceTable) {
      const { data: sourceRecord } = await supabase
        .from(sourceTable)
        .select('id')
        .eq('id', sourceId)
        .eq('firm_id', firmIdResult.firmId)
        .maybeSingle()
      if (!sourceRecord) {
        return NextResponse.json({ error: 'Source record not found in your firm' }, { status: 403 })
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('compliance_comments')
      .insert({
        firm_id: firmIdResult.firmId,
        source_type: sourceType,
        source_id: sourceId,
        user_id: authResult.context.userId,
        content: content.trim(),
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('[Compliance Comments] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }

    const { data: comment, error: fetchError } = await supabase
      .from('compliance_comments_with_user')
      .select('*')
      .eq('id', inserted.id)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Failed to load comment' }, { status: 500 })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('[Compliance Comments] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

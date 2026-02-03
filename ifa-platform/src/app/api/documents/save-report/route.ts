// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/documents/save-report/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const { firmId } = firmResult

    const body = await parseRequestBody(request)
    const { clientId, assessmentType, assessmentId, fileName, fileBlob, metadata } = body

    const supabase = getSupabaseServiceClient()
    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    // Convert base64 to buffer
    const base64Data = fileBlob.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload to Supabase Storage
    const filePath = `firms/${firmId}/reports/${clientId}/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        client_id: clientId,
        firm_id: firmId,
        created_by: auth.context.userId,
        assessment_id: assessmentId,
        name: fileName,
        type: `${assessmentType}_report`,
        category: 'assessment_report',
        file_path: filePath,
        status: 'completed',
        metadata,
        source_type: 'assessment'
      })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ 
      success: true, 
      documentId: document.id 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    )
  }
}

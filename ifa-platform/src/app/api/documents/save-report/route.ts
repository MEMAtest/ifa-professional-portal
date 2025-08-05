// src/app/api/documents/save-report/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, assessmentType, assessmentId, fileName, fileBlob, metadata } = body

    // Convert base64 to buffer
    const base64Data = fileBlob.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload to Supabase Storage
    const filePath = `reports/${clientId}/${fileName}`
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
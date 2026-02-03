export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
])

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (authResult.context.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can upload the firm logo' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) return firmIdResult

    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', message: 'Please select a logo image to upload' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', message: 'Logo must be under 2MB' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type', message: 'Logo must be PNG, JPG, WebP, or SVG' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const storagePath = `firms/${firmIdResult.firmId}/branding/logo-${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      log.error('[Logo API] Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Upload failed', message: 'Could not upload logo to storage' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath)

    const logoUrl = publicUrlData.publicUrl

    // Update firm settings with the logo URL
    const { data: firm, error: fetchError } = await supabase
      .from('firms')
      .select('settings')
      .eq('id', firmIdResult.firmId)
      .single()

    if (fetchError) {
      log.error('[Logo API] Error fetching firm:', fetchError)
      return NextResponse.json(
        { error: 'Failed to update firm settings' },
        { status: 500 }
      )
    }

    const currentSettings = (firm?.settings as Record<string, any>) || {}
    const updatedSettings = {
      ...currentSettings,
      branding: {
        ...(currentSettings.branding || {}),
        logoUrl,
      },
    }

    const { error: updateError } = await supabase
      .from('firms')
      .update({ settings: updatedSettings })
      .eq('id', firmIdResult.firmId)

    if (updateError) {
      log.error('[Logo API] Error updating firm settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to save logo URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { logoUrl } })
  } catch (error) {
    log.error('[Logo API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

/**
 * Firm API Route
 * GET /api/firm - Get current user's firm
 * PUT /api/firm - Update firm settings (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import type { Firm, FirmUpdateInput } from '@/modules/firm/types/firm.types'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'
import { parseRequestBody } from '@/app/api/utils'

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      log.error('[Firm API] requireFirmId failed — no valid firm_id', {
        userId: authResult.context.userId,
        email: authResult.context.email,
        role: authResult.context.role,
        firmId: authResult.context.firmId,
      })
      return firmIdResult
    }

    const supabase = getSupabaseServiceClient()

    const { data: firm, error } = await supabase
      .from('firms')
      .select('*')
      .eq('id', firmIdResult.firmId)
      .single()

    if (error) {
      log.error('[Firm API] Error fetching firm', error)
      return NextResponse.json({ error: 'Failed to fetch firm' }, { status: 500 })
    }

    if (!firm) {
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 })
    }

    // Transform to frontend type
    const response: Firm = {
      id: firm.id,
      name: firm.name,
      fcaNumber: firm.fca_number ?? undefined,
      address: firm.address as unknown as Firm['address'],
      settings: firm.settings as unknown as Firm['settings'],
      subscriptionTier: (firm.subscription_tier ?? 'starter') as Firm['subscriptionTier'],
      createdAt: new Date(firm.created_at || Date.now()),
      updatedAt: new Date(firm.updated_at || Date.now()),
    }

    return NextResponse.json(response)
  } catch (error) {
    log.error('[Firm API] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)

    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can edit firm settings
    if (authResult.context.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can edit firm settings' },
        { status: 403 }
      )
    }

    const firmIdResult = requireFirmId(authResult.context)
    if (firmIdResult instanceof NextResponse) {
      return firmIdResult
    }

    const body: FirmUpdateInput = await parseRequestBody(request)
    const supabase = getSupabaseServiceClient()

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.fcaNumber !== undefined) {
      updateData.fca_number = body.fcaNumber
    }

    if (body.address !== undefined) {
      updateData.address = body.address
    }

    if (body.subscriptionTier !== undefined) {
      updateData.subscription_tier = body.subscriptionTier
    }

    // Handle partial settings update
    if (body.settings !== undefined) {
      // Get current settings first
      const { data: currentFirm } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', firmIdResult.firmId)
        .single()

      const currentSettings = (currentFirm?.settings ?? {}) as Record<string, unknown>

      // Merge settings — preserve all known nested keys so partial updates
      // don't accidentally drop sibling properties (e.g. onboarding.completed)
      updateData.settings = {
        ...currentSettings,
        ...body.settings,
        branding: {
          ...(currentSettings.branding as Record<string, unknown> ?? {}),
          ...(body.settings.branding ?? {}),
        },
        compliance: {
          ...(currentSettings.compliance as Record<string, unknown> ?? {}),
          ...(body.settings.compliance ?? {}),
        },
        billing: {
          ...(currentSettings.billing as Record<string, unknown> ?? {}),
          ...(body.settings.billing ?? {}),
        },
        features: {
          ...(currentSettings.features as Record<string, unknown> ?? {}),
          ...(body.settings.features ?? {}),
        },
        onboarding: {
          ...(currentSettings.onboarding as Record<string, unknown> ?? {}),
          ...((body.settings as any).onboarding ?? {}),
        },
      }
    }

    const { data: firm, error } = await supabase
      .from('firms')
      .update(updateData)
      .eq('id', firmIdResult.firmId)
      .select()
      .single()

    if (error) {
      log.error('[Firm API] Error updating firm', error)
      return NextResponse.json({ error: 'Failed to update firm' }, { status: 500 })
    }

    // Transform to frontend type
    const response: Firm = {
      id: firm.id,
      name: firm.name,
      fcaNumber: firm.fca_number ?? undefined,
      address: firm.address as unknown as Firm['address'],
      settings: firm.settings as unknown as Firm['settings'],
      subscriptionTier: (firm.subscription_tier ?? 'starter') as Firm['subscriptionTier'],
      createdAt: new Date(firm.created_at || Date.now()),
      updatedAt: new Date(firm.updated_at || Date.now()),
    }

    return NextResponse.json(response)
  } catch (error) {
    log.error('[Firm API] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

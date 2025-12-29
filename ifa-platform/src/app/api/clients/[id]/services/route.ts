// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// src/app/api/clients/[id]/services/route.ts
// API route for client services - uses service client to bypass RLS

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger } from '@/lib/logging/structured'

interface ClientServicesPayload {
  client_id: string
  firm_id?: string | null
  services_selected?: string[]
  target_market_checks?: Record<string, Record<string, boolean>>
  suitability_justification?: string
  platform_selected?: string
  platform_justification?: Record<string, unknown>
  decumulation_strategy?: string | null
  decumulation_justification?: string
  sustainability_assessment?: Record<string, unknown>
}

/**
 * GET /api/clients/[id]/services
 * Get client services for a specific client
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = context?.params?.id;
    logger.debug('GET /api/clients/[id]/services - Request received', { clientId })

    if (!clientId || clientId === 'undefined' || clientId === 'null') {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS (cast to any to handle missing table type)
    const supabaseService = getSupabaseServiceClient() as any
    const { data, error } = await supabaseService
      .from('client_services')
      .select('*')
      .eq('client_id', clientId)
      .limit(1)

    if (error) {
      logger.error('Database error fetching client services', error, { clientId })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch client services', details: error.message },
        { status: 500 }
      );
    }

    const record = Array.isArray(data) ? data[0] : null

    logger.info('Client services fetched successfully', { clientId, hasRecord: !!record })

    return NextResponse.json({
      success: true,
      data: record
    });

  } catch (error) {
    logger.error('Unexpected error in GET /api/clients/[id]/services', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients/[id]/services
 * Create or update client services
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)
  const isValidFirmId = (value?: string | null) => {
    if (!value) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  }

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = context?.params?.id;
    logger.debug('POST /api/clients/[id]/services - Saving client services', { clientId })

    if (!clientId || clientId === 'undefined' || clientId === 'null') {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json() as ClientServicesPayload;

    // Validate required fields
    if (!body.client_id || body.client_id !== clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID mismatch' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS (cast to any to handle missing table type)
    const supabaseService = getSupabaseServiceClient() as any

    // Check if record exists
    const { data: existing } = await supabaseService
      .from('client_services')
      .select('id, firm_id, services_selected, target_market_checks, suitability_justification, platform_selected, platform_justification, decumulation_strategy, decumulation_justification, sustainability_assessment')
      .eq('client_id', clientId)
      .limit(1)

    const existingRecord = Array.isArray(existing) ? existing[0] : null
    const resolvedFirmId = isValidFirmId(body.firm_id)
      ? body.firm_id
      : existingRecord?.firm_id ?? null

    const payload = {
      client_id: clientId,
      firm_id: resolvedFirmId,
      services_selected: body.services_selected ?? existingRecord?.services_selected ?? [],
      target_market_checks: body.target_market_checks ?? existingRecord?.target_market_checks ?? {},
      suitability_justification: body.suitability_justification ?? existingRecord?.suitability_justification ?? '',
      platform_selected: body.platform_selected ?? existingRecord?.platform_selected ?? '',
      platform_justification: body.platform_justification ?? existingRecord?.platform_justification ?? {},
      decumulation_strategy: body.decumulation_strategy ?? existingRecord?.decumulation_strategy ?? null,
      decumulation_justification: body.decumulation_justification ?? existingRecord?.decumulation_justification ?? '',
      sustainability_assessment: body.sustainability_assessment ?? existingRecord?.sustainability_assessment ?? {},
      updated_at: new Date().toISOString()
    }

    let result;
    if (existingRecord) {
      // Update existing record
      const { data, error } = await supabaseService
        .from('client_services')
        .update(payload)
        .eq('id', existingRecord.id)
        .select()
        .single()

      if (error) {
        logger.error('Database error updating client services', error, { clientId })
        return NextResponse.json(
          { success: false, error: 'Failed to update client services', details: error.message },
          { status: 500 }
        );
      }
      result = data
    } else {
      // Insert new record
      const { data, error } = await supabaseService
        .from('client_services')
        .insert({
          ...payload,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        logger.error('Database error inserting client services', error, { clientId })
        return NextResponse.json(
          { success: false, error: 'Failed to create client services', details: error.message },
          { status: 500 }
        );
      }
      result = data
    }

    logger.info('Client services saved successfully', { clientId, recordId: result?.id })

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('POST /api/clients/[id]/services error', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

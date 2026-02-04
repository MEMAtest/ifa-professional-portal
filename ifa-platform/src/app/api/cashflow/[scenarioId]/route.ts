// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// =====================================================
// File: src/app/api/cashflow/[scenarioId]/route.ts
// INDIVIDUAL SCENARIO ENDPOINTS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { handleError } from '../../utils';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireScenarioAccess } from '@/lib/monte-carlo/monteCarloAccess'
import { parseRequestBody } from '@/app/api/utils'

interface RouteParams {
  params: { scenarioId: string };
}

function transformToCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(transformToCamelCase)
  const result: any = {}
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[camelKey] = transformToCamelCase(obj[key])
  }
  return result
}

function transformToSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(transformToSnakeCase)
  const result: any = {}
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = transformToSnakeCase(obj[key])
  }
  return result
}

// =====================================================
// INDIVIDUAL SCENARIO ENDPOINTS
// =====================================================

/**
 * GET /api/cashflow/[scenarioId]
 * Retrieves a specific cash flow scenario by its ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }

    const { scenarioId } = params;
    const supabase = getSupabaseServiceClient()
    const access = await requireScenarioAccess({ supabase, scenarioId, ctx: auth.context })
    if (!access.ok) {
      return access.response
    }

    const { data, error } = await supabase
      .from('cash_flow_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: transformToCamelCase(data) });

  } catch (error) {
    return handleError(error, 'Failed to fetch scenario');
  }
}

/**
 * PUT /api/cashflow/[scenarioId]
 * Updates a specific cash flow scenario.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }

    const { scenarioId } = params;
    const updates = await parseRequestBody(request);

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ success: false, error: 'Request body cannot be empty.' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient()
    const access = await requireScenarioAccess({ supabase, scenarioId, ctx: auth.context })
    if (!access.ok) {
      return access.response
    }

    const updateData = {
      ...transformToSnakeCase(updates),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('cash_flow_scenarios')
      .update(updateData)
      .eq('id', scenarioId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Failed to update scenario' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: transformToCamelCase(data) });

  } catch (error) {
    return handleError(error, 'Failed to update scenario');
  }
}

/**
 * DELETE /api/cashflow/[scenarioId]
 * Deletes a specific cash flow scenario.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }

    const { scenarioId } = params;
    const supabase = getSupabaseServiceClient()
    const access = await requireScenarioAccess({ supabase, scenarioId, ctx: auth.context })
    if (!access.ok) {
      return access.response
    }

    await supabase
      .from('cash_flow_scenarios')
      .delete()
      .eq('id', scenarioId)

    // Return a 204 No Content response, the standard for successful deletions.
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    return handleError(error, 'Failed to delete scenario');
  }
}

// FIX: This line was removed as it caused the "Cannot redeclare" error.
// The `export` keyword on each function above is sufficient.
// export { GET, PUT, DELETE };

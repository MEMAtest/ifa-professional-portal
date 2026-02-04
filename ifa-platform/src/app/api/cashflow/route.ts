// src/app/api/cashflow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { handleError, validateRequiredFields, createSuccessResponse } from '../utils';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/cashflow
 * Retrieves all cash flow scenarios for the authenticated user.
 * If a 'clientId' query parameter is provided, it retrieves scenarios for that specific client.
 */
export async function GET(request: NextRequest) {
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
    const supabase = getSupabaseServiceClient()

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (clientId) {
      const access = await requireClientAccess({
        supabase,
        clientId,
        ctx: auth.context,
        select: 'id, firm_id, advisor_id'
      })
      if (!access.ok) {
        return access.response
      }

      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('client_id', clientId)
        .eq('firm_id', firmId)
        .eq('is_active', true)

      if (error) {
        return handleError(error, 'Failed to fetch cash flow scenarios')
      }

      const scenarios = (data || []).sort((a: any, b: any) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
      return createSuccessResponse({
        scenarios,
        count: scenarios.length
      });
    } else {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('firm_id', firmId)
        .eq('is_active', true)

      if (error) {
        return handleError(error, 'Failed to fetch cash flow scenarios')
      }

      const scenarios = (data || []).sort((a: any, b: any) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
      return createSuccessResponse({
        scenarios,
        count: scenarios.length
      });
    }

  } catch (error) {
    return handleError(error, 'Failed to fetch cash flow scenarios');
  }
}

/**
 * POST /api/cashflow
 * Creates a new cash flow scenario.
 */
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

    const body = await parseRequestBody(request);

    const validationError = validateRequiredFields(body, [
      'clientId',
      'scenarioName',
      'scenarioType',
      'projectionYears'
    ]);

    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient()
    const access = await requireClientAccess({
      supabase,
      clientId: body.clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    const scenario = await CashFlowDataService.createScenarioFromClient(
      body.clientId, 
      body.scenarioType || 'base'
    );

    return createSuccessResponse({ scenario }, 'Cash flow scenario created successfully', 201);

  } catch (error) {
    return handleError(error, 'Failed to create cash flow scenario');
  }
}

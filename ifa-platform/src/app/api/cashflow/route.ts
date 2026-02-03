// src/app/api/cashflow/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { checkAuthentication, handleError, validateRequiredFields, createSuccessResponse } from '../utils';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
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
    const { user, error: authError } = await checkAuthentication(request);
    if (authError) {
      log.warn('Cashflow authentication warning', { error: authError });
      // Continue anyway for now - make this stricter if needed
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (clientId) {
      const scenarios = await CashFlowDataService.getClientScenarios(clientId);
      return createSuccessResponse({
        scenarios,
        count: scenarios.length
      });
    } else if (user) {
      const scenarios = await CashFlowDataService.getUserScenarios(user.id);
      return createSuccessResponse({
        scenarios,
        count: scenarios.length
      });
    } else {
      // Return empty array if no user and no clientId
      return createSuccessResponse({
        scenarios: [],
        count: 0
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
    const { user, error: authError } = await checkAuthentication(request);
    if (authError) {
      return handleError(authError, 'Authentication required');
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

    const scenario = await CashFlowDataService.createScenarioFromClient(
      body.clientId, 
      body.scenarioType || 'base'
    );

    return createSuccessResponse({ scenario }, 'Cash flow scenario created successfully', 201);

  } catch (error) {
    return handleError(error, 'Failed to create cash flow scenario');
  }
}
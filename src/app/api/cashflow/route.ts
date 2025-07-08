// =====================================================
// CASH FLOW API ROUTES
// File: src/app/api/cashflow/route.ts
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { handleError, checkAuthentication, validateRequiredFields } from '../utils'; // FIX: Centralized import

// =====================================================
// MAIN CASH FLOW ENDPOINTS
// =====================================================

/**
 * GET /api/cashflow
 * Retrieves all cash flow scenarios for the authenticated user.
 * If a 'clientId' query parameter is provided, it retrieves scenarios for that specific client.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await checkAuthentication(request);
    if (authError || !user) {
        return handleError(authError || new Error('Authentication failed'), 'Authentication failed');
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (clientId) {
      // Here you might add a check to ensure the user has permission to view this client's data
      const scenarios = await CashFlowDataService.getClientScenarios(clientId);
      return NextResponse.json({
        success: true,
        data: scenarios,
        count: scenarios.length
      });
    } else {
      const scenarios = await CashFlowDataService.getUserScenarios(user.id);
      return NextResponse.json({
        success: true,
        data: scenarios,
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
    const { user, error: authError } = await checkAuthentication(request);
    if (authError || !user) {
        return handleError(authError || new Error('Authentication failed'), 'Authentication failed');
    }

    const body = await request.json();

    const validationError = validateRequiredFields(body, [
        'clientId',
        'scenarioName',
        'scenarioType',
        'projectionYears',
        'riskScore'
    ]);

    if (validationError) {
        return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    // Here you might add a check to ensure the user has permission to create a scenario for this client
    const scenario = await CashFlowDataService.createScenarioFromClient(
  body.clientId, 
  body.scenarioType || 'base'
);

    return NextResponse.json({
      success: true,
      data: scenario
    }, { status: 201 }); // Use 201 for resource creation

  } catch (error) {
    return handleError(error, 'Failed to create cash flow scenario');
  }
}
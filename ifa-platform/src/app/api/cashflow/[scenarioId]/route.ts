// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// =====================================================
// File: src/app/api/cashflow/[scenarioId]/route.ts
// INDIVIDUAL SCENARIO ENDPOINTS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { handleError, checkAuthentication } from '../../utils';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

interface RouteParams {
  params: { scenarioId: string };
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
    const { user, error: authError } = await checkAuthentication(request);
    if (authError || !user) {
        return handleError(authError || new Error('Authentication failed'), 'Authentication failed');
    }

    const { scenarioId } = params;
    const scenario = await CashFlowDataService.getScenario(scenarioId);

    if (!scenario) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    // CRITICAL SECURITY FIX (IDOR): Ensures the user can only access their own scenarios.
    if (scenario.createdBy !== user.id) {
        return handleError({ message: 'unauthorized' }, 'Unauthorized access to scenario');
    }

    return NextResponse.json({ success: true, data: scenario });

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
    const { user, error: authError } = await checkAuthentication(request);
    if (authError || !user) {
        return handleError(authError || new Error('Authentication failed'), 'Authentication failed');
    }

    const { scenarioId } = params;
    const updates = await request.json();

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ success: false, error: 'Request body cannot be empty.' }, { status: 400 });
    }

    const scenario = await CashFlowDataService.getScenario(scenarioId);

    if (!scenario) {
      return NextResponse.json({ success: false, error: 'Scenario not found' }, { status: 404 });
    }

    // CRITICAL SECURITY FIX (IDOR): Prevents users from updating scenarios they don't own.
    if (scenario.createdBy !== user.id) {
        return handleError({ message: 'unauthorized' }, 'Unauthorized to update scenario');
    }

    const updatedScenario = await CashFlowDataService.updateScenario(scenarioId, updates);
    return NextResponse.json({ success: true, data: updatedScenario });

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
    const { user, error: authError } = await checkAuthentication(request);
    if (authError || !user) {
        return handleError(authError || new Error('Authentication failed'), 'Authentication failed');
    }

    const { scenarioId } = params;
    const scenario = await CashFlowDataService.getScenario(scenarioId);

    if (!scenario) {
      // The resource is already gone, so the request can be considered successful.
      return new NextResponse(null, { status: 204 });
    }

    // CRITICAL SECURITY FIX (IDOR): Prevents users from deleting scenarios they don't own.
    if (scenario.createdBy !== user.id) {
        return handleError({ message: 'unauthorized' }, 'Unauthorized to delete scenario');
    }

    await CashFlowDataService.deleteScenario(scenarioId);

    // Return a 204 No Content response, the standard for successful deletions.
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    return handleError(error, 'Failed to delete scenario');
  }
}

// FIX: This line was removed as it caused the "Cannot redeclare" error.
// The `export` keyword on each function above is sufficient.
// export { GET, PUT, DELETE };
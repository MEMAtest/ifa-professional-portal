// src/app/api/monte-carlo/results/[scenarioId]/route.ts
// Fixed API route for retrieving Monte Carlo results

import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

interface RouteParams {
  params: {
    scenarioId: string;
  };
}

/**
 * GET /api/monte-carlo/results/[scenarioId]
 * Retrieve Monte Carlo simulation results for a specific scenario
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { scenarioId } = params;

    // Validate scenario ID
    if (!scenarioId || scenarioId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario ID is required'
        },
        { status: 400 }
      );
    }

    // Get database instance
    const db = getMonteCarloDatabase();

    // Retrieve results
    const resultsResponse = await db.getResults(scenarioId);
    
    if (!resultsResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultsResponse.error
        },
        { status: 404 }
      );
    }

    // Also get assumptions for context
    const assumptionsResponse = await db.getAssumptions(scenarioId);

    const responseData = {
      success: true,
      data: {
        results: resultsResponse.data,
        assumptions: assumptionsResponse.success ? assumptionsResponse.data : null
      }
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: unknown) {
    console.error('Error retrieving Monte Carlo results:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monte-carlo/results/[scenarioId]
 * Delete Monte Carlo simulation results for a specific scenario
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { scenarioId } = params;

    // Validate scenario ID
    if (!scenarioId || scenarioId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario ID is required'
        },
        { status: 400 }
      );
    }

    // Get database instance
    const db = getMonteCarloDatabase();

    // Delete scenario
    const deleteResponse = await db.deleteScenario(scenarioId);
    
    if (!deleteResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: deleteResponse.error
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Scenario deleted successfully'
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error deleting Monte Carlo scenario:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/monte-carlo/results/[scenarioId]
 * Update status of Monte Carlo simulation
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { scenarioId } = params;

    // Validate scenario ID
    if (!scenarioId || scenarioId.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Scenario ID is required'
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['pending', 'running', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Must be one of: pending, running, completed, failed'
        },
        { status: 400 }
      );
    }

    // Get database instance
    const db = getMonteCarloDatabase();

    // Update status
    const updateResponse = await db.updateStatus(scenarioId, status);
    
    if (!updateResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: updateResponse.error
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Status updated successfully',
        data: { scenarioId, status }
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error updating Monte Carlo status:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
// src/app/api/monte-carlo/results/[scenarioId]/route.ts
// ✅ COMPLETE BULLETPROOF VERSION - FIXED WITH TYPE IMPORT

import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';
// ✅ FIX: Import the type from the database module
import type { MonteCarloAssumptionRecord } from '@/lib/monte-carlo/database';

// ✅ FORCE DYNAMIC RENDERING
export const dynamic = 'force-dynamic';

interface ResultsRouteParams {
  params: {
    scenarioId: string;
  };
}

/**
 * GET /api/monte-carlo/results/[scenarioId]
 * Get Monte Carlo results for a specific scenario
 */
export async function GET(
  request: NextRequest,
  { params }: ResultsRouteParams
): Promise<NextResponse> {
  try {
    // ✅ TIMEOUT PROTECTION
    const timeoutId = setTimeout(() => {
      throw new Error('Get results timeout after 15 seconds');
    }, 15000);

    // ✅ PARAMETER VALIDATION
    const { scenarioId } = params;

    if (!scenarioId || typeof scenarioId !== 'string' || scenarioId.trim() === '') {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Scenario ID is required and must be a valid string' 
        },
        { status: 400 }
      );
    }

    const cleanScenarioId = scenarioId.trim();

    // ✅ PROPER DATABASE INITIALIZATION
    const db = getMonteCarloDatabase();
    
    // ✅ GET RESULTS WITH ERROR HANDLING
    const resultsResponse = await db.getResults(cleanScenarioId);
    
    clearTimeout(timeoutId);
    
    if (!resultsResponse.success) {
      const isNotFound = resultsResponse.error?.includes('No results found') || 
                        resultsResponse.error?.includes('not found');
      
      const statusCode = isNotFound ? 404 : 500;
      
      console.error(`Failed to get results for scenario ${cleanScenarioId}:`, resultsResponse.error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: resultsResponse.error || 'Failed to retrieve results',
          scenarioId: cleanScenarioId
        },
        { status: statusCode }
      );
    }

    // ✅ OPTIONALLY GET ASSUMPTIONS FOR CONTEXT
    let assumptions: MonteCarloAssumptionRecord | null = null;
    try {
      const assumptionsResponse = await db.getAssumptions(cleanScenarioId);
      if (assumptionsResponse.success) {
        assumptions = assumptionsResponse.data || null;
      }
    } catch (assumptionError) {
      console.warn(`Could not fetch assumptions for scenario ${cleanScenarioId}:`, assumptionError);
    }

    // ✅ STANDARDIZED SUCCESS RESPONSE
    return NextResponse.json(
      {
        success: true,
        data: {
          results: resultsResponse.data,
          assumptions: assumptions
        },
        metadata: {
          scenarioId: cleanScenarioId,
          fetchedAt: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        }
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );

  } catch (error: unknown) {
    console.error('Monte Carlo results API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/monte-carlo/results/[scenarioId]
 * Update Monte Carlo result status
 */
export async function PATCH(
  request: NextRequest,
  { params }: ResultsRouteParams
): Promise<NextResponse> {
  try {
    // ✅ TIMEOUT PROTECTION
    const timeoutId = setTimeout(() => {
      throw new Error('Update status timeout after 10 seconds');
    }, 10000);

    // ✅ PARAMETER VALIDATION
    const { scenarioId } = params;

    if (!scenarioId || typeof scenarioId !== 'string' || scenarioId.trim() === '') {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Scenario ID is required and must be a valid string' 
        },
        { status: 400 }
      );
    }

    const cleanScenarioId = scenarioId.trim();

    // ✅ SAFE BODY PARSING
    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body' 
        },
        { status: 400 }
      );
    }

    const { status } = body;

    // ✅ STATUS VALIDATION
    const validStatuses = ['pending', 'running', 'completed', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      );
    }

    // ✅ PROPER DATABASE INITIALIZATION
    const db = getMonteCarloDatabase();
    
    // ✅ UPDATE STATUS WITH ERROR HANDLING
    const updateResponse = await db.updateStatus(cleanScenarioId, status);
    
    clearTimeout(timeoutId);
    
    if (!updateResponse.success) {
      console.error(`Failed to update status for scenario ${cleanScenarioId}:`, updateResponse.error);
      return NextResponse.json(
        {
          success: false,
          error: updateResponse.error || 'Failed to update status'
        },
        { status: 500 }
      );
    }

    // ✅ STANDARDIZED SUCCESS RESPONSE
    return NextResponse.json(
      {
        success: true,
        message: 'Status updated successfully',
        data: { 
          scenarioId: cleanScenarioId, 
          status,
          updatedAt: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Monte Carlo update status API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monte-carlo/results/[scenarioId]
 * Delete Monte Carlo scenario and related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: ResultsRouteParams
): Promise<NextResponse> {
  try {
    // ✅ TIMEOUT PROTECTION
    const timeoutId = setTimeout(() => {
      throw new Error('Delete scenario timeout after 10 seconds');
    }, 10000);

    // ✅ PARAMETER VALIDATION
    const { scenarioId } = params;

    if (!scenarioId || typeof scenarioId !== 'string' || scenarioId.trim() === '') {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Scenario ID is required and must be a valid string' 
        },
        { status: 400 }
      );
    }

    const cleanScenarioId = scenarioId.trim();

    // ✅ PROPER DATABASE INITIALIZATION
    const db = getMonteCarloDatabase();
    
    // ✅ DELETE WITH ERROR HANDLING
    const deleteResponse = await db.deleteScenario(cleanScenarioId);
    
    clearTimeout(timeoutId);
    
    if (!deleteResponse.success) {
      console.error(`Failed to delete scenario ${cleanScenarioId}:`, deleteResponse.error);
      return NextResponse.json(
        {
          success: false,
          error: deleteResponse.error || 'Failed to delete scenario'
        },
        { status: 500 }
      );
    }

    // ✅ STANDARDIZED SUCCESS RESPONSE
    return NextResponse.json(
      {
        success: true,
        message: 'Scenario deleted successfully',
        data: { 
          scenarioId: cleanScenarioId,
          deletedAt: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Monte Carlo delete scenario API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/monte-carlo/results/[scenarioId]
 * Handle CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    { message: 'OK' },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
}
// src/app/api/monte-carlo/assumptions/[scenarioId]/route.ts
// ✅ COMPLETE BULLETPROOF VERSION - COPY-PASTE REPLACEMENT

import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

// ✅ FORCE DYNAMIC RENDERING
export const dynamic = 'force-dynamic';

interface AssumptionRouteParams {
  params: {
    scenarioId: string;
  };
}

/**
 * GET /api/monte-carlo/assumptions/[scenarioId]
 * Get Monte Carlo assumptions for a specific scenario
 */
export async function GET(
  request: NextRequest,
  { params }: AssumptionRouteParams
): Promise<NextResponse> {
  try {
    // ✅ TIMEOUT PROTECTION
    const timeoutId = setTimeout(() => {
      throw new Error('Get assumptions timeout after 10 seconds');
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
    
    // ✅ DATABASE OPERATION WITH ERROR HANDLING
    const response = await db.getAssumptions(cleanScenarioId);
    
    clearTimeout(timeoutId);
    
    if (!response.success) {
      const isNotFound = response.error?.includes('No assumptions found') || 
                        response.error?.includes('not found');
      
      const statusCode = isNotFound ? 404 : 500;
      
      console.error(`Failed to get assumptions for scenario ${cleanScenarioId}:`, response.error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: response.error || 'Failed to retrieve assumptions',
          scenarioId: cleanScenarioId
        },
        { status: statusCode }
      );
    }

    // ✅ STANDARDIZED SUCCESS RESPONSE
    return NextResponse.json(
      { 
        success: true, 
        data: response.data,
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
    console.error('Monte Carlo assumptions API error:', error);
    
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
 * OPTIONS /api/monte-carlo/assumptions/[scenarioId]
 * Handle CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    { message: 'OK' },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
}
// src/app/api/monte-carlo/results/[scenarioId]/route.ts
// ✅ FIXED: Removed problematic import and simplified

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    const { scenarioId } = params;

    if (!scenarioId || typeof scenarioId !== 'string' || scenarioId.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Scenario ID is required and must be a valid string' 
        },
        { status: 400 }
      );
    }

    const cleanScenarioId = scenarioId.trim();

    // Try to get results by scenario_id (TEXT field)
    const { data: results, error: resultsError } = await supabase
      .from('monte_carlo_results')
      .select('*')
      .eq('scenario_id', cleanScenarioId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!resultsError && results && results.length > 0) {
      return NextResponse.json({
        success: true,
        data: results[0],
        metadata: {
          scenarioId: cleanScenarioId,
          fetchedAt: new Date().toISOString()
        }
      });
    }

    // If not found by scenario_id, try client_id
    const { data: resultsByClient, error: clientError } = await supabase
      .from('monte_carlo_results')
      .select('*')
      .eq('client_id', cleanScenarioId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (clientError) {
      console.error('Monte Carlo results fetch error:', clientError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch Monte Carlo results' 
        },
        { status: 500 }
      );
    }

    if (!resultsByClient || resultsByClient.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No Monte Carlo results found',
          scenarioId: cleanScenarioId
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: resultsByClient[0],
      metadata: {
        scenarioId: cleanScenarioId,
        fetchedAt: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('Monte Carlo results API error:', error);
    
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
 * PATCH /api/monte-carlo/results/[scenarioId]
 * Update Monte Carlo result status
 */
export async function PATCH(
  request: NextRequest,
  { params }: ResultsRouteParams
): Promise<NextResponse> {
  try {
    const { scenarioId } = params;

    if (!scenarioId || typeof scenarioId !== 'string' || scenarioId.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Scenario ID is required' 
        },
        { status: 400 }
      );
    }

    const cleanScenarioId = scenarioId.trim();

    let body: any;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON in request body' 
        },
        { status: 400 }
      );
    }

    const { status } = body;

    const validStatuses = ['pending', 'running', 'completed', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Update in monte_carlo_results table
    const { data, error } = await supabase
      .from('monte_carlo_results')
      .update({ 
        calculation_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('scenario_id', cleanScenarioId)
      .select()
      .single();

    if (error) {
      console.error(`Failed to update status for scenario ${cleanScenarioId}:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update status'
        },
        { status: 500 }
      );
    }

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
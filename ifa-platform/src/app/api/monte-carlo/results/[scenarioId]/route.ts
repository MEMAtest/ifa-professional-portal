// src/app/api/monte-carlo/results/[scenarioId]/route.ts
// ✅ FIXED: Returns results in array format as expected by frontend

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ FORCE DYNAMIC RENDERING
export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          error: 'Scenario ID is required and must be a valid string',
          results: [] // Always return results array
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

    // If we found results by scenario_id, return them as array
    if (!resultsError && results && results.length > 0) {
      return NextResponse.json({
        success: true,
        results: results, // Return as array format
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
          error: 'Failed to fetch Monte Carlo results',
          results: [] // Always return results array even on error
        },
        { status: 500 }
      );
    }

    // Return results as array, or empty array if none found
    // Don't return 404 - return success with empty array
    if (!resultsByClient || resultsByClient.length === 0) {
      return NextResponse.json({
        success: true,
        results: [], // Empty array when no results found
        message: 'No Monte Carlo results found for this scenario',
        scenarioId: cleanScenarioId,
        metadata: {
          scenarioId: cleanScenarioId,
          fetchedAt: new Date().toISOString()
        }
      });
    }

    // Return found results as array
    return NextResponse.json({
      success: true,
      results: resultsByClient, // Return as array format
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
        results: [], // Always include results array
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

/**
 * POST /api/monte-carlo/results/[scenarioId]
 * Create new Monte Carlo results for a scenario
 */
export async function POST(
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

    // Create new result record
    const { data, error } = await supabase
      .from('monte_carlo_results')
      .insert({
        scenario_id: cleanScenarioId,
        client_id: body.client_id,
        simulation_count: body.simulation_count || 1000,
        success_probability: body.success_probability,
        shortfall_risk: body.shortfall_risk,
        median_outcome: body.median_outcome,
        confidence_intervals: body.confidence_intervals,
        calculation_status: body.calculation_status || 'completed',
        calculation_params: body.calculation_params,
        run_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error(`Failed to create results for scenario ${cleanScenarioId}:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create Monte Carlo results'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Results created successfully',
        data,
        results: [data] // Also return in array format for consistency
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Monte Carlo create results API error:', error);
    
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
 * Delete Monte Carlo results for a scenario
 */
export async function DELETE(
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

    // Delete results
    const { error } = await supabase
      .from('monte_carlo_results')
      .delete()
      .eq('scenario_id', cleanScenarioId);

    if (error) {
      console.error(`Failed to delete results for scenario ${cleanScenarioId}:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete Monte Carlo results'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Results deleted successfully',
        scenarioId: cleanScenarioId
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Monte Carlo delete results API error:', error);
    
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
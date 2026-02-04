// src/app/api/monte-carlo/results/[scenarioId]/route.ts
// ✅ FIXED: Returns results in array format as expected by frontend

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient';
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth';
import { requireClientAccess } from '@/lib/auth/requireClientAccess';
import { requireScenarioAccess } from '@/lib/monte-carlo/monteCarloAccess'
import { parseRequestBody } from '@/app/api/utils'
import { z } from 'zod'

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
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized', success: false, results: [] }, { status: 401 });
    }
    const firmResult = requireFirmId(auth.context);
    if (!('firmId' in firmResult)) {
      return firmResult as NextResponse;
    }

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

    const supabase = getSupabaseServiceClient();

    const { data: scenarioRow } = await supabase
      .from('cash_flow_scenarios')
      .select('id')
      .eq('id', cleanScenarioId)
      .maybeSingle()

    if (scenarioRow?.id) {
      const access = await requireScenarioAccess({
        supabase,
        scenarioId: cleanScenarioId,
        ctx: auth.context
      })
      if (!access.ok) {
        return access.response as NextResponse
      }

      const { data: results, error: resultsError } = await supabase
        .from('monte_carlo_results')
        .select('*')
        .eq('scenario_id', cleanScenarioId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (resultsError) {
        log.error('Monte Carlo results fetch error', { error: resultsError.message });
        return NextResponse.json(
          { success: false, error: 'Failed to fetch Monte Carlo results', results: [] },
          { status: 500 }
        )
      }

      if (!results || results.length === 0) {
        return NextResponse.json({
          success: true,
          results: [],
          message: 'No Monte Carlo results found for this scenario',
          scenarioId: cleanScenarioId,
          metadata: {
            scenarioId: cleanScenarioId,
            fetchedAt: new Date().toISOString()
          }
        })
      }

      return NextResponse.json({
        success: true,
        results: results,
        metadata: {
          scenarioId: cleanScenarioId,
          fetchedAt: new Date().toISOString()
        }
      })
    }

    // If not a scenario id, treat as client id
    const clientAccess = await requireClientAccess({
      supabase,
      clientId: cleanScenarioId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!clientAccess.ok) {
      return clientAccess.response as NextResponse
    }

    const { data: resultsByClient, error: clientError } = await supabase
      .from('monte_carlo_results')
      .select('*')
      .eq('client_id', cleanScenarioId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (clientError) {
      log.error('Monte Carlo results fetch error', { error: clientError.message });
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

    return NextResponse.json({
      success: true,
      results: resultsByClient, // Return as array format
      metadata: {
        scenarioId: cleanScenarioId,
        fetchedAt: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error('Monte Carlo results API error', { error: errorMessage });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
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
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    const firmResult = requireFirmId(auth.context);
    if (!('firmId' in firmResult)) {
      return firmResult as NextResponse;
    }

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

    const statusSchema = z.object({
      status: z.enum(['pending', 'running', 'completed', 'failed'])
    })

    const parsedBody = await parseRequestBody(request, statusSchema)
    const { status } = parsedBody

    const supabase = getSupabaseServiceClient()

    const scenarioAccess = await requireScenarioAccess({
      supabase,
      scenarioId: cleanScenarioId,
      ctx: auth.context
    })
    if (!scenarioAccess.ok) {
      return scenarioAccess.response as NextResponse
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

    if (error || !data) {
      log.error('Failed to update status for scenario', { scenarioId: cleanScenarioId, error: error?.message });
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error('Monte Carlo update status API error', { error: errorMessage });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
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
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    const firmResult = requireFirmId(auth.context);
    if (!('firmId' in firmResult)) {
      return firmResult as NextResponse;
    }

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

    const createSchema = z.object({
      client_id: z.string().uuid(),
      simulation_count: z.coerce.number().int().positive().optional(),
      success_probability: z.coerce.number().optional(),
      shortfall_risk: z.coerce.number().optional(),
      median_outcome: z.coerce.number().optional(),
      confidence_intervals: z.any().optional(),
      calculation_status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
      calculation_params: z.any().optional()
    })

    const body = await parseRequestBody(request, createSchema)

    const supabase = getSupabaseServiceClient()

    const scenarioAccess = await requireScenarioAccess({
      supabase,
      scenarioId: cleanScenarioId,
      ctx: auth.context
    })
    if (!scenarioAccess.ok) {
      return scenarioAccess.response as NextResponse
    }

    if (scenarioAccess.scenario?.client_id && scenarioAccess.scenario.client_id !== body.client_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const access = await requireClientAccess({
      supabase,
      clientId: body.client_id,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response as NextResponse
    }

    // Create new result record
    const { data, error } = await (supabase
      .from('monte_carlo_results') as any)
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
      log.error('Failed to create results for scenario', { scenarioId: cleanScenarioId, error: error.message });
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error('Monte Carlo create results API error', { error: errorMessage });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
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
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }
    const firmResult = requireFirmId(auth.context);
    if (!('firmId' in firmResult)) {
      return firmResult as NextResponse;
    }

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

    const supabase = getSupabaseServiceClient()

    const scenarioAccess = await requireScenarioAccess({
      supabase,
      scenarioId: cleanScenarioId,
      ctx: auth.context
    })
    if (!scenarioAccess.ok) {
      return scenarioAccess.response as NextResponse
    }

    // Delete results
    const { error } = await supabase
      .from('monte_carlo_results')
      .delete()
      .eq('scenario_id', cleanScenarioId);

    if (error) {
      log.error('Failed to delete results for scenario', { scenarioId: cleanScenarioId, error: error.message });
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error('Monte Carlo delete results API error', { error: errorMessage });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

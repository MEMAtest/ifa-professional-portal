// src/app/api/monte-carlo/assumptions/[scenarioId]/route.ts
// ✅ COMPLETE BULLETPROOF VERSION - COPY-PASTE REPLACEMENT

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireScenarioAccess } from '@/lib/monte-carlo/monteCarloAccess'

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
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }

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

    const supabase: any = getSupabaseServiceClient()
    const access = await requireScenarioAccess({ supabase, scenarioId: cleanScenarioId, ctx: auth.context })
    if (!access.ok) {
      clearTimeout(timeoutId)
      return access.response
    }

    const { data, error } = await supabase
      .from('monte_carlo_assumptions')
      .select('*')
      .eq('scenario_id', cleanScenarioId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    clearTimeout(timeoutId)

    if (error) {
      log.error(`Failed to get assumptions for scenario ${cleanScenarioId}`, { error: error.message });
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve assumptions', scenarioId: cleanScenarioId },
        { status: 500 }
      )
    }

    // ✅ STANDARDIZED SUCCESS RESPONSE
    return NextResponse.json(
      { 
        success: true, 
        data: data || null,
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
    log.error('Monte Carlo assumptions API error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve assumptions',
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
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  }

  if (origin) {
    if (appUrl && origin === appUrl) {
      headers['Access-Control-Allow-Origin'] = origin
    } else if (process.env.NODE_ENV === 'development') {
      headers['Access-Control-Allow-Origin'] = origin
    }
  }

  return new NextResponse(null, { status: 204, headers });
}

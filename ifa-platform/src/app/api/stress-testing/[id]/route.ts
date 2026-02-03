// ================================================================
// src/app/api/stress-testing/[id]/route.ts
// API route for individual stress scenario details
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/apiAuth';
import { createRequestLogger } from '@/lib/logging/structured';
import { StressTestingEngine } from '@/services/StressTestingEngine';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/stress-testing/[id]
 * Get details for a specific stress scenario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(request);
  if (!auth.success) {
    return auth.response!;
  }

  const logger = createRequestLogger(request);
  const { id } = await params;

  try {
    logger.info('GET /api/stress-testing/[id] - Fetching scenario details', { id });

    // Get scenario by ID from the engine
    const scenario = StressTestingEngine.getScenarioById(id);

    if (!scenario) {
      return NextResponse.json({
        success: false,
        error: 'Stress scenario not found'
      }, { status: 404 });
    }

    // Get related scenarios in the same category
    const scenariosByCategory = StressTestingEngine.getScenariosByCategory();
    const relatedScenarios = scenariosByCategory[scenario.category]?.filter(
      s => s.id !== id
    ) || [];

    return NextResponse.json({
      success: true,
      scenario,
      relatedScenarios,
      categoryInfo: {
        name: scenario.category,
        totalScenarios: scenariosByCategory[scenario.category]?.length || 0
      }
    });

  } catch (error) {
    logger.error('GET /api/stress-testing/[id] error', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

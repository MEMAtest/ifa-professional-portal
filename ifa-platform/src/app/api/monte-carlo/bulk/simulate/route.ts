// ===== 4. src/app/api/monte-carlo/bulk/simulate/route.ts =====
import { NextRequest, NextResponse } from 'next/server';
import { createMonteCarloEngine, SimulationInput } from '@/lib/monte-carlo/engine';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

interface BulkSimulationRequest {
  scenarios: Array<{
    scenarioId: string;
    input: SimulationInput;
  }>;
  options?: {
    parallel?: boolean;
    maxConcurrent?: number;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: BulkSimulationRequest = await request.json();
    const { scenarios, options = {} } = body;

    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Scenarios array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (scenarios.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 scenarios allowed per bulk request' },
        { status: 400 }
      );
    }

    const engine = createMonteCarloEngine();
    const db = getMonteCarloDatabase();
    const results = [];

    // Process scenarios (sequential for now to avoid overwhelming the system)
    for (const scenario of scenarios) {
      try {
        // Update status to running
        await db.updateStatus(scenario.scenarioId, 'running');

        // Run simulation
        const result = await engine.runSimulation(scenario.input);

        // Save results
        const saveResponse = await db.saveResults(scenario.scenarioId, result, scenario.input);
        
        if (saveResponse.success) {
          await db.updateStatus(scenario.scenarioId, 'completed');
          results.push({
            scenarioId: scenario.scenarioId,
            success: true,
            data: result
          });
        } else {
          await db.updateStatus(scenario.scenarioId, 'failed');
          results.push({
            scenarioId: scenario.scenarioId,
            success: false,
            error: saveResponse.error
          });
        }

      } catch (error: unknown) {
        await db.updateStatus(scenario.scenarioId, 'failed');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          scenarioId: scenario.scenarioId,
          success: false,
          error: errorMessage
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json(
      {
        success: true,
        data: {
          results,
          summary: {
            total: scenarios.length,
            successful: successCount,
            failed: failCount
          }
        }
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
// ===== 1. src/app/api/monte-carlo/assumptions/[scenarioId]/route.ts =====
import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

interface AssumptionRouteParams {
  params: {
    scenarioId: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: AssumptionRouteParams
): Promise<NextResponse> {
  try {
    const { scenarioId } = params;

    if (!scenarioId || scenarioId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
        { status: 400 }
      );
    }

    const db = getMonteCarloDatabase();
    const response = await db.getAssumptions(scenarioId);
    
    if (!response.success) {
      return NextResponse.json(
        { success: false, error: response.error },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: response.data },
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
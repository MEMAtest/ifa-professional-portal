// ===== 2. src/app/api/monte-carlo/status/route.ts =====
import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const db = getMonteCarloDatabase();
    const healthResponse = await db.getHealthStatus();
    
    if (!healthResponse.success) {
      return NextResponse.json(
        {
          success: false,
          status: 'unhealthy',
          error: healthResponse.error
        },
        { status: 503 }
      );
    }

    // Get recent scenarios count
    const scenariosResponse = await db.listScenarios(1, 1);
    const hasData = scenariosResponse.success && scenariosResponse.data && scenariosResponse.data.length > 0;

    return NextResponse.json(
      {
        success: true,
        status: 'healthy',
        database: healthResponse.data,
        features: {
          simulation: true,
          storage: true,
          api: true
        },
        hasData,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
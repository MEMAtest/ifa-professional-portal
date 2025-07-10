// src/app/api/monte-carlo/status/route.ts
// ✅ CORRECTED AND ROBUST MONTE CARLO STATUS API ROUTE

import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

// ✅ CRITICAL FIX: Force this route to be dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/monte-carlo/status
 * Returns the health status of the Monte Carlo simulation system
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 🛡️ BUILD-TIME SAFETY: Prevent database calls during static generation
    const isProduction = process.env.NODE_ENV === 'production';
    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    if (isProduction && !hasDbUrl && !hasSupabaseUrl) {
      return NextResponse.json(
        {
          success: true,
          status: 'build-time',
          message: 'Database health check skipped during build'
        },
        { status: 200 }
      );
    }

    // Initialize database connection
    const db = getMonteCarloDatabase();
    
    // ✅ CORRECTED: Get health status using the fixed method
    const healthResponse = await db.getHealthStatus();
    
    if (healthResponse?.success !== true) {
      console.error('Monte Carlo database health check failed:', healthResponse?.error);
      return NextResponse.json(
        {
          success: false,
          status: 'unhealthy',
          error: healthResponse?.error || 'Database health check failed',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }

    // ✅ IMPROVED: Get scenarios with proper error handling
    let hasData: boolean = false;
    let scenarioCount: number = 0;
    
    try {
      const scenariosResponse = await db.listScenarios(1, 5); // Check first 5 scenarios
      hasData = Boolean(
        scenariosResponse?.success === true && 
        scenariosResponse?.data && 
        Array.isArray(scenariosResponse.data) &&
        scenariosResponse.data.length > 0
      );
      scenarioCount = scenariosResponse?.data?.length || 0;
    } catch (scenarioError) {
      console.warn('Could not fetch scenario data for status check:', scenarioError);
      // Continue with health check even if scenario fetch fails
      hasData = false;
      scenarioCount = 0;
    }

    // ✅ STANDARDIZED: Return comprehensive status
    return NextResponse.json(
      {
        success: true,
        status: 'healthy',
        database: {
          connection: 'ok',
          health: healthResponse.data?.status || 'unknown',
          totalRecords: healthResponse.data?.count || 0
        },
        features: {
          simulation: true,
          storage: true,
          api: true,
          healthCheck: true
        },
        data: {
          hasScenarios: hasData,
          recentScenarioCount: scenarioCount
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error: unknown) {
    console.error('Monte Carlo status API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/monte-carlo/status
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
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
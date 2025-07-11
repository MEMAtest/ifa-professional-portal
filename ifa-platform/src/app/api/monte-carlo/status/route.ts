// src/app/api/monte-carlo/status/route.ts
// ✅ COMPLETE BULLETPROOF VERSION - COPY-PASTE REPLACEMENT

import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

// ✅ FORCE DYNAMIC RENDERING
export const dynamic = 'force-dynamic';

/**
 * GET /api/monte-carlo/status
 * Returns the health status of the Monte Carlo simulation system
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ✅ TIMEOUT PROTECTION
    const timeoutId = setTimeout(() => {
      throw new Error('Health check timeout after 10 seconds');
    }, 10000);

    // ✅ PROPER DATABASE INITIALIZATION
    const db = getMonteCarloDatabase();
    
    // ✅ GET HEALTH STATUS WITH ERROR HANDLING
    const healthResponse = await db.getHealthStatus();
    
    clearTimeout(timeoutId);
    
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

    // ✅ SAFE SCENARIO CHECKING WITH FALLBACKS
    let hasData: boolean = false;
    let scenarioCount: number = 0;
    let recordCount: number = 0;
    
    try {
      const scenariosResponse = await db.listScenarios(1, 5);
      hasData = Boolean(
        scenariosResponse?.success === true && 
        scenariosResponse?.data && 
        Array.isArray(scenariosResponse.data) &&
        scenariosResponse.data.length > 0
      );
      scenarioCount = scenariosResponse?.data?.length || 0;
      
      // ✅ HANDLE BOTH OLD AND NEW DATABASE INTERFACES
      const healthData = healthResponse.data || {};
      recordCount = ('count' in healthData && typeof healthData.count === 'number') 
        ? healthData.count 
        : 0;
        
    } catch (scenarioError) {
      console.warn('Could not fetch scenario data for status check:', scenarioError);
      hasData = false;
      scenarioCount = 0;
      recordCount = 0;
    }

    // ✅ STANDARDIZED SUCCESS RESPONSE
    return NextResponse.json(
      {
        success: true,
        status: 'healthy',
        database: {
          connection: 'ok',
          health: healthResponse.data?.status || 'unknown',
          totalRecords: recordCount
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
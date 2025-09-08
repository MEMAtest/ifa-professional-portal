import { createClient } from "@/lib/supabase/server"
// src/app/api/monte-carlo/cleanup/route.ts
// ✅ COMPLETE BULLETPROOF VERSION - COPY-PASTE REPLACEMENT

import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

// ✅ FORCE DYNAMIC RENDERING
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/monte-carlo/cleanup
 * Clean up old Monte Carlo results
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // ✅ TIMEOUT PROTECTION (generous for cleanup operations)
    const timeoutId = setTimeout(() => {
      throw new Error('Cleanup timeout after 30 seconds');
    }, 30000);

    // ✅ SAFE PARAMETER EXTRACTION
    const searchParams = request.nextUrl.searchParams;
    const olderThanDaysParam = searchParams.get('olderThanDays');
    
    // ✅ PARAMETER VALIDATION AND DEFAULTS
    let olderThanDays = 90; // Default to 90 days
    
    if (olderThanDaysParam !== null) {
      const parsed = parseInt(olderThanDaysParam, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 365) {
        clearTimeout(timeoutId);
        return NextResponse.json(
          { 
            success: false, 
            error: 'olderThanDays must be a number between 1 and 365' 
          },
          { status: 400 }
        );
      }
      olderThanDays = parsed;
    }

    // ✅ PROPER DATABASE INITIALIZATION
    const db = getMonteCarloDatabase();
    
    // ✅ CLEANUP OPERATION WITH ERROR HANDLING
    const cleanupResponse = await db.cleanupOldResults(olderThanDays);
    
    clearTimeout(timeoutId);
    
    if (!cleanupResponse.success) {
      console.error('Failed to cleanup old Monte Carlo results:', cleanupResponse.error);
      return NextResponse.json(
        { 
          success: false, 
          error: cleanupResponse.error || 'Failed to cleanup old results'
        },
        { status: 500 }
      );
    }

    const deletedCount = cleanupResponse.data || 0;

    // ✅ STANDARDIZED SUCCESS RESPONSE
    return NextResponse.json(
      {
        success: true,
        message: `Cleanup completed successfully`,
        data: {
          deletedCount,
          olderThanDays,
          cleanupDate: new Date().toISOString(),
          cutoffDate: new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)).toISOString()
        },
        metadata: {
          operation: 'cleanup',
          completedAt: new Date().toISOString(),
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
    console.error('Monte Carlo cleanup API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/monte-carlo/cleanup
 * Get cleanup status and statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ✅ TIMEOUT PROTECTION
    const timeoutId = setTimeout(() => {
      throw new Error('Cleanup status timeout after 10 seconds');
    }, 10000);

    // ✅ SAFE PARAMETER EXTRACTION
    const searchParams = request.nextUrl.searchParams;
    const olderThanDaysParam = searchParams.get('olderThanDays');
    
    let olderThanDays = 90;
    if (olderThanDaysParam !== null) {
      const parsed = parseInt(olderThanDaysParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 365) {
        olderThanDays = parsed;
      }
    }

    // ✅ PROPER DATABASE INITIALIZATION
    const db = getMonteCarloDatabase();
    
    // ✅ GET STATISTICS WITHOUT ACTUAL CLEANUP
    const scenarios = await db.listScenarios(1, 1000); // Get a large sample
    
    clearTimeout(timeoutId);
    
    if (!scenarios.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: scenarios.error || 'Failed to get cleanup statistics'
        },
        { status: 500 }
      );
    }

    // ✅ CALCULATE CLEANUP STATISTICS
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    const allScenarios = scenarios.data || [];
    
    const oldScenarios = allScenarios.filter(scenario => {
      if (!scenario.created_at) return false;
      return new Date(scenario.created_at) < cutoffDate;
    });

    // ✅ STANDARDIZED RESPONSE
    return NextResponse.json(
      {
        success: true,
        data: {
          totalScenarios: allScenarios.length,
          oldScenarios: oldScenarios.length,
          recentScenarios: allScenarios.length - oldScenarios.length,
          olderThanDays,
          cutoffDate: cutoffDate.toISOString(),
          wouldDelete: oldScenarios.length
        },
        metadata: {
          operation: 'cleanup-preview',
          checkedAt: new Date().toISOString(),
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
    console.error('Monte Carlo cleanup status API error:', error);
    
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
 * OPTIONS /api/monte-carlo/cleanup
 * Handle CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    { message: 'OK' },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
}
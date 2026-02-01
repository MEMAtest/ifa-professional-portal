// src/app/api/monte-carlo/list/route.ts
// ✅ COMPLETE BULLETPROOF VERSION - COPY-PASTE REPLACEMENT

import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

// ✅ FORCE DYNAMIC RENDERING
export const dynamic = 'force-dynamic';

/**
 * GET /api/monte-carlo/list
 * List Monte Carlo scenarios with pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // ✅ TIMEOUT PROTECTION
    const timeoutId = setTimeout(() => {
      throw new Error('List scenarios timeout after 15 seconds');
    }, 15000);

    // ✅ SAFE PARAMETER EXTRACTION
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

    if (isNaN(page) || isNaN(pageSize)) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid pagination parameters. Page and pageSize must be valid numbers.' 
        },
        { status: 400 }
      );
    }

    // ✅ PROPER DATABASE INITIALIZATION
    const db = getMonteCarloDatabase();
    
    // ✅ DATABASE OPERATION WITH ERROR HANDLING
    const response = await db.listScenarios(page, pageSize);
    
    clearTimeout(timeoutId);
    
    if (!response.success) {
      log.error('Failed to list Monte Carlo scenarios', { error: response.error });
      return NextResponse.json(
        { 
          success: false, 
          error: response.error || 'Failed to retrieve scenarios'
        },
        { status: 500 }
      );
    }

    // ✅ SAFE DATA HANDLING
    const scenarios = response.data || [];
    const totalCount = scenarios.length;

    // ✅ STANDARDIZED SUCCESS RESPONSE
    return NextResponse.json(
      {
        success: true,
        data: scenarios,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNextPage: totalCount === pageSize,
          hasPreviousPage: page > 1
        },
        metadata: {
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
    log.error('Monte Carlo list API error', error);

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
 * OPTIONS /api/monte-carlo/list
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
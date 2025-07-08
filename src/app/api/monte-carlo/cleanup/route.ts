// ===== 5. src/app/api/monte-carlo/cleanup/route.ts =====
import { NextRequest, NextResponse } from 'next/server';
import { getMonteCarloDatabase } from '@/lib/monte-carlo/database';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { olderThanDays = 90 } = body;

    if (typeof olderThanDays !== 'number' || olderThanDays < 1 || olderThanDays > 365) {
      return NextResponse.json(
        { success: false, error: 'olderThanDays must be between 1 and 365' },
        { status: 400 }
      );
    }

    const db = getMonteCarloDatabase();
    const cleanupResponse = await db.cleanupOldResults(olderThanDays);
    
    if (!cleanupResponse.success) {
      return NextResponse.json(
        { success: false, error: cleanupResponse.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          deletedCount: cleanupResponse.data,
          olderThanDays,
          timestamp: new Date().toISOString()
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
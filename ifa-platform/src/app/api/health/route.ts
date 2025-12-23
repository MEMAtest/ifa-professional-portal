// =====================================================
// FILE: src/app/api/health/route.ts
// PURPOSE: Liveness probe - application is running
// Phase B: Observability Infrastructure
// =====================================================

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 *
 * Liveness probe - returns 200 if the application is running.
 * Used by load balancers and orchestrators to check if the app is alive.
 * Does NOT check dependencies (use /api/readiness for that).
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  })
}

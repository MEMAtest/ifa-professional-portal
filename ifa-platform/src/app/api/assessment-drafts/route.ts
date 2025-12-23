export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'

// Temporary stub to avoid 404s while draft persistence is refactored to server-side storage.
// Returns empty results and acknowledges writes without persisting.
// Note: Auth is still required even for stub endpoints to prevent unauthorized access.

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ success: true, drafts: [], assessments: [] })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ success: true, message: 'Draft save acknowledged (stub)' })
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth.success) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ success: true, message: 'Draft delete acknowledged (stub)' })
}

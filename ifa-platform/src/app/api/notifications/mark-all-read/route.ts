export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { NotificationService } from '@/lib/notifications/notificationService'
import { log } from '@/lib/logging/structured'

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response ?? NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const count = await NotificationService.markAllAsRead(
      authResult.context.userId,
      authResult.context.firmId ?? undefined
    )

    return NextResponse.json({ success: true, count })
  } catch (error) {
    log.error('POST /api/notifications/mark-all-read error', error)
    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

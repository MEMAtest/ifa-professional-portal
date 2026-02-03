import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { NotificationService } from '@/lib/notifications/notificationService'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/unread-count
 * Get the number of unread notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response ?? NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Pass firmId for firm-wide notifications
    const count = await NotificationService.getUnreadCount(
      authResult.context.userId,
      authResult.context.firmId ?? undefined
    )

    return NextResponse.json({ count })
  } catch (error) {
    log.error('GET /api/notifications/unread-count error', error)
    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

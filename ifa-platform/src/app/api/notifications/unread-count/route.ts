import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { NotificationService } from '@/lib/notifications/notificationService'

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
    console.error('GET /api/notifications/unread-count error:', error)
    const isDev = process.env.NODE_ENV === 'development'
    const message = error instanceof Error ? error.message : 'Internal server error'
    const code = (error as any)?.code
    return NextResponse.json(
      {
        error: isDev ? message : 'Internal server error',
        ...(isDev && code ? { code } : {})
      },
      { status: 500 }
    )
  }
}

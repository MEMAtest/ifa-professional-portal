import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { NotificationService } from '@/lib/notifications/notificationService'

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
    console.error('POST /api/notifications/mark-all-read error:', error)
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

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { NotificationService } from '@/lib/notifications/notificationService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications
 * Get notifications for the current user
 *
 * Query params:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 * - before: ISO date string (optional; cursor pagination)
 * - unread_only: boolean (default false)
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0')
    const before = searchParams.get('before') ?? undefined
    const unreadOnly = searchParams.get('unread_only') === 'true'

    // Pass firmId from auth context for firm-wide notifications
    const result = await NotificationService.getForUser(authResult.context.userId, {
      limit,
      offset,
      before,
      unreadOnly,
      firmId: authResult.context.firmId ?? undefined
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/notifications error:', error)
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

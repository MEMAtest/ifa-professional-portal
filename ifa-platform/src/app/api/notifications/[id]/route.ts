export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { NotificationService } from '@/lib/notifications/notificationService'
import { log } from '@/lib/logging/structured'

/**
 * PATCH /api/notifications/[id]
 * Mark notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response ?? NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    log.debug('[PATCH notification] request', { id, userId: authResult.context.userId, firmId: authResult.context.firmId })

    const success = await NotificationService.markAsRead(
      id,
      authResult.context.userId,
      authResult.context.firmId ?? undefined
    )

    log.debug('[PATCH notification] success', { id, success })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('PATCH /api/notifications/[id] error', error)
    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response ?? NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const success = await NotificationService.delete(
      id,
      authResult.context.userId,
      authResult.context.firmId ?? undefined
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('DELETE /api/notifications/[id] error', error)
    return NextResponse.json(
      {
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

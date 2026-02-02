export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { NotificationService } from '@/lib/notifications/notificationService'

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
    console.log('[PATCH notification] id:', id, 'userId:', authResult.context.userId, 'firmId:', authResult.context.firmId)

    const success = await NotificationService.markAsRead(
      id,
      authResult.context.userId,
      authResult.context.firmId ?? undefined
    )

    console.log('[PATCH notification] success:', success)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/notifications/[id] error:', error, (error as any)?.cause)
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
    console.error('DELETE /api/notifications/[id] error:', error)
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

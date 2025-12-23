import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import type { NotificationPriority, NotificationType } from '@/types/notifications'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const authResult = await getAuthContext(request)
  if (!authResult.success || !authResult.context) {
    return authResult.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const type = (body.type as NotificationType | undefined) ?? 'system'
  const priority = (body.priority as NotificationPriority | undefined) ?? 'normal'
  const title = (body.title as string | undefined) ?? 'Test notification'
  const message = (body.message as string | undefined) ?? 'This is a dev-seeded notification.'

  const supabase = getSupabaseServiceClient()
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: authResult.context.userId,
      firm_id: authResult.context.firmId ?? null,
      type,
      title,
      message,
      priority,
      read: false,
      metadata: {
        seeded: true
      }
    })
    .select()
    .single()

  if (error || !notification) {
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { error: isDev ? (error?.message ?? 'Failed to create notification') : 'Failed to create notification' },
      { status: 500 }
    )
  }

  return NextResponse.json({ notification }, { status: 201 })
}

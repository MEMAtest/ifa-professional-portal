import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { NotificationService } from '@/lib/notifications/notificationService'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

const statusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'approved', 'rejected', 'escalated'])
})

const formatName = (profile?: { first_name?: string | null; last_name?: string | null }) => {
  if (!profile) return ''
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
  return name
}

const formatClientName = (client?: { personal_details?: Record<string, any> | null; client_ref?: string | null }) => {
  if (!client) return 'Client'
  const pd = client.personal_details || {}
  const name = `${pd.title ? `${pd.title} ` : ''}${pd.firstName || ''} ${pd.lastName || ''}`.trim()
  return name || client.client_ref || 'Client'
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmResult = requireFirmId(authResult.context)
    if (firmResult instanceof NextResponse) return firmResult

    const permissionError = requirePermission(authResult.context, 'reports:generate')
    if (permissionError) return permissionError

    const body = await request.json().catch(() => null)
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const reviewId = context.params.id
    const nextStatus = parsed.data.status
    const supabase = getSupabaseServiceClient()

    const { data: review, error: reviewError } = await supabase
      .from('file_reviews')
      .select('id, firm_id, client_id, adviser_id, reviewer_id, status, review_type, reviewer_started_at')
      .eq('id', reviewId)
      .eq('firm_id', firmResult.firmId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const { data: reviewerProfile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', authResult.context.userId)
      .single()

    const { data: client } = await supabase
      .from('clients')
      .select('id, client_ref, personal_details')
      .eq('id', review.client_id)
      .single()

    const updateData: Record<string, any> = {
      status: nextStatus
    }

    const now = new Date().toISOString()
    if (!review.reviewer_started_at && ['in_progress', 'approved', 'rejected', 'escalated'].includes(nextStatus)) {
      updateData.reviewer_started_at = now
    }
    if (['approved', 'rejected', 'escalated'].includes(nextStatus)) {
      updateData.reviewer_completed_at = now
      updateData.completed_at = nextStatus === 'escalated' ? null : now
      updateData.reviewer_name = formatName(reviewerProfile) || 'Reviewer'
    }

    const { data: updatedReview, error: updateError } = await supabase
      .from('file_reviews')
      .update(updateData)
      .eq('id', reviewId)
      .eq('firm_id', firmResult.firmId)
      .select('*')
      .single()

    if (updateError || !updatedReview) {
      log.error('Failed to update file review status', { updateError })
      return NextResponse.json({ error: 'Failed to update review status' }, { status: 500 })
    }

    if (['approved', 'rejected', 'escalated'].includes(nextStatus)) {
      const clientName = formatClientName(client)
      const messageSuffix =
        nextStatus === 'approved'
          ? 'approved'
          : nextStatus === 'rejected'
            ? 'rejected'
            : 'escalated for further review'

      const actionUrl = `/compliance?tab=qa&filter=completed`

      if (review.adviser_id) {
        await NotificationService.create({
          user_id: review.adviser_id,
          firm_id: firmResult.firmId,
          client_id: review.client_id,
          entity_type: 'review',
          entity_id: review.id,
          type: 'review_completed',
          title: 'File review completed',
          message: `${clientName} review was ${messageSuffix}.`,
          action_url: actionUrl,
          priority: nextStatus === 'rejected' || nextStatus === 'escalated' ? 'high' : 'normal'
        })
      }

      if (review.reviewer_id) {
        await NotificationService.create({
          user_id: review.reviewer_id,
          firm_id: firmResult.firmId,
          client_id: review.client_id,
          entity_type: 'review',
          entity_id: review.id,
          type: 'review_completed',
          title: 'Review status updated',
          message: `${clientName} review marked ${messageSuffix}.`,
          action_url: actionUrl,
          priority: nextStatus === 'rejected' || nextStatus === 'escalated' ? 'high' : 'normal'
        })
      }
    }

    return NextResponse.json({ success: true, review: updatedReview })
  } catch (error) {
    log.error('PATCH /api/compliance/file-reviews/[id]/status error', { error })
    return NextResponse.json({ error: 'Failed to update review status' }, { status: 500 })
  }
}

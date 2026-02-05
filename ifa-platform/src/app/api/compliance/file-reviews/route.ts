import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { NotificationService } from '@/lib/notifications/notificationService'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

const optionalDate = z.string().optional().nullable().refine((value) => {
  if (!value) return true
  return !Number.isNaN(Date.parse(value))
}, { message: 'Invalid date format' })

const createReviewSchema = z.object({
  client_id: z.string().uuid(),
  adviser_id: z.string().uuid(),
  reviewer_id: z.string().uuid(),
  review_type: z.enum(['new_business', 'annual_review', 'complaint', 'ad_hoc']).default('new_business'),
  due_date: optionalDate,
  risk_rating: z.enum(['low', 'medium', 'high', 'critical']).optional().nullable()
})

const DEFAULT_CHECKLIST = {
  client_suitability: false,
  risk_profile_current: false,
  capacity_for_loss: false,
  product_recommendations: false,
  fees_disclosed: false,
  documentation_complete: false,
  aml_checks: false,
  consumer_duty: false
}

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

export async function POST(request: NextRequest) {
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
    const parsed = createReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { client_id, adviser_id, reviewer_id, review_type, due_date, risk_rating } = parsed.data

    if (adviser_id === reviewer_id) {
      return NextResponse.json(
        { error: 'Four-eyes rule violated', message: 'Adviser and reviewer must be different users.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, firm_id, client_ref, personal_details')
      .eq('id', client_id)
      .single()

    if (clientError || !client || client.firm_id !== firmResult.firmId) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: adviserProfile } = await supabase
      .from('profiles')
      .select('id, firm_id, first_name, last_name')
      .eq('id', adviser_id)
      .single()

    const { data: reviewerProfile } = await supabase
      .from('profiles')
      .select('id, firm_id, first_name, last_name')
      .eq('id', reviewer_id)
      .single()

    if (!adviserProfile || adviserProfile.firm_id !== firmResult.firmId) {
      return NextResponse.json({ error: 'Adviser not found in firm' }, { status: 404 })
    }
    if (!reviewerProfile || reviewerProfile.firm_id !== firmResult.firmId) {
      return NextResponse.json({ error: 'Reviewer not found in firm' }, { status: 404 })
    }

    const adviserName = formatName(adviserProfile) || 'Adviser'
    const reviewerName = formatName(reviewerProfile) || 'Reviewer'

    const { data: review, error } = await supabase
      .from('file_reviews')
      .insert({
        firm_id: firmResult.firmId,
        client_id,
        adviser_id,
        reviewer_id,
        review_type,
        due_date: due_date || null,
        risk_rating: risk_rating || null,
        checklist: DEFAULT_CHECKLIST,
        status: 'pending',
        adviser_submitted_at: new Date().toISOString(),
        adviser_name: adviserName,
        reviewer_name: reviewerName
      })
      .select('*')
      .single()

    if (error || !review) {
      log.error('Failed to create file review', { error })
      return NextResponse.json({ error: 'Failed to create file review' }, { status: 500 })
    }

    const clientName = formatClientName(client)
    const actionUrl = `/compliance?tab=qa&filter=my-reviews`

    const reviewerNotification = await NotificationService.create({
      user_id: reviewer_id,
      firm_id: firmResult.firmId,
      client_id,
      entity_type: 'review',
      entity_id: review.id,
      type: 'review_due',
      title: 'New file review assigned',
      message: `${clientName} • ${review_type.replace(/_/g, ' ')} review`,
      action_url: actionUrl,
      priority: 'normal',
      metadata: {
        adviser_id,
        reviewer_id,
        review_type
      }
    })

    const adviserNotification = await NotificationService.create({
      user_id: adviser_id,
      firm_id: firmResult.firmId,
      client_id,
      entity_type: 'review',
      entity_id: review.id,
      type: 'review_due',
      title: 'File review submitted',
      message: `${clientName} has been submitted for QA review`,
      action_url: `/compliance?tab=qa&filter=pending`,
      priority: 'normal',
      metadata: {
        adviser_id,
        reviewer_id,
        review_type
      }
    })

    return NextResponse.json({
      success: true,
      review,
      notifications: {
        reviewer: Boolean(reviewerNotification),
        adviser: Boolean(adviserNotification)
      }
    })
  } catch (error) {
    log.error('POST /api/compliance/file-reviews error', { error })
    return NextResponse.json({ error: 'Failed to create file review' }, { status: 500 })
  }
}

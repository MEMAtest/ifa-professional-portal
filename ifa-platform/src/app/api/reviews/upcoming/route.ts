// src/app/api/reviews/upcoming/route.ts
// Endpoint for fetching upcoming reviews for dashboard display

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/logging/structured'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const filter = searchParams.get('filter') || 'outstanding'

    const supabase = await createClient()

    // Get current date for filtering
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const sevenDayLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const futureLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead
    const outstandingLimit = endOfMonth > futureLimit ? endOfMonth : futureLimit

    // Fetch pending and overdue reviews with client info
    let query = supabase
      .from('client_reviews')
      .select(`
        id,
        client_id,
        review_type,
        due_date,
        status,
        created_at,
        clients:clients(
          id,
          personal_details
        )
      `)

    // Exclude completed reviews, but allow null status to pass through
    query = query.or('status.is.null,status.neq.completed')

    if (filter === 'overdue') {
      query = query.lt('due_date', now.toISOString())
    } else if (filter === 'due_7') {
      query = query
        .gte('due_date', now.toISOString())
        .lte('due_date', sevenDayLimit.toISOString())
    } else if (filter === 'due_30') {
      query = query
        .gte('due_date', now.toISOString())
        .lte('due_date', futureLimit.toISOString())
    } else {
      query = query.lte('due_date', outstandingLimit.toISOString())
    }

    const { data: reviews, error } = await query
      .order('due_date', { ascending: true })
      .limit(limit)

    const upcomingReviews = [...(reviews || [])]

    const passesFilter = (dueDate: string) => {
      const due = new Date(dueDate)
      if (filter === 'overdue') {
        return due < now
      }
      if (filter === 'due_7') {
        return due >= now && due <= sevenDayLimit
      }
      if (filter === 'due_30') {
        return due >= now && due <= futureLimit
      }
      return due <= outstandingLimit
    }

    // Pull firm-level PROD review task from firm settings, if available
    const { data: authData } = await supabase.auth.getUser()
    const authUser = authData?.user
    const metadataFirmId = authUser?.user_metadata?.firm_id || authUser?.user_metadata?.firmId
    let resolvedFirmId = metadataFirmId || null

    if (!resolvedFirmId && authUser?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', authUser.id)
        .maybeSingle()
      resolvedFirmId = profile?.firm_id || null
    }

    if (resolvedFirmId) {
      const { data: firmData } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', resolvedFirmId)
        .maybeSingle()

      const reviewTask = (firmData?.settings as any)?.services_prod?.reviewTask
      if (reviewTask?.due_date && passesFilter(reviewTask.due_date)) {
        upcomingReviews.push({
          id: `firm-prod-${reviewTask.version || 'current'}`,
          client_id: null,
          review_type: 'prod_policy',
          due_date: reviewTask.due_date,
          status: reviewTask.status || 'pending',
          created_at: reviewTask.created_at || new Date().toISOString(),
          clients: null
        } as any)
      }
    }

    if (error) {
      log.error('Error fetching upcoming reviews', error)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming reviews' },
        { status: 500 }
      )
    }

    // Format response with client names
    const formattedReviews = upcomingReviews.map((review: any) => {
      const client = review.clients
      let clientName = 'Unknown Client'

      if (review.review_type === 'prod_policy') {
        clientName = 'Firm PROD Review'
      } else if (client?.personal_details) {
        const pd = client.personal_details
        const firstName = pd.firstName || pd.first_name || ''
        const lastName = pd.lastName || pd.last_name || ''
        clientName = `${firstName} ${lastName}`.trim() || 'Unknown Client'
      }

      return {
        id: review.id,
        client_id: review.client_id,
        client_name: clientName,
        review_type: review.review_type,
        due_date: review.due_date,
        status: review.status,
        created_at: review.created_at
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedReviews,
      count: formattedReviews.length,
      filter
    })
  } catch (error) {
    log.error('Error in GET /api/reviews/upcoming', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

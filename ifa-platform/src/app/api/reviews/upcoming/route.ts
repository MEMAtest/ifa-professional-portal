// src/app/api/reviews/upcoming/route.ts
// Endpoint for fetching upcoming reviews for dashboard display

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/logging/structured'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')

    const supabase = await createClient()

    // Get current date for filtering
    const now = new Date()
    const futureLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead

    // Fetch pending and overdue reviews with client info
    const { data: reviews, error } = await supabase
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
      .in('status', ['pending', 'overdue'])
      .lte('due_date', futureLimit.toISOString())
      .order('due_date', { ascending: true })
      .limit(limit)

    if (error) {
      log.error('Error fetching upcoming reviews', error)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming reviews' },
        { status: 500 }
      )
    }

    // Format response with client names
    const formattedReviews = (reviews || []).map((review: any) => {
      const client = review.clients
      let clientName = 'Unknown Client'

      if (client?.personal_details) {
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
      count: formattedReviews.length
    })
  } catch (error) {
    log.error('Error in GET /api/reviews/upcoming', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

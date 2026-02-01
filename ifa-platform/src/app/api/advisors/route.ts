// src/app/api/advisors/route.ts
// Endpoint for fetching advisor list for filters

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, getValidatedFirmId } from '@/lib/auth/apiAuth'
import { log } from '@/lib/logging/structured'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseServiceClient()
    const firmId = getValidatedFirmId(auth.context)

    // Query advisors/profiles
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, role, firm_id')
      .in('role', ['advisor', 'admin', 'senior_advisor'])
      .order('first_name')

    // Filter by firm if available
    if (firmId) {
      query = query.eq('firm_id', firmId)
    }

    const { data: advisors, error } = await query

    if (error) {
      log.error('Error fetching advisors', error)
      return NextResponse.json(
        { error: 'Failed to fetch advisors' },
        { status: 500 }
      )
    }

    // Format response
    const formattedAdvisors = (advisors || []).map((advisor: any) => ({
      id: advisor.id,
      name: `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim() || advisor.id,
      email: null,
      role: advisor.role
    }))

    return NextResponse.json({
      success: true,
      data: formattedAdvisors,
      count: formattedAdvisors.length
    })
  } catch (error) {
    log.error('Error in GET /api/advisors', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

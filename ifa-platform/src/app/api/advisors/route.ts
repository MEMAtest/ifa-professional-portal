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

    // SECURITY: Require firm context to prevent cross-tenant data access
    if (!firmId) {
      log.warn('GET /api/advisors - No firm_id available, refusing to return unscoped data')
      return NextResponse.json({ error: 'Firm context required' }, { status: 403 })
    }

    // Query advisors/profiles with mandatory firm_id filter
    const { data: advisors, error } = await (supabase
      .from('profiles') as any)
      .select('id, full_name, role, firm_id')
      .in('role', ['advisor', 'admin', 'senior_advisor'])
      .eq('firm_id', firmId)
      .order('full_name')

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
      name: (advisor.full_name || '').trim() || advisor.id,
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

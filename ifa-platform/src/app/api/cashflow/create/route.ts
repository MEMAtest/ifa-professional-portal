export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { clientService } from '@/services/ClientService'
import { AssessmentService } from '@/services/AssessmentService'
import { CashFlowDataService } from '@/services/CashFlowDataService'
import { log } from '@/lib/logging/structured'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials missing')
  }
  return createSupabaseClient<Database>(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, scenarioType = 'base' } = body
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const authClient = createBrowserClient()
    const { data: { user } } = await authClient.auth.getUser()
    const currentUserId = user?.id || null

    // Load client + assessment via existing services (they use anon client; safe for reads)
    const client = await clientService.getClientById(clientId)
    const assessment = await AssessmentService.getClientAssessment(clientId)
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Build scenario using the same logic as CashFlowDataService
    const scenario = await CashFlowDataService.buildScenarioPayload(client, assessment, scenarioType, currentUserId)

    const { data, error } = await supabase
      .from('cash_flow_scenarios')
      .insert(scenario)
      .select()
      .single()

    if (error) {
      log.error('Cashflow insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, scenario: data })
  } catch (err) {
    log.error('Cashflow create API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

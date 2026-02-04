export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { DbInsert } from '@/types/db'
import type { ScenarioType } from '@/types/cashflow'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { clientService } from '@/services/ClientService'
import { AssessmentService } from '@/services/AssessmentService'
import { CashFlowDataService } from '@/services/CashFlowDataService'
import { log } from '@/lib/logging/structured'
import { parseRequestBody } from '@/app/api/utils'

const requestSchema = z.object({
  clientId: z.string().min(1),
  scenarioType: z.enum([
    'base',
    'optimistic',
    'pessimistic',
    'stress',
    'early_retirement',
    'high_inflation',
    'capacity_for_loss'
  ]).optional()
})

export async function POST(req: NextRequest) {
  try {
    const body = await parseRequestBody(req, requestSchema)
    const clientId = body.clientId
    const scenarioType: ScenarioType = body.scenarioType ?? 'base'
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const auth = await getAuthContext(req)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const currentUserId = auth.context.userId || null

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    // Load client + assessment via existing services (they use anon client; safe for reads)
    const client = await clientService.getClientById(clientId)
    const assessment = await AssessmentService.getClientAssessment(clientId)
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Build scenario using the same logic as CashFlowDataService
    const scenario = await CashFlowDataService.buildScenarioPayload(
      client,
      assessment,
      scenarioType,
      currentUserId
    ) as DbInsert<'cash_flow_scenarios'>

    const { data, error } = await supabase
      .from('cash_flow_scenarios')
      .insert({ ...scenario, firm_id: firmResult.firmId })
      .select()
      .single()

    if (error) {
      log.error('Cashflow insert error:', error)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Save activity to activity_log for Activity Timeline
    try {
      const clientName = client.personalDetails?.firstName && client.personalDetails?.lastName
        ? `${client.personalDetails.firstName} ${client.personalDetails.lastName}`
        : `Client ${client.clientRef || clientId.slice(0, 8)}`;

      await supabase
        .from('activity_log')
        .insert({
          id: crypto.randomUUID(),
          client_id: clientId,
          action: `Cash flow scenario created: ${data.scenario_name || scenarioType} for ${clientName}`,
          type: 'cashflow',
          user_name: null,
          date: new Date().toISOString()
        });

      log.info('Cash flow activity saved to database', { clientId, scenarioId: data.id });
    } catch (activityError) {
      log.warn('Failed to save cash flow activity', {
        error: activityError instanceof Error ? activityError.message : String(activityError)
      });
      // Don't fail the request if activity logging fails
    }

    return NextResponse.json({ success: true, scenario: data })
  } catch (err) {
    log.error('Cashflow create API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/db'
import type { AuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'

type RequireScenarioAccessArgs = {
  supabase: SupabaseClient<Database>
  scenarioId: string
  ctx: AuthContext
}

export async function requireScenarioAccess({
  supabase,
  scenarioId,
  ctx
}: RequireScenarioAccessArgs) {
  const { data: scenario, error } = await supabase
    .from('cash_flow_scenarios')
    .select('id, client_id, firm_id')
    .eq('id', scenarioId)
    .single()

  if (error || !scenario) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }
  }

  if (!ctx.isPlatformAdmin) {
    if (!ctx.firmId || scenario.firm_id !== ctx.firmId) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  if (scenario.client_id) {
    const access = await requireClientAccess({
      supabase,
      clientId: scenario.client_id,
      ctx,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return { ok: false as const, response: access.response }
    }
  }

  return { ok: true as const, scenario }
}

export async function getFirmScenarioIds(params: {
  supabase: SupabaseClient<Database>
  firmId: string
  page: number
  pageSize: number
}) {
  const { supabase, firmId, page, pageSize } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('cash_flow_scenarios')
    .select('id, client_id, firm_id', { count: 'exact' })
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .range(from, to)

  return { data: data || [], error, count: count ?? 0 }
}

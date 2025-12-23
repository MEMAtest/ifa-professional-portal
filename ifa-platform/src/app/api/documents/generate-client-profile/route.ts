export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'
import { getAuthContext, canAccessClient, ROLES } from '@/lib/auth/apiAuth'
import { advisorContextService } from '@/services/AdvisorContextService'
import { generateClientProfileReportPDF } from '@/lib/pdf-templates/client-profile-report'
import { buildClientProfileReportModel } from '@/lib/clients/profileReport/buildClientProfileReportModel'
import { log } from '@/lib/logging/structured'

interface GenerateClientProfileRequest {
  clientId: string
}

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured')
  }

  return createSupabaseClient<Database>(url, key)
}

async function resolveFirmId(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  client: Database['public']['Tables']['clients']['Row'],
  ctx: { firmId?: string | null }
): Promise<string | null> {
  if (client?.firm_id) return String(client.firm_id)
  if (ctx?.firmId) return String(ctx.firmId)

  const { data: firm, error } = await supabase
    .from('firms')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    log.warn('[generate-client-profile] Failed to resolve default firm', { error: error.message })
    return null
  }

  return firm?.id ? String(firm.id) : null
}

type ClientAssessmentTable =
  | 'suitability_assessments'
  | 'atr_assessments'
  | 'cfl_assessments'
  | 'persona_assessments'

type ClientAssessmentRow<TTable extends ClientAssessmentTable> =
  Database['public']['Tables'][TTable]['Row']

async function fetchLatestByClientId<TTable extends ClientAssessmentTable>(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  table: TTable,
  clientId: string
): Promise<ClientAssessmentRow<TTable> | null> {
  const current = await (supabase.from(table as any) as any)
    .select('*')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .order('assessment_date' as any, { ascending: false })
    .order('created_at' as any, { ascending: false })
    .limit(1)
    .maybeSingle()

  if (current.data) return current.data as any

  const latest = await (supabase.from(table as any) as any)
    .select('*')
    .eq('client_id', clientId)
    .order('assessment_date' as any, { ascending: false })
    .order('created_at' as any, { ascending: false })
    .limit(1)
    .maybeSingle()

  return (latest.data as any) || null
}

function safeFileToken(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'client'
  return trimmed.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateClientProfileRequest = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }

    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (ctx.role !== ROLES.ADMIN) {
      if (ctx.firmId && client.firm_id && ctx.firmId !== client.firm_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (client.advisor_id && !canAccessClient(ctx, client.advisor_id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const firmId = await resolveFirmId(supabase, client, ctx)
    const reportContext = await advisorContextService.getReportContext(ctx.userId, firmId ?? undefined)

    const [suitability, atr, cfl, persona] = await Promise.all([
      fetchLatestByClientId(supabase, 'suitability_assessments', clientId),
      fetchLatestByClientId(supabase, 'atr_assessments', clientId),
      fetchLatestByClientId(supabase, 'cfl_assessments', clientId),
      fetchLatestByClientId(supabase, 'persona_assessments', clientId)
    ])

    const reportDateISO = new Date().toISOString()
    const model = buildClientProfileReportModel({
      client,
      reportContext: { firmName: reportContext.firmName, advisorName: reportContext.advisorName },
      reportDateISO,
      suitability: suitability as any,
      atr: atr as any,
      cfl: cfl as any,
      persona: persona as any
    })

    const pdf = await generateClientProfileReportPDF(model, {
      firmName: reportContext.firmName,
      primaryColor: reportContext.firmPrimaryColor || undefined,
      accentColor: reportContext.firmAccentColor || undefined,
      footerText: reportContext.firmFooterText || undefined
    })

    // Best-effort audit logging (do not fail export if logging fails / table missing).
    try {
      await (supabase as any).from('audit_logs').insert({
        action: 'export',
        resource: 'client_profile',
        client_id: clientId,
        resource_id: clientId,
        user_id: ctx.userId,
        success: true,
        timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || null,
        ip_address: request.headers.get('x-forwarded-for') || null,
        details: {
          kind: 'client_profile',
          endpoint: '/api/documents/generate-client-profile'
        }
      })
    } catch (auditError) {
      log.warn('[generate-client-profile] audit log failed', { error: auditError instanceof Error ? auditError.message : 'Unknown' })
    }

    const fileToken = safeFileToken(model.client.clientRef || model.client.id)
    const filename = `client-profile-${fileToken}.pdf`

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=\"${filename}\"`
      }
    })
  } catch (error) {
    log.error('[generate-client-profile] error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

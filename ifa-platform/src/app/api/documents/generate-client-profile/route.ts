export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import type { DbRow } from '@/types/db'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { advisorContextService } from '@/services/AdvisorContextService'
import { generateClientProfileReportPDF } from '@/lib/pdf-templates/client-profile-report'
import { buildClientProfileReportModel } from '@/lib/clients/profileReport/buildClientProfileReportModel'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { parseRequestBody } from '@/app/api/utils'
import { rateLimit } from '@/lib/security/rateLimit'

interface GenerateClientProfileRequest {
  clientId: string
}

type ClientAssessmentTable =
  | 'suitability_assessments'
  | 'atr_assessments'
  | 'cfl_assessments'
  | 'persona_assessments'

type ClientAssessmentRow<TTable extends ClientAssessmentTable> =
  DbRow<TTable>

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
    const rateLimitResponse = await rateLimit(request, 'api')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const permissionError = requirePermission(auth.context, 'reports:generate')
    if (permissionError) {
      return permissionError
    }
    const { firmId } = firmResult

    const body: GenerateClientProfileRequest = await parseRequestBody(request)
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    const reportContext = await advisorContextService.getReportContext(ctx.userId, firmId)

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

// =====================================================
// FILE: src/app/api/assessments/persona/route.ts
// Refactor: use shared auth + service client (no server-side auth.getUser fallbacks)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { isUUID } from '@/lib/utils'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'
import { parseRequestBody } from '@/app/api/utils'

export const dynamic = 'force-dynamic'

type PersonaAssessmentRow = {
  id: string
  client_id: string
  persona_level: number | null
  persona_type: string | null
  scores: any
  confidence: number | null
  answers: any
  motivations: any
  fears: any
  psychological_profile: any
  communication_needs: any
  consumer_duty_alignment: any
  notes: string | null
  assessment_date: string | null
  version: number | null
  is_current: boolean | null
  completed_by: string | null
  created_at: string | null
  updated_at: string | null
}

async function writeAssessmentProgress(params: {
  supabase: ReturnType<typeof getSupabaseServiceClient>
  clientId: string
  status: 'not_started' | 'in_progress' | 'completed'
  progressPercentage: number
  completedAtISO?: string
  metadata?: Record<string, unknown>
}) {
  const { supabase, clientId, status, progressPercentage, completedAtISO, metadata } = params
  const now = new Date().toISOString()

  const payload: any = {
    client_id: clientId,
    assessment_type: 'persona',
    status,
    progress_percentage: progressPercentage,
    last_updated: now,
    updated_at: now,
    metadata: metadata || null
  }

  if (completedAtISO) payload.completed_at = completedAtISO

  const attempted = await supabase
    .from('assessment_progress')
    .upsert(payload, { onConflict: 'client_id,assessment_type' })

  if (!attempted.error) return

  const message = String(attempted.error.message || attempted.error.details || '')
  if (!message.toLowerCase().includes('no unique') && !message.toLowerCase().includes('on conflict')) {
    throw attempted.error
  }

  const existing = await supabase
    .from('assessment_progress')
    .select('id')
    .eq('client_id', clientId)
    .eq('assessment_type', 'persona')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.data?.id) {
    const updated = await supabase.from('assessment_progress').update(payload).eq('id', existing.data.id)
    if (updated.error) throw updated.error
    return
  }

  const inserted = await supabase.from('assessment_progress').insert(payload)
  if (inserted.error) throw inserted.error
}

export async function GET(request: NextRequest) {
  try {
    log.debug('Persona GET request received')

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required', success: false }, { status: 400 })
    }

    if (!isUUID(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format', success: false }, { status: 400 })
    }

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }

    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    const { data: personaData, error } = await supabase
      .from('persona_assessments')
      .select(
        'id,client_id,persona_level,persona_type,scores,confidence,answers,motivations,fears,psychological_profile,communication_needs,consumer_duty_alignment,notes,assessment_date,version,is_current,completed_by,created_at,updated_at'
      )
      .eq('client_id', clientId)
      .eq('is_current', true)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .maybeSingle<PersonaAssessmentRow>()

    if (error) {
      log.error('Persona database fetch error', error, { clientId })
      return NextResponse.json({ error: 'Failed to fetch Persona data', success: false }, { status: 500 })
    }

    const { count: versionCount } = await supabase
      .from('persona_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    return NextResponse.json({
      success: true,
      data: personaData,
      hasAssessment: Boolean(personaData),
      totalVersions: versionCount || 0,
      clientId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    log.error('Persona GET route error', error)
    return NextResponse.json(
      { error: 'Internal server error', message: '', success: false },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    log.debug('Persona POST request received')

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    const ctx = auth.context!
    const userId = ctx.userId || null

    const supabase = getSupabaseServiceClient()

    const body = await parseRequestBody(request)
    const {
      clientId,
      personaLevel,
      personaType,
      scores,
      confidence,
      answers,
      motivations,
      fears,
      psychologicalProfile,
      communicationNeeds,
      consumerDutyAlignment,
      notes
    } = body || {}

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required', success: false }, { status: 400 })
    }

    if (!isUUID(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format', success: false }, { status: 400 })
    }

    if (personaLevel === undefined || personaLevel === null || !personaType) {
      return NextResponse.json(
        { error: 'Missing required assessment data: personaLevel and personaType are required', success: false },
        { status: 400 }
      )
    }

    if (confidence !== undefined && confidence !== null) {
      if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
        return NextResponse.json({ error: 'Confidence must be a number between 0 and 100', success: false }, { status: 400 })
      }
    }

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    const { data: latestAssessment, error: versionError } = await supabase
      .from('persona_assessments')
      .select('version')
      .eq('client_id', clientId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle<{ version: number | null }>()

    if (versionError && versionError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch version information', success: false },
        { status: 500 }
      )
    }

    const currentMaxVersion = latestAssessment?.version || 0
    const newVersion = currentMaxVersion + 1

    const now = new Date().toISOString()

    const markOld = await supabase
      .from('persona_assessments')
      .update({ is_current: false, updated_at: now })
      .eq('client_id', clientId)
      .eq('is_current', true)

    if (markOld.error) {
      log.error('Persona mark old error', markOld.error, { clientId })
      return NextResponse.json({ error: 'Failed to archive previous Persona assessments', success: false }, { status: 500 })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('persona_assessments')
      .insert({
        client_id: clientId,
        persona_level: personaLevel,
        persona_type: personaType,
        scores: scores ?? null,
        confidence: confidence ?? null,
        answers: answers ?? null,
        motivations: motivations ?? null,
        fears: fears ?? null,
        psychological_profile: psychologicalProfile ?? null,
        communication_needs: communicationNeeds ?? null,
        consumer_duty_alignment: consumerDutyAlignment ?? null,
        notes: notes ?? null,
        version: newVersion,
        is_current: true,
        assessment_date: now,
        completed_by: userId,
        created_at: now,
        updated_at: now
      })
      .select(
        'id,client_id,persona_level,persona_type,scores,confidence,answers,motivations,fears,psychological_profile,communication_needs,consumer_duty_alignment,notes,assessment_date,version,is_current,completed_by,created_at,updated_at'
      )
      .single<PersonaAssessmentRow>()

    if (insertError) {
      log.error('Persona create error', insertError, { clientId })
      return NextResponse.json({ error: 'Failed to create Persona assessment', success: false }, { status: 500 })
    }

    await writeAssessmentProgress({
      supabase,
      clientId,
      status: 'completed',
      progressPercentage: 100,
      completedAtISO: now,
      metadata: {
        assessmentId: inserted.id,
        personaLevel,
        personaType,
        confidence: confidence ?? null,
        version: newVersion
      }
    })

    return NextResponse.json({
      success: true,
      data: inserted,
      version: newVersion
    })
  } catch (error) {
    log.error('Persona POST route error', error)
    return NextResponse.json(
      { error: 'Internal server error', message: '', success: false },
      { status: 500 }
    )
  }
}

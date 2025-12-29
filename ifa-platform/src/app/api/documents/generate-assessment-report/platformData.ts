import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, DbRow } from '@/types/db'
import type { PulledPlatformData } from '@/types/suitability'

export type SupabaseServiceClient = SupabaseClient<Database>
export type PersonaRow = DbRow<'persona_assessments'>

export async function fetchLatestATRCFL(
  supabase: SupabaseServiceClient,
  clientId: string
): Promise<PulledPlatformData> {
  const pulled: PulledPlatformData = {}

  const [atrResult, cflResult] = await Promise.all([
    supabase
      .from('atr_assessments')
      .select('id,risk_level,risk_category,assessment_date,created_at')
      .eq('client_id', clientId)
      // Prefer `is_current`, but support legacy rows where it was never set.
      .order('is_current', { ascending: false, nullsFirst: false })
      .order('assessment_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('cfl_assessments')
      .select('id,capacity_level,capacity_category,assessment_date,created_at')
      .eq('client_id', clientId)
      // Prefer `is_current`, but support legacy rows where it was never set.
      .order('is_current', { ascending: false, nullsFirst: false })
      .order('assessment_date', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  const atr = atrResult.data as any
  if (atr) {
    pulled.atrScore = typeof atr.risk_level === 'number' ? atr.risk_level : Number(atr.risk_level)
    pulled.atrCategory = atr.risk_category
    pulled.lastAssessmentDates = {
      ...(pulled.lastAssessmentDates || {}),
      atr: atr.assessment_date ?? atr.created_at
    }
  }

  const cfl = cflResult.data as any
  if (cfl) {
    pulled.cflScore = typeof cfl.capacity_level === 'number' ? cfl.capacity_level : Number(cfl.capacity_level)
    pulled.cflCategory = cfl.capacity_category
    pulled.lastAssessmentDates = {
      ...(pulled.lastAssessmentDates || {}),
      cfl: cfl.assessment_date ?? cfl.created_at
    }
  }

  return pulled
}

export async function fetchATRCFLAtOrBefore(
  supabase: SupabaseServiceClient,
  clientId: string,
  cutoffISO: string | null
): Promise<PulledPlatformData> {
  if (!cutoffISO) return fetchLatestATRCFL(supabase, clientId)

  const pulled: PulledPlatformData = {}

  const findAtr = async () => {
    const byDate = await supabase
      .from('atr_assessments')
      .select('id,risk_level,risk_category,assessment_date,created_at')
      .eq('client_id', clientId)
      .lte('assessment_date', cutoffISO)
      .order('assessment_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (byDate.data) return byDate.data as any

    const byCreated = await supabase
      .from('atr_assessments')
      .select('id,risk_level,risk_category,assessment_date,created_at')
      .eq('client_id', clientId)
      .lte('created_at', cutoffISO)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return (byCreated.data as any) || null
  }

  const findCfl = async () => {
    const byDate = await supabase
      .from('cfl_assessments')
      .select('id,capacity_level,capacity_category,assessment_date,created_at')
      .eq('client_id', clientId)
      .lte('assessment_date', cutoffISO)
      .order('assessment_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (byDate.data) return byDate.data as any

    const byCreated = await supabase
      .from('cfl_assessments')
      .select('id,capacity_level,capacity_category,assessment_date,created_at')
      .eq('client_id', clientId)
      .lte('created_at', cutoffISO)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return (byCreated.data as any) || null
  }

  const [atr, cfl] = await Promise.all([findAtr(), findCfl()])

  if (atr) {
    pulled.atrScore = typeof atr.risk_level === 'number' ? atr.risk_level : Number(atr.risk_level)
    pulled.atrCategory = atr.risk_category
    pulled.lastAssessmentDates = {
      ...(pulled.lastAssessmentDates || {}),
      atr: atr.assessment_date ?? atr.created_at
    }
  }

  if (cfl) {
    pulled.cflScore = typeof cfl.capacity_level === 'number' ? cfl.capacity_level : Number(cfl.capacity_level)
    pulled.cflCategory = cfl.capacity_category
    pulled.lastAssessmentDates = {
      ...(pulled.lastAssessmentDates || {}),
      cfl: cfl.assessment_date ?? cfl.created_at
    }
  }

  return pulled
}

export async function fetchLatestPersona(
  supabase: SupabaseServiceClient,
  clientId: string
): Promise<PersonaRow | null> {
  const { data, error } = await supabase
    .from('persona_assessments')
    .select('client_id,persona_type,persona_level,confidence,motivations,fears,assessment_date,created_at')
    .eq('client_id', clientId)
    .order('is_current', { ascending: false, nullsFirst: false })
    .order('assessment_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as PersonaRow
}

export async function fetchPersonaAtOrBefore(
  supabase: SupabaseServiceClient,
  clientId: string,
  cutoffISO: string | null
): Promise<PersonaRow | null> {
  if (!cutoffISO) return fetchLatestPersona(supabase, clientId)

  const byDate = await supabase
    .from('persona_assessments')
    .select('client_id,persona_type,persona_level,confidence,motivations,fears,assessment_date,created_at')
    .eq('client_id', clientId)
    .lte('assessment_date', cutoffISO)
    .order('assessment_date', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (byDate.data) return byDate.data as PersonaRow

  const byCreated = await supabase
    .from('persona_assessments')
    .select('client_id,persona_type,persona_level,confidence,motivations,fears,assessment_date,created_at')
    .eq('client_id', clientId)
    .lte('created_at', cutoffISO)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (byCreated.error || !byCreated.data) return null
  return byCreated.data as PersonaRow
}

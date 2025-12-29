// =====================================================
// FILE: src/app/api/assessments/metrics/route.ts
// PURPOSE: Assessment Dashboard metrics (firm-scoped + chart-ready)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database, DbTableKey } from '@/types/db'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createRequestLogger } from '@/lib/logging/structured'
import { normalizeAssessmentType } from '@/lib/assessments/routing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_FIRM_ID = process.env.DEFAULT_FIRM_ID || null

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase credentials missing')
  return createSupabaseClient<Database>(url, key)
}

function bucketRiskLevel(level: unknown): 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High' | null {
  if (typeof level === 'string') {
    const raw = level.trim().toLowerCase()
    if (!raw) return null

    // Handle common non-numeric encodings
    if (raw.includes('very low')) return 'Very Low'
    if (raw.includes('very high')) return 'Very High'
    if (raw.includes('medium')) return 'Medium'
    if (raw.includes('low')) return 'Low'
    if (raw.includes('high')) return 'High'

    // Extract first number (e.g. "High (4/10)")
    const match = raw.match(/(\d+(?:\.\d+)?)/)
    if (match) {
      const parsed = Number(match[1])
      if (Number.isFinite(parsed)) {
        const n = parsed
        if (n <= 0) return null
        if (n <= 2) return 'Very Low'
        if (n <= 4) return 'Low'
        if (n <= 6) return 'Medium'
        if (n <= 8) return 'High'
        return 'Very High'
      }
    }
  }

  const n = typeof level === 'number' ? level : typeof level === 'string' ? Number(level) : NaN
  if (!Number.isFinite(n) || n <= 0) return null
  if (n <= 2) return 'Very Low'
  if (n <= 4) return 'Low'
  if (n <= 6) return 'Medium'
  if (n <= 8) return 'High'
  return 'Very High'
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getDob(personalDetails: any): string | null {
  const raw = personalDetails?.dateOfBirth || personalDetails?.date_of_birth || null
  return typeof raw === 'string' && raw.trim() ? raw : null
}

function getClientCity(contactInfo: any): string | null {
  const address = contactInfo?.address
  if (!address) return null

  // Some installs store address as a free-text string; treat as "location" for Top Locations.
  if (typeof address === 'string') {
    const normalized = address.trim()
    return normalized ? normalized : null
  }

  const city = address?.city
  if (typeof city === 'string' && city.trim()) return city.trim()

  const town = address?.town
  if (typeof town === 'string' && town.trim()) return town.trim()

  const county = address?.county
  if (typeof county === 'string' && county.trim()) return county.trim()

  const country = address?.country
  if (typeof country === 'string' && country.trim()) return country.trim()

  return null
}

async function fetchFirmClientIds(
  supabase: ReturnType<typeof createSupabaseClient<Database>>,
  firmId: string
): Promise<string[]> {
  // Single-firm installs historically created clients with `firm_id = null`. We treat those as in-firm.
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .or(`firm_id.eq.${firmId},firm_id.is.null`)
    .limit(10000)

  if (error) throw error
  return (data || []).map((r) => r.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
}

export async function GET(request: NextRequest) {
  const logger = createRequestLogger(request)
  let step = 'init'
  const warnings: string[] = []

  try {
    logger.info('Metrics API request received')
    step = 'auth'

    const authSupabase = await createServerClient()
    const {
      data: { user }
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Best-effort firm scope (single-firm installs will still work if null)
    step = 'resolve_firm'
    let firmId: string | null =
      (user.user_metadata as any)?.firm_id || (user.user_metadata as any)?.firmId || null

    if (!firmId) {
      const { data: profile, error: profileError } = await authSupabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        logger.warn('Could not resolve firm_id from profile', { profileError: profileError.message })
      }
      firmId = profile?.firm_id ?? null
    }

    if (!firmId && DEFAULT_FIRM_ID) {
      firmId = DEFAULT_FIRM_ID
    }

    step = 'create_service_client'
    const supabase = getServiceClient()

    // Get current date for calculations
    const now = new Date()
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const tenMonthsAgo = new Date(now)
    tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // ===== CLIENT COVERAGE METRICS =====
    step = 'count_clients'
    const { count: unscopedClients, error: unscopedClientsError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    if (unscopedClientsError) {
      logger.error('Failed to count clients (unscoped)', unscopedClientsError)
      throw new Error('Failed to fetch client metrics')
    }

    let scopedClients: number | null = null
    if (firmId) {
      // NOTE: In the current single-firm setup we still have legacy clients with `firm_id = null`.
      // We treat those as belonging to the current firm to keep firm-wide dashboards correct.
      // When you migrate to true multi-firm, remove the `.or(...is.null)` clause after data is backfilled.
      const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .or(`firm_id.eq.${firmId},firm_id.is.null`)

      if (error) {
        logger.warn('Failed to count clients (scoped)', { firmId, message: error.message })
      } else {
        scopedClients = typeof count === 'number' ? count : null
      }
    }

    const unscopedCount = typeof unscopedClients === 'number' ? unscopedClients : 0
    let totalClients = typeof scopedClients === 'number' ? scopedClients : unscopedCount

    // Single-firm mode safety: if firm scoping looks obviously wrong, fall back to unscoped.
    // We only do this when the user's firm is the DEFAULT_FIRM_ID (legacy installs).
    if (
      firmId &&
      DEFAULT_FIRM_ID &&
      firmId === DEFAULT_FIRM_ID &&
      typeof scopedClients === 'number' &&
      unscopedCount > 0
    ) {
      const ratio = scopedClients / unscopedCount
      if (scopedClients <= 1 || ratio < 0.6) {
        logger.warn('Firm scoping returned implausible client count; falling back to unscoped metrics', {
          firmId,
          scopedClients,
          unscopedCount,
          ratio
        })
        firmId = null
        totalClients = unscopedCount
      }
    }

    // Resolve client IDs for firm scoping (avoids fragile embedded join filters in PostgREST).
    let firmClientIds: string[] | null = null
    if (firmId) {
      step = 'fetch_firm_client_ids'
      try {
        firmClientIds = await fetchFirmClientIds(supabase, firmId)
      } catch (e: any) {
        logger.warn('Failed to fetch firm client IDs; falling back to unscoped metrics', {
          firmId,
          message: e?.message || String(e)
        })
        firmClientIds = null
        firmId = null
      }
    }

    if (
      firmId &&
      DEFAULT_FIRM_ID &&
      firmId === DEFAULT_FIRM_ID &&
      firmClientIds &&
      firmClientIds.length > 0 &&
      unscopedCount > 0 &&
      firmClientIds.length / unscopedCount < 0.6
    ) {
      logger.warn('Firm client ID list seems incomplete; falling back to unscoped metrics', {
        firmId,
        firmClientIds: firmClientIds.length,
        unscopedCount
      })
      firmClientIds = null
      firmId = null
    }

    const totalClientCount = firmClientIds ? firmClientIds.length : totalClients || 0

    // Pull assessment_progress and de-dupe legacy duplicates
    const MAX_ROWS = 10000

    step = 'load_progress'
    let progressQuery = supabase
      .from('assessment_progress')
      .select(`client_id, assessment_type, status, progress_percentage, completed_at, updated_at`, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .limit(MAX_ROWS)

    if (firmClientIds && firmClientIds.length > 0) progressQuery = progressQuery.in('client_id', firmClientIds)

    const { data: progressRows, error: progressError } = await progressQuery
    if (progressError) {
      logger.error('Failed to fetch assessment_progress', progressError)
      warnings.push(`progress_unavailable:${progressError.message}`)
    }

    // Dedupe by client_id + assessment_type (keep most recent due to ordering)
    const dedupedProgress = new Map<string, any>()
    for (const row of progressRows || []) {
      const normalizedType = normalizeAssessmentType(row.assessment_type)
      const key = `${row.client_id}:${normalizedType}`
      if (!dedupedProgress.has(key)) {
        dedupedProgress.set(key, { ...row, assessment_type: normalizedType })
      }
    }

    const progressData = Array.from(dedupedProgress.values())

    const assessmentTypes = ['atr', 'cfl', 'persona', 'suitability', 'monte_carlo', 'cashflow'] as const

    const coverageSets: Record<
      (typeof assessmentTypes)[number],
      { completed: Set<string>; inProgress: Set<string>; needsReview: Set<string>; notStarted: Set<string> }
    > = {
      atr: { completed: new Set(), inProgress: new Set(), needsReview: new Set(), notStarted: new Set() },
      cfl: { completed: new Set(), inProgress: new Set(), needsReview: new Set(), notStarted: new Set() },
      persona: { completed: new Set(), inProgress: new Set(), needsReview: new Set(), notStarted: new Set() },
      suitability: { completed: new Set(), inProgress: new Set(), needsReview: new Set(), notStarted: new Set() },
      monte_carlo: { completed: new Set(), inProgress: new Set(), needsReview: new Set(), notStarted: new Set() },
      cashflow: { completed: new Set(), inProgress: new Set(), needsReview: new Set(), notStarted: new Set() }
    }

    const assessedClientsSet = new Set<string>()

    // Activity buckets
    let completedLast7Days = 0
    let completedLast30Days = 0

    // Weekly activity trend (last 12 weeks)
    const weeks: Date[] = []
    const startOfWeek = (d: Date) => {
      const copy = new Date(d)
      copy.setHours(0, 0, 0, 0)
      copy.setDate(copy.getDate() - copy.getDay())
      return copy
    }
    const startWeek = startOfWeek(new Date(now.getTime() - 11 * 7 * 24 * 60 * 60 * 1000))
    for (let i = 0; i < 12; i++) {
      const dt = new Date(startWeek)
      dt.setDate(startWeek.getDate() + i * 7)
      weeks.push(dt)
    }
    const weeklyCounts = new Map<string, number>()
    weeks.forEach((w) => weeklyCounts.set(w.toISOString().slice(0, 10), 0))

    for (const row of progressData) {
      const type = normalizeAssessmentType(row.assessment_type)
      if (!assessmentTypes.includes(type as any)) continue

      const pct = typeof row.progress_percentage === 'number' ? row.progress_percentage : 0
      let status = row.status || 'not_started'
      if (pct === 100 && status !== 'completed') status = 'completed'
      if (pct > 0 && pct < 100 && status === 'not_started') status = 'in_progress'

      const clientId = row.client_id
      if (!clientId) continue

      if (status === 'completed') {
        coverageSets[type as keyof typeof coverageSets].completed.add(clientId)
        assessedClientsSet.add(clientId)

        // Activity metrics based on completed_at
        const completedAt = row.completed_at ? new Date(row.completed_at) : null
        if (completedAt && !Number.isNaN(completedAt.getTime())) {
          if (completedAt >= sevenDaysAgo) completedLast7Days++
          if (completedAt >= thirtyDaysAgo) completedLast30Days++

          const wk = startOfWeek(completedAt).toISOString().slice(0, 10)
          if (weeklyCounts.has(wk)) {
            weeklyCounts.set(wk, (weeklyCounts.get(wk) || 0) + 1)
          }
        }
      } else if (status === 'in_progress') {
        coverageSets[type as keyof typeof coverageSets].inProgress.add(clientId)
      } else if (status === 'needs_review') {
        coverageSets[type as keyof typeof coverageSets].needsReview.add(clientId)
      } else {
        coverageSets[type as keyof typeof coverageSets].notStarted.add(clientId)
      }
    }

    const assessedClients = assessedClientsSet.size

    const totalsByStatus = {
      completed: 0,
      inProgress: 0,
      needsReview: 0,
      notStarted: 0,
      possible: totalClientCount * assessmentTypes.length
    }

    for (const t of assessmentTypes) {
      totalsByStatus.completed += coverageSets[t].completed.size
      totalsByStatus.inProgress += coverageSets[t].inProgress.size
      totalsByStatus.needsReview += coverageSets[t].needsReview.size
      // note: notStarted includes missing, calculated later in breakdown; we still compute a conservative raw figure here
      totalsByStatus.notStarted += coverageSets[t].notStarted.size
    }

    const coverageBreakdown = assessmentTypes.map((t) => {
      const completed = coverageSets[t].completed.size
      const inProgress = coverageSets[t].inProgress.size
      const needsReview = coverageSets[t].needsReview.size
      const notStartedFromRows = coverageSets[t].notStarted.size
      const represented = completed + inProgress + needsReview + notStartedFromRows
      const missing = Math.max(0, totalClientCount - represented)
      const notStarted = notStartedFromRows + missing

      return {
        key: t,
        label:
          t === 'atr'
            ? 'Attitude to Risk'
            : t === 'cfl'
              ? 'Capacity for Loss'
              : t === 'persona'
                ? 'Investor Persona'
                : t === 'suitability'
                  ? 'Suitability'
                  : t === 'monte_carlo'
                    ? 'Monte Carlo'
                    : 'Cash Flow',
        completed,
        inProgress,
        needsReview,
        notStarted,
        total: completed + inProgress + needsReview + notStarted
      }
    })

    // Replace the conservative notStarted with the true sum of "missing" computed per-type.
    totalsByStatus.notStarted = coverageBreakdown.reduce((sum, row) => sum + row.notStarted, 0)

    const coverageByType = {
      atr: coverageSets.atr.completed.size,
      cfl: coverageSets.cfl.completed.size,
      persona: coverageSets.persona.completed.size,
      suitability: coverageSets.suitability.completed.size,
      monte_carlo: coverageSets.monte_carlo.completed.size,
      cashflow: coverageSets.cashflow.completed.size
    }

    // ===== RISK DISTRIBUTION (prefer reconciled risk_profiles) =====
    step = 'risk_distribution'
    const riskCounts: Record<'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High', number> = {
      'Very Low': 0,
      'Low': 0,
      'Medium': 0,
      'High': 0,
      'Very High': 0
    }

    let riskQuery = supabase
      .from('risk_profiles')
      .select(`final_risk_level, client_id`)
      .eq('is_current', true)
      .limit(10000)
    if (firmClientIds && firmClientIds.length > 0) riskQuery = riskQuery.in('client_id', firmClientIds)

    const { data: riskProfiles, error: riskProfilesError } = await riskQuery
    if (riskProfilesError) {
      logger.warn('risk_profiles query failed; falling back to atr_assessments', { message: riskProfilesError.message })
    }

    if (riskProfiles && riskProfiles.length > 0) {
      riskProfiles.forEach((row) => {
        const bucket = bucketRiskLevel(row.final_risk_level)
        if (bucket) riskCounts[bucket]++
      })
    } else {
      // Fallback to ATR level if reconciled risk isn't present
      let atrQuery = supabase
        .from('atr_assessments')
        .select(`risk_level, client_id`)
        .eq('is_current', true)
        .limit(10000)
      if (firmClientIds && firmClientIds.length > 0) atrQuery = atrQuery.in('client_id', firmClientIds)

      const { data: atrRows } = await atrQuery
      atrRows?.forEach((row) => {
        const bucket = bucketRiskLevel(row.risk_level)
        if (bucket) riskCounts[bucket]++
      })
    }

    // ===== COMPLIANCE STATUS (client-level, core assessments) =====
    step = 'compliance_status'
    const clientCompliance: Record<string, { overdue: boolean; due: boolean }> = {}

    const complianceTables: Array<{ table: DbTableKey; dateField: string }> = [
      { table: 'atr_assessments', dateField: 'assessment_date' },
      { table: 'cfl_assessments', dateField: 'assessment_date' },
      { table: 'persona_assessments', dateField: 'assessment_date' },
      { table: 'suitability_assessments', dateField: 'assessment_date' }
    ]

    for (const { table, dateField } of complianceTables) {
      let q = supabase
        .from(table as any)
        .select(`client_id, ${dateField}`)
        .eq('is_current', true)
        .not(dateField, 'is', null)
        .limit(10000)

      if (firmClientIds && firmClientIds.length > 0) q = q.in('client_id', firmClientIds)

      const { data, error } = await q
      if (error) {
        warnings.push(`compliance_${String(table)}:${error.message}`)
        continue
      }
      for (const row of data || []) {
        const clientId = (row as any).client_id as string | undefined
        const dateStr = (row as any)[dateField] as string | null | undefined
        if (!clientId || !dateStr) continue

        const dt = new Date(dateStr)
        if (Number.isNaN(dt.getTime())) continue

        const entry = clientCompliance[clientId] || { overdue: false, due: false }
        if (dt < twelveMonthsAgo) entry.overdue = true
        else if (dt <= tenMonthsAgo) entry.due = true
        clientCompliance[clientId] = entry
      }
    }

    let overdueClients = 0
    let dueClients = 0
    let upToDateClients = 0

    for (const entry of Object.values(clientCompliance)) {
      if (entry.overdue) overdueClients++
      else if (entry.due) dueClients++
      else upToDateClients++
    }

    // ===== DEMOGRAPHIC + FINANCIAL INSIGHTS =====
    step = 'demographics_financials'
    let clientsDetailsQuery = supabase
      .from('clients')
      .select('personal_details, contact_info, financial_profile, vulnerability_assessment')
      .limit(10000)
    if (firmClientIds && firmClientIds.length > 0) clientsDetailsQuery = clientsDetailsQuery.in('id', firmClientIds)

    const { data: clientsWithDetails, error: clientsDetailsError } = await clientsDetailsQuery
    if (clientsDetailsError) {
      logger.error('Failed to fetch client details for insights', clientsDetailsError)
      warnings.push(`client_insights_unavailable:${clientsDetailsError.message}`)
    }

    const genderDistribution = {
      male: 0,
      female: 0,
      other: 0,
      notSpecified: clientsDetailsError ? totalClientCount : 0
    }
    const ageGroups = {
      'Under 30': 0,
      '30-40': 0,
      '40-50': 0,
      '50-60': 0,
      '60-70': 0,
      'Over 70': 0
    }
    const locationDistribution: Record<string, number> = {}

    let totalNetWorth = 0
    let totalAnnualIncome = 0
    let clientsWithFinancialData = 0
    let clientsWithNetWorth = 0
    let clientsWithIncome = 0

    const wealthBrackets = {
      'Under £100k': 0,
      '£100k-£250k': 0,
      '£250k-£500k': 0,
      '£500k-£1M': 0,
      'Over £1M': 0
    }

    let vulnerableCount = 0
    const vulnerabilityFactors: Record<string, number> = {}

    for (const client of clientsWithDetails || []) {
      const personalDetails = client.personal_details as Record<string, unknown> | null
      const genderRaw = personalDetails?.gender
      const gender = typeof genderRaw === 'string' ? genderRaw.toLowerCase() : ''
      if (gender === 'male' || gender === 'm') genderDistribution.male++
      else if (gender === 'female' || gender === 'f') genderDistribution.female++
      else if (gender && gender !== 'null') genderDistribution.other++
      else genderDistribution.notSpecified++

      const dob = getDob(personalDetails)
      if (dob) {
        const birthDate = new Date(dob)
        if (!Number.isNaN(birthDate.getTime())) {
          const age = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          if (age < 30) ageGroups['Under 30']++
          else if (age < 40) ageGroups['30-40']++
          else if (age < 50) ageGroups['40-50']++
          else if (age < 60) ageGroups['50-60']++
          else if (age < 70) ageGroups['60-70']++
          else ageGroups['Over 70']++
        }
      }

      const city = getClientCity(client.contact_info)
      if (city) locationDistribution[city] = (locationDistribution[city] || 0) + 1

      const financialProfile = client.financial_profile as Record<string, unknown> | null
      const netWorth =
        parseNumber(financialProfile?.netWorth)
        ?? parseNumber(financialProfile?.net_worth)
        ?? parseNumber(financialProfile?.netWorthValue)
        ?? null

      const annualIncome =
        parseNumber(financialProfile?.annualIncome)
        ?? parseNumber(financialProfile?.annual_income)
        ?? null

      if (netWorth != null && Number.isFinite(netWorth)) {
        totalNetWorth += netWorth
        clientsWithNetWorth++

        if (netWorth < 100000) wealthBrackets['Under £100k']++
        else if (netWorth < 250000) wealthBrackets['£100k-£250k']++
        else if (netWorth < 500000) wealthBrackets['£250k-£500k']++
        else if (netWorth < 1000000) wealthBrackets['£500k-£1M']++
        else wealthBrackets['Over £1M']++
      }

      if (annualIncome != null && Number.isFinite(annualIncome)) {
        totalAnnualIncome += annualIncome
        clientsWithIncome++
      }

      if ((netWorth != null && Number.isFinite(netWorth)) || (annualIncome != null && Number.isFinite(annualIncome))) {
        clientsWithFinancialData++
      }

      const vulnerabilityAssessment = client.vulnerability_assessment as Record<string, unknown> | null
      const isVulnerable =
        (vulnerabilityAssessment?.is_vulnerable as unknown)
        ?? (vulnerabilityAssessment?.isVulnerable as unknown)
        ?? (vulnerabilityAssessment?.hasVulnerability as unknown)
        ?? (vulnerabilityAssessment?.vulnerable as unknown)

      if (isVulnerable === true || isVulnerable === 'true') {
        vulnerableCount++
        const factors = vulnerabilityAssessment?.factors || []
        if (Array.isArray(factors)) {
          for (const factor of factors) {
            if (typeof factor === 'string' && factor.trim()) {
              vulnerabilityFactors[factor] = (vulnerabilityFactors[factor] || 0) + 1
            }
          }
        }
      }
    }

    const topCities = Object.entries(locationDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }))

    const averageNetWorth = clientsWithNetWorth > 0 ? totalNetWorth / clientsWithNetWorth : 0
    const averageAnnualIncome = clientsWithIncome > 0 ? totalAnnualIncome / clientsWithIncome : 0

    // ===== ASSESSMENT COUNTS (for stats cards) =====
    step = 'assessment_counts'
    const countCurrent = async (table: DbTableKey) => {
      let q = supabase
        .from(table as any)
        .select(`id`, { count: 'exact', head: true })
        .eq('is_current', true)
      if (firmClientIds && firmClientIds.length > 0) q = q.in('client_id', firmClientIds)
      const { count, error } = await q
      if (error) warnings.push(`count_${String(table)}:${error.message}`)
      return count || 0
    }

    const [atrCount, cflCount, personaCount, suitabilityCount] = await Promise.all([
      countCurrent('atr_assessments'),
      countCurrent('cfl_assessments'),
      countCurrent('persona_assessments'),
      countCurrent('suitability_assessments')
    ])

    // Monte Carlo count (results table, join to clients)
    step = 'monte_carlo_count'
    let monteCarloQuery = supabase
      .from('monte_carlo_results')
      .select(`client_id`, { count: 'exact', head: true })
      .not('client_id', 'is', null)
    if (firmClientIds && firmClientIds.length > 0) monteCarloQuery = monteCarloQuery.in('client_id', firmClientIds)
    const { count: monteCarloCount, error: monteCarloError } = await monteCarloQuery
    if (monteCarloError) warnings.push(`count_monte_carlo_results:${monteCarloError.message}`)

    // ===== VERSION STATS =====
    step = 'version_stats'
    let versionsQuery = supabase
      .from('atr_assessments')
      .select(`version, client_id`)
      .order('version', { ascending: false })
      .limit(2000)
    if (firmClientIds && firmClientIds.length > 0) versionsQuery = versionsQuery.in('client_id', firmClientIds)
    const { data: atrVersions, error: versionsError } = await versionsQuery
    if (versionsError) warnings.push(`version_stats:${versionsError.message}`)

    const maxATRVersion = atrVersions?.[0]?.version || 0
    const averageVersions = atrVersions?.length
      ? atrVersions.reduce((sum, v) => sum + (v.version || 1), 0) / atrVersions.length
      : 0

    const activityTrend = weeks.map((weekStart) => {
      const key = weekStart.toISOString().slice(0, 10)
      return {
        weekStart: key,
        label: weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        completed: weeklyCounts.get(key) || 0
      }
    })

    const metrics = {
      clientCoverage: {
        assessed: assessedClients,
        total: totalClientCount,
        percentage: totalClientCount ? Math.round((assessedClients / totalClientCount) * 100) : 0,
        byType: coverageByType,
        breakdown: coverageBreakdown
      },

      complianceStatus: {
        needReview: dueClients,
        upToDate: upToDateClients,
        overdue: overdueClients
      },

      riskDistribution: riskCounts,

      activityMetrics: {
        last7Days: completedLast7Days,
        last30Days: completedLast30Days,
        averagePerMonth: Math.round(completedLast30Days)
      },

      activityTrend,

      demographics: {
        gender: genderDistribution,
        ageGroups,
        topCities,
        vulnerableClients: {
          count: vulnerableCount,
          percentage: totalClientCount ? Math.round((vulnerableCount / totalClientCount) * 100) : 0,
          topFactors: Object.entries(vulnerabilityFactors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([factor, count]) => ({ factor, count }))
        }
      },

      financialInsights: {
        averageNetWorth: Math.round(averageNetWorth),
        averageAnnualIncome: Math.round(averageAnnualIncome),
        wealthDistribution: wealthBrackets,
        clientsWithFinancialData,
        clientsWithNetWorth,
        clientsWithIncome
      },

      assessmentStats: {
        byType: {
          atr: atrCount,
          cfl: cflCount,
          persona: personaCount,
          suitability: suitabilityCount,
          monte_carlo: monteCarloCount || 0,
          cashflow: coverageByType.cashflow
        },
        totalAssessments: atrCount + cflCount + personaCount + suitabilityCount,
        completedTotal: totalsByStatus.completed,
        inProgressTotal: totalsByStatus.inProgress,
        needsReviewTotal: totalsByStatus.needsReview,
        notStartedTotal: totalsByStatus.notStarted,
        totalPossible: totalsByStatus.possible,
        completionRate: totalsByStatus.possible
          ? Math.round((totalsByStatus.completed / totalsByStatus.possible) * 100)
          : 0,
        averageVersions: Math.round(averageVersions * 10) / 10,
        maxVersionReached: maxATRVersion
      },

      summary: {
        totalClients: totalClientCount,
        assessedClients,
        overdueReviews: overdueClients,
        recentActivity: completedLast7Days,
        femaleClients: genderDistribution.female,
        maleClients: genderDistribution.male,
        over60Clients: ageGroups['60-70'] + ageGroups['Over 70'],
        highRiskClients: riskCounts['High'] + riskCounts['Very High'],
        vulnerableClients: vulnerableCount,
        clientsWithData: clientsWithFinancialData
      }
    }

    logger.info('Metrics compiled successfully', {
      firmId: firmId || 'unscoped',
      totalClients,
      assessedClients,
      overdueClients,
      dueClients
    })

    return NextResponse.json({
      success: true,
      metrics,
      warnings: warnings.length > 0 ? warnings : undefined,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Metrics API error', { step, error })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        step,
        ...(process.env.NODE_ENV !== 'production'
          ? { stack: error instanceof Error ? error.stack : undefined }
          : {})
      },
      { status: 500 }
    )
  }
}

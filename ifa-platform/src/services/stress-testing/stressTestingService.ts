import type { SupabaseClient } from '@supabase/supabase-js'
import { clientService } from '@/services/ClientService'
import type { Client } from '@/types/client'
import type { StressTestResult } from '@/types/stress-testing'
import type { StressTestClientMetrics } from '@/components/stress-testing/StressTestDrillDownModal'
import type {
  StressCoverageClientIds,
  StressTestingDashboardData,
  StressTestingDashboardStats
} from '@/lib/stress-testing/types'
import {
  RESILIENCE_BUCKETS,
  SCENARIO_CATEGORY_COLORS,
  SCENARIO_CATEGORY_LOOKUP,
  SEVERITY_LEVELS,
  STRESS_SCENARIOS
} from '@/components/stress-testing/constants'
import { mapStoredStressResults } from '@/lib/stress-testing/mappers'

const emptyDashboardStats: StressTestingDashboardStats = {
  totalClients: 0,
  testedClients: 0,
  totalTestsRun: 0,
  averageResilienceScore: 0,
  highRiskClients: 0,
  reportsGenerated: 0
}

const emptyCoverageIds: StressCoverageClientIds = {
  scenarios: [],
  tested: [],
  reports: [],
  highRisk: [],
  retestDue: []
}

export const loadStressTestingDashboardData = async (
  supabase: SupabaseClient,
  activeClients: Client[]
): Promise<StressTestingDashboardData> => {
  if (activeClients.length === 0) {
    return {
      dashboardStats: emptyDashboardStats,
      stressMetricsByClient: {},
      coverageClientIds: emptyCoverageIds,
      resilienceDistribution: [],
      severityMix: [],
      scenarioMix: [],
      testsOverTime: [],
      coverageSeries: []
    }
  }

  const clientIds = activeClients.map((client) => client.id)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)

  const normalizeToken = (value?: string | null) =>
    (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

  const isStressTestDocument = (record: Record<string, any>) => {
    const fields = [
      record.document_type,
      record.type,
      record.category,
      record.name,
      record.file_name,
      record.description,
      record.title,
      record.template_id
    ]
    return fields.some((field) => {
      const token = normalizeToken(field)
      return token.includes('stresstest') || token.includes('stress')
    })
  }

  const [latestResultsResponse, testsCountResponse, stressRunsResponse, scenariosResponse] = await Promise.all([
    supabase
      .from('latest_stress_test_results')
      .select('client_id, overall_resilience_score, max_shortfall_risk, severity_level, scenarios_selected, test_date, created_at')
      .in('client_id', clientIds),
    supabase
      .from('stress_test_results')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clientIds),
    supabase
      .from('stress_test_results')
      .select('client_id, test_date, created_at, severity_level')
      .in('client_id', clientIds)
      .gte('created_at', twelveMonthsAgo.toISOString()),
    supabase
      .from('cash_flow_scenarios')
      .select('client_id')
      .in('client_id', clientIds)
  ])

  let latestResults = latestResultsResponse.data || []
  if (latestResultsResponse.error) {
    console.error('Error loading latest stress test results:', latestResultsResponse.error)
    latestResults = []
  }

  let stressRuns = stressRunsResponse.data || []
  if (stressRunsResponse.error) {
    console.error('Error loading stress test runs:', stressRunsResponse.error)
    stressRuns = []
  }

  let scenarios = scenariosResponse.data || []
  if (scenariosResponse.error) {
    console.error('Error loading cash flow scenarios:', scenariosResponse.error)
    scenarios = []
  }

  const documents = await fetchDocumentsForClients(
    supabase,
    'documents',
    'client_id, document_type, category, type, name, file_name, description',
    clientIds
  )
  const generatedDocs = await fetchDocumentsForClients(
    supabase,
    'generated_documents',
    'client_id, title, template_id, file_path',
    clientIds
  )

  const scenarioClientIds = Array.from(
    new Set(scenarios.map((row: any) => row.client_id).filter(Boolean))
  ) as string[]

  const reportClientIds = Array.from(
    new Set(
      [
        ...documents.filter(isStressTestDocument).map((row: any) => row.client_id),
        ...generatedDocs.filter(isStressTestDocument).map((row: any) => row.client_id)
      ].filter(Boolean)
    )
  ) as string[]

  if (latestResults.length === 0 && (testsCountResponse.count ?? 0) > 0) {
    const { data: fallbackResults, error: fallbackError } = await supabase
      .from('stress_test_results')
      .select('client_id, overall_resilience_score, max_shortfall_risk, severity_level, scenarios_selected, test_date, created_at')
      .in('client_id', clientIds)

    if (fallbackError) {
      console.error('Error loading fallback stress test results:', fallbackError)
    } else if (fallbackResults && fallbackResults.length > 0) {
      const latestByClient: Record<string, any> = {}
      fallbackResults.forEach((row: any) => {
        if (!row.client_id) return
        const rowDate = new Date(row.test_date || row.created_at || 0).getTime()
        const current = latestByClient[row.client_id]
        const currentDate = current
          ? new Date(current.test_date || current.created_at || 0).getTime()
          : -1
        if (!current || rowDate > currentDate) {
          latestByClient[row.client_id] = row
        }
      })
      latestResults = Object.values(latestByClient)
    }
  }

  const testedClientIds = Array.from(
    new Set(latestResults.map((row: any) => row.client_id).filter(Boolean))
  ) as string[]

  const metricsByClient: Record<string, StressTestClientMetrics> = {}
  const highRiskIds = new Set<string>()
  const retestDueIds = new Set<string>()
  const categoryCounts = new Map<string, number>()
  const severityCounts = new Map<string, number>()

  let resilienceSum = 0
  let resilienceCount = 0

  const retestThreshold = new Date()
  retestThreshold.setFullYear(retestThreshold.getFullYear() - 1)

  latestResults.forEach((result: any) => {
    if (!result.client_id) return
    const resilienceScore = result.overall_resilience_score ?? null
    const shortfallRisk = result.max_shortfall_risk ?? null
    const testDate = result.test_date || result.created_at || null
    const severityLevel = (result.severity_level || 'moderate').toLowerCase()
    const scenariosSelected = Array.isArray(result.scenarios_selected) ? result.scenarios_selected : []
    const categorySet = new Set<string>()

    scenariosSelected.forEach((scenarioId: string) => {
      const category = SCENARIO_CATEGORY_LOOKUP.get(scenarioId) || 'Other'
      categorySet.add(category)
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    })

    severityCounts.set(severityLevel, (severityCounts.get(severityLevel) || 0) + 1)

    metricsByClient[result.client_id] = {
      resilienceScore,
      shortfallRisk,
      testDate,
      severity: severityLevel,
      scenarioCount: scenariosSelected.length,
      categories: Array.from(categorySet)
    }

    if (resilienceScore !== null && resilienceScore !== undefined) {
      resilienceSum += resilienceScore
      resilienceCount += 1
    }

    if ((resilienceScore ?? 100) < 50 || (shortfallRisk ?? 0) >= 50) {
      highRiskIds.add(result.client_id)
    }

    if (testDate) {
      const testDateValue = new Date(testDate)
      if (!Number.isNaN(testDateValue.getTime()) && testDateValue < retestThreshold) {
        retestDueIds.add(result.client_id)
      }
    }
  })

  const resilienceDistribution = RESILIENCE_BUCKETS.map((bucket) => {
    const count = Object.values(metricsByClient).reduce((sum, metrics) => {
      const score = metrics.resilienceScore ?? null
      if (score === null) return sum
      if (score >= bucket.min && score <= bucket.max) return sum + 1
      return sum
    }, 0)
    return { key: bucket.key, label: bucket.label, count, color: bucket.color }
  })

  const severityMix = SEVERITY_LEVELS.map((level) => ({
    key: level.key,
    label: level.label,
    count: severityCounts.get(level.value) || 0,
    color: level.color
  }))

  const scenarioMix = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      key: `category:${category}`,
      label: category,
      count,
      color: SCENARIO_CATEGORY_COLORS[category] || SCENARIO_CATEGORY_COLORS.Other
    }))
    .sort((a, b) => b.count - a.count)

  const monthlySeries = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + index, 1)
    const label = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    const key = `${date.getFullYear()}-${date.getMonth()}`
    return { key, label, count: 0 }
  })

  stressRuns.forEach((run: any) => {
    const dateValue = run.test_date || run.created_at
    if (!dateValue) return
    const parsed = new Date(dateValue)
    if (Number.isNaN(parsed.getTime())) return
    const key = `${parsed.getFullYear()}-${parsed.getMonth()}`
    const entry = monthlySeries.find((item) => item.key === key)
    if (entry) {
      entry.count += 1
    }
  })

  const totalClients = activeClients.length
  const testsRun = testsCountResponse.error
    ? stressRuns.length
    : testsCountResponse.count ?? stressRuns.length
  const averageResilienceScore = resilienceCount > 0 ? resilienceSum / resilienceCount : 0

  const coverageSeries = [
    {
      key: 'coverage_total',
      label: 'Clients',
      count: totalClients,
      percent: totalClients > 0 ? Math.round((totalClients / totalClients) * 100) : 0,
      color: '#60a5fa'
    },
    {
      key: 'coverage_scenarios',
      label: 'Scenarios',
      count: scenarioClientIds.length,
      percent: totalClients > 0 ? Math.round((scenarioClientIds.length / totalClients) * 100) : 0,
      color: '#34d399'
    },
    {
      key: 'coverage_tests',
      label: 'Stress Tests',
      count: testedClientIds.length,
      percent: totalClients > 0 ? Math.round((testedClientIds.length / totalClients) * 100) : 0,
      color: '#f97316'
    },
    {
      key: 'coverage_reports',
      label: 'Reports',
      count: reportClientIds.length,
      percent: totalClients > 0 ? Math.round((reportClientIds.length / totalClients) * 100) : 0,
      color: '#a78bfa'
    }
  ]

  const dashboardStats: StressTestingDashboardStats = {
    totalClients,
    testedClients: testedClientIds.length,
    totalTestsRun: testsRun,
    averageResilienceScore,
    highRiskClients: highRiskIds.size,
    reportsGenerated: reportClientIds.length
  }

  return {
    dashboardStats,
    stressMetricsByClient: metricsByClient,
    coverageClientIds: {
      scenarios: scenarioClientIds,
      tested: testedClientIds,
      reports: reportClientIds,
      highRisk: Array.from(highRiskIds),
      retestDue: Array.from(retestDueIds)
    },
    resilienceDistribution,
    severityMix,
    scenarioMix,
    testsOverTime: monthlySeries.map(({ label, count }) => ({ label, count })),
    coverageSeries
  }
}

export const loadStressTestingClientData = async (
  supabase: SupabaseClient,
  clientIdToLoad: string
): Promise<{
  client: Client
  monteCarloSuccessRate: number | null
  results: StressTestResult[]
  selectedScenarios: string[] | null
}> => {
  const client = await clientService.getClientById(clientIdToLoad)

  const { data: mcResults } = await supabase
    .from('monte_carlo_results')
    .select('success_probability')
    .eq('scenario_id', clientIdToLoad)
    .order('created_at', { ascending: false })
    .limit(1)

  const monteCarloSuccessRate = mcResults?.[0]?.success_probability ?? null

  const { data: latestStressResult, error: stressError } = await supabase
    .from('stress_test_results')
    .select('results_json, scenarios_selected, test_date, created_at')
    .eq('client_id', clientIdToLoad)
    .order('test_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (stressError) {
    console.error('Error loading stress test results:', stressError)
  }

  const storedResults = Array.isArray(latestStressResult?.results_json)
    ? latestStressResult?.results_json
    : []
  const results = mapStoredStressResults(storedResults)

  const selectedScenarios = Array.isArray(latestStressResult?.scenarios_selected)
    ? latestStressResult?.scenarios_selected
    : []

  return {
    client,
    monteCarloSuccessRate,
    results,
    selectedScenarios: selectedScenarios.length ? selectedScenarios : null
  }
}

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const fetchDocumentsForClients = async (
  supabase: SupabaseClient,
  table: 'documents' | 'generated_documents',
  selectFields: string,
  ids: string[]
) => {
  if (ids.length === 0) return []
  const chunks = chunkArray(ids, 50)
  const responses = await Promise.all(
    chunks.map((chunk) => supabase.from(table).select(selectFields).in('client_id', chunk))
  )

  const data: Record<string, any>[] = []
  responses.forEach((response) => {
    if (response.error) {
      console.error(`Error fetching ${table}:`, response.error)
      return
    }
    if (response.data) {
      data.push(...response.data)
    }
  })

  return data
}

import type { StressTestClientMetrics } from '@/components/stress-testing/StressTestDrillDownModal'

export interface StressTestingDashboardStats {
  totalClients: number
  testedClients: number
  totalTestsRun: number
  averageResilienceScore: number
  highRiskClients: number
  reportsGenerated: number
}

export interface StressCoverageClientIds {
  scenarios: string[]
  tested: string[]
  reports: string[]
  highRisk: string[]
  retestDue: string[]
}

export interface StressDistributionItem {
  key: string
  label: string
  count: number
  color: string
}

export interface StressCoverageSeriesItem extends StressDistributionItem {
  percent: number
}

export interface TestsOverTimeItem {
  label: string
  count: number
}

export interface StressTestingDashboardData {
  dashboardStats: StressTestingDashboardStats
  stressMetricsByClient: Record<string, StressTestClientMetrics>
  coverageClientIds: StressCoverageClientIds
  resilienceDistribution: StressDistributionItem[]
  severityMix: StressDistributionItem[]
  scenarioMix: StressDistributionItem[]
  testsOverTime: TestsOverTimeItem[]
  coverageSeries: StressCoverageSeriesItem[]
}

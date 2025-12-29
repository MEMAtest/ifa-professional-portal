'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clientService } from '@/services/ClientService';
import type { Client } from '@/types/client';
import type { StressTestClientMetrics } from '@/components/stress-testing/StressTestDrillDownModal';
import type {
  StressCoverageClientIds,
  StressCoverageSeriesItem,
  StressDistributionItem,
  StressTestingDashboardData,
  StressTestingDashboardStats,
  TestsOverTimeItem
} from '@/lib/stress-testing/types';
import { loadStressTestingDashboardData } from '@/services/stress-testing/stressTestingService';

const emptyDashboardStats: StressTestingDashboardStats = {
  totalClients: 0,
  testedClients: 0,
  totalTestsRun: 0,
  averageResilienceScore: 0,
  highRiskClients: 0,
  reportsGenerated: 0
};

const emptyCoverageIds: StressCoverageClientIds = {
  scenarios: [],
  tested: [],
  reports: [],
  highRisk: [],
  retestDue: []
};

type StressTestingDashboardState = {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  dashboardStats: StressTestingDashboardStats;
  stressMetricsByClient: Record<string, StressTestClientMetrics>;
  coverageClientIds: StressCoverageClientIds;
  resilienceDistribution: StressDistributionItem[];
  severityMix: StressDistributionItem[];
  scenarioMix: StressDistributionItem[];
  testsOverTime: TestsOverTimeItem[];
  coverageSeries: StressCoverageSeriesItem[];
};

type StressTestingDashboardHook = StressTestingDashboardState & {
  refreshDashboard: (clientsOverride?: Client[]) => Promise<void>;
  setError: (value: string | null) => void;
};

export const useStressTestingDashboardData = (
  supabase: SupabaseClient
): StressTestingDashboardHook => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<StressTestingDashboardStats>(emptyDashboardStats);
  const [stressMetricsByClient, setStressMetricsByClient] = useState<Record<string, StressTestClientMetrics>>({});
  const [coverageClientIds, setCoverageClientIds] = useState<StressCoverageClientIds>(emptyCoverageIds);
  const [resilienceDistribution, setResilienceDistribution] = useState<StressDistributionItem[]>([]);
  const [severityMix, setSeverityMix] = useState<StressDistributionItem[]>([]);
  const [scenarioMix, setScenarioMix] = useState<StressDistributionItem[]>([]);
  const [testsOverTime, setTestsOverTime] = useState<TestsOverTimeItem[]>([]);
  const [coverageSeries, setCoverageSeries] = useState<StressCoverageSeriesItem[]>([]);

  const applyDashboardData = useCallback((data: StressTestingDashboardData) => {
    setDashboardStats(data.dashboardStats);
    setStressMetricsByClient(data.stressMetricsByClient);
    setCoverageClientIds(data.coverageClientIds);
    setResilienceDistribution(data.resilienceDistribution);
    setSeverityMix(data.severityMix);
    setScenarioMix(data.scenarioMix);
    setTestsOverTime(data.testsOverTime);
    setCoverageSeries(data.coverageSeries);
  }, []);

  const refreshDashboard = useCallback(
    async (clientsOverride?: Client[]) => {
      const targetClients = clientsOverride ?? clients;
      const dashboardData = await loadStressTestingDashboardData(supabase, targetClients);
      applyDashboardData(dashboardData);
    },
    [applyDashboardData, clients, supabase]
  );

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const clientsResponse = await clientService.getAllClients({ status: ['active'] }, 1, 100);
      setClients(clientsResponse.clients);

      await refreshDashboard(clientsResponse.clients);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [refreshDashboard]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    clients,
    isLoading,
    error,
    dashboardStats,
    stressMetricsByClient,
    coverageClientIds,
    resilienceDistribution,
    severityMix,
    scenarioMix,
    testsOverTime,
    coverageSeries,
    refreshDashboard,
    setError
  };
};

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clientService } from '@/services/ClientService';
import type { Client } from '@/types/client';
import clientLogger from '@/lib/logging/clientLogger'
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

// Combined dashboard data state to prevent render thrashing
type DashboardDataState = {
  dashboardStats: StressTestingDashboardStats;
  stressMetricsByClient: Record<string, StressTestClientMetrics>;
  coverageClientIds: StressCoverageClientIds;
  resilienceDistribution: StressDistributionItem[];
  severityMix: StressDistributionItem[];
  scenarioMix: StressDistributionItem[];
  testsOverTime: TestsOverTimeItem[];
  coverageSeries: StressCoverageSeriesItem[];
};

const initialDashboardData: DashboardDataState = {
  dashboardStats: emptyDashboardStats,
  stressMetricsByClient: {},
  coverageClientIds: emptyCoverageIds,
  resilienceDistribution: [],
  severityMix: [],
  scenarioMix: [],
  testsOverTime: [],
  coverageSeries: []
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

  // Combined state to prevent render thrashing - single setState call updates all dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardDataState>(initialDashboardData);

  // Apply all dashboard data in a single state update to prevent multiple re-renders
  const applyDashboardData = useCallback((data: StressTestingDashboardData) => {
    setDashboardData({
      dashboardStats: data.dashboardStats,
      stressMetricsByClient: data.stressMetricsByClient,
      coverageClientIds: data.coverageClientIds,
      resilienceDistribution: data.resilienceDistribution,
      severityMix: data.severityMix,
      scenarioMix: data.scenarioMix,
      testsOverTime: data.testsOverTime,
      coverageSeries: data.coverageSeries
    });
  }, []);

  // Use ref for clients to avoid dependency cycle in refreshDashboard
  const clientsRef = useRef<Client[]>([]);
  clientsRef.current = clients; // Direct assignment more efficient than useEffect

  const refreshDashboard = useCallback(
    async (clientsOverride?: Client[]) => {
      const targetClients = clientsOverride ?? clientsRef.current;
      const loadedData = await loadStressTestingDashboardData(supabase, targetClients);
      applyDashboardData(loadedData);
    },
    [applyDashboardData, supabase]
  );

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const clientsResponse = await clientService.getAllClients({ status: ['active'] }, 1, 100);
      setClients(clientsResponse.clients);

      await refreshDashboard(clientsResponse.clients);
    } catch (err) {
      clientLogger.error('Error loading initial data:', err);
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
    dashboardStats: dashboardData.dashboardStats,
    stressMetricsByClient: dashboardData.stressMetricsByClient,
    coverageClientIds: dashboardData.coverageClientIds,
    resilienceDistribution: dashboardData.resilienceDistribution,
    severityMix: dashboardData.severityMix,
    scenarioMix: dashboardData.scenarioMix,
    testsOverTime: dashboardData.testsOverTime,
    coverageSeries: dashboardData.coverageSeries,
    refreshDashboard,
    setError
  };
};

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clientService } from '@/services/ClientService';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { CashFlowScenarioService } from '@/services/CashFlowScenarioService';
import { AssessmentService } from '@/services/AssessmentService';
import type { CashflowCoverageClientIds } from '@/services/cashflow/cashflowCoverageService';
import { fetchCashflowCoverageData } from '@/services/cashflow/cashflowCoverageService';
import type { Client, ClientListResponse } from '@/types/client';
import type { CashFlowScenario } from '@/types/cashflow';

type CashFlowTrackingState = {
  isTracking: boolean;
  lastTrackedScenarioId?: string;
};

type UseCashFlowPageDataArgs = {
  supabase: SupabaseClient;
  clientId: string | null;
  linkScenario?: (scenarioId: string) => Promise<unknown>;
  toast: (args: { title?: string; description?: string; variant?: 'default' | 'destructive'; duration?: number }) => unknown;
};

type UseCashFlowPageDataResult = {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  clients: Client[];
  scenarios: CashFlowScenario[];
  isLoading: boolean;
  error: string | null;
  isCreatingScenario: boolean;
  coverageLoaded: boolean;
  coverageClientIds: CashflowCoverageClientIds;
  scenarioRetirementAges: Record<string, number>;
  trackingState: CashFlowTrackingState;
  setTrackingState: (state: CashFlowTrackingState) => void;
  trackCashFlowProgress: (scenario: CashFlowScenario, clientOverride?: Client | null) => Promise<void>;
  refreshCoverage: (clientList: Client[]) => Promise<void>;
  reloadData: () => Promise<void>;
};

export const useCashFlowPageData = ({
  supabase,
  clientId,
  linkScenario,
  toast
}: UseCashFlowPageDataArgs): UseCashFlowPageDataResult => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [scenarios, setScenarios] = useState<CashFlowScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [coverageLoaded, setCoverageLoaded] = useState(false);
  const [coverageClientIds, setCoverageClientIds] = useState<CashflowCoverageClientIds>({
    assessed: [],
    scenarios: [],
    reports: []
  });
  const [scenarioRetirementAges, setScenarioRetirementAges] = useState<Record<string, number>>({});
  const [trackingState, setTrackingState] = useState<CashFlowTrackingState>({
    isTracking: false
  });

  const refreshCoverage = useCallback(
    async (clientList: Client[]) => {
      const clientIds = clientList.map((client) => client.id);

      try {
        const { coverageClientIds: coverageData, scenarioRetirementAges: retirementAges } =
          await fetchCashflowCoverageData(supabase, clientIds);
        setCoverageClientIds(coverageData);
        setScenarioRetirementAges(retirementAges);
      } catch (coverageError) {
        console.warn('Coverage data lookup failed:', coverageError);
        setCoverageClientIds({ assessed: [], scenarios: [], reports: [] });
        setScenarioRetirementAges({});
      } finally {
        setCoverageLoaded(true);
      }
    },
    [supabase]
  );

  const trackCashFlowProgress = useCallback(
    async (scenario: CashFlowScenario, clientOverride?: Client | null) => {
      const targetClient = clientOverride ?? selectedClient;
      if (!targetClient) return;

      try {
        setTrackingState({ isTracking: true, lastTrackedScenarioId: scenario.id });

        const { count } = await (supabase as any)
          .from('cash_flow_scenarios')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', targetClient.id);

        const scenarioCount = count || 1;

        await AssessmentService.updateProgress(targetClient.id, {
          assessmentType: 'cashFlow',
          status: 'completed',
          progressPercentage: 100,
          metadata: {
            lastUpdate: new Date().toISOString(),
            scenarioCount,
            lastScenarioName: scenario.scenarioName || 'Cash Flow Scenario',
            scenarioType: scenario.scenarioType || 'standard',
            projectionYears: scenario.projectionYears || 30
          }
        });

        await AssessmentService.logHistory(targetClient.id, {
          assessmentType: 'cashFlow',
          action: 'scenario_created',
          changes: {
            scenarioName: scenario.scenarioName,
            type: scenario.scenarioType || 'standard',
            projectionYears: scenario.projectionYears || 30
          }
        });

        toast({
          title: 'Progress Updated',
          description: 'Cash flow assessment has been recorded',
          variant: 'default',
          duration: 2000
        });
      } catch (trackError) {
        console.error('Failed to track cash flow progress:', trackError);
      } finally {
        setTrackingState((prev) => ({ ...prev, isTracking: false }));
      }
    },
    [selectedClient, supabase, toast]
  );

  const createDefaultScenario = useCallback(
    async (client: Client) => {
      try {
        setIsCreatingScenario(true);

        const defaultScenario = await CashFlowScenarioService.ensureClientHasScenario(client.id);

        if (linkScenario) {
          await linkScenario(defaultScenario.id);
        }

        await trackCashFlowProgress(defaultScenario as unknown as CashFlowScenario, client);

        const updatedScenarios = await CashFlowDataService.getScenariosForClient(client.id);
        setScenarios(updatedScenarios);

        toast({
          title: 'Default Scenario Created',
          description: 'A base case scenario has been created for this client',
          variant: 'default'
        });
      } catch (createError) {
        console.error('Error creating default scenario:', createError);
        toast({
          title: 'Error',
          description: 'Failed to create default scenario',
          variant: 'destructive'
        });
      } finally {
        setIsCreatingScenario(false);
      }
    },
    [linkScenario, toast, trackCashFlowProgress]
  );

  const loadClientAndScenarios = useCallback(
    async (clientIdToLoad: string) => {
      try {
        const client = await clientService.getClientById(clientIdToLoad);
        setSelectedClient(client);

        const clientScenarios = await CashFlowDataService.getScenariosForClient(clientIdToLoad);
        setScenarios(clientScenarios);

        if (clientScenarios.length === 0) {
          await createDefaultScenario(client);
        }
      } catch (loadError) {
        console.error('Error loading client and scenarios:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load client data');
      }
    },
    [createDefaultScenario]
  );

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const clientsResponse: ClientListResponse = await clientService.getAllClients(
        { status: ['active'] },
        1,
        100
      );
      setClients(clientsResponse.clients);
      await refreshCoverage(clientsResponse.clients);

      if (clientId) {
        await loadClientAndScenarios(clientId);
      }
    } catch (initialError) {
      console.error('Error loading initial data:', initialError);
      setError(initialError instanceof Error ? initialError.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, loadClientAndScenarios, refreshCoverage]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (clientId) {
      loadClientAndScenarios(clientId);
    }
  }, [clientId, loadClientAndScenarios]);

  return {
    selectedClient,
    setSelectedClient,
    clients,
    scenarios,
    isLoading,
    error,
    isCreatingScenario,
    coverageLoaded,
    coverageClientIds,
    scenarioRetirementAges,
    trackingState,
    setTrackingState,
    trackCashFlowProgress,
    refreshCoverage,
    reloadData: loadInitialData
  };
};

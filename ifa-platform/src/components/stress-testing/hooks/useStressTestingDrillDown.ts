'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Client } from '@/types/client';
import type { StressCoverageClientIds } from '@/lib/stress-testing/types';
import type { StressTestClientMetrics } from '@/components/stress-testing/StressTestDrillDownModal';

type UseStressTestingDrillDownArgs = {
  clients: Client[];
  coverageClientIds: StressCoverageClientIds;
  stressMetricsByClient: Record<string, StressTestClientMetrics>;
};

type DrillDownState = {
  isDrillDownOpen: boolean;
  setIsDrillDownOpen: (value: boolean) => void;
  drillDownKey: string;
  drillDownTitle: string;
  drillDownDescription?: string;
  openDrillDown: (key: string, title: string, description?: string) => void;
  getInteractiveRowProps: (key: string, title: string, description?: string) => {
    className: string;
    onClick: () => void;
  };
  drillDownClients: Client[];
  reportMissingIds: string[];
};

export const useStressTestingDrillDown = ({
  clients,
  coverageClientIds,
  stressMetricsByClient
}: UseStressTestingDrillDownArgs): DrillDownState => {
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [drillDownKey, setDrillDownKey] = useState('all');
  const [drillDownTitle, setDrillDownTitle] = useState('All Clients');
  const [drillDownDescription, setDrillDownDescription] = useState<string | undefined>(undefined);

  const reportMissingIds = useMemo(() => {
    const reportSet = new Set(coverageClientIds.reports);
    return coverageClientIds.tested.filter((id) => !reportSet.has(id));
  }, [coverageClientIds.reports, coverageClientIds.tested]);

  const openDrillDown = useCallback((key: string, title: string, description?: string) => {
    setDrillDownKey(key);
    setDrillDownTitle(title);
    setDrillDownDescription(description);
    setIsDrillDownOpen(true);
  }, []);

  const getInteractiveRowProps = useCallback(
    (key: string, title: string, description?: string) => ({
      className: 'flex items-start justify-between rounded-lg p-2 hover:bg-gray-50 cursor-pointer transition-colors',
      onClick: () => openDrillDown(key, title, description)
    }),
    [openDrillDown]
  );

  const drillDownClients = useMemo(() => {
    if (clients.length === 0) return [];

    const testedSet = new Set(coverageClientIds.tested);
    const scenarioSet = new Set(coverageClientIds.scenarios);
    const reportSet = new Set(coverageClientIds.reports);
    const highRiskSet = new Set(coverageClientIds.highRisk);
    const retestDueSet = new Set(coverageClientIds.retestDue);

    const filterByResilience = (min: number, max: number) =>
      clients.filter((client) => {
        const score = stressMetricsByClient[client.id]?.resilienceScore;
        if (score === null || score === undefined) return false;
        return score >= min && score <= max;
      });

    if (drillDownKey.startsWith('category:')) {
      const category = drillDownKey.replace('category:', '');
      return clients.filter((client) =>
        stressMetricsByClient[client.id]?.categories?.includes(category)
      );
    }

    switch (drillDownKey) {
      case 'tested':
      case 'coverage_tests':
        return clients.filter((client) => testedSet.has(client.id));
      case 'untested':
        return clients.filter((client) => !testedSet.has(client.id));
      case 'coverage_scenarios':
        return clients.filter((client) => scenarioSet.has(client.id));
      case 'coverage_reports':
        return clients.filter((client) => reportSet.has(client.id));
      case 'high_risk':
        return clients.filter((client) => highRiskSet.has(client.id));
      case 'retest_due':
        return clients.filter((client) => retestDueSet.has(client.id));
      case 'report_missing':
        return clients.filter((client) => reportMissingIds.includes(client.id));
      case 'severity_mild':
        return clients.filter((client) => stressMetricsByClient[client.id]?.severity === 'mild');
      case 'severity_moderate':
        return clients.filter((client) => stressMetricsByClient[client.id]?.severity === 'moderate');
      case 'severity_severe':
        return clients.filter((client) => stressMetricsByClient[client.id]?.severity === 'severe');
      case 'resilience_0_39':
        return filterByResilience(0, 39);
      case 'resilience_40_59':
        return filterByResilience(40, 59);
      case 'resilience_60_79':
        return filterByResilience(60, 79);
      case 'resilience_80_100':
        return filterByResilience(80, 100);
      case 'coverage_total':
      default:
        return clients;
    }
  }, [clients, coverageClientIds, drillDownKey, reportMissingIds, stressMetricsByClient]);

  return {
    isDrillDownOpen,
    setIsDrillDownOpen,
    drillDownKey,
    drillDownTitle,
    drillDownDescription,
    openDrillDown,
    getInteractiveRowProps,
    drillDownClients,
    reportMissingIds
  };
};

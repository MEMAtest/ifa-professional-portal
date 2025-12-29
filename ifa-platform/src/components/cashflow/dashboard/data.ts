import type { Client } from '@/types/client';
import type {
  ClientFilterKey,
  CommandCenterStats,
  CoverageSeriesEntry,
  RiskMixEntry,
  RetirementDistributionEntry,
  AumSeriesPoint
} from '@/components/cashflow/dashboard/types';
import { RETIREMENT_BUCKETS, RISK_MIX_COLORS } from '@/components/cashflow/dashboard/constants';
import { getClientRetirementAge, getRetirementBucketKey } from '@/components/cashflow/dashboard/utils';

export interface CoverageSets {
  assessed: Set<string>;
  scenarios: Set<string>;
  reports: Set<string>;
}

export interface CoverageClientIds {
  assessed: string[];
  scenarios: string[];
  reports: string[];
}

export const createCoverageSets = (coverageClientIds: CoverageClientIds): CoverageSets => ({
  assessed: new Set(coverageClientIds.assessed),
  scenarios: new Set(coverageClientIds.scenarios),
  reports: new Set(coverageClientIds.reports)
});

export const hasAssessmentForClient = (
  client: Client,
  coverageLoaded: boolean,
  coverageSets: CoverageSets
): boolean => {
  if (coverageLoaded) {
    return coverageSets.assessed.has(client.id);
  }

  const riskProfile = client.riskProfile;
  const hasHistory = (riskProfile?.assessmentHistory?.length || 0) > 0;
  const hasId = Boolean((riskProfile as { lastAssessmentId?: string } | undefined)?.lastAssessmentId);
  const hasQuestionnaire =
    riskProfile?.questionnaire && Object.keys(riskProfile.questionnaire).length > 0;
  const hasTolerance = Boolean(riskProfile?.riskTolerance);

  return hasHistory || hasId || hasQuestionnaire || hasTolerance;
};

export const hasScenarioForClient = (
  client: Client,
  coverageLoaded: boolean,
  coverageSets: CoverageSets
): boolean => {
  if (coverageLoaded) {
    return coverageSets.scenarios.has(client.id);
  }
  return Boolean(client.financialProfile?.linkedScenarioId);
};

export const hasDocumentsForClient = (
  client: Client,
  coverageLoaded: boolean,
  coverageSets: CoverageSets
): boolean => {
  if (coverageLoaded) {
    return coverageSets.reports.has(client.id);
  }
  return false;
};

export const buildRiskStats = (clients: Client[]) => {
  const stats = {
    conservative: 0,
    moderate: 0,
    growth: 0,
    aggressive: 0,
    unrated: 0
  };

  clients.forEach((client) => {
    const risk = client.riskProfile?.riskTolerance?.toLowerCase() || '';
    if (!risk) {
      stats.unrated += 1;
      return;
    }
    if (risk.includes('conservative')) {
      stats.conservative += 1;
      return;
    }
    if (risk.includes('moderate') || risk.includes('balanced')) {
      stats.moderate += 1;
      return;
    }
    if (risk.includes('growth')) {
      stats.growth += 1;
      return;
    }
    if (risk.includes('aggressive') || risk.includes('high')) {
      stats.aggressive += 1;
      return;
    }
    stats.unrated += 1;
  });

  return stats;
};

export const buildCommandCenterStats = (
  clients: Client[],
  riskStats: ReturnType<typeof buildRiskStats>,
  hasAssessment: (client: Client) => boolean,
  hasScenario: (client: Client) => boolean
): CommandCenterStats => {
  const totalClients = clients.length;
  const activeClients = clients.filter((client) => client.status === 'active').length;
  const reviewDue = clients.filter((client) => client.status === 'review_due').length;
  const totalAum = clients.reduce(
    (sum, client) => sum + (client.financialProfile?.netWorth || 0),
    0
  );
  const totalIncome = clients.reduce(
    (sum, client) => sum + (client.financialProfile?.annualIncome || 0),
    0
  );
  const avgIncome = totalClients > 0 ? totalIncome / totalClients : 0;
  const missingAssessments = clients.filter((client) => !hasAssessment(client)).length;
  const missingPlans = clients.filter((client) => !hasScenario(client)).length;
  const highRisk = riskStats.aggressive + riskStats.growth;

  return {
    totalClients,
    activeClients,
    reviewDue,
    totalAum,
    avgIncome,
    missingAssessments,
    missingPlans,
    highRisk
  };
};

export const buildRiskMix = (riskStats: ReturnType<typeof buildRiskStats>): RiskMixEntry[] => {
  return [
    { label: 'Conservative', count: riskStats.conservative, color: RISK_MIX_COLORS.conservative },
    { label: 'Moderate', count: riskStats.moderate, color: RISK_MIX_COLORS.moderate },
    { label: 'Growth', count: riskStats.growth, color: RISK_MIX_COLORS.growth },
    { label: 'Aggressive', count: riskStats.aggressive, color: RISK_MIX_COLORS.aggressive },
    { label: 'Unrated', count: riskStats.unrated, color: RISK_MIX_COLORS.unrated }
  ].filter((entry) => entry.count > 0);
};

export const buildRetirementDistribution = (
  clients: Client[],
  scenarioRetirementAges: Record<string, number>
): RetirementDistributionEntry[] => {
  const bucketCounts = RETIREMENT_BUCKETS.map((bucket) => ({
    key: bucket.key as ClientFilterKey,
    label: bucket.label,
    count: 0,
    color: bucket.color
  }));

  clients.forEach((client) => {
    const age = getClientRetirementAge(client, scenarioRetirementAges);
    if (age === null || !Number.isFinite(age)) {
      return;
    }
    const bucketIndex = RETIREMENT_BUCKETS.findIndex(
      (bucket) => age >= bucket.min && age <= bucket.max
    );
    if (bucketIndex >= 0) {
      bucketCounts[bucketIndex].count += 1;
    }
  });

  return bucketCounts.filter((entry) => entry.count > 0);
};

export const buildCoverageSeries = (
  clients: Client[],
  coverageLoaded: boolean,
  coverageSets: CoverageSets,
  hasAssessment: (client: Client) => boolean,
  hasScenario: (client: Client) => boolean,
  hasDocument: (client: Client) => boolean
): CoverageSeriesEntry[] => {
  const total = clients.length;
  const assessed = coverageLoaded
    ? coverageSets.assessed.size
    : clients.filter((client) => hasAssessment(client)).length;
  const planned = coverageLoaded
    ? coverageSets.scenarios.size
    : clients.filter((client) => hasScenario(client)).length;
  const reported = coverageLoaded
    ? coverageSets.reports.size
    : clients.filter((client) => hasDocument(client)).length;

  const toPercent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return [
    { key: 'all' as ClientFilterKey, label: 'Clients', count: total, percent: 100, color: '#1d4ed8' },
    { key: 'assessed' as ClientFilterKey, label: 'Assessed', count: assessed, percent: toPercent(assessed), color: '#2563eb' },
    { key: 'scenario_built' as ClientFilterKey, label: 'Scenario', count: planned, percent: toPercent(planned), color: '#3b82f6' },
    { key: 'report_generated' as ClientFilterKey, label: 'Reports', count: reported, percent: toPercent(reported), color: '#60a5fa' }
  ];
};

export const buildAumSeries = (clients: Client[]): AumSeriesPoint[] => {
  const validClients = clients
    .map((client) => ({
      createdAt: new Date(client.createdAt || client.updatedAt || ''),
      netWorth: client.financialProfile?.netWorth || 0
    }))
    .filter((entry) => !Number.isNaN(entry.createdAt.getTime()))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (validClients.length === 0) return [];

  const points = Math.min(8, validClients.length);
  const step = Math.max(1, Math.floor(validClients.length / points));
  let cumulativeAum = 0;
  let cumulativeClients = 0;
  const series: AumSeriesPoint[] = [];

  validClients.forEach((entry, index) => {
    cumulativeAum += entry.netWorth;
    cumulativeClients += 1;

    if (index % step === 0 || index === validClients.length - 1) {
      series.push({
        month: entry.createdAt.toLocaleString('en-GB', { month: 'short', year: '2-digit' }),
        aum: cumulativeAum,
        clients: cumulativeClients
      });
    }
  });

  return series;
};

export const filterClientsByKey = (options: {
  clients: Client[];
  filter: ClientFilterKey;
  scenarioRetirementAges: Record<string, number>;
  hasAssessment: (client: Client) => boolean;
  hasScenario: (client: Client) => boolean;
  hasDocument: (client: Client) => boolean;
}): Client[] => {
  const { clients, filter, scenarioRetirementAges, hasAssessment, hasScenario, hasDocument } = options;

  if (filter === 'all') {
    return clients;
  }

  const sortByValue = (valueGetter: (client: Client) => number) => {
    return [...clients].sort((a, b) => valueGetter(b) - valueGetter(a));
  };

  const getRiskLabel = (client: Client) => (client.riskProfile?.riskTolerance || '').toLowerCase();

  switch (filter) {
    case 'active':
      return clients.filter((client) => client.status === 'active');
    case 'review_due':
      return clients.filter((client) => client.status === 'review_due');
    case 'missing_assessment':
      return clients.filter((client) => !hasAssessment(client));
    case 'missing_plan':
      return clients.filter((client) => !hasScenario(client));
    case 'high_risk':
      return clients.filter((client) => {
        const risk = getRiskLabel(client);
        return risk.includes('aggressive') || risk.includes('high') || risk.includes('growth');
      });
    case 'risk_conservative':
      return clients.filter((client) => getRiskLabel(client).includes('conservative'));
    case 'risk_moderate':
      return clients.filter((client) => {
        const risk = getRiskLabel(client);
        return risk.includes('moderate') || risk.includes('balanced');
      });
    case 'risk_growth':
      return clients.filter((client) => getRiskLabel(client).includes('growth'));
    case 'risk_aggressive':
      return clients.filter((client) => {
        const risk = getRiskLabel(client);
        return risk.includes('aggressive') || risk.includes('high');
      });
    case 'risk_unrated':
      return clients.filter((client) => !client.riskProfile?.riskTolerance);
    case 'top_aum':
      return sortByValue((client) => client.financialProfile?.netWorth || 0).slice(0, 10);
    case 'top_income':
      return sortByValue((client) => client.financialProfile?.annualIncome || 0).slice(0, 10);
    case 'assessed':
      return clients.filter((client) => hasAssessment(client));
    case 'scenario_built':
      return clients.filter((client) => hasScenario(client));
    case 'report_generated':
      return clients.filter((client) => hasDocument(client));
    case 'retirement_50_54':
    case 'retirement_55_59':
    case 'retirement_60_64':
    case 'retirement_65_69':
    case 'retirement_70_74':
    case 'retirement_75_plus':
      return clients.filter(
        (client) =>
          getRetirementBucketKey(
            getClientRetirementAge(client, scenarioRetirementAges),
            RETIREMENT_BUCKETS
          ) === filter
      );
    default:
      return clients;
  }
};

import type { Client } from '@/types/client';
import type { ScenarioWithResult } from '@/components/monte-carlo/types';

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '£0';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Unknown date';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

export const getClientAge = (client: Client): number => {
  if (client.personalDetails?.dateOfBirth) {
    const dob = new Date(client.personalDetails.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    return age;
  }
  return 45; // fallback only if no DOB
};

export const getClientInitials = (client: Client): string => {
  const firstName = client.personalDetails?.firstName || '';
  const lastName = client.personalDetails?.lastName || '';
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'XX';
};

export const generateAllocationFromRiskScore = (riskScore: number) => {
  const equityPercent = Math.min(90, Math.max(20, riskScore * 8 + 10));
  const bondPercent = 100 - equityPercent - 10;
  const cashPercent = 10;

  return [
    { name: 'Equities', value: equityPercent, color: '#3B82F6', description: 'UK & Global Stocks' },
    { name: 'Bonds', value: bondPercent, color: '#10B981', description: 'Government & Corporate Bonds' },
    { name: 'Cash', value: cashPercent, color: '#6B7280', description: 'Cash & Money Market' }
  ];
};

export const generateLongevityData = (scenario: ScenarioWithResult, currentAge: number) => {
  const baseSuccess = scenario.success_probability || 70;
  const medianWealth = scenario.median_final_wealth || 500000;
  const p10Wealth = scenario.confidence_intervals?.p10 || medianWealth * 0.5;

  return [85, 90, 95, 100].map((targetAge) => {
    const yearsFromNow = targetAge - currentAge;
    const adjustedSuccess = Math.max(0, baseSuccess - (yearsFromNow - 20) * 2);
    return {
      targetAge,
      yearsFromNow,
      successProbability: adjustedSuccess,
      medianWealth: medianWealth * (1 - yearsFromNow * 0.02),
      p10Wealth: p10Wealth * (1 - yearsFromNow * 0.03)
    };
  });
};

export const generateWealthValues = (scenario: ScenarioWithResult, count: number = 100) => {
  const ci = scenario.confidence_intervals || { p10: 100000, p50: 300000, p90: 500000 };
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    const random = Math.random();
    let value: number;
    if (random < 0.1) {
      value = ci.p10 * (0.5 + Math.random());
    } else if (random < 0.5) {
      value = ci.p10 + (ci.p50 - ci.p10) * ((random - 0.1) / 0.4);
    } else if (random < 0.9) {
      value = ci.p50 + (ci.p90 - ci.p50) * ((random - 0.5) / 0.4);
    } else {
      value = ci.p90 * (1 + Math.random() * 0.5);
    }
    values.push(value);
  }
  return values;
};

export const generateFanChartData = (scenario: ScenarioWithResult) => {
  const timeHorizon = scenario.time_horizon || 25;
  const initialWealth = scenario.initial_wealth || 500000;
  const ci = scenario.confidence_intervals || { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };

  const data = [];
  for (let year = 0; year <= timeHorizon; year++) {
    const progress = year / timeHorizon;
    const decayFactor = Math.exp(-0.02 * year);
    const growthFactor = 1 + 0.05 * year * decayFactor;

    data.push({
      year,
      p10: Math.max(0, initialWealth * (1 - progress * 0.8) * growthFactor + (ci.p10 || 0) * progress),
      p25: Math.max(0, initialWealth * (1 - progress * 0.4) * growthFactor + (ci.p25 || 0) * progress),
      p50: Math.max(0, initialWealth * (1 - progress * 0.1) * growthFactor + (ci.p50 || 0) * progress),
      p75: initialWealth * (1 + progress * 0.3) * growthFactor + (ci.p75 || 0) * progress * 0.5,
      p90: initialWealth * (1 + progress * 0.6) * growthFactor + (ci.p90 || 0) * progress * 0.5
    });
  }
  return data;
};

export const filterClients = (options: {
  clients: Client[];
  searchTerm: string;
  statFilter: string;
}): Client[] => {
  const { clients, searchTerm, statFilter } = options;
  return clients.filter((client) => {
    const fullName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.toLowerCase();
    const email = client.contactInfo?.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search) || email.includes(search) || client.clientRef.toLowerCase().includes(search);

    if (statFilter === 'all') return matchesSearch;
    return matchesSearch;
  });
};

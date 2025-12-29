import { formatCurrency as formatCurrencyValue } from '@/lib/utils';
import type { Client } from '@/types/client';
import type { ClientFilterKey, RetirementBucket } from './types';

export function formatCurrency(amount: number): string {
  return formatCurrencyValue(amount, 'GBP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export function formatCompactCurrency(amount: number): string {
  return formatCurrencyValue(amount || 0, 'GBP', {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });
}

export function getClientRetirementAge(
  client: Client,
  scenarioRetirementAges: Record<string, number>
): number | null {
  const personalDetails = client.personalDetails as {
    retirementAge?: number;
    target_retirement_age?: number;
    targetRetirementAge?: number;
  };
  const directAge =
    personalDetails?.retirementAge ??
    personalDetails?.target_retirement_age ??
    personalDetails?.targetRetirementAge;
  if (Number.isFinite(directAge)) {
    return Number(directAge);
  }

  const financialProfile = client.financialProfile as {
    target_retirement_age?: number;
    targetRetirementAge?: number;
    retirementAge?: number;
  };
  const targetAge =
    financialProfile?.target_retirement_age ??
    financialProfile?.targetRetirementAge ??
    financialProfile?.retirementAge;
  if (Number.isFinite(targetAge)) {
    return Number(targetAge);
  }

  const pensionAge = client.financialProfile?.pensionArrangements
    ?.map((arrangement) => arrangement.expectedRetirementAge)
    .find((age) => Number.isFinite(age));

  if (Number.isFinite(pensionAge)) {
    return Number(pensionAge);
  }

  const scenarioAge = scenarioRetirementAges[client.id];
  if (Number.isFinite(scenarioAge)) {
    return Number(scenarioAge);
  }

  return null;
}

export function getRetirementBucketKey(
  age: number | null,
  retirementBuckets: RetirementBucket[]
): ClientFilterKey | null {
  if (!Number.isFinite(age)) {
    return null;
  }

  const bucket = retirementBuckets.find(
    (entry) => Number(age) >= entry.min && Number(age) <= entry.max
  );
  return bucket?.key ?? null;
}

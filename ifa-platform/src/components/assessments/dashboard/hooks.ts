import { useCallback, useEffect, useState } from 'react';
import type { DashboardMetrics, IncompleteAssessment } from '@/components/assessments/dashboard/types';
import clientLogger from '@/lib/logging/clientLogger'

interface UseAssessmentDashboardState {
  metrics: DashboardMetrics | null;
  incompleteAssessments: IncompleteAssessment[];
  incompleteTotalCount: number;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date;
  refresh: () => void;
}

const fetchIncompleteAssessments = async () => {
  try {
    const response = await fetch('/api/assessments/incomplete?limit=20');
    if (!response.ok) {
      return { items: [], totalCount: 0 };
    }

    const data = await response.json();
    if (!data?.success || !Array.isArray(data.assessments)) {
      return { items: [], totalCount: 0 };
    }

    return {
      items: data.assessments as IncompleteAssessment[],
      totalCount: typeof data.count === 'number' ? data.count : data.assessments.length
    };
  } catch (error) {
    clientLogger.error('Error fetching incomplete assessments:', error);
    return { items: [], totalCount: 0 };
  }
};

const fetchMetrics = async () => {
  const response = await fetch('/api/assessments/metrics');
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  const data = contentType.includes('application/json') ? JSON.parse(raw || '{}') : null;

  if (!response.ok) {
    const message =
      data && (data.message || data.error)
        ? `${String(data.message || data.error)}${data.step ? ` (step: ${String(data.step)})` : ''}`
        : raw
          ? raw.slice(0, 180).replace(/\s+/g, ' ')
          : 'Failed to fetch metrics';
    throw new Error(message);
  }

  if (data?.success && data.metrics) {
    return data.metrics as DashboardMetrics;
  }

  throw new Error(data?.error ? String(data.error) : 'Invalid response format');
};

export const useAssessmentDashboard = (): UseAssessmentDashboardState => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [incompleteAssessments, setIncompleteAssessments] = useState<IncompleteAssessment[]>([]);
  const [incompleteTotalCount, setIncompleteTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const metricsData = await fetchMetrics();
      setMetrics(metricsData);
      setLastRefresh(new Date());
    } catch (err) {
      clientLogger.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadIncompleteAssessments = useCallback(async () => {
    const { items, totalCount } = await fetchIncompleteAssessments();
    setIncompleteAssessments(items);
    setIncompleteTotalCount(totalCount);
  }, []);

  const refresh = useCallback(() => {
    loadMetrics();
    loadIncompleteAssessments();
  }, [loadIncompleteAssessments, loadMetrics]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    metrics,
    incompleteAssessments,
    incompleteTotalCount,
    isLoading,
    error,
    lastRefresh,
    refresh
  };
};

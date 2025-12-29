import type { CashFlowProjection, ProjectionResult } from '@/types/cashflow';

export const formatKeyInsights = (insights: string[], locale?: string): string => {
  if (!Array.isArray(insights)) return '';
  return insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('');
};

export const calculateAnnualPerformance = (
  projections: CashFlowProjection[],
  summary: ProjectionResult['summary']
): number => {
  if (projections.length > 1) {
    const startValue = projections[0].totalAssets || 0;
    const endValue = projections[1].totalAssets || 0;
    if (startValue > 0) {
      return ((endValue - startValue) / startValue) * 100;
    }
  }
  return summary.averageAnnualReturn || 0;
};

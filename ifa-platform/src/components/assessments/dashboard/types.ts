export interface DashboardMetrics {
  clientCoverage: {
    assessed: number;
    total: number;
    percentage: number;
    byType: {
      atr: number;
      cfl: number;
      persona: number;
      suitability: number;
      monte_carlo: number;
      cashflow: number;
    };
    breakdown?: Array<{
      key: string;
      label: string;
      completed: number;
      inProgress: number;
      needsReview: number;
      notStarted: number;
      total: number;
    }>;
  };
  complianceStatus: {
    needReview: number;
    upToDate: number;
    overdue: number;
  };
  riskDistribution: {
    'Very Low': number;
    'Low': number;
    'Medium': number;
    'High': number;
    'Very High': number;
  };
  activityMetrics: {
    last7Days: number;
    last30Days: number;
    averagePerMonth: number;
  };
  activityTrend?: Array<{ weekStart: string; label: string; completed: number }>;
  demographics: {
    gender: {
      male: number;
      female: number;
      other: number;
      notSpecified: number;
    };
    ageGroups: {
      'Under 30': number;
      '30-40': number;
      '40-50': number;
      '50-60': number;
      '60-70': number;
      'Over 70': number;
    };
    topCities: Array<{ city: string; count: number }>;
    vulnerableClients: {
      count: number;
      percentage: number;
      topFactors: Array<{ factor: string; count: number }>;
    };
  };
  financialInsights: {
    averageNetWorth: number;
    averageAnnualIncome: number;
    wealthDistribution: {
      'Under £100k': number;
      '£100k-£250k': number;
      '£250k-£500k': number;
      '£500k-£1M': number;
      'Over £1M': number;
    };
    clientsWithFinancialData: number;
    clientsWithNetWorth: number;
    clientsWithIncome: number;
  };
  assessmentStats: {
    byType: {
      atr: number;
      cfl: number;
      persona: number;
      suitability: number;
      monte_carlo: number;
      cashflow: number;
    };
    totalAssessments: number;
    completedTotal: number;
    inProgressTotal: number;
    needsReviewTotal: number;
    notStartedTotal: number;
    totalPossible: number;
    completionRate: number;
    averageVersions: number;
    maxVersionReached: number;
  };
  summary: {
    totalClients: number;
    assessedClients: number;
    overdueReviews: number;
    recentActivity: number;
    femaleClients: number;
    maleClients: number;
    over60Clients: number;
    highRiskClients: number;
    vulnerableClients: number;
    clientsWithData: number;
  };
}

export interface IncompleteAssessment {
  id: string;
  client_id: string;
  client_name: string;
  client_ref?: string | null;
  assessment_type: string;
  progress_percentage: number;
  status: string;
  last_updated: string;
}

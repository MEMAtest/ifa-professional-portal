export interface DashboardStats {
  totalClients: number;
  totalAUM: number;
  assessmentsDue: number;
  complianceScore: number;
  recentActivity: ActivityItem[];
  weeklyStats: WeeklyStats;
  thisWeek: {
    clientsOnboarded: number;
    assessmentsCompleted: number;
    documentsGenerated: number;
    monteCarloRuns: number;
  };
  clientDistribution: {
    riskProfile: Array<{ name: string; value: number; color: string }>;
    ageGroups: Array<{ range: string; count: number }>;
    portfolioSizes: Array<{ range: string; count: number; color: string }>;
    regionDistribution: Array<{
      region: string;
      count: number;
      aum: number;
      color: string;
      clients: Array<{ id: string; name: string; aum: number }>;
    }>;
  };
  performance: {
    aumGrowth: Array<{ month: string; aum: number; clients: number }>;
    complianceHistory: Array<{ month: string; score: number }>;
  };
  upcomingEvents: Array<{
    id: string;
    type: 'meeting' | 'review' | 'deadline';
    clientName: string;
    clientId?: string;
    description: string;
    date: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface WeeklyStats {
  clientsChart: ChartDataPoint[];
  assessmentsChart: ChartDataPoint[];
  documentsChart: ChartDataPoint[];
  monteCarloChart: ChartDataPoint[];
}

export interface ChartDataPoint {
  day: string;
  value: number;
  date: string;
}

export interface ActivityItem {
  id: string;
  type:
    | 'client_added'
    | 'assessment_completed'
    | 'document_signed'
    | 'review_due'
    | 'monte_carlo_run'
    | 'profile_update';
  clientName: string;
  clientId?: string;
  description: string;
  timestamp: string;
}

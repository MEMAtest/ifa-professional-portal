// ================================================================
// src/components/monte-carlo/DashboardStats.tsx
// Dashboard Statistics Cards for Monte Carlo Home View
// Shows aggregated metrics like total simulations, clients analyzed, etc.
// Now with drill-down functionality - click any card to see details
// ================================================================

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import clientLogger from '@/lib/logging/clientLogger'
import {
  Activity,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  ChevronRight
} from 'lucide-react';

// Stat type for drill-down identification
export type StatType =
  | 'total_simulations'
  | 'clients_analyzed'
  | 'avg_success_rate'
  | 'last_assessment'
  | 'this_month'
  | 'scenarios_created'
  | 'high_risk'
  | 'safe_scenarios'
  | 'avg_time_horizon';

// Data passed when a stat card is clicked
export interface StatClickData {
  statType: StatType;
  title: string;
  count: number;
  scenarios: ScenarioRow[];
  results: ResultRow[];
  clients: { id: string; name: string }[];
  clientNames?: Map<string, string>;
}

// Database row types
interface ScenarioRow {
  id: string;
  client_id: string;
  scenario_name?: string;
  time_horizon: number;
  initial_portfolio?: number;
  annual_withdrawal?: number;
  created_at?: string;
}

interface ResultRow {
  id?: string;
  scenario_id: string;
  success_probability: number;
  created_at: string;
  simulation_count: number;
}

interface DashboardStatsData {
  totalSimulations: number;
  totalClients: number;
  averageSuccessRate: number;
  lastAssessmentDate: string | null;
  assessmentsThisMonth: number;
  highRiskClients: number;
  lowRiskClients: number;
  averageTimeHorizon: number;
  totalScenariosCreated: number;
}

interface DashboardStatsProps {
  clientId?: string; // If provided, filter to this client only
  onStatClick?: (data: StatClickData) => void; // Callback when stat card is clicked
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ clientId, onStatClick }) => {
  const [stats, setStats] = useState<DashboardStatsData>({
    totalSimulations: 0,
    totalClients: 0,
    averageSuccessRate: 0,
    lastAssessmentDate: null,
    assessmentsThisMonth: 0,
    highRiskClients: 0,
    lowRiskClients: 0,
    averageTimeHorizon: 0,
    totalScenariosCreated: 0
  });
  const [loading, setLoading] = useState(true);

  // Store raw data for drill-down
  const [rawScenarios, setRawScenarios] = useState<ScenarioRow[]>([]);
  const [rawResults, setRawResults] = useState<ResultRow[]>([]);
  const [clientNames, setClientNames] = useState<Map<string, string>>(new Map());

  const supabase = useMemo(() => createClient(), []);

  // Helper to handle stat card clicks
  const handleStatClick = (statType: StatType, title: string, count: number) => {
    if (!onStatClick) return;

    // Build the clients array from unique client IDs
    const uniqueClientIds = new Set(rawScenarios.map(s => s.client_id));
    const clients = Array.from(uniqueClientIds).map(id => ({
      id,
      name: clientNames.get(id) || 'Unknown Client'
    }));

    onStatClick({
      statType,
      title,
      count,
      scenarios: rawScenarios,
      results: rawResults,
      clients,
      clientNames
    });
  };

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // Build queries based on whether we have a clientId
      let scenariosQuery = supabase.from('monte_carlo_scenarios').select('*', { count: 'exact' });

      if (clientId) {
        scenariosQuery = scenariosQuery.eq('client_id', clientId);
      }

      // Get scenarios
      const { data: scenarios, count: scenarioCount, error: scenariosError } = await scenariosQuery;

      if (scenariosError) {
        clientLogger.error('Error loading scenarios:', scenariosError);
      }

      // Get scenario IDs to filter results
      const scenarioIds = scenarios?.map((s: any) => s.id) || [];

      // Get results for these scenarios (simpler query without joins)
      let resultsQuery = supabase.from('monte_carlo_results').select('*');
      if (scenarioIds.length > 0) {
        resultsQuery = resultsQuery.in('scenario_id', scenarioIds);
      }

      const { data: results, error: resultsError } = await resultsQuery;

      if (resultsError) {
        clientLogger.error('Error loading results:', resultsError);
      }

      // Get unique clients with simulations
      const uniqueClientIds = new Set(scenarios?.map((s: any) => s.client_id) || []);

      // Fetch client names for drill-down display
      const clientNamesMap = new Map<string, string>();
      if (uniqueClientIds.size > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, personal_details')
          .in('id', Array.from(uniqueClientIds));

        if (clientsData) {
          clientsData.forEach((c: any) => {
            const pd = c.personal_details || {};
            const name = `${pd.firstName || ''} ${pd.lastName || ''}`.trim() || 'Unknown';
            clientNamesMap.set(c.id, name);
          });
        }
      }
      setClientNames(clientNamesMap);

      // Store raw data for drill-down
      setRawScenarios(scenarios || []);
      setRawResults(results || []);

      // Calculate average success rate
      const successRates = results?.map((r: any) => r.success_probability) || [];
      const avgSuccessRate = successRates.length > 0
        ? successRates.reduce((a: number, b: number) => a + b, 0) / successRates.length
        : 0;

      // Get last assessment date
      const lastAssessment = results?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // Count assessments this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const assessmentsThisMonth = results?.filter((r: any) =>
        new Date(r.created_at) >= monthStart
      ).length || 0;

      // Count high/low risk (based on success probability)
      const highRisk = results?.filter((r: any) => r.success_probability < 50).length || 0;
      const lowRisk = results?.filter((r: any) => r.success_probability >= 85).length || 0;

      // Calculate average time horizon
      const timeHorizons = scenarios?.map((s: any) => s.time_horizon) || [];
      const avgTimeHorizon = timeHorizons.length > 0
        ? timeHorizons.reduce((a: number, b: number) => a + b, 0) / timeHorizons.length
        : 25;

      // Total simulations (sum of simulation_count from results)
      const totalSimulations = results?.reduce((sum: number, r: any) => sum + (r.simulation_count || 5000), 0) || 0;

      setStats({
        totalSimulations,
        totalClients: uniqueClientIds.size,
        averageSuccessRate: avgSuccessRate,
        lastAssessmentDate: lastAssessment?.created_at || null,
        assessmentsThisMonth,
        highRiskClients: highRisk,
        lowRiskClients: lowRisk,
        averageTimeHorizon: avgTimeHorizon,
        totalScenariosCreated: scenarioCount || 0
      });
    } catch (error) {
      clientLogger.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, supabase]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Reusable stat card component for consistent styling
  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    statType,
    count,
    subtitle
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'indigo' | 'cyan';
    statType: StatType;
    count: number;
    subtitle?: string;
  }) => {
    const colorClasses = {
      blue: { bg: 'bg-white', iconBg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-gray-200', value: 'text-gray-900' },
      green: { bg: 'bg-white', iconBg: 'bg-green-100', icon: 'text-green-600', border: 'border-gray-200', value: 'text-green-600' },
      purple: { bg: 'bg-white', iconBg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-gray-200', value: 'text-gray-900' },
      amber: { bg: 'bg-white', iconBg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-gray-200', value: 'text-amber-600' },
      red: { bg: 'bg-white', iconBg: 'bg-red-100', icon: 'text-red-600', border: 'border-gray-200', value: 'text-red-600' },
      indigo: { bg: 'bg-white', iconBg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-gray-200', value: 'text-gray-900' },
      cyan: { bg: 'bg-white', iconBg: 'bg-cyan-100', icon: 'text-cyan-600', border: 'border-gray-200', value: 'text-gray-900' },
    };
    const c = colorClasses[color];

    return (
      <div
        className={`${c.bg} rounded-xl border ${c.border} p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 group`}
        onClick={() => handleStatClick(statType, title, count)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${c.value}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`${c.iconBg} p-2.5 rounded-lg`}>
            <Icon className={`h-5 w-5 ${c.icon}`} />
          </div>
        </div>
        <div className="flex items-center mt-3 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Click to view details</span>
          <ChevronRight className="h-3 w-3 ml-1" />
        </div>
      </div>
    );
  };

  // Get success rate color
  const getSuccessColor = () => {
    if (stats.averageSuccessRate >= 75) return 'green';
    if (stats.averageSuccessRate >= 50) return 'amber';
    return 'red';
  };

  return (
    <div className="space-y-3">
      {/* Primary Stats Row - Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Simulations"
          value={formatNumber(stats.totalSimulations)}
          icon={Activity}
          color="blue"
          statType="total_simulations"
          count={stats.totalSimulations}
        />
        <StatCard
          title="Clients Analyzed"
          value={stats.totalClients}
          icon={Users}
          color="green"
          statType="clients_analyzed"
          count={stats.totalClients}
        />
        <StatCard
          title="Avg Success Rate"
          value={`${stats.averageSuccessRate.toFixed(1)}%`}
          icon={TrendingUp}
          color={getSuccessColor()}
          statType="avg_success_rate"
          count={stats.averageSuccessRate}
        />
        <StatCard
          title="Last Assessment"
          value={formatDate(stats.lastAssessmentDate)}
          icon={Calendar}
          color="purple"
          statType="last_assessment"
          count={1}
        />
      </div>

      {/* Secondary Stats Row - Activity & Risk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="This Month"
          value={`${stats.assessmentsThisMonth} assessments`}
          icon={BarChart3}
          color="indigo"
          statType="this_month"
          count={stats.assessmentsThisMonth}
        />
        <StatCard
          title="Scenarios Created"
          value={stats.totalScenariosCreated}
          icon={Target}
          color="cyan"
          statType="scenarios_created"
          count={stats.totalScenariosCreated}
        />
        <StatCard
          title="High Risk"
          value={`${stats.highRiskClients} scenarios`}
          icon={AlertTriangle}
          color="red"
          statType="high_risk"
          count={stats.highRiskClients}
          subtitle="<50% success rate"
        />
        <StatCard
          title="Safe (85%+)"
          value={`${stats.lowRiskClients} scenarios`}
          icon={CheckCircle}
          color="green"
          statType="safe_scenarios"
          count={stats.lowRiskClients}
          subtitle="High confidence"
        />
      </div>

      {/* Average Time Horizon - Full Width */}
      <div
        className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200 group"
        onClick={() => handleStatClick('avg_time_horizon', 'Average Planning Horizon', stats.averageTimeHorizon)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Average Planning Horizon</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {stats.averageTimeHorizon.toFixed(0)} years
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Based on {stats.totalScenariosCreated} scenarios</p>
            <div className="flex items-center mt-1 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
              <span>Click to view details</span>
              <ChevronRight className="h-3 w-3 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;

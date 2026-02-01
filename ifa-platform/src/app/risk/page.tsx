// src/app/risk/page.tsx
// Risk Center Dashboard - Comprehensive risk monitoring and analytics

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { clientService } from '@/services/ClientService';
import { createClient } from '@/lib/supabase/client';
import { WorkflowBoard, WORKFLOW_CONFIGS } from '@/components/compliance/workflow';
import type { WorkflowItem } from '@/components/compliance/workflow';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Users,
  Search,
  Filter,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw,
  Clock as ClockIcon,
  X,
  User,
  Calendar,
  Target,
  TrendingDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import type { Client } from '@/types/client';

// Chart colors
const RISK_COLORS = {
  high: '#ef4444',
  mediumHigh: '#f97316',
  medium: '#eab308',
  low: '#22c55e'
};

interface RiskStatistics {
  totalClients: number;
  byRiskScore: Record<number, number>;
  highRiskClients: number;
  mediumRiskClients: number;
  lowRiskClients: number;
  assessmentsDue: number;
  recentAssessments: number;
}

interface RiskClient extends Client {
  lastAssessmentDate?: string;
  daysSinceAssessment?: number;
}

interface TrendDataPoint {
  week: string;
  assessments: number;
  avgScore: number;
}

export default function RiskCenterPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<RiskClient[]>([]);
  const [filteredClients, setFilteredClients] = useState<RiskClient[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [statistics, setStatistics] = useState<RiskStatistics>({
    totalClients: 0,
    byRiskScore: {},
    highRiskClients: 0,
    mediumRiskClients: 0,
    lowRiskClients: 0,
    assessmentsDue: 0,
    recentAssessments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'due' | 'recent'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'workflow'>('table');
  const [selectedClient, setSelectedClient] = useState<RiskClient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Allow drilldown from dashboard: /risk?bucket=Very%20High
  useEffect(() => {
    if (filterRiskLevel !== 'all') return;
    const bucket = searchParams.get('bucket');
    if (!bucket) return;

    const normalized = bucket.toLowerCase();
    if (normalized.includes('high')) {
      setFilterRiskLevel('high');
    } else if (normalized.includes('medium')) {
      setFilterRiskLevel('medium');
    } else if (normalized.includes('low')) {
      setFilterRiskLevel('low');
    }
  }, [searchParams, filterRiskLevel]);

  const loadRiskData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load all clients (fallback source of truth)
      const response = await clientService.getAllClients({ status: ['active'] }, 1, 1000);

      // Load risk assessments from database with error handling (optional)
      let assessments: any[] = [];
      try {
        const { data, error } = await supabase
          .from('risk_profiles')
          .select('client_id, created_at, updated_at, final_risk_level, final_risk_category')
          .order('created_at', { ascending: false });
        if (error) {
          console.warn('Risk profiles query warning:', error.message);
        } else {
          assessments = data || [];
        }
      } catch (err) {
        console.warn('Risk profiles query failed:', err);
      }

      // Load assessment history for trends (last 90 days) - optional
      let historyData: any[] = [];
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const { data, error } = await supabase
          .from('risk_profiles')
          .select('created_at, final_risk_level')
          .gte('created_at', ninetyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('Risk history query warning:', error.message);
        } else {
          historyData = data || [];
        }
      } catch (err) {
        console.warn('Risk history query failed:', err);
      }

      // Calculate trend data by week
      if (historyData && historyData.length > 0) {
        const weeklyData: Record<string, { total: number; count: number }> = {};

        historyData.forEach((item: any) => {
          const date = new Date(item.created_at);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { total: 0, count: 0 };
          }
          weeklyData[weekKey].total += item.final_risk_level || 5;
          weeklyData[weekKey].count += 1;
        });

        const trends = Object.entries(weeklyData).map(([week, data]) => ({
          week: new Date(week).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          assessments: data.count,
          avgScore: Math.round((data.total / data.count) * 10) / 10
        }));

        setTrendData(trends);
      } else {
        // Fallback: use client updatedAt dates to build a basic trend
        const weeklyData: Record<string, number> = {};
        response.clients.forEach((client: any) => {
          const date = client.updatedAt ? new Date(client.updatedAt) : new Date();
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
        });
        const trends = Object.entries(weeklyData).map(([week, count]) => ({
          week: new Date(week).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          assessments: count,
          avgScore: 0
        }));
        setTrendData(trends);
      }

      // Combine client data with assessments
      const enrichedClients = response.clients.map(client => {
        const assessment = assessments?.find(a => a.client_id === client.id);
        const lastAssessmentDate = assessment?.updated_at || assessment?.created_at || client.updatedAt || client.createdAt;
        const riskScore = assessment?.final_risk_level ?? client.riskProfile?.attitudeToRisk ?? 5;
        const riskCategory = assessment?.final_risk_category ?? client.riskProfile?.riskTolerance ?? 'Balanced';
        const daysSinceAssessment = Math.floor(
          (new Date().getTime() - new Date(lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...client,
          riskProfile: {
            ...client.riskProfile,
            attitudeToRisk: riskScore,
            riskTolerance: riskCategory
          },
          lastAssessmentDate,
          daysSinceAssessment
        };
      });

      setClients(enrichedClients);
      calculateStatistics(enrichedClients);

    } catch (error) {
      console.error('Error loading risk data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData]);

  const filterClients = useCallback(() => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client => {
        const name = `${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase()) ||
               client.clientRef?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Risk level filter
    if (filterRiskLevel !== 'all') {
      filtered = filtered.filter(client => {
        const riskScore = client.riskProfile?.attitudeToRisk || 5;
        if (filterRiskLevel === 'high') return riskScore >= 7;
        if (filterRiskLevel === 'medium') return riskScore >= 4 && riskScore <= 6;
        if (filterRiskLevel === 'low') return riskScore <= 3;
        return true;
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => {
        if (filterStatus === 'due') return client.daysSinceAssessment! > 365;
        if (filterStatus === 'recent') return client.daysSinceAssessment! < 30;
        return true;
      });
    }

    // Sort by days since assessment (oldest first)
    filtered.sort((a, b) => (b.daysSinceAssessment || 0) - (a.daysSinceAssessment || 0));

    setFilteredClients(filtered);
  }, [clients, filterRiskLevel, filterStatus, searchTerm]);

  useEffect(() => {
    filterClients();
  }, [filterClients]);

  const calculateStatistics = (clientList: RiskClient[]) => {
    const stats: RiskStatistics = {
      totalClients: clientList.length,
      byRiskScore: {},
      highRiskClients: 0,
      mediumRiskClients: 0,
      lowRiskClients: 0,
      assessmentsDue: 0,
      recentAssessments: 0
    };

    clientList.forEach(client => {
      const riskScore = client.riskProfile?.attitudeToRisk || 5;

      // Count by risk score
      stats.byRiskScore[riskScore] = (stats.byRiskScore[riskScore] || 0) + 1;

      // Count by risk category
      if (riskScore >= 7) stats.highRiskClients++;
      else if (riskScore >= 4) stats.mediumRiskClients++;
      else stats.lowRiskClients++;

      // Count assessments due (>365 days)
      if (client.daysSinceAssessment && client.daysSinceAssessment > 365) {
        stats.assessmentsDue++;
      }

      // Count recent assessments (<30 days)
      if (client.daysSinceAssessment && client.daysSinceAssessment < 30) {
        stats.recentAssessments++;
      }
    });

    setStatistics(stats);
  };

  // Prepare pie chart data
  const pieChartData = useMemo(() => [
    { name: 'High Risk', value: statistics.highRiskClients, color: RISK_COLORS.high },
    { name: 'Medium Risk', value: statistics.mediumRiskClients, color: RISK_COLORS.medium },
    { name: 'Low Risk', value: statistics.lowRiskClients, color: RISK_COLORS.low }
  ].filter(d => d.value > 0), [statistics]);

  // Recency donut for due vs recent vs up-to-date
  const recencyChartData = useMemo(() => {
    const due = statistics.assessmentsDue;
    const recent = statistics.recentAssessments;
    const upToDate = Math.max(0, statistics.totalClients - due - recent);
    return [
      { name: 'Overdue', value: due, color: RISK_COLORS.high },
      { name: 'Recent (<30d)', value: recent, color: RISK_COLORS.medium },
      { name: 'Up to date', value: upToDate, color: RISK_COLORS.low },
    ].filter(d => d.value > 0);
  }, [statistics]);

  // Prepare bar chart data
  const barChartData = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => ({
      score: score.toString(),
      count: statistics.byRiskScore[score] || 0,
      fill: score >= 7 ? RISK_COLORS.high : score >= 4 ? RISK_COLORS.medium : RISK_COLORS.low
    }));
  }, [statistics]);

  // Additional chart: weekly assessment activity (count per week)
  const activityChartData = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    return trendData.map(item => ({
      week: item.week,
      assessments: item.assessments
    }));
  }, [trendData]);

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'text-red-600';
    if (score >= 7) return 'text-orange-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 8) return 'High Risk';
    if (score >= 7) return 'Medium-High';
    if (score >= 4) return 'Medium';
    if (score >= 2) return 'Low-Medium';
    return 'Low Risk';
  };

  const getAssessmentStatus = (days: number) => {
    if (days > 365) return { label: 'Overdue', color: 'destructive' };
    if (days > 300) return { label: 'Due Soon', color: 'warning' };
    if (days < 30) return { label: 'Recent', color: 'success' };
    return { label: 'Current', color: 'default' };
  };

  const getWorkflowStageId = useCallback((days: number) => {
    if (days > 365) return 'overdue';
    if (days > 300) return 'due_soon';
    if (days < 30) return 'recent';
    return 'current';
  }, []);

  const workflowItems: WorkflowItem[] = useMemo(() => {
    return filteredClients.map((client) => {
      const name = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim()
      const riskScore = client.riskProfile?.attitudeToRisk || 5
      const days = client.daysSinceAssessment || 0
      return {
        id: client.id,
        sourceType: 'risk_assessment',
        sourceId: client.id,
        title: name || client.clientRef || 'Client',
        subtitle: client.clientRef || undefined,
        status: getWorkflowStageId(days),
        dueDate: client.lastAssessmentDate,
        clientId: client.id,
        description: `Risk score ${riskScore}/10`,
      }
    })
  }, [filteredClients, getWorkflowStageId]);

  const openClientModal = (client: RiskClient) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const closeClientModal = () => {
    setSelectedClient(null);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading risk data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Risk Center</h1>
          <p className="text-gray-600">
            Comprehensive risk monitoring, analytics, and client assessment management
          </p>
        </div>
        <Button onClick={loadRiskData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Clients</p>
                <p className="text-2xl font-bold">{statistics.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">High Risk Clients</p>
                <p className="text-2xl font-bold text-red-600">{statistics.highRiskClients}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assessments Due</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.assessmentsDue}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Recent Assessments</p>
                <p className="text-2xl font-bold text-green-600">{statistics.recentAssessments}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Risk Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2" />
              Risk Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} clients`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No risk data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assessment Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Assessment Trends (Last 90 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="assessments"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Assessments"
                    dot={{ fill: '#3b82f6' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Avg Risk Score"
                    dot={{ fill: '#f97316' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No trend data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Activity Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Assessment Activity (Weekly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityChartData}>
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="assessments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              No activity data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Score Distribution Bar Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Risk Score Distribution (1-10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barChartData}>
              <XAxis dataKey="score" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`${value} clients`, 'Count']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span> Low Risk (1-3)</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></span> Medium Risk (4-6)</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span> High Risk (7-10)</span>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Recency Donut */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Assessment Recency
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recencyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={recencyChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {recencyChartData.map((entry, idx) => (
                    <Cell key={`recency-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} clients`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              No assessment recency data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterRiskLevel === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRiskLevel('all')}
              >
                All
              </Button>
              <Button
                variant={filterRiskLevel === 'high' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRiskLevel('high')}
              >
                High Risk
              </Button>
              <Button
                variant={filterRiskLevel === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRiskLevel('medium')}
              >
                Medium
              </Button>
              <Button
                variant={filterRiskLevel === 'low' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterRiskLevel('low')}
              >
                Low Risk
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'due' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(filterStatus === 'due' ? 'all' : 'due')}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Due
              </Button>
              <Button
                variant={filterStatus === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(filterStatus === 'recent' ? 'all' : 'recent')}
              >
                <Shield className="h-4 w-4 mr-1" />
                Recent
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'workflow' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('workflow')}
              >
                Workflow
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Risk List */}
      <Card>
        <CardHeader>
          <CardTitle>Client Risk Profiles ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'workflow' ? (
            filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No clients match your filters.
              </div>
            ) : (
              <WorkflowBoard
                columns={WORKFLOW_CONFIGS.risk_assessment.stages}
                items={workflowItems}
                onItemClick={(item) => {
                  const client = filteredClients.find((entry) => entry.id === item.sourceId)
                  if (client) openClientModal(client)
                }}
              />
            )
          ) : (
            filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No clients match your filters.
              </div>
            ) : (
              <>
                <div className="space-y-3 sm:hidden">
                  {filteredClients.map((client) => {
                    const riskScore = client.riskProfile?.attitudeToRisk || 5;
                    const assessmentStatus = getAssessmentStatus(client.daysSinceAssessment || 0);
                    return (
                      <div key={client.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{client.clientRef}</p>
                          </div>
                          <Badge variant={riskScore >= 7 ? 'destructive' : riskScore >= 4 ? 'warning' : 'success'}>
                            {getRiskLabel(riskScore)}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-gray-400 uppercase">Risk Score</p>
                            <p className={`text-lg font-semibold ${getRiskColor(riskScore)}`}>
                              {riskScore}<span className="text-gray-400 text-xs">/10</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 uppercase">Assessment</p>
                            <p className="text-sm font-semibold text-gray-900">{client.daysSinceAssessment} days ago</p>
                            <p className="text-xs text-gray-500">
                              {client.lastAssessmentDate && new Date(client.lastAssessmentDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Badge variant={assessmentStatus.color as any}>
                            {assessmentStatus.label}
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openClientModal(client)}
                            className="w-full"
                          >
                            View Details
                          </Button>
                          {client.daysSinceAssessment! > 300 && (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/assessments/atr?clientId=${client.id}`)}
                              className="w-full"
                            >
                              Update Assessment
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Client</th>
                        <th className="text-left py-3 px-4">Risk Score</th>
                        <th className="text-left py-3 px-4">Risk Level</th>
                        <th className="text-left py-3 px-4">Last Assessment</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client) => {
                        const riskScore = client.riskProfile?.attitudeToRisk || 5;
                        const assessmentStatus = getAssessmentStatus(client.daysSinceAssessment || 0);
                        
                        return (
                          <tr key={client.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium">
                                  {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                                </p>
                                <p className="text-sm text-gray-500">{client.clientRef}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <span className={`text-2xl font-bold ${getRiskColor(riskScore)}`}>
                                  {riskScore}
                                </span>
                                <span className="text-gray-500 ml-1">/10</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={riskScore >= 7 ? 'destructive' : riskScore >= 4 ? 'warning' : 'success'}>
                                {getRiskLabel(riskScore)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm">
                                  {client.daysSinceAssessment} days ago
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(client.lastAssessmentDate!).toLocaleDateString()}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={assessmentStatus.color as any}>
                                {assessmentStatus.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openClientModal(client)}
                                >
                                  View Details
                                </Button>
                                {client.daysSinceAssessment! > 300 && (
                                  <Button
                                    size="sm"
                                    onClick={() => router.push(`/assessments/atr?clientId=${client.id}`)}
                                  >
                                    Update Assessment
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>

      {/* Risk Profile Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Risk Profile Details
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold">
                  {selectedClient.personalDetails?.firstName} {selectedClient.personalDetails?.lastName}
                </h3>
                <p className="text-sm text-gray-500">{selectedClient.clientRef}</p>
              </div>

              {/* Risk Score */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Risk Score</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${getRiskColor(selectedClient.riskProfile?.attitudeToRisk || 5)}`}>
                      {selectedClient.riskProfile?.attitudeToRisk || 5}
                    </span>
                    <span className="text-gray-500">/10</span>
                  </div>
                  <Badge
                    variant={(selectedClient.riskProfile?.attitudeToRisk || 5) >= 7 ? 'destructive' :
                             (selectedClient.riskProfile?.attitudeToRisk || 5) >= 4 ? 'warning' : 'success'}
                    className="mt-2"
                  >
                    {getRiskLabel(selectedClient.riskProfile?.attitudeToRisk || 5)}
                  </Badge>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Last Assessment</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {selectedClient.daysSinceAssessment} days ago
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedClient.lastAssessmentDate && new Date(selectedClient.lastAssessmentDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <Badge
                    variant={getAssessmentStatus(selectedClient.daysSinceAssessment || 0).color as any}
                    className="mt-2"
                  >
                    {getAssessmentStatus(selectedClient.daysSinceAssessment || 0).label}
                  </Badge>
                </div>
              </div>

              {/* Capacity for Loss */}
              {selectedClient.riskProfile?.capacityForLoss && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Capacity for Loss</span>
                  </div>
                  <Badge variant="outline" className="text-base">
                    {selectedClient.riskProfile.capacityForLoss}
                  </Badge>
                </div>
              )}

              {/* Risk Category Description */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Risk Profile Summary</h4>
                <p className="text-sm text-gray-700">
                  {(selectedClient.riskProfile?.attitudeToRisk || 5) >= 7
                    ? 'This client has a high risk tolerance and is comfortable with significant market volatility in pursuit of higher returns. Suitable for growth-focused investment strategies.'
                    : (selectedClient.riskProfile?.attitudeToRisk || 5) >= 4
                    ? 'This client has a moderate risk tolerance, balancing growth potential with capital preservation. Suitable for balanced investment strategies.'
                    : 'This client has a low risk tolerance and prioritizes capital preservation over growth. Suitable for conservative investment strategies.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => router.push(`/clients/${selectedClient.id}?tab=risk`)}
                  variant="outline"
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  View Full Profile
                </Button>
                <Button
                  onClick={() => router.push(`/assessments/atr?clientId=${selectedClient.id}`)}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Update Assessment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

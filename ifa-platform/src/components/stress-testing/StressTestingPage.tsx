// ================================================================
// src/components/stress-testing/StressTestingPage.tsx
// Dedicated Stress Testing Hub with Monte Carlo Integration
// ================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { StressTestReportService } from '@/services/StressTestReportService';
import {
  ArrowLeft,
  User,
  DollarSign,
  Calendar,
  AlertTriangle,
  Zap,
  TrendingDown,
  Shield,
  FileText,
  Play,
  RefreshCw,
  CheckCircle2,
  Users,
  Activity,
  BarChart3,
  LineChart as LineChartIcon,
  Download,
  Filter,
  List,
  Focus
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import type { Client } from '@/types/client';
import type { StressTestResult, StressTestParams } from '@/types/stress-testing';
import {
  buildClientProfile
} from '@/lib/stress-testing/profile';
import { filterClientsBySearch } from '@/lib/stress-testing/filters';
import { formatCurrency, getClientAge, getClientInitials } from '@/lib/stress-testing/formatters';
import { mapApiStressResults } from '@/lib/stress-testing/mappers';
import {
  loadStressTestingClientData,
  loadStressTestingDashboardData
} from '@/services/stress-testing/stressTestingService';
import {
  STRESS_SCENARIOS,
  SCENARIO_CATEGORIES,
  SCENARIO_CATEGORY_LOOKUP,
  SCENARIO_CATEGORY_COLORS,
  RESILIENCE_BUCKETS,
  SEVERITY_LEVELS
} from './constants';
import { useStressTestingDashboardData } from './hooks/useStressTestingDashboardData';
import { useStressTestingDrillDown } from './hooks/useStressTestingDrillDown';

// Import new stress testing components
import { ClientProfilePanel } from './ClientProfilePanel';
import { StressTestNarrative } from './StressTestNarrative';
import { StressTestReportModal } from './StressTestReportModal';
import { ResilienceScoreExplainer } from './ResilienceScoreExplainer';
import { VulnerabilityBreakdown } from './VulnerabilityBreakdown';
import { ScenarioFocusView } from './ScenarioFocusView';
import { StressTestDrillDownModal } from './StressTestDrillDownModal';

// Import existing stress testing components (named exports)
// Note: These can be used for additional functionality if needed
// import { StressTestMatrix } from '@/components/cashflow/advanced/StressTestMatrix';
// import { StressTestResults } from '@/components/cashflow/advanced/StressTestResults';

// ================================================================
// TYPES
// ================================================================

type ViewMode = 'dashboard' | 'scenarios' | 'results' | 'history';


// ================================================================
// MAIN COMPONENT
// ================================================================

export default function StressTestingPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');
  const { toast } = useToast();

  // State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [activeTab, setActiveTab] = useState<string>('scenarios');

  const {
    clients,
    isLoading,
    dashboardStats,
    stressMetricsByClient,
    coverageClientIds,
    resilienceDistribution,
    severityMix,
    scenarioMix,
    testsOverTime,
    coverageSeries,
    refreshDashboard,
    setError
  } = useStressTestingDashboardData(supabase);

  const {
    isDrillDownOpen,
    setIsDrillDownOpen,
    drillDownKey,
    drillDownTitle,
    drillDownDescription,
    openDrillDown,
    getInteractiveRowProps,
    drillDownClients,
    reportMissingIds
  } = useStressTestingDrillDown({
    clients,
    coverageClientIds,
    stressMetricsByClient
  });

  // Stress testing state
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([
    'market_crash_2008',
    'job_loss_redundancy'
  ]);
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [duration, setDuration] = useState(3);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<StressTestResult[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [resultsViewMode, setResultsViewMode] = useState<'list' | 'focus'>('focus');

  // Monte Carlo integration
  const [monteCarloSuccessRate, setMonteCarloSuccessRate] = useState<number | null>(null);

  // Report generation handler
  const handleGenerateReport = useCallback(async (format: 'pdf' | 'html') => {
    if (!selectedClient || results.length === 0) {
      toast({
        title: 'Cannot Generate Report',
        description: 'Please run stress tests first before generating a report.',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingReport(true);
    try {
      const reportService = new StressTestReportService();

      // Get or create a cash flow scenario for the client
      const { data: scenarios } = await supabase
        .from('cash_flow_scenarios')
        .select('id')
        .eq('client_id', selectedClient.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const scenarioId = scenarios?.[0]?.id;

      if (!scenarioId) {
        toast({
          title: 'No Cash Flow Scenario',
          description: 'Please create a cash flow scenario for this client first.',
          variant: 'destructive'
        });
        setIsGeneratingReport(false);
        return;
      }

      const result = await reportService.generateStressTestReport(scenarioId, {
        includeExecutiveSummary: true,
        includeDetailedResults: true,
        includeRecommendations: true,
        includeComplianceEvidence: true,
        includeCharts: true,
        reportFormat: format,
        selectedScenarios: selectedScenarios
      });

      if (result.success && result.downloadUrl) {
        // Download the report
        window.open(result.downloadUrl, '_blank');
        toast({
          title: 'Report Generated',
          description: `Your ${format.toUpperCase()} report has been generated successfully.`,
        });
      } else {
        throw new Error(result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: 'Report Generation Failed',
        description: error instanceof Error ? error.message : 'An error occurred while generating the report.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingReport(false);
    }
  }, [selectedClient, results, selectedScenarios, supabase, toast]);

  const loadClientData = useCallback(async (clientIdToLoad: string) => {
    try {
      const { client, monteCarloSuccessRate, results, selectedScenarios } =
        await loadStressTestingClientData(supabase, clientIdToLoad);

      setSelectedClient(client);
      setMonteCarloSuccessRate(monteCarloSuccessRate);
      setResults(results);

      if (selectedScenarios && selectedScenarios.length > 0) {
        setSelectedScenarios(selectedScenarios);
      }
    } catch (err) {
      console.error('Error loading client data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    }
  }, [setError, supabase]);

  useEffect(() => {
    if (clientId) {
      loadClientData(clientId);
      setViewMode('scenarios');
    }
  }, [clientId, loadClientData]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setViewMode('scenarios');
    router.push(`/stress-testing?clientId=${client.id}`);
  };

  const handleScenarioToggle = (scenarioId: string) => {
    setSelectedScenarios(prev =>
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const runStressTests = async () => {
    if (selectedScenarios.length === 0) {
      toast({
        title: 'No Scenarios Selected',
        description: 'Please select at least one stress scenario to run.',
        variant: 'destructive'
      });
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch('/api/stress-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id,
          scenarioIds: selectedScenarios,
          severity,
          duration
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run stress tests');
      }

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.error || 'Failed to run stress tests');
      }

      const testResults: StressTestResult[] = mapApiStressResults(payload.results || []);

      setResults(testResults);
      setActiveTab('results');
      await refreshDashboard();

      toast({
        title: 'Stress Tests Complete',
        description: `Successfully ran ${testResults.length} stress scenarios.`,
        variant: 'default'
      });

    } catch (err) {
      console.error('Error running stress tests:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to run stress tests. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const filteredClients = filterClientsBySearch(clients, searchTerm);

  // Calculate average resilience from results
  const averageResilience = results.length > 0
    ? results.reduce((sum, r) => sum + r.resilienceScore, 0) / results.length
    : 0;

  const untestedCount = Math.max(dashboardStats.totalClients - coverageClientIds.tested.length, 0);
  const missingScenarioCount = Math.max(dashboardStats.totalClients - coverageClientIds.scenarios.length, 0);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Zap className="h-16 w-16 text-orange-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading Stress Testing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!selectedClient ? (
        // Client Selection Dashboard
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex flex-wrap items-center gap-3">
                <Zap className="h-8 w-8 text-orange-500" />
                Stress Testing
              </h1>
              <p className="text-gray-600 mt-2">
                Test client portfolios against market crashes, personal crises, and economic shocks
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() =>
                  openDrillDown('coverage_total', 'All Clients', 'All active clients in stress testing.')
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Clients</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalClients}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() =>
                  openDrillDown('tested', 'Clients Tested', 'Clients with at least one stress test.')
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Clients Tested</p>
                      <p className="text-2xl font-bold">{dashboardStats.testedClients}</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() =>
                  openDrillDown('coverage_tests', 'Stress Tests Run', 'All clients with stress tests.')
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tests Run</p>
                      <p className="text-2xl font-bold">{dashboardStats.totalTestsRun}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() =>
                  openDrillDown('tested', 'Average Resilience', 'Latest resilience scores for tested clients.')
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Resilience</p>
                      <p className="text-2xl font-bold">
                        {Math.round(dashboardStats.averageResilienceScore)}
                        <span className="text-sm text-gray-500">/100</span>
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() =>
                  openDrillDown('high_risk', 'High Risk Watchlist', 'Clients with low resilience or high shortfall risk.')
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">High Risk</p>
                      <p className="text-2xl font-bold">{dashboardStats.highRiskClients}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() =>
                  openDrillDown('coverage_reports', 'Reports Generated', 'Clients with stress test reports.')
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Reports Generated</p>
                      <p className="text-2xl font-bold">{dashboardStats.reportsGenerated}</p>
                    </div>
                    <FileText className="h-8 w-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity + Mix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card
                className="lg:col-span-8 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() =>
                  openDrillDown('tested', 'Stress Test Activity', 'Clients with stress tests in the last 12 months.')
                }
              >
                <CardHeader>
                  <CardTitle>Stress Test Activity</CardTitle>
                  <p className="text-xs text-gray-500">Runs captured over the last 12 months</p>
                </CardHeader>
                <CardContent className="h-[220px] sm:h-[280px]">
                  {testsOverTime.some((entry) => entry.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={testsOverTime} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="stressActivityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#f97316"
                          strokeWidth={2}
                          fill="url(#stressActivityGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">
                      No stress test activity captured yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-6">
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() =>
                    openDrillDown('coverage_tests', 'Scenario Mix', 'Scenario categories covered in tests.')
                  }
                >
                  <CardHeader>
                    <CardTitle>Scenario Mix</CardTitle>
                    <p className="text-xs text-gray-500">Categories covered across latest tests</p>
                  </CardHeader>
                  <CardContent className="h-[180px] sm:h-[200px]">
                    {scenarioMix.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scenarioMix} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            radius={[6, 6, 0, 0]}
                            onClick={(data) => {
                              if (data?.payload?.key) {
                                openDrillDown(
                                  data.payload.key,
                                  `${data.payload.label} scenarios`,
                                  'Clients tested against this scenario category.'
                                );
                              }
                            }}
                          >
                            {scenarioMix.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} cursor="pointer" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-gray-500">
                        Run stress tests to populate scenario mix.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() =>
                    openDrillDown('coverage_tests', 'Severity Mix', 'Latest severity levels across tests.')
                  }
                >
                  <CardHeader>
                    <CardTitle>Severity Mix</CardTitle>
                    <p className="text-xs text-gray-500">Latest test severity levels</p>
                  </CardHeader>
                  <CardContent className="h-[160px] sm:h-[180px]">
                    {severityMix.some((entry) => entry.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={severityMix} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            radius={[6, 6, 0, 0]}
                            onClick={(data) => {
                              if (data?.payload?.key) {
                                openDrillDown(
                                  data.payload.key,
                                  `${data.payload.label} severity`,
                                  'Clients with latest tests at this severity level.'
                                );
                              }
                            }}
                          >
                            {severityMix.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} cursor="pointer" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-gray-500">
                        No severity data yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alerts & Next Actions</CardTitle>
                  <p className="text-xs text-gray-500">Across all active clients</p>
                </CardHeader>
                <CardContent className="h-auto sm:h-[240px] flex flex-col gap-4 text-sm">
                  <div className="space-y-3">
                    <div
                      {...getInteractiveRowProps(
                        'retest_due',
                        'Retest due',
                        'Clients whose last stress test is over 12 months old.'
                      )}
                    >
                      <div>
                        <p className="font-medium text-gray-900">Retest due</p>
                        <p className="text-xs text-gray-500">Last test older than 12 months</p>
                      </div>
                      <Badge variant="outline">{coverageClientIds.retestDue.length}</Badge>
                    </div>
                    <div
                      {...getInteractiveRowProps(
                        'high_risk',
                        'High risk watchlist',
                        'Low resilience or high shortfall risk.'
                      )}
                    >
                      <div>
                        <p className="font-medium text-gray-900">High risk watchlist</p>
                        <p className="text-xs text-gray-500">Low resilience or high shortfall risk</p>
                      </div>
                      <Badge variant="outline">{dashboardStats.highRiskClients}</Badge>
                    </div>
                    <div
                      {...getInteractiveRowProps(
                        'untested',
                        'No stress test',
                        'Clients without a recorded stress test.'
                      )}
                    >
                      <div>
                        <p className="font-medium text-gray-900">No stress test</p>
                        <p className="text-xs text-gray-500">Stress testing not run yet</p>
                      </div>
                      <Badge variant="outline">{untestedCount}</Badge>
                    </div>
                    <div
                      {...getInteractiveRowProps(
                        'report_missing',
                        'Reports missing',
                        'Stress tests run without a report generated.'
                      )}
                    >
                      <div>
                        <p className="font-medium text-gray-900">Reports missing</p>
                        <p className="text-xs text-gray-500">Run tests but no report saved</p>
                      </div>
                      <Badge variant="outline">{reportMissingIds.length}</Badge>
                    </div>
                    {missingScenarioCount > 0 && (
                      <div
                        {...getInteractiveRowProps(
                          'coverage_scenarios',
                          'Cash flow scenario missing',
                          'Clients without a cash flow scenario.'
                        )}
                      >
                        <div>
                          <p className="font-medium text-gray-900">Cash flow scenario missing</p>
                          <p className="text-xs text-gray-500">No scenario available for testing</p>
                        </div>
                        <Badge variant="outline">{missingScenarioCount}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Coverage Funnel</CardTitle>
                  <p className="text-xs text-gray-500">From scenarios to stress test reports</p>
                </CardHeader>
                <CardContent className="h-[220px] sm:h-[240px]">
                  {coverageSeries.some((entry) => entry.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={coverageSeries}
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        barSize={16}
                      >
                        <XAxis type="number" hide domain={[0, 100]} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={90} />
                        <Tooltip
                          formatter={(_value: number, _name: string, props) => {
                            const count = props.payload?.count ?? 0;
                            const percent = props.payload?.percent ?? 0;
                            return [`${count} (${percent}%)`, 'Clients'];
                          }}
                        />
                        <Bar
                          dataKey="percent"
                          radius={[6, 6, 6, 6]}
                          onClick={(data) => {
                            if (data?.payload?.key) {
                              openDrillDown(
                                data.payload.key,
                                `${data.payload.label} coverage`,
                                'Clients captured in this stage.'
                              );
                            }
                          }}
                        >
                          {coverageSeries.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} cursor="pointer" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">
                      Add coverage data to visualize readiness.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resilience Distribution</CardTitle>
                  <p className="text-xs text-gray-500">Latest resilience scores by band</p>
                </CardHeader>
                <CardContent className="h-[220px] sm:h-[240px]">
                  {resilienceDistribution.some((entry) => entry.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resilienceDistribution}>
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          radius={[6, 6, 0, 0]}
                          onClick={(data) => {
                            if (data?.payload?.key) {
                              openDrillDown(
                                data.payload.key,
                                `${data.payload.label} resilience`,
                                'Clients grouped by latest resilience score.'
                              );
                            }
                          }}
                        >
                          {resilienceDistribution.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} cursor="pointer" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">
                      Run stress tests to populate resilience distribution.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search clients by name, email, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border rounded-lg focus:outline-none focus:border-orange-500"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Clients Grid */}
            <Card>
              <CardContent className="p-6">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? 'No clients found' : 'No Clients Found'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm ? 'Try adjusting your search terms.' : 'Create clients before running stress tests.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="bg-white p-4 sm:p-6 rounded-lg border hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                              {getClientInitials(client)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                              </h3>
                              <p className="text-sm text-gray-500">{client.clientRef}</p>
                            </div>
                          </div>
                          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{getClientAge(client)} years old</span>
                          </div>

                          {client.financialProfile?.netWorth && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="h-4 w-4" />
                              <span>{formatCurrency(client.financialProfile.netWorth)}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <Button
                            className="w-full group-hover:bg-orange-600 group-hover:text-white transition-colors"
                            variant="outline"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Run Stress Tests
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // Client Stress Testing View
        <>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b z-10">
            <div className="container mx-auto px-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 sm:h-16">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedClient(null);
                      setResults([]);
                      router.push('/stress-testing');
                    }}
                    className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Clients</span>
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                      {getClientInitials(selectedClient)}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {selectedClient.personalDetails?.firstName} {selectedClient.personalDetails?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{selectedClient.clientRef}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isRunning && (
                    <Badge variant="default" className="animate-pulse bg-orange-500">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Running Tests
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Monte Carlo Context Card */}
            {monteCarloSuccessRate !== null && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <LineChartIcon className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Monte Carlo Success Rate</p>
                    <p className="text-2xl font-bold text-blue-700">{monteCarloSuccessRate.toFixed(1)}%</p>
                  </div>
                  <div className="w-full sm:w-auto sm:ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/monte-carlo?clientId=${selectedClient.id}`)}
                      className="w-full sm:w-auto text-blue-700 border-blue-300"
                    >
                      View Monte Carlo
                    </Button>
                  </div>
                </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2">
                <TabsTrigger value="scenarios" className="flex items-center gap-2 text-xs sm:text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Scenarios
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2 text-xs sm:text-sm">
                  <Filter className="h-4 w-4" />
                  Custom
                </TabsTrigger>
                <TabsTrigger value="results" className="flex items-center gap-2 text-xs sm:text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Results
                  {results.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{results.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2 text-xs sm:text-sm">
                  <FileText className="h-4 w-4" />
                  Reports
                </TabsTrigger>
              </TabsList>

              {/* Scenarios Tab */}
              <TabsContent value="scenarios" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Select Stress Scenarios</span>
                      <Badge variant="outline">{selectedScenarios.length} selected</Badge>
                    </CardTitle>
                    <CardDescription>
                      Choose scenarios to test how the portfolio performs under various stress conditions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(SCENARIO_CATEGORIES).map(([category, scenarios]) => (
                      <div key={category} className="space-y-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          {category === 'Market Risk' && <TrendingDown className="h-4 w-4 text-red-500" />}
                          {category === 'Personal Risk' && <User className="h-4 w-4 text-orange-500" />}
                          {category === 'Economic Risk' && <BarChart3 className="h-4 w-4 text-purple-500" />}
                          {category === 'Inflation Risk' && <TrendingDown className="h-4 w-4 text-yellow-600" />}
                          {category === 'Interest Rate Risk' && <Activity className="h-4 w-4 text-blue-500" />}
                          {category === 'Longevity Risk' && <Calendar className="h-4 w-4 text-green-500" />}
                          {category === 'Political Risk' && <Shield className="h-4 w-4 text-gray-500" />}
                          {category === 'Currency Risk' && <DollarSign className="h-4 w-4 text-teal-500" />}
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {scenarios.map((scenario) => (
                            <div
                              key={scenario.id}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedScenarios.includes(scenario.id)
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-orange-300'
                              }`}
                              onClick={() => handleScenarioToggle(scenario.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-medium">{scenario.name}</h5>
                                    <Badge
                                      variant={
                                        scenario.severity === 'severe' ? 'destructive' :
                                        scenario.severity === 'moderate' ? 'default' : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {scenario.severity}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                                  <p className="text-xs text-gray-500 mt-1">Duration: {scenario.durationYears} years</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  selectedScenarios.includes(scenario.id)
                                    ? 'bg-orange-500 border-orange-500'
                                    : 'border-gray-300'
                                }`}>
                                  {selectedScenarios.includes(scenario.id) && (
                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Severity and Duration Controls */}
                    <div className="pt-4 border-t space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stress Severity
                          </label>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            {(['mild', 'moderate', 'severe'] as const).map((level) => (
                              <Button
                                key={level}
                                variant={severity === level ? 'default' : 'outline'}
                                onClick={() => setSeverity(level)}
                                className={`${severity === level ? 'bg-orange-500 hover:bg-orange-600' : ''} w-full sm:w-auto`}
                              >
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Test Duration (years)
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>1 year</span>
                            <span className="font-medium">{duration} years</span>
                            <span>10 years</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={runStressTests}
                        disabled={selectedScenarios.length === 0 || isRunning}
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        size="lg"
                      >
                        {isRunning ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Running {selectedScenarios.length} Stress Tests...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run {selectedScenarios.length} Stress Tests
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Custom Tab */}
              <TabsContent value="custom" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Stress Parameters</CardTitle>
                    <CardDescription>
                      Define custom stress scenarios with specific parameter adjustments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Equity Decline (%)
                        </label>
                        <input
                          type="number"
                          defaultValue={-30}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="-100"
                          max="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bond Decline (%)
                        </label>
                        <input
                          type="number"
                          defaultValue={-10}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="-100"
                          max="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Inflation Spike (%)
                        </label>
                        <input
                          type="number"
                          defaultValue={5}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="0"
                          max="20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Income Reduction (%)
                        </label>
                        <input
                          type="number"
                          defaultValue={0}
                          className="w-full px-3 py-2 border rounded-lg"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600">
                      <Play className="h-4 w-4 mr-2" />
                      Run Custom Stress Test
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results" className="space-y-6">
                {results.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                      <p className="text-gray-600 mb-4">
                        Run stress tests to see how the portfolio performs under various scenarios.
                      </p>
                      <Button onClick={() => setActiveTab('scenarios')}>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Select Scenarios
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* View Toggle */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white rounded-lg p-3 border shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">View:</span>
                        <div className="flex w-full sm:w-auto rounded-lg border overflow-hidden">
                          <button
                            onClick={() => setResultsViewMode('focus')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                              resultsViewMode === 'focus'
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            } flex-1 sm:flex-none justify-center`}
                          >
                            <Focus className="h-4 w-4" />
                            Focus
                          </button>
                          <button
                            onClick={() => setResultsViewMode('list')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                              resultsViewMode === 'list'
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            } flex-1 sm:flex-none justify-center`}
                          >
                            <List className="h-4 w-4" />
                            List
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {resultsViewMode === 'focus' ? 'One scenario at a time' : 'All scenarios at once'}
                      </p>
                    </div>

                    {/* Focus View */}
                    {resultsViewMode === 'focus' && selectedClient && (
                      <ScenarioFocusView
                        results={results}
                        clientProfile={buildClientProfile(selectedClient)}
                        onGenerateReport={() => setShowReportModal(true)}
                      />
                    )}

                    {/* List View */}
                    {resultsViewMode === 'list' && (
                      <>
                        {/* Client Profile Panel - Shows what's being tested */}
                        {selectedClient && (
                          <ClientProfilePanel profile={buildClientProfile(selectedClient)} />
                        )}

                        {/* Summary Card */}
                        <Card className="border-orange-200">
                      <CardHeader>
                      <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-orange-500" />
                          Overall Resilience Score
                        </div>
                        <Button
                          onClick={() => setShowReportModal(true)}
                          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Report
                        </Button>
                      </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center py-4">
                          <div className={`text-6xl font-bold ${
                            averageResilience >= 70 ? 'text-green-600' :
                            averageResilience >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {averageResilience.toFixed(0)}
                          </div>
                          <div className="text-2xl text-gray-400 ml-2">/100</div>
                        </div>
                        <p className="text-center text-gray-600">
                          Based on {results.length} stress scenarios
                        </p>
                      </CardContent>
                    </Card>

                    {/* Score Explainer - What does the score mean? */}
                    <ResilienceScoreExplainer
                      currentScore={averageResilience}
                      showCurrentScore={true}
                    />

                    {/* Vulnerability Breakdown - WHY is the score what it is? */}
                    {selectedClient && (
                      <VulnerabilityBreakdown
                        results={results}
                        clientProfile={buildClientProfile(selectedClient)}
                      />
                    )}

                    {/* Results Narrative - Plain English explanation */}
                    {selectedClient && (
                      <StressTestNarrative
                        results={results}
                        clientProfile={{
                          clientName: buildClientProfile(selectedClient).clientName,
                          portfolioValue: buildClientProfile(selectedClient).portfolioValue,
                          annualIncome: buildClientProfile(selectedClient).annualIncome,
                          age: buildClientProfile(selectedClient).age
                        }}
                      />
                    )}

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.map((result) => {
                        // Determine score level for context
                        const scoreLevel = result.resilienceScore >= 70 ? 'Robust' :
                                          result.resilienceScore >= 50 ? 'Moderate' :
                                          result.resilienceScore >= 30 ? 'Vulnerable' : 'Critical';
                        const scoreColor = result.resilienceScore >= 70 ? 'text-green-600' :
                                          result.resilienceScore >= 50 ? 'text-amber-600' :
                                          result.resilienceScore >= 30 ? 'text-orange-600' : 'text-red-600';
                        const scoreBg = result.resilienceScore >= 70 ? 'bg-green-50' :
                                       result.resilienceScore >= 50 ? 'bg-amber-50' :
                                       result.resilienceScore >= 30 ? 'bg-orange-50' : 'bg-red-50';

                        return (
                          <Card key={result.scenarioId} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg flex items-center justify-between">
                                <span>{result.scenarioName}</span>
                                <span title={`${scoreLevel}: ${result.resilienceScore.toFixed(0)}/100 resilience`}>
                                  <Badge
                                    variant={
                                      result.resilienceScore >= 70 ? 'default' :
                                      result.resilienceScore >= 50 ? 'secondary' : 'destructive'
                                    }
                                  >
                                    {result.resilienceScore.toFixed(0)}/100
                                  </Badge>
                                </span>
                              </CardTitle>
                              {/* Score Interpretation */}
                              <p className={`text-xs ${scoreColor} font-medium`}>
                                {scoreLevel} Resilience
                              </p>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Survival Probability</span>
                                  <span className={`font-medium ${
                                    result.survivalProbability >= 75 ? 'text-green-600' :
                                    result.survivalProbability >= 50 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {result.survivalProbability.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Shortfall Risk</span>
                                  <span className="font-medium text-red-600">
                                    {result.shortfallRisk.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Portfolio Impact</span>
                                  <span className="font-medium">
                                    -{result.impactAnalysis.portfolioDeclinePercent.toFixed(1)}%
                                  </span>
                                </div>
                                {result.recoveryTimeYears && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Recovery Time</span>
                                    <span className="font-medium">
                                      {result.recoveryTimeYears} years
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Score Context Bar */}
                              <div className={`mt-4 pt-3 border-t ${scoreBg} -mx-6 -mb-6 px-6 py-3 rounded-b-lg`}>
                                <p className={`text-xs ${scoreColor}`}>
                                  {result.resilienceScore >= 70 && 'Portfolio can weather this scenario with confidence'}
                                  {result.resilienceScore >= 50 && result.resilienceScore < 70 && 'Some vulnerability exists - minor adjustments may help'}
                                  {result.resilienceScore >= 30 && result.resilienceScore < 50 && 'Significant risk - consider protective measures'}
                                  {result.resilienceScore < 30 && 'High risk of depletion - immediate action recommended'}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                      </>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Generate Stress Test Report
                    </CardTitle>
                    <CardDescription>
                      Create FCA-compliant stress testing documentation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {results.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">
                          Run stress tests first to generate reports.
                        </p>
                        <Button variant="outline" onClick={() => setActiveTab('scenarios')}>
                          Select Scenarios
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">Report will include:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Executive summary with key metrics</li>
                            <li>• Detailed stress test results for {results.length} scenarios</li>
                            <li>• Risk assessment and resilience scoring</li>
                            <li>• Mitigation strategy recommendations</li>
                            <li>• FCA compliance documentation</li>
                          </ul>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600"
                            onClick={() => handleGenerateReport('pdf')}
                            disabled={isGeneratingReport}
                          >
                            {isGeneratingReport ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            {isGeneratingReport ? 'Generating...' : 'Download PDF Report'}
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full sm:flex-1"
                            onClick={() => handleGenerateReport('html')}
                            disabled={isGeneratingReport}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate HTML
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      {/* Stress Test Report Modal */}
      {selectedClient && (
        <StressTestReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          results={results}
          clientProfile={buildClientProfile(selectedClient)}
          selectedScenarios={selectedScenarios}
          onReportGenerated={(result) => {
            toast({
              title: 'Report Generated',
              description: 'Your stress test report has been generated successfully.',
            });
          }}
        />
      )}

      <StressTestDrillDownModal
        isOpen={isDrillDownOpen}
        onClose={() => setIsDrillDownOpen(false)}
        title={drillDownTitle}
        description={drillDownDescription}
        clients={drillDownClients}
        metricsByClient={stressMetricsByClient}
        onSelectClient={(clientIdToOpen) => {
          const targetClient = clients.find((client) => client.id === clientIdToOpen);
          if (targetClient) {
            handleClientSelect(targetClient);
          }
        }}
        defaultSort="resilience"
      />
    </div>
  );
}

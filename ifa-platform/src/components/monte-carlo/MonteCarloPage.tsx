// ================================================================
// src/app/monte-carlo/page.tsx
// FINAL VERSION - Using existing AssessmentService
// All existing functionality preserved + assessment tracking
// ================================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clientService } from '@/services/ClientService';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import clientLogger from '@/lib/logging/clientLogger';
import NuclearMonteCarlo from '@/components/monte-carlo/NuclearMonteCarlo';
// FIX: Use existing AssessmentService
import { AssessmentService } from '@/services/AssessmentService';
import {
  filterClients,
  formatCurrency,
  formatDate,
  generateAllocationFromRiskScore,
  generateFanChartData,
  generateLongevityData,
  generateWealthValues,
  getClientAge,
  getClientInitials
} from '@/components/monte-carlo/utils';
import {
  MonteCarloDashboardStats,
  ScenarioWithResult,
  StatFilter,
  ViewMode
} from '@/components/monte-carlo/types';
import {
  fetchMonteCarloScenarios,
  fetchMonteCarloStats
} from '@/services/monte-carlo/monteCarloService';
// NEW: Import enhanced components
import MonteCarloReportModal from '@/components/monte-carlo/MonteCarloReportModal';
import DashboardStats, { StatClickData } from '@/components/monte-carlo/DashboardStats';
import StatsDrillDownModal from '@/components/monte-carlo/StatsDrillDownModal';
import {
  FanChart,
  SuccessHistogram,
  SustainabilityGauge,
  LongevityHeatmap,
  AssetAllocationPie
} from '@/components/monte-carlo/charts';
import { 
  ArrowLeft,
  User,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle,
  History,
  Plus,
  LineChart,
  RefreshCw,
  ChevronRight,
  Eye,
  Download,
  Clock,
  Users,
  Activity,
  Target,
  BarChart3,
  CheckCircle2,
  Filter,
  Shield
} from 'lucide-react';
import type { Client, ClientListResponse } from '@/types/client';

export default function MonteCarloPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');
  const { toast } = useToast();

  // State with proper typing
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioWithResult[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioWithResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<MonteCarloDashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalScenarios: 0,
    averageSuccessRate: 0
  });
  
  // Enhanced state for better UX
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [statFilter, setStatFilter] = useState<StatFilter>('all');
  const [latestResults, setLatestResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  // INTEGRATION: Add tracking state
  const [isTrackingProgress, setIsTrackingProgress] = useState(false);
  // NEW: Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportScenario, setReportScenario] = useState<ScenarioWithResult | null>(null);

  // NEW: Drill-down modal state
  const [showDrillDownModal, setShowDrillDownModal] = useState(false);
  const [drillDownData, setDrillDownData] = useState<StatClickData | null>(null);
  const [drillDownClientNames, setDrillDownClientNames] = useState<Map<string, string>>(new Map());

  const loadStats = useCallback(async () => {
    try {
      const dashboardStats = await fetchMonteCarloStats(supabase);
      setStats(dashboardStats);
    } catch (error) {
      clientLogger.error('Error fetching stats:', error);
    }
  }, [supabase]);

  const loadScenarios = useCallback(async (clientIdToLoad: string) => {
    try {
      const scenariosWithResults = await fetchMonteCarloScenarios(supabase, clientIdToLoad);
      setScenarios(scenariosWithResults);
    } catch (err) {
      clientLogger.error('Error loading scenarios:', err);
      setError('Failed to load scenarios');
    }
  }, [supabase]);

  const loadClientAndScenarios = useCallback(async (clientIdToLoad: string) => {
    try {
      setIsLoadingScenarios(true);
      
      // Load client details
      const client = await clientService.getClientById(clientIdToLoad);
      setSelectedClient(client);

      // Load scenarios for this client
      await loadScenarios(clientIdToLoad);

    } catch (err) {
      clientLogger.error('Error loading client and scenarios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    } finally {
      setIsLoadingScenarios(false);
    }
  }, [loadScenarios]);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load clients list
      const clientsResponse: ClientListResponse = await clientService.getAllClients(
        { status: ['active'] },
        1,
        100
      );
      setClients(clientsResponse.clients);

      // Load stats with proper database counts
      await loadStats();

    } catch (err) {
      clientLogger.error('Error loading initial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [loadStats]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (clientId) {
      loadClientAndScenarios(clientId);
      setViewMode('history');
    }
  }, [clientId, loadClientAndScenarios]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setViewMode('history');
    router.push(`/monte-carlo?clientId=${client.id}`);
  };

  // NEW: Handle stat card click for drill-down modal
  const handleStatClick = (data: StatClickData) => {
    // Use clientNames from callback if available, otherwise build from clients array
    if (data.clientNames && data.clientNames.size > 0) {
      setDrillDownClientNames(data.clientNames);
    } else {
      const namesMap = new Map<string, string>();
      data.clients.forEach(c => namesMap.set(c.id, c.name));
      setDrillDownClientNames(namesMap);
    }
    setDrillDownData(data);
    setShowDrillDownModal(true);
  };

  // NEW: Handle selection from drill-down modal
  const handleDrillDownSelect = async (clientId: string, scenarioId?: string) => {
    setShowDrillDownModal(false);

    // Find the client from our loaded clients list
    const client = clients.find(c => c.id === clientId);

    if (client) {
      handleClientSelect(client);

      // If a specific scenario was selected, we could highlight it
      // The scenario loading happens in handleClientSelect via router param
      if (scenarioId) {
        // Store scenarioId to auto-select after scenarios load
        sessionStorage.setItem('autoSelectScenarioId', scenarioId);
      }
    } else {
      // If client not in our list, navigate anyway
      router.push(`/monte-carlo?clientId=${clientId}`);
    }
  };

  // ENHANCED: With assessment tracking using existing service
  const handleScenarioComplete = useCallback(async (results: any) => {
    // Store results but DON'T change viewMode - let NuclearMonteCarlo show its detailed results
    setLatestResults(results);
    setShowResults(true);
    // NOTE: We intentionally DON'T set viewMode here - NuclearMonteCarlo has its own detailed results view
    
    // INTEGRATION: Track assessment completion in background
    if (selectedClient) {
      setIsTrackingProgress(true);
      
      try {
        // Get current scenario count
        const { count } = await supabase
          .from('monte_carlo_scenarios')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', selectedClient.id);
        
        const scenarioCount = (count || 0) + 1; // Include the one just created
        
        // Track completion using existing AssessmentService
        await AssessmentService.updateProgress(selectedClient.id, {
          assessmentType: 'monteCarlo',
          status: 'completed',
          progressPercentage: 100,
          metadata: {
            lastSimulation: new Date().toISOString(),
            scenarioCount,
            lastSuccessRate: results.successRate,
            lastSimulationCount: results.simulationCount || 5000,
            lastScenarioName: results.scenarioName || 'Monte Carlo Simulation'
          }
        });
        
        // Log history
        await AssessmentService.logHistory(selectedClient.id, {
          assessmentType: 'monteCarlo',
          action: 'simulation_completed',
          changes: {
            scenarioName: results.scenarioName || 'Monte Carlo Simulation',
            successRate: results.successRate,
            simulationCount: results.simulationCount || 5000,
            medianWealth: results.medianFinalWealth,
            failureRisk: results.failureRisk
          }
        });
        
        // Show success toast
        toast({
          title: 'Simulation Complete',
          description: 'Monte Carlo analysis has been recorded',
          variant: 'default',
          duration: 3000
        });
        
      } catch (error) {
        clientLogger.error('Failed to track Monte Carlo progress:', error);
        // Don't show error toast - this is non-blocking
      } finally {
        setIsTrackingProgress(false);
      }
      
      // Refresh scenarios in background
      loadScenarios(selectedClient.id);
    }
  }, [selectedClient, loadScenarios, supabase, toast]);

  const handleScenarioClick = async (scenario: ScenarioWithResult) => {
    // Check if scenario has results
    if (!scenario.result && !scenario.success_probability) {
      toast({
        title: "No Results",
        description: "This scenario has no results yet.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedScenario(scenario);
    setViewMode('history');
  };

  const filteredClients = filterClients({ clients, searchTerm, statFilter });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LineChart className="h-16 w-16 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading Monte Carlo Analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!selectedClient ? (
        // Enhanced Client Selection Dashboard
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monte Carlo Analysis</h1>
              <p className="text-gray-600 mt-2">
                Select a client to run probability-based retirement planning simulations
              </p>
            </div>

            {/* Enhanced Dashboard Stats - clickable for drill-down */}
            <DashboardStats onStatClick={handleStatClick} />

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search clients by name, email, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border rounded-lg focus:outline-none focus:border-blue-500"
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
                      {searchTerm ? 'Try adjusting your search terms.' : 'Create clients before running Monte Carlo analysis.'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => router.push('/clients/new')}>
                        Create New Client
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="bg-white p-6 rounded-lg border hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
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
                          
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="h-4 w-4" />
                            <span>{client.contactInfo?.email}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <Button 
                            className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors"
                            variant="outline"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              handleClientSelect(client);
                            }}
                          >
                            <LineChart className="h-4 w-4 mr-2" />
                            Run Monte Carlo Analysis
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
        // Client Monte Carlo View with enhanced UX
        <>
          <div className="sticky top-0 bg-white border-b z-10">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedClient(null);
                      setViewMode('dashboard');
                      setShowResults(false);
                      setSelectedScenario(null);
                      router.push('/monte-carlo');
                    }}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Clients</span>
                  </Button>

                  <Link href={`/clients/${selectedClient.id}`}>
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>View Client Profile</span>
                    </Button>
                  </Link>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {getClientInitials(selectedClient)}
                    </div>
                    <div>
                      <Link href={`/clients/${selectedClient.id}`} className="hover:underline">
                        <p className="font-semibold">
                          {selectedClient.personalDetails?.firstName} {selectedClient.personalDetails?.lastName}
                        </p>
                      </Link>
                      <p className="text-sm text-gray-500">{selectedClient.clientRef}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* INTEGRATION: Show assessment status */}
                  {isTrackingProgress && (
                    <Badge variant="default" className="animate-pulse">
                      <Shield className="h-3 w-3 mr-1" />
                      Updating Assessment
                    </Badge>
                  )}
                  
                  {viewMode === 'results' && (
                    <Button
                      onClick={() => setViewMode('simulation')}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Simulation
                    </Button>
                  )}
                  
                  {viewMode === 'history' && (
                    <Button
                      onClick={() => setViewMode('simulation')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Scenario
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => loadScenarios(selectedClient.id)}
                    variant="outline"
                    size="sm"
                    disabled={isLoadingScenarios}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingScenarios ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Client Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Client Age</p>
                      <p className="text-2xl font-bold">{getClientAge(selectedClient)} years</p>
                    </div>
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Net Worth</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(selectedClient.financialProfile?.netWorth)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Risk Score</p>
                      <p className="text-2xl font-bold">5/10</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Scenarios Run</p>
                      <p className="text-2xl font-bold">{scenarios.length}</p>
                    </div>
                    <History className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* View Mode Content */}
            {viewMode === 'simulation' && (
              <NuclearMonteCarlo 
                clientId={selectedClient.id}
                clientName={`${selectedClient.personalDetails?.firstName} ${selectedClient.personalDetails?.lastName}`}
                initialInputs={{
                  initialPortfolio: selectedClient.financialProfile?.netWorth || 500000,
                  timeHorizon: 30,
                  annualWithdrawal: 25000,
                  riskScore: 5,
                  inflationRate: 2.5,
                  simulationCount: 5000
                }}
                onComplete={handleScenarioComplete}
              />
            )}

            {/* Show Latest Results */}
            {viewMode === 'results' && latestResults && (
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Simulation Complete
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('history')}
                    >
                      View History
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-5xl font-bold text-green-600 mb-4">
                      {latestResults.successRate?.toFixed(1) || '0'}% Success Rate
                    </p>
                    <p className="text-gray-600 mb-6">
                      Based on {latestResults.simulationCount || 0} simulations
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Median Wealth</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(latestResults.medianFinalWealth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Average Wealth</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(latestResults.averageFinalWealth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Failure Risk</p>
                        <p className="text-lg font-semibold text-red-600">
                          {latestResults.failureRisk?.toFixed(1) || '0'}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Max Drawdown</p>
                        <p className="text-lg font-semibold text-orange-600">
                          {latestResults.maxDrawdown?.toFixed(1) || '0'}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <Button
                      onClick={() => setViewMode('simulation')}
                      className="flex-1"
                    >
                      Run Another Simulation
                    </Button>
                    <Button
                      onClick={() => setViewMode('history')}
                      variant="outline"
                      className="flex-1"
                    >
                      View All Scenarios
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Scenario Details - Enhanced with Charts */}
            {selectedScenario && viewMode === 'history' && (
              <div className="space-y-6">
                {/* Header Card */}
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-blue-600" />
                        Scenario: {selectedScenario.scenario_name}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedScenario.result && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setReportScenario(selectedScenario);
                              setShowReportModal(true);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Generate Report
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedScenario(null)}
                        >
                          ✕
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Success Rate</p>
                        <p className={`text-3xl font-bold ${
                          (selectedScenario.success_probability || 0) >= 75 ? 'text-green-600' :
                          (selectedScenario.success_probability || 0) >= 50 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {(selectedScenario.success_probability || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Median Wealth</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(selectedScenario.median_final_wealth)}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Average Wealth</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(selectedScenario.average_final_wealth)}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600">Shortfall Risk</p>
                        <p className="text-xl font-bold text-red-600">
                          {(selectedScenario.shortfall_risk || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-600">Max Drawdown</p>
                        <p className="text-xl font-bold text-orange-600">
                          {(selectedScenario.max_drawdown || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Scenario Parameters */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <h4 className="font-semibold mb-3 text-gray-700">Scenario Parameters</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Initial Wealth:</span>
                          <span className="ml-2 font-medium">{formatCurrency(selectedScenario.initial_wealth)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Annual Portfolio Withdrawal:</span>
                          <span className="ml-2 font-medium">{formatCurrency(selectedScenario.withdrawal_amount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time Horizon:</span>
                          <span className="ml-2 font-medium">{selectedScenario.time_horizon} years</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Risk Score:</span>
                          <span className="ml-2 font-medium">{selectedScenario.risk_score}/10</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Charts Row 1: Sustainability Gauge + Asset Allocation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sustainability Gauge - component has its own Card wrapper */}
                  <SustainabilityGauge
                    successProbability={selectedScenario.success_probability || 0}
                    withdrawalRate={selectedScenario.withdrawal_amount && selectedScenario.initial_wealth
                      ? (selectedScenario.withdrawal_amount / selectedScenario.initial_wealth) * 100
                      : 4}
                    safeWithdrawalRate={4}
                    currentWithdrawal={selectedScenario.withdrawal_amount || 25000}
                    portfolioValue={selectedScenario.initial_wealth || 500000}
                  />

                  {/* Asset Allocation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Portfolio Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AssetAllocationPie
                        allocation={generateAllocationFromRiskScore(selectedScenario.risk_score || 5)}
                        riskScore={selectedScenario.risk_score || 5}
                        portfolioValue={selectedScenario.initial_wealth || 500000}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row 2: Fan Chart (Confidence Intervals Over Time) */}
                {selectedScenario.confidence_intervals && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Wealth Trajectory - Confidence Intervals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FanChart
                        data={generateFanChartData(selectedScenario)}
                        initialWealth={selectedScenario.initial_wealth || 500000}
                        withdrawalAmount={selectedScenario.withdrawal_amount || 25000}
                        timeHorizon={selectedScenario.time_horizon || 25}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Charts Row 3: Longevity Heatmap + Success Histogram */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Longevity Heatmap */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Longevity Risk Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LongevityHeatmap
                        currentAge={65}
                        baseSuccessProbability={selectedScenario.success_probability || 70}
                        longevityData={generateLongevityData(selectedScenario, 65)}
                      />
                    </CardContent>
                  </Card>

                  {/* Success Histogram */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Outcome Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SuccessHistogram
                        finalWealthValues={generateWealthValues(selectedScenario, 100)}
                        simulationCount={selectedScenario.simulation_count || 5000}
                        successProbability={selectedScenario.success_probability || 70}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Confidence Intervals Table */}
                {selectedScenario.confidence_intervals && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detailed Confidence Intervals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Percentile</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Final Wealth</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-600">Interpretation</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b bg-red-50">
                              <td className="py-3 px-4 font-medium">10th Percentile (Pessimistic)</td>
                              <td className="py-3 px-4 font-bold">{formatCurrency(selectedScenario.confidence_intervals.p10)}</td>
                              <td className="py-3 px-4 text-gray-600">90% chance of doing better than this</td>
                            </tr>
                            <tr className="border-b bg-amber-50">
                              <td className="py-3 px-4 font-medium">25th Percentile</td>
                              <td className="py-3 px-4 font-bold">{formatCurrency(selectedScenario.confidence_intervals.p25)}</td>
                              <td className="py-3 px-4 text-gray-600">75% chance of doing better than this</td>
                            </tr>
                            <tr className="border-b bg-blue-50">
                              <td className="py-3 px-4 font-medium">50th Percentile (Median)</td>
                              <td className="py-3 px-4 font-bold">{formatCurrency(selectedScenario.confidence_intervals.p50)}</td>
                              <td className="py-3 px-4 text-gray-600">Most likely outcome</td>
                            </tr>
                            <tr className="border-b bg-green-50">
                              <td className="py-3 px-4 font-medium">75th Percentile</td>
                              <td className="py-3 px-4 font-bold">{formatCurrency(selectedScenario.confidence_intervals.p75)}</td>
                              <td className="py-3 px-4 text-gray-600">25% chance of doing better than this</td>
                            </tr>
                            <tr className="bg-emerald-50">
                              <td className="py-3 px-4 font-medium">90th Percentile (Optimistic)</td>
                              <td className="py-3 px-4 font-bold">{formatCurrency(selectedScenario.confidence_intervals.p90)}</td>
                              <td className="py-3 px-4 text-gray-600">10% chance of doing better than this</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Scenario History */}
            {(viewMode === 'history' || viewMode === 'results') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <History className="h-5 w-5 mr-2" />
                      Simulation History
                    </span>
                    {isLoadingScenarios && (
                      <span className="text-sm text-gray-500">Loading...</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scenarios.length === 0 ? (
                    <div className="text-center py-8">
                      <LineChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Simulations Yet</h3>
                      <p className="text-gray-600 mb-4">
                        Run your first Monte Carlo simulation for this client.
                      </p>
                      <Button 
                        onClick={() => setViewMode('simulation')}
                        className="mx-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Run First Simulation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scenarios.map((scenario) => (
                        <div
                          key={scenario.id}
                          className={`border rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer ${
                            selectedScenario?.id === scenario.id ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => handleScenarioClick(scenario)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{scenario.scenario_name}</h4>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatDate(scenario.created_at)}
                                </span>
                                <span>{(scenario.simulation_count || 0).toLocaleString()} simulations</span>
                                <span>{scenario.time_horizon} years</span>
                                <span>{formatCurrency(scenario.withdrawal_amount)}/year</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <p className="text-sm text-gray-600">Success Rate</p>
                                <p className={`text-2xl font-bold ${
                                  (scenario.success_probability || 0) >= 75 ? 'text-green-600' :
                                  (scenario.success_probability || 0) >= 50 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {(scenario.success_probability || 0).toFixed(1)}%
                                </p>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    handleScenarioClick(scenario);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {scenario.result && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                      e.stopPropagation();
                                      setReportScenario(scenario);
                                      setShowReportModal(true);
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* INTEGRATION: Assessment Hub Link */}
            {scenarios.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Assessment Progress</p>
                        <p className="text-sm text-blue-700">
                          Monte Carlo analysis is now tracked in the Assessment Hub
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/assessments/client/${selectedClient.id}`)}
                      className="text-blue-700 border-blue-300"
                    >
                      View Hub
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Report Generation Modal */}
      {showReportModal && reportScenario && reportScenario.result && selectedClient && (
        <MonteCarloReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportScenario(null);
          }}
          scenario={reportScenario}
          result={reportScenario.result}
          client={selectedClient}
        />
      )}

      {/* Stats Drill-Down Modal */}
      <StatsDrillDownModal
        isOpen={showDrillDownModal}
        onClose={() => {
          setShowDrillDownModal(false);
          setDrillDownData(null);
        }}
        data={drillDownData}
        onSelectClient={handleDrillDownSelect}
        clientNames={drillDownClientNames}
      />
    </div>
  );
}

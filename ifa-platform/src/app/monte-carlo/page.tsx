// ================================================================
// src/app/monte-carlo/page.tsx
// FINAL VERSION - Using existing AssessmentService
// All existing functionality preserved + assessment tracking
// ================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clientService } from '@/services/ClientService';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { MonteCarloReportButton } from '@/components/monte-carlo/MonteCarloReport';
import NuclearMonteCarlo from '@/components/monte-carlo/NuclearMonteCarlo';
// FIX: Use existing AssessmentService
import { AssessmentService } from '@/services/AssessmentService';
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

// Enhanced type definitions with strict typing
interface MonteCarloScenario {
  id: string;
  client_id: string;
  scenario_name: string;
  created_at: string;
  initial_wealth: number;
  time_horizon: number;
  withdrawal_amount: number;
  risk_score: number;
  inflation_rate: number;
}

interface MonteCarloResult {
  id: string;
  scenario_id: string;
  success_probability: number;
  simulation_count: number;
  average_final_wealth: number;
  median_final_wealth: number;
  confidence_intervals: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  shortfall_risk: number;
  average_shortfall_amount: number;
  wealth_volatility: number;
  maximum_drawdown: number;
  calculation_status: string;
  created_at: string;
}

interface ScenarioWithResult extends MonteCarloScenario {
  result?: MonteCarloResult;
  success_probability?: number;
  simulation_count?: number;
  average_final_wealth?: number;
  median_final_wealth?: number;
  confidence_intervals?: any;
  shortfall_risk?: number;
  volatility?: number;
  max_drawdown?: number;
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalScenarios: number;
  averageSuccessRate: number;
}

type ViewMode = 'dashboard' | 'simulation' | 'results' | 'history';
type StatFilter = 'all' | 'active' | 'with-scenarios' | 'high-success';

export default function MonteCarloPage() {
  const supabase = createClient()
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
  const [stats, setStats] = useState<DashboardStats>({
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

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadClientAndScenarios(clientId);
      setViewMode('history');
    }
  }, [clientId]);

  const loadInitialData = async () => {
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
      console.error('Error loading initial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total clients count from database
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Get total scenarios
      const { count: scenariosCount } = await supabase
        .from('monte_carlo_scenarios')
        .select('*', { count: 'exact', head: true });

      // Get average success rate with null safety
      const { data: resultsData } = await supabase
        .from('monte_carlo_results')
        .select('success_probability')
        .not('success_probability', 'is', null);

      const avgSuccess = resultsData && resultsData.length > 0
        ? resultsData.reduce((sum, r) => sum + (r.success_probability || 0), 0) / resultsData.length
        : 0;

      // Active clients (those with scenarios in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentScenarios } = await supabase
        .from('monte_carlo_scenarios')
        .select('client_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const uniqueActiveClients = new Set(recentScenarios?.map(s => s.client_id) || []);

      setStats({
        totalClients: clientCount || 0,
        activeClients: uniqueActiveClients.size,
        totalScenarios: scenariosCount || 0,
        averageSuccessRate: avgSuccess
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const loadClientAndScenarios = async (clientIdToLoad: string) => {
    try {
      setIsLoadingScenarios(true);
      
      // Load client details
      const client = await clientService.getClientById(clientIdToLoad);
      setSelectedClient(client);

      // Load scenarios for this client
      await loadScenarios(clientIdToLoad);

    } catch (err) {
      console.error('Error loading client and scenarios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const loadScenarios = async (clientIdToLoad: string) => {
    try {
      // Get scenarios
      const { data: scenarios, error: scenarioError } = await supabase
        .from('monte_carlo_scenarios')
        .select('*')
        .eq('client_id', clientIdToLoad)
        .order('created_at', { ascending: false });

      if (scenarioError) throw scenarioError;

      if (!scenarios || scenarios.length === 0) {
        setScenarios([]);
        return;
      }

      // Get all results for these scenarios
      const scenarioIds = scenarios.map(s => s.id);
      const { data: results, error: resultsError } = await supabase
        .from('monte_carlo_results')
        .select('*')
        .in('scenario_id', scenarioIds);

      if (resultsError) throw resultsError;

      // Combine scenarios with their results - with null safety
      const scenariosWithResults: ScenarioWithResult[] = scenarios.map(scenario => {
        const result = results?.find(r => r.scenario_id === scenario.id);
        
        return {
          ...scenario,
          result,
          success_probability: result?.success_probability ?? 0,
          simulation_count: result?.simulation_count ?? 0,
          average_final_wealth: result?.average_final_wealth,
          median_final_wealth: result?.median_final_wealth,
          confidence_intervals: result?.confidence_intervals,
          shortfall_risk: result?.shortfall_risk,
          volatility: result?.wealth_volatility,
          max_drawdown: result?.maximum_drawdown
        };
      });

      setScenarios(scenariosWithResults);
    } catch (err) {
      console.error('Error loading scenarios:', err);
      setError('Failed to load scenarios');
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setViewMode('history');
    router.push(`/monte-carlo?clientId=${client.id}`);
  };

  // ENHANCED: With assessment tracking using existing service
  const handleScenarioComplete = useCallback(async (results: any) => {
    console.log('Scenario completed with results:', results);
    
    // Store and show results
    setLatestResults(results);
    setShowResults(true);
    setViewMode('results');
    
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
        console.error('Failed to track Monte Carlo progress:', error);
        // Don't show error toast - this is non-blocking
      } finally {
        setIsTrackingProgress(false);
      }
      
      // Refresh scenarios in background
      loadScenarios(selectedClient.id);
    }
  }, [selectedClient, toast]);

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

  // Handle stat card clicks
  const handleStatClick = (filter: StatFilter) => {
    setStatFilter(filter);
    // Apply filtering logic here
  };

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '£0';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string | null | undefined): string => {
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

  const getClientAge = (client: Client): number => {
    // Calculate from DOB if available in client data
    return 45; // Placeholder
  };

  const getClientInitials = (client: Client): string => {
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'XX';
  };

  // Filter clients based on search and stat filter
  const filteredClients = clients.filter(client => {
    const fullName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.toLowerCase();
    const email = client.contactInfo?.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search) || email.includes(search) || client.clientRef.toLowerCase().includes(search);
    
    // Apply stat filter
    if (statFilter === 'all') return matchesSearch;
    // Add more filter logic as needed
    
    return matchesSearch;
  });

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

            {/* Interactive Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleStatClick('all')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Clients</p>
                      <p className="text-2xl font-bold">{stats.totalClients}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleStatClick('active')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold">{stats.activeClients}</p>
                      <p className="text-xs text-gray-500">Last 30 days</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Scenarios</p>
                      <p className="text-2xl font-bold">{stats.totalScenarios}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Success Rate</p>
                      <p className="text-2xl font-bold">{stats.averageSuccessRate.toFixed(1)}%</p>
                    </div>
                    <Target className="h-8 w-8 text-orange-500" />
                  </div>
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
                            onClick={(e) => {
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
                  
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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

            {/* Selected Scenario Details */}
            {selectedScenario && viewMode === 'history' && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Scenario: {selectedScenario.scenario_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedScenario(null)}
                    >
                      ✕
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className={`text-2xl font-bold ${
                        (selectedScenario.success_probability || 0) >= 75 ? 'text-green-600' :
                        (selectedScenario.success_probability || 0) >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(selectedScenario.success_probability || 0).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Median Wealth</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(selectedScenario.median_final_wealth)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Shortfall Risk</p>
                      <p className="text-lg font-semibold text-red-600">
                        {(selectedScenario.shortfall_risk || 0).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Volatility</p>
                      <p className="text-lg font-semibold">
                        {(selectedScenario.volatility || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {selectedScenario.confidence_intervals && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Confidence Intervals</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">10th Percentile</span>
                          <span className="font-medium">{formatCurrency(selectedScenario.confidence_intervals.p10)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">50th Percentile</span>
                          <span className="font-medium">{formatCurrency(selectedScenario.confidence_intervals.p50)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">90th Percentile</span>
                          <span className="font-medium">{formatCurrency(selectedScenario.confidence_intervals.p90)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    {selectedScenario.result && (
                      <MonteCarloReportButton
                        scenario={selectedScenario}
                        result={selectedScenario.result}
                        client={selectedClient}
                        variant="default"
                        className="w-full"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleScenarioClick(scenario);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {scenario.result && (
                                  <MonteCarloReportButton
                                    scenario={scenario}
                                    result={scenario.result}
                                    client={selectedClient}
                                    variant="outline"
                                  />
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
    </div>
  );
}
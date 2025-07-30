// src/app/monte-carlo/page.tsx
// Updated Monte Carlo Page with NuclearMonteCarlo component

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clientService } from '@/services/ClientService';
import { supabase } from '@/lib/supabase';
import { MonteCarloReportButton } from '@/components/monte-carlo/MonteCarloReport';
import NuclearMonteCarlo from '@/components/monte-carlo/NuclearMonteCarlo';
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
  BarChart3
} from 'lucide-react';
import type { Client, ClientListResponse } from '@/types/client';

interface MonteCarloScenario {
  id: string;
  client_id: string;
  scenario_name: string;
  created_at: string;
  success_probability: number;
  simulation_count: number;
  initial_wealth?: number;
  time_horizon?: number;
  withdrawal_amount?: number;
  risk_score?: number;
  average_final_wealth?: number;
  median_final_wealth?: number;
  confidence_intervals?: any;
  shortfall_risk?: number;
  volatility?: number;
  max_drawdown?: number;
  average_shortfall_amount?: number;
  wealth_volatility?: number;
  maximum_drawdown?: number;
}

interface SelectedScenarioDetails extends MonteCarloScenario {
  yearlyProjections?: any[];
  simulations?: any[];
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalScenarios: number;
  averageSuccessRate: number;
}

export default function MonteCarloPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [scenarios, setScenarios] = useState<MonteCarloScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<SelectedScenarioDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [isLoadingScenarioDetails, setIsLoadingScenarioDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalScenarios: 0,
    averageSuccessRate: 0
  });
  
  // Store latest simulation result
  const [latestSimulationResult, setLatestSimulationResult] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadClientAndScenarios(clientId);
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

      // Load stats
      await loadStats();

      // If we have a clientId in URL, load that client
      if (clientId) {
        await loadClientAndScenarios(clientId);
      }

    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total scenarios
      const { count: scenariosCount } = await supabase
        .from('monte_carlo_scenarios')
        .select('*', { count: 'exact', head: true });

      // Get average success rate
      const { data: resultsData } = await supabase
        .from('monte_carlo_results')
        .select('success_probability');

      const avgSuccess = resultsData && resultsData.length > 0
        ? resultsData.reduce((sum, r) => sum + r.success_probability, 0) / resultsData.length
        : 0;

      // Active clients (those with scenarios in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeCount } = await supabase
        .from('monte_carlo_scenarios')
        .select('client_id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats({
        totalClients: clients.length,
        activeClients: activeCount || 0,
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
      // Get scenarios directly
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

      // Combine scenarios with their results
      const scenariosWithResults = scenarios.map(scenario => {
        const result = results?.find(r => r.scenario_id === scenario.id);
        
        return {
          ...scenario,
          success_probability: result?.success_probability || 0,
          simulation_count: result?.simulation_count || 0,
          average_final_wealth: result?.average_final_wealth,
          median_final_wealth: result?.median_final_wealth,
          confidence_intervals: result?.confidence_intervals,
          shortfall_risk: result?.shortfall_risk,
          volatility: result?.wealth_volatility,
          max_drawdown: result?.maximum_drawdown,
          average_shortfall_amount: result?.average_shortfall_amount,
          wealth_volatility: result?.wealth_volatility,
          maximum_drawdown: result?.maximum_drawdown
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
    router.push(`/monte-carlo?clientId=${client.id}`);
  };

  const handleScenarioComplete = useCallback(async (results: any) => {
    console.log('Scenario completed with results:', results);
    
    // Store the results immediately
    setLatestSimulationResult(results);
    
    // Show success state for a moment before refreshing
    setTimeout(async () => {
      if (selectedClient) {
        await refreshScenarios(selectedClient.id);
      }
      setShowNewScenario(false);
    }, 1500);
  }, [selectedClient]);

  const refreshScenarios = async (clientIdToRefresh: string) => {
    setIsLoadingScenarios(true);
    await loadScenarios(clientIdToRefresh);
    setIsLoadingScenarios(false);
  };

  const handleScenarioClick = async (scenario: MonteCarloScenario) => {
    try {
      setIsLoadingScenarioDetails(true);
      setSelectedScenario(null);

      // Load full scenario details
      const { data, error } = await supabase
        .from('monte_carlo_results')
        .select('*')
        .eq('scenario_id', scenario.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setSelectedScenario({
        ...scenario,
        ...data
      });

    } catch (err) {
      console.error('Error loading scenario details:', err);
      setError('Failed to load scenario details');
    } finally {
      setIsLoadingScenarioDetails(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getClientAge = (client: Client) => {
    // Calculate age from client data if available
    // This is a placeholder - adjust based on your client data structure
    return 45;
  };

  const getClientInitials = (client: Client) => {
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Filter clients based on search
  const filteredClients = clients.filter(client => {
    const fullName = `${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`.toLowerCase();
    const email = client.contactInfo?.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search) || client.clientRef.toLowerCase().includes(search);
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

  // Error state
  if (error && !selectedClient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-center mb-2">Error Loading Data</h2>
            <p className="text-center text-gray-600">{error}</p>
            <div className="text-center mt-4">
              <Button onClick={loadInitialData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!selectedClient ? (
        // Enhanced Client Selection View with Dashboard
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monte Carlo Analysis</h1>
              <p className="text-gray-600 mt-2">
                Select a client to run probability-based retirement planning simulations
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
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

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold">{stats.activeClients}</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
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

              <Card>
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
        // Client Monte Carlo View with NuclearMonteCarlo
        <>
          <div className="sticky top-0 bg-white border-b z-10">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedClient(null);
                      setShowNewScenario(false);
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
                  <Button
                    onClick={() => refreshScenarios(selectedClient.id)}
                    variant="outline"
                    size="sm"
                    disabled={isLoadingScenarios}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingScenarios ? 'animate-spin' : ''}`} />
                  </Button>
                  
                  {!showNewScenario && (
                    <Button
                      onClick={() => {
                        setShowNewScenario(true);
                        setSelectedScenario(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Scenario
                    </Button>
                  )}
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
                      {formatCurrency(selectedClient.financialProfile?.netWorth || 500000)}
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

          {/* New Scenario Form with NuclearMonteCarlo */}
          {showNewScenario && (
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

          {/* Selected Scenario Details */}
          {selectedScenario && !showNewScenario && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Scenario Details: {selectedScenario.scenario_name}</span>
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
                      selectedScenario.success_probability >= 75 ? 'text-green-600' :
                      selectedScenario.success_probability >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {selectedScenario.success_probability.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Median Wealth</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(selectedScenario.median_final_wealth || 0)}
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
                  <MonteCarloReportButton
                    scenario={selectedScenario}
                    client={selectedClient}
                    variant="default"
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scenario History */}
          {!showNewScenario && (
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
                      onClick={() => setShowNewScenario(true)}
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
                              <span>{scenario.simulation_count.toLocaleString()} simulations</span>
                              {scenario.time_horizon && (
                                <span>{scenario.time_horizon} years</span>
                              )}
                              {scenario.withdrawal_amount && (
                                <span>{formatCurrency(scenario.withdrawal_amount)}/year</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-sm text-gray-600">Success Rate</p>
                              <p className={`text-2xl font-bold ${
                                scenario.success_probability >= 75 ? 'text-green-600' :
                                scenario.success_probability >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {scenario.success_probability.toFixed(1)}%
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
                              <MonteCarloReportButton
                                scenario={scenario}
                                client={selectedClient}
                                variant="outline"
                              />
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

          {/* Display latest results if just completed */}
          {latestSimulationResult && !showNewScenario && scenarios.length === 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle>Latest Simulation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    {latestSimulationResult.successRate.toFixed(1)}% Success
                  </p>
                  <p className="text-gray-600">
                    Results are being saved. They will appear in the history shortly.
                  </p>
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
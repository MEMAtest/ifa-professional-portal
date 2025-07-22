// src/app/monte-carlo/page.tsx
// Complete updated version with all fixes

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clientService } from '@/services/ClientService';
import { supabase } from '@/lib/supabase';
import { MonteCarloReportButton } from '@/components/monte-carlo/MonteCarloReport';
import EnhancedMonteCarloRunner from '@/components/monte-carlo/EnhancedMonteCarloRunner';
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
  RefreshCw
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
}

interface MonteCarloInput {
  initialWealth: number;
  timeHorizon: number;
  withdrawalAmount: number;
  riskScore: number;
  inflationRate?: number;
  simulationCount?: number;
}

export default function MonteCarloPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [scenarios, setScenarios] = useState<MonteCarloScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewScenario, setShowNewScenario] = useState(false);

  // Default inputs
  const [monteCarloInputs, setMonteCarloInputs] = useState<MonteCarloInput>({
    initialWealth: 500000,
    timeHorizon: 30,
    withdrawalAmount: 25000,
    riskScore: 5,
    inflationRate: 2.5,
    simulationCount: 5000
  });

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

  const loadClientAndScenarios = async (clientId: string) => {
    try {
      // Load selected client
      const client = await clientService.getClientById(clientId);
      setSelectedClient(client);

      // Pre-populate inputs based on client data
      if (client) {
        const age = calculateAge(client.personalDetails?.dateOfBirth);
        const yearsToRetirement = Math.max(65 - age, 1);
        
        setMonteCarloInputs({
          initialWealth: client.financialProfile?.netWorth || 
                        client.financialProfile?.liquidAssets || 
                        500000,
          timeHorizon: yearsToRetirement,
          withdrawalAmount: (client.financialProfile?.monthlyExpenses || 2000) * 12,
          riskScore: client.riskProfile?.attitudeToRisk || 5,
          inflationRate: 2.5,
          simulationCount: 5000
        });
      }

      // Load scenarios
      await refreshScenarios(clientId);

    } catch (err) {
      console.error('Error loading client and scenarios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    }
  };

  const refreshScenarios = async (clientId: string) => {
    try {
      setIsLoadingScenarios(true);
      console.log('🔄 Refreshing scenarios for client:', clientId);
      
      const { data, error } = await supabase
        .from('monte_carlo_results')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading scenarios:', error);
        throw error;
      }

      console.log('✅ Scenarios loaded:', data?.length || 0);
      setScenarios(data || []);
      
      // If client has no scenarios yet, show new scenario form
      if (!data || data.length === 0) {
      }
    } catch (err) {
      console.error('Error refreshing scenarios:', err);
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    router.push(`/monte-carlo?clientId=${client.id}`);
  };

  const handleScenarioComplete = async (results: any) => {
    console.log('🎯 Simulation complete, refreshing scenarios...');
    
    // Add a delay to ensure the database write completes
    setTimeout(async () => {
      if (selectedClient) {
        await refreshScenarios(selectedClient.id);
      }
      setShowNewScenario(false);
    }, 1500); // 1.5 second delay
  };

  const calculateAge = (dateOfBirth?: string): number => {
    if (!dateOfBirth) return 45;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Monte Carlo system...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !selectedClient) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={loadInitialData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Monte Carlo Analysis</h1>
        <p className="text-gray-600">
          Probability-based retirement planning and portfolio analysis
        </p>
      </div>

      {/* Main Content */}
      {!selectedClient ? (
        // Client Selection View
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select a Client</CardTitle>
              <p className="text-sm text-gray-600">
                Choose a client to run Monte Carlo simulations
              </p>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Clients Found</h3>
                  <p className="text-gray-600 mb-4">
                    Create clients before running Monte Carlo analysis.
                  </p>
                  <Button onClick={() => router.push('/clients/new')}>
                    Create New Client
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="p-4 border rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleClientSelect(client)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">
                          {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                        </h3>
                        <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>📧 {client.contactInfo?.email}</div>
                        {client.financialProfile?.netWorth && (
                          <div>💰 {formatCurrency(client.financialProfile.netWorth)} net worth</div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Click to run Monte Carlo analysis
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Client Monte Carlo View
        <div className="space-y-6">
          {/* Client Header with Back Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedClient(null);
                  setShowNewScenario(false);
                  router.push('/monte-carlo');
                }}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Client List</span>
              </Button>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedClient.personalDetails?.firstName} {selectedClient.personalDetails?.lastName}
                </h2>
                <p className="text-gray-600">
                  Monte Carlo Analysis
                </p>
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
              <Button
                onClick={() => setShowNewScenario(!showNewScenario)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Scenario
              </Button>
            </div>
          </div>

          {/* Client Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Client</p>
                    <p className="font-medium">
                      {selectedClient.personalDetails?.firstName} {selectedClient.personalDetails?.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Current Age</p>
                    <p className="font-medium">
                      {calculateAge(selectedClient.personalDetails?.dateOfBirth)} years
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Net Worth</p>
                    <p className="font-medium">
                      {formatCurrency(selectedClient.financialProfile?.netWorth || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Risk Score</p>
                    <p className="font-medium">
                      {selectedClient.riskProfile?.attitudeToRisk || 5}/10
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Scenario */}
          {showNewScenario && (
            <Card>
              <CardHeader>
                <CardTitle>Run New Monte Carlo Simulation</CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedMonteCarloRunner 
                  clientId={selectedClient.id}
                  clientName={`${selectedClient.personalDetails?.firstName} ${selectedClient.personalDetails?.lastName}`}
                  initialInputs={monteCarloInputs}
                  onComplete={handleScenarioComplete}
                />
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
                    <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No simulations run yet</p>
                    <Button onClick={() => setShowNewScenario(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Run First Simulation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scenarios.map((scenario) => (
                      <div 
                        key={scenario.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <h4 className="font-semibold">{scenario.scenario_name}</h4>
                            <p className="text-sm text-gray-600">{formatDate(scenario.created_at)}</p>
                            
                            {/* Show scenario parameters */}
                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                              {scenario.initial_wealth && (
                                <span>Initial: {formatCurrency(scenario.initial_wealth)}</span>
                              )}
                              {scenario.time_horizon && (
                                <span>{scenario.time_horizon} years</span>
                              )}
                              {scenario.withdrawal_amount && (
                                <span>Withdrawal: {formatCurrency(scenario.withdrawal_amount)}/year</span>
                              )}
                              {scenario.risk_score && (
                                <span>Risk: {scenario.risk_score}/10</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Success Rate</p>
                              <p className={`text-2xl font-bold ${
                                scenario.success_probability >= 75 ? 'text-green-600' :
                                scenario.success_probability >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {scenario.success_probability.toFixed(1)}%
                              </p>
                            </div>
                            <MonteCarloReportButton
                              scenario={scenario}
                              client={selectedClient}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
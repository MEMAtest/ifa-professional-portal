// ===================================================================
// src/app/monte-carlo/[clientId]/page.tsx - Client Monte Carlo Analysis
// ===================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Download,
  Plus
} from 'lucide-react';
import type { Client } from '@/types/client';

interface MonteCarloScenario {
  id: string;
  client_id: string;
  scenario_name: string;
  created_at: string;
  success_probability: number;
  simulation_count: number;
}

interface MonteCarloInput {
  initialWealth: number;
  timeHorizon: number;
  withdrawalAmount: number;
  riskScore: number;
  inflationRate?: number;
  simulationCount?: number;
}

export default function ClientMonteCarloPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<Client | null>(null);
  const [scenarios, setScenarios] = useState<MonteCarloScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<MonteCarloScenario | null>(null);

  // Pre-populated inputs based on client data
  const [monteCarloInputs, setMonteCarloInputs] = useState<MonteCarloInput>({
    initialWealth: 500000,
    timeHorizon: 30,
    withdrawalAmount: 25000,
    riskScore: 5,
    inflationRate: 2.5,
    simulationCount: 5000
  });

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load client data
      const clientData = await clientService.getClientById(clientId);
      setClient(clientData);

      // Pre-populate Monte Carlo inputs based on client data
      if (clientData) {
        const age = calculateAge(clientData.personalDetails?.dateOfBirth);
        const yearsToRetirement = Math.max(65 - age, 1);
        
        setMonteCarloInputs({
          initialWealth: clientData.financialProfile?.netWorth || 
                        clientData.financialProfile?.liquidAssets || 
                        500000,
          timeHorizon: yearsToRetirement,
          withdrawalAmount: (clientData.financialProfile?.monthlyExpenses || 2000) * 12,
          riskScore: clientData.riskProfile?.attitudeToRisk || 5,
          inflationRate: 2.5,
          simulationCount: 5000
        });
      }

      // Load existing scenarios
      await loadScenarios();

    } catch (err) {
      console.error('Error loading client data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('monte_carlo_results')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScenarios(data || []);
      
      // If client has no scenarios yet, show new scenario form
      if (!data || data.length === 0) {
        setShowNewScenario(true);
      }
    } catch (err) {
      console.error('Error loading scenarios:', err);
    }
  };

  const calculateAge = (dateOfBirth?: string): number => {
    if (!dateOfBirth) return 45; // Default age
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
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
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleScenarioComplete = async (results: any) => {
    // Refresh scenarios list after new simulation
    await loadScenarios();
    setShowNewScenario(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading client data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Client</h3>
              <p className="text-gray-600 mb-4">{error || 'Client not found'}</p>
              <Button onClick={() => router.push('/monte-carlo')}>
                Back to Client List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const age = calculateAge(client.personalDetails?.dateOfBirth);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/monte-carlo')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Client List
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Monte Carlo Analysis
            </h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <span className="font-medium">
                  {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                </span>
              </div>
              <Badge variant="secondary">{client.status}</Badge>
            </div>
          </div>
          
          <Button
            onClick={() => setShowNewScenario(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
        </div>
      </div>

      {/* Client Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Worth</p>
                <p className="text-xl font-bold">
                  {formatCurrency(client.financialProfile?.netWorth || 0)}
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
                <p className="text-sm text-gray-500">Current Age</p>
                <p className="text-xl font-bold">{age} years</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className="text-xl font-bold">
                  {client.riskProfile?.attitudeToRisk || 'N/A'}/10
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Annual Expenses</p>
                <p className="text-xl font-bold">
                  {formatCurrency((client.financialProfile?.monthlyExpenses || 0) * 12)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {showNewScenario ? (
        <Card>
          <CardHeader>
            <CardTitle>Run New Monte Carlo Simulation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                The simulation inputs have been pre-populated based on {client.personalDetails?.firstName}'s 
                financial profile. You can adjust any values before running the simulation.
              </p>
              <div className="mt-2 text-xs text-blue-700">
                <p>• Initial Wealth: {formatCurrency(monteCarloInputs.initialWealth)}</p>
                <p>• Time Horizon: {monteCarloInputs.timeHorizon} years (to age 65)</p>
                <p>• Annual Withdrawal: {formatCurrency(monteCarloInputs.withdrawalAmount)}</p>
                <p>• Risk Score: {monteCarloInputs.riskScore}/10</p>
              </div>
            </div>
            
            {/* Note: The EnhancedMonteCarloRunner will need to be modified to accept these inputs */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <p className="text-sm text-yellow-800 font-medium">Integration Note:</p>
              <p className="text-sm text-yellow-700">
                To complete the integration, update the EnhancedMonteCarloRunner component in your codebase to:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
                <li>Accept initialInputs prop for pre-populated values</li>
                <li>Accept clientId prop to save results with client association</li>
                <li>Accept onComplete callback to refresh the scenarios list</li>
              </ul>
            </div>
            
            {/* Use the existing Enhanced Monte Carlo Runner */}
            <EnhancedMonteCarloRunner />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Scenario History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Simulation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scenarios.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No simulations run yet</p>
                  <Button onClick={() => setShowNewScenario(true)}>
                    Run First Simulation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedScenario(scenario)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{scenario.scenario_name}</h4>
                          <p className="text-sm text-gray-500">
                            {formatDate(scenario.created_at)} • {scenario.simulation_count.toLocaleString()} simulations
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {scenario.success_probability.toFixed(1)}%
                          </div>
                          <p className="text-sm text-gray-500">Success Rate</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Scenario Details */}
          {selectedScenario && (
            <Card>
              <CardHeader>
                <CardTitle>Scenario Details: {selectedScenario.scenario_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Success Probability</p>
                    <div className="text-3xl font-bold text-green-600">
                      {selectedScenario.success_probability.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <MonteCarloReportButton 
  scenario={selectedScenario} 
  client={client} 
  variant="outline"
/>
                    <Button
                      onClick={() => {
                        setSelectedScenario(null);
                        setShowNewScenario(true);
                      }}
                    >
                      Run New Scenario
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
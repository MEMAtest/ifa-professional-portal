// src/app/monte-carlo/[clientId]/page.tsx
// Fixed version with correct imports and props

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clientService } from '@/services/ClientService'; // ✅ Fixed: lowercase 'c'
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
      const clientData = await clientService.getClientById(clientId); // ✅ Now using correct import
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

  const handleScenarioComplete = async (results: any) => {
    // Refresh scenarios list after new simulation
    await loadScenarios();
    setShowNewScenario(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading client data...</p>
            </div>
          </CardContent>
        </Card>
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

  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim();
  const clientAge = calculateAge(client.personalDetails?.dateOfBirth);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => router.push('/monte-carlo')}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Client List
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monte Carlo Analysis</h1>
            <p className="text-gray-600 mt-1">
              Probability-based retirement planning for {clientName}
            </p>
          </div>
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
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium">{clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Current Age</p>
                <p className="font-medium">{clientAge} years</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Net Worth</p>
                <p className="font-medium">
                  {formatCurrency(client.financialProfile?.netWorth || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className="font-medium">
                  {client.riskProfile?.attitudeToRisk || 5}/10
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Scenario Section */}
      {showNewScenario && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Run New Monte Carlo Simulation</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedMonteCarloRunner 
              clientId={clientId}
              clientName={clientName}
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
            <CardTitle className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              Simulation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scenarios.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  No simulations run yet for this client
                </p>
                <Button
                  onClick={() => setShowNewScenario(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {scenario.scenario_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(scenario.created_at)}
                        </p>
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
                          client={client}
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
  );
}
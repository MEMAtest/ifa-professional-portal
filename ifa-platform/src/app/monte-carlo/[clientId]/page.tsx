// src/app/monte-carlo/[clientId]/page.tsx
// WORKING VERSION - Direct API calls, no service

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { MonteCarloReportButton } from '@/components/monte-carlo/MonteCarloReport';
import EnhancedMonteCarloRunner from '@/components/monte-carlo/EnhancedMonteCarloRunner';
import { 
  ArrowLeft, User, DollarSign, Calendar, TrendingUp, 
  AlertCircle, History, Plus
} from 'lucide-react';

export default function ClientMonteCarloPage() {
  const router = useRouter();
  const params = useParams();
  
  // Get clientId - try multiple approaches
  const clientId = (params as any)?.clientId || 
                   (params as Record<string, string>)?.clientId || 
                   window.location.pathname.split('/').pop();

  const [client, setClient] = useState<any>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewScenario, setShowNewScenario] = useState(false);

  // Default inputs
  const [monteCarloInputs] = useState({
    initialWealth: 500000,
    timeHorizon: 30,
    withdrawalAmount: 25000,
    riskScore: 5,
    inflationRate: 2.5,
    simulationCount: 5000
  });

  useEffect(() => {
    if (clientId && clientId !== 'monte-carlo') {
      loadData();
    } else {
      setError('No client ID provided');
      setIsLoading(false);
    }
  }, [clientId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load client directly from Supabase
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) {
        throw new Error('Client not found');
      }

      // Transform the data
      const transformedClient = {
        id: clientData.id,
        clientRef: clientData.client_ref,
        personalDetails: clientData.personal_details || {},
        financialProfile: clientData.financial_profile || {},
        riskProfile: clientData.risk_profile || {},
        status: clientData.status
      };

      setClient(transformedClient);

      // Load scenarios
      const { data: scenarioData, error: scenarioError } = await supabase
        .from('monte_carlo_results')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (!scenarioError) {
        setScenarios(scenarioData || []);
        if (!scenarioData || scenarioData.length === 0) {
          setShowNewScenario(true);
        }
      }

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioComplete = async () => {
    await loadData();
    setShowNewScenario(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading client data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error || 'Client not found'}</p>
            <Button onClick={() => router.push('/monte-carlo')}>
              Back to Client List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() || 'Client';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button onClick={() => router.push('/monte-carlo')} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Monte Carlo Analysis</h1>
            <p className="text-gray-600 mt-1">{clientName}</p>
          </div>
          <Button onClick={() => setShowNewScenario(!showNewScenario)}>
            <Plus className="h-4 w-4 mr-2" />
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
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Net Worth</p>
                <p className="font-medium">
                  £{(client.financialProfile?.netWorth || 0).toLocaleString()}
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
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">{client.status}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Scenario */}
      {showNewScenario && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Run New Simulation</CardTitle>
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

      {/* History */}
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
                <p className="text-gray-600 mb-4">No simulations yet</p>
                <Button onClick={() => setShowNewScenario(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Run First Simulation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{scenario.scenario_name}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(scenario.created_at).toLocaleDateString()}
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
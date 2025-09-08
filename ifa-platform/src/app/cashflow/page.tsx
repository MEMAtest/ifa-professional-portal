// ================================================================
// src/app/cashflow/page.tsx - UPDATED VERSION
// Added Stress Test button and fixed Generate Report to use modal
// ================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import CashFlowDashboard from '@/components/cashflow/CashFlowDashboard';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { CashFlowScenarioService } from '@/services/CashFlowScenarioService';
import { clientService } from '@/services/ClientService';
import { useClientIntegration } from '@/lib/hooks/useClientIntegration';
import { AssessmentService } from '@/services/AssessmentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
// ADDED: Import modals
import GenerateReportModal from '@/components/cashflow/EnhancedGenerateReportModal';
import { StressTestModal } from '@/components/cashflow/StressTestModal';
import { 
  TrendingUp, 
  Calculator, 
  Users, 
  FileText, 
  Shield, 
  Plus,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Target,
  Activity,
  ChevronRight,
  Save,
  Loader2,
  Zap // ADDED: Zap icon for stress test
} from 'lucide-react';
import type { Client, ClientListResponse } from '@/types/client';
import type { CashFlowScenario } from '@/types/cashflow';

// ================================================================
// INTERFACES FOR INTEGRATION
// ================================================================

interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  action: () => void;
  disabled?: boolean;
}

interface TrackingState {
  isTracking: boolean;
  lastTrackedScenarioId?: string;
}

// ================================================================
// MAIN COMPONENT WITH INTEGRATION
// ================================================================

export default function CashFlowPage() {
  const supabase = createClient()
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');
  const action = searchParams?.get('action');
  const { toast } = useToast();

  // Existing state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [scenarios, setScenarios] = useState<CashFlowScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [showNewScenarioDialog, setShowNewScenarioDialog] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState>({
    isTracking: false
  });

  // ADDED: Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStressTestModal, setShowStressTestModal] = useState(false);
  const [selectedScenarioForReport, setSelectedScenarioForReport] = useState<CashFlowScenario | null>(null);

  const { 
    client: integratedClient,
    dashboardData,
    linkScenario,
    getIntegrationStatus
  } = useClientIntegration({
    clientId: selectedClient?.id || undefined,
    autoSave: false
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadClientAndScenarios(clientId);
    }
  }, [clientId]);

  useEffect(() => {
    if (action === 'new' && selectedClient) {
      setShowNewScenarioDialog(true);
      const newUrl = `/cashflow?clientId=${selectedClient.id}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [action, selectedClient]);

  useEffect(() => {
    if (!selectedClient) return;

    const handleScenarioSave = async (event: CustomEvent) => {
      const { scenario, isNew } = event.detail;
      
      if (isNew && scenario.id !== trackingState.lastTrackedScenarioId) {
        await trackCashFlowProgress(scenario);
        setTrackingState({
          isTracking: false,
          lastTrackedScenarioId: scenario.id
        });
      }
    };

    window.addEventListener('cashflow:scenarioSaved' as any, handleScenarioSave as EventListener);
    
    return () => {
      window.removeEventListener('cashflow:scenarioSaved' as any, handleScenarioSave as EventListener);
    };
  }, [selectedClient, trackingState.lastTrackedScenarioId]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const clientsResponse: ClientListResponse = await clientService.getAllClients(
        { status: ['active'] },
        1,
        100
      );
      setClients(clientsResponse.clients);

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
      const client = await clientService.getClientById(clientId);
      setSelectedClient(client);

      const clientScenarios = await CashFlowDataService.getScenariosForClient(clientId);
      setScenarios(clientScenarios);

      if (clientScenarios.length === 0) {
        await createDefaultScenario(client);
      }

    } catch (err) {
      console.error('Error loading client and scenarios:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    }
  };

  const createDefaultScenario = async (client: Client) => {
    try {
      setIsCreatingScenario(true);
      
      const defaultScenario = await CashFlowScenarioService.ensureClientHasScenario(client.id);
      
      if (linkScenario) {
        await linkScenario(defaultScenario.id);
      }
      
      await trackCashFlowProgress(defaultScenario as any);
      
      const updatedScenarios = await CashFlowDataService.getScenariosForClient(client.id);
      setScenarios(updatedScenarios);
      
      toast({
        title: 'Default Scenario Created',
        description: 'A base case scenario has been created for this client',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error creating default scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to create default scenario',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingScenario(false);
    }
  };

  const trackCashFlowProgress = async (scenario: CashFlowScenario) => {
    if (!selectedClient) return;
    
    try {
      setTrackingState({ isTracking: true, lastTrackedScenarioId: scenario.id });
      
      const { count } = await supabase
        .from('cashflow_scenarios')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', selectedClient.id);
      
      const scenarioCount = count || 1;
      
      await AssessmentService.updateProgress(selectedClient.id, {
        assessmentType: 'cashFlow',
        status: 'completed',
        progressPercentage: 100,
        metadata: {
          lastUpdate: new Date().toISOString(),
          scenarioCount,
          lastScenarioName: scenario.scenarioName || 'Cash Flow Scenario',
          scenarioType: scenario.scenarioType || 'standard',
          projectionYears: scenario.projectionYears || 30
        }
      });
      
      await AssessmentService.logHistory(selectedClient.id, {
        assessmentType: 'cashFlow',
        action: 'scenario_created',
        changes: {
          scenarioName: scenario.scenarioName,
          type: scenario.scenarioType || 'standard',
          projectionYears: scenario.projectionYears || 30
        }
      });
      
      toast({
        title: 'Progress Updated',
        description: 'Cash flow assessment has been recorded',
        variant: 'default',
        duration: 2000
      });
      
    } catch (error) {
      console.error('Failed to track cash flow progress:', error);
    } finally {
      setTrackingState(prev => ({ ...prev, isTracking: false }));
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    router.push(`/cashflow?clientId=${client.id}`);
  };

  const handleStartAssessment = () => {
    if (!selectedClient) return;
    router.push(`/assessments/suitability?clientId=${selectedClient.id}`);
  };

  // UPDATED: Generate Report to use modal
  const handleGenerateReport = () => {
    if (!selectedClient || scenarios.length === 0) return;
    setSelectedScenarioForReport(scenarios[0]);
    setShowReportModal(true);
  };

  // ADDED: Stress Test handler
  const handleStressTest = () => {
    if (!selectedClient || scenarios.length === 0) return;
    setSelectedScenarioForReport(scenarios[0]);
    setShowStressTestModal(true);
  };

  const handleRunMonteCarlo = () => {
    if (!selectedClient) return;
    router.push(`/monte-carlo?clientId=${selectedClient.id}`);
  };

  const handleViewClient = () => {
    if (!selectedClient) return;
    router.push(`/clients/${selectedClient.id}`);
  };

  const handleViewAssessmentHub = () => {
    if (!selectedClient) return;
    router.push(`/assessments/client/${selectedClient.id}`);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // UPDATED: Quick actions with Stress Test
  const getQuickActions = (): QuickAction[] => {
    if (!selectedClient) return [];
    
    const integrationStatus = getIntegrationStatus();
    
    return [
      {
        icon: Shield,
        label: 'Risk Assessment',
        description: integrationStatus.hasAssessment ? 'View assessment' : 'Start assessment',
        action: handleStartAssessment,
        disabled: false
      },
      {
        icon: Zap,
        label: 'Stress Test',
        description: 'Test scenario resilience',
        action: handleStressTest,
        disabled: scenarios.length === 0
      },
      {
        icon: Activity,
        label: 'Monte Carlo',
        description: 'Run simulation',
        action: handleRunMonteCarlo,
        disabled: scenarios.length === 0
      },
      {
        icon: FileText,
        label: 'Generate Report',
        description: 'Create cash flow report',
        action: handleGenerateReport,
        disabled: scenarios.length === 0
      }
    ];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cash flow system...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <AlertCircle className="h-16 w-16 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Cash Flow System</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={loadInitialData} variant="outline">
                Try Again
              </Button>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Flow Analysis</h1>
        <p className="text-gray-600">
          Professional cash flow modeling and financial planning for your clients
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
                Choose a client to begin cash flow analysis and financial planning
              </p>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <Users className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clients Found</h3>
                  <p className="text-gray-600 mb-4">
                    You need to create clients before you can perform cash flow analysis.
                  </p>
                  <Button onClick={() => router.push('/clients/new')}>
                    Create New Client
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map((client) => {
                    const hasAssessment = dashboardData?.client?.id === client.id && 
                                        dashboardData?.currentAssessment !== null;
                    
                    return (
                      <div
                        key={client.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">
                            {client.personalDetails?.firstName} {client.personalDetails?.lastName}
                          </h3>
                          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <span>📧</span> {client.contactInfo?.email}
                          </div>
                          {client.financialProfile?.annualIncome && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(client.financialProfile.annualIncome)} annual income
                            </div>
                          )}
                          {client.financialProfile?.netWorth && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {formatCurrency(client.financialProfile.netWorth)} net worth
                            </div>
                          )}
                          
                          <div className="flex gap-2 mt-2">
                            {hasAssessment && (
                              <Badge className="text-xs bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Assessed
                              </Badge>
                            )}
                            {client.riskProfile?.riskTolerance && (
                              <Badge className="text-xs" variant="outline">
                                {client.riskProfile.riskTolerance} risk
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500 mt-2 flex items-center">
                            Click to start cash flow analysis
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Overview */}
          {clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
                    <div className="text-sm text-gray-600">Total Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {clients.filter(c => c.status === 'active').length}
                    </div>
                    <div className="text-sm text-gray-600">Active Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {scenarios.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Scenarios</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(
                        clients.reduce((sum, client) => 
                          sum + (client.financialProfile?.netWorth || 0), 0
                        )
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Total AUM</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Client Cash Flow Dashboard View
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedClient(null);
                  router.push('/cashflow');
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
                  {selectedClient.contactInfo?.email} • {selectedClient.status}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {trackingState.isTracking && (
                <Badge variant="default" className="animate-pulse">
                  <Save className="h-3 w-3 mr-1" />
                  Saving Progress
                </Badge>
              )}
              
              <Badge variant={selectedClient.status === 'active' ? 'default' : 'secondary'}>
                {selectedClient.status}
              </Badge>
              {scenarios.length > 0 && (
                <Badge variant="outline">
                  {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {dashboardData?.currentAssessment && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Risk Assessed
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {getQuickActions().map((action, index) => (
              <Card
                key={index}
                className={`cursor-pointer hover:shadow-lg transition-all ${
                  action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={!action.disabled ? action.action : undefined}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <action.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{action.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Warnings and Info */}
          {scenarios.length === 0 && !isCreatingScenario && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <h3 className="font-medium text-orange-900">No Scenarios Found</h3>
                <p className="text-sm text-orange-800 mt-1">
                  Creating default scenario for this client...
                </p>
              </div>
            </Alert>
          )}

          {dashboardData?.currentAssessment && scenarios.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Risk Profile Applied</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Scenarios are using the client's {dashboardData.currentAssessment.riskProfile.overall} risk profile
                      with a risk score of {dashboardData.currentAssessment.riskProfile.attitudeToRisk}/10
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartAssessment}
                    className="text-blue-700 border-blue-300"
                  >
                    Update Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cash Flow Dashboard Component */}
          <CashFlowDashboard clientId={selectedClient.id} />

          {/* Assessment Hub Link */}
          {scenarios.length > 0 && (
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">Assessment Progress</p>
                      <p className="text-sm text-purple-700">
                        Cash flow planning is now tracked in the Assessment Hub
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewAssessmentHub}
                    className="text-purple-700 border-purple-300"
                  >
                    View Hub
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* UPDATED: Next Steps with Stress Test and fixed Generate Report */}
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!dashboardData?.currentAssessment && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Complete Risk Assessment</p>
                        <p className="text-sm text-gray-600">Required for accurate projections</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={handleStartAssessment}>
                      Start Assessment
                    </Button>
                  </div>
                )}
                
                {scenarios.length > 0 && (
                  <>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">Run Stress Test</p>
                          <p className="text-sm text-gray-600">Test financial resilience</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleStressTest}>
                        Run Test
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Run Monte Carlo Analysis</p>
                          <p className="text-sm text-gray-600">Test scenario probability</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleRunMonteCarlo}>
                        Run Analysis
                      </Button>
                    </div>
                  </>
                )}
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Generate Cash Flow Report</p>
                      <p className="text-sm text-gray-600">Professional client report</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleGenerateReport}
                    disabled={scenarios.length === 0}
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ADDED: Modals */}
      {showReportModal && selectedScenarioForReport && (
        <GenerateReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          scenario={selectedScenarioForReport}
        />
      )}

      {showStressTestModal && selectedScenarioForReport && (
        <StressTestModal
          isOpen={showStressTestModal}
          onClose={() => setShowStressTestModal(false)}
          scenario={selectedScenarioForReport}
          client={selectedClient}
        />
      )}
    </div>
  );
}
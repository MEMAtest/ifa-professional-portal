// ================================================================
// src/app/cashflow/page.tsx - UPDATED VERSION
// Added Stress Test button and fixed Generate Report to use modal
// ================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import CashFlowDashboard from '@/components/cashflow/CashFlowDashboard';
import { useClientIntegration } from '@/lib/hooks/useClientIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
// ADDED: Import modals
import GenerateReportModal from '@/components/cashflow/EnhancedGenerateReportModal';
import { StressTestModal } from '@/components/cashflow/StressTestModal';
import { CashFlowDrillDownModal } from '@/components/cashflow/CashFlowDrillDownModal';
import { CashFlowAlertsCard } from '@/components/cashflow/dashboard/CashFlowAlertsCard';
import { CashFlowCommandCenterCards } from '@/components/cashflow/dashboard/CashFlowCommandCenterCards';
import { CashFlowCoverageFunnelCard } from '@/components/cashflow/dashboard/CashFlowCoverageFunnelCard';
import { CashFlowPortfolioMomentumCard } from '@/components/cashflow/dashboard/CashFlowPortfolioMomentumCard';
import { CashFlowRetirementDistributionCard } from '@/components/cashflow/dashboard/CashFlowRetirementDistributionCard';
import { CashFlowRiskMixCard } from '@/components/cashflow/dashboard/CashFlowRiskMixCard';
import {
  DRILLDOWN_CONFIGS,
  FILTER_LABELS
} from '@/components/cashflow/dashboard/constants';
import {
  buildAumSeries,
  buildCommandCenterStats,
  buildCoverageSeries,
  buildRetirementDistribution,
  buildRiskMix,
  buildRiskStats,
  createCoverageSets,
  filterClientsByKey,
  hasAssessmentForClient,
  hasDocumentsForClient,
  hasScenarioForClient
} from '@/components/cashflow/dashboard/data';
import {
  formatCompactCurrency,
  formatCurrency
} from '@/components/cashflow/dashboard/utils';
import type {
  ClientFilterKey,
  QuickAction
} from '@/components/cashflow/dashboard/types';
import { useCashFlowPageData } from '@/components/cashflow/hooks/useCashFlowPageData';
import { 
  ArrowLeft,
  AlertCircle,
  Calculator,
  CheckCircle,
  DollarSign,
  Activity,
  ChevronRight,
  FileText,
  Save,
  Shield,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import type { Client } from '@/types/client';
import type { CashFlowScenario } from '@/types/cashflow';

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
  const [showNewScenarioDialog, setShowNewScenarioDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ClientFilterKey>('all');
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [drillDownKey, setDrillDownKey] = useState<ClientFilterKey>('all');

  const { 
    client: integratedClient,
    dashboardData,
    linkScenario,
    getIntegrationStatus
  } = useClientIntegration({
    clientId: clientId || undefined,
    autoSave: false
  });

  const {
    selectedClient,
    setSelectedClient,
    clients,
    scenarios,
    isLoading,
    error,
    isCreatingScenario,
    coverageLoaded,
    coverageClientIds,
    scenarioRetirementAges,
    trackingState,
    setTrackingState,
    trackCashFlowProgress,
    reloadData
  } = useCashFlowPageData({
    supabase,
    clientId,
    linkScenario,
    toast
  });

  // ADDED: Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStressTestModal, setShowStressTestModal] = useState(false);
  const [selectedScenarioForReport, setSelectedScenarioForReport] = useState<CashFlowScenario | null>(null);

  useEffect(() => {
    if (action === 'new' && selectedClient) {
      setShowNewScenarioDialog(true);
      const newUrl = `/cashflow?clientId=${selectedClient.id}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [action, selectedClient]);

  useEffect(() => {
    if (!selectedClient) return;

    const handleScenarioSave = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { scenario, isNew } = customEvent.detail;

      if (isNew && scenario.id !== trackingState.lastTrackedScenarioId) {
        await trackCashFlowProgress(scenario);
        setTrackingState({
          isTracking: false,
          lastTrackedScenarioId: scenario.id
        });
      }
    };

    window.addEventListener('cashflow:scenarioSaved', handleScenarioSave as EventListener);

    return () => {
      window.removeEventListener('cashflow:scenarioSaved', handleScenarioSave as EventListener);
    };
  }, [selectedClient, trackCashFlowProgress, trackingState.lastTrackedScenarioId, setTrackingState]);

  useEffect(() => {
    const handleScenarioSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ scenario?: CashFlowScenario }>;
      if (customEvent.detail?.scenario) {
        setSelectedScenarioForReport(customEvent.detail.scenario);
      }
    };

    window.addEventListener('cashflow:scenarioSelected', handleScenarioSelected as EventListener);

    return () => {
      window.removeEventListener('cashflow:scenarioSelected', handleScenarioSelected as EventListener);
    };
  }, []);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    router.push(`/cashflow?clientId=${client.id}`);
  };

  const handleClientSelectById = (clientId: string) => {
    const targetClient = clients.find((client) => client.id === clientId);
    if (targetClient) {
      handleClientSelect(targetClient);
    }
  };

  const handleStartAssessment = () => {
    if (!selectedClient) return;
    router.push(`/assessments/suitability?clientId=${selectedClient.id}`);
  };

  // UPDATED: Generate Report to use modal
  const handleGenerateReport = () => {
    if (!selectedClient || scenarios.length === 0) return;
    const targetScenario = selectedScenarioForReport || scenarios[0];
    setSelectedScenarioForReport(targetScenario);
    setShowReportModal(true);
  };

  // ADDED: Stress Test handler
  const handleStressTest = () => {
    if (!selectedClient || scenarios.length === 0) return;
    const targetScenario = selectedScenarioForReport || scenarios[0];
    setSelectedScenarioForReport(targetScenario);
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

  const coverageSets = useMemo(() => createCoverageSets(coverageClientIds), [coverageClientIds]);

  const openDrillDown = (filter: ClientFilterKey) => {
    setActiveFilter(filter);
    setDrillDownKey(filter);
    setIsDrillDownOpen(true);
  };

  const handleFilterKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    filter: ClientFilterKey
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDrillDown(filter);
    }
  };

  const getInteractiveCardProps = (filter: ClientFilterKey, baseClassName = '') => {
    const isActive = activeFilter === filter;
    return {
      role: 'button' as const,
      tabIndex: 0,
      onClick: () => openDrillDown(filter),
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => handleFilterKeyDown(event, filter),
      className: `${baseClassName} cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-blue-500 border-blue-200' : 'hover:border-blue-200 hover:shadow-md'
      }`
    };
  };

  const getInteractiveRowProps = (filter: ClientFilterKey, baseClassName = '') => {
    const isActive = activeFilter === filter;
    return {
      role: 'button' as const,
      tabIndex: 0,
      onClick: () => openDrillDown(filter),
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => handleFilterKeyDown(event, filter),
      className: `${baseClassName} rounded-lg px-2 py-2 transition-colors ${
        isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
      }`
    };
  };

  const riskStats = useMemo(() => buildRiskStats(clients), [clients]);

  const commandCenterStats = useMemo(
    () =>
      buildCommandCenterStats(
        clients,
        riskStats,
        (client) => hasAssessmentForClient(client, coverageLoaded, coverageSets),
        (client) => hasScenarioForClient(client, coverageLoaded, coverageSets)
      ),
    [clients, riskStats, coverageLoaded, coverageSets]
  );

  const riskMix = useMemo(() => buildRiskMix(riskStats), [riskStats]);

  const retirementDistribution = useMemo(
    () => buildRetirementDistribution(clients, scenarioRetirementAges),
    [clients, scenarioRetirementAges]
  );

  const coverageSeries = useMemo(
    () =>
      buildCoverageSeries(
        clients,
        coverageLoaded,
        coverageSets,
        (client) => hasAssessmentForClient(client, coverageLoaded, coverageSets),
        (client) => hasScenarioForClient(client, coverageLoaded, coverageSets),
        (client) => hasDocumentsForClient(client, coverageLoaded, coverageSets)
      ),
    [clients, coverageLoaded, coverageSets]
  );

  const handleRiskMixSelection = (label?: string) => {
    if (!label) return;
    const normalized = label.toLowerCase();
    if (normalized.includes('conservative')) {
      openDrillDown('risk_conservative');
      return;
    }
    if (normalized.includes('moderate')) {
      openDrillDown('risk_moderate');
      return;
    }
    if (normalized.includes('growth')) {
      openDrillDown('risk_growth');
      return;
    }
    if (normalized.includes('aggressive')) {
      openDrillDown('risk_aggressive');
      return;
    }
    if (normalized.includes('unrated')) {
      openDrillDown('risk_unrated');
    }
  };

  const aumSeries = useMemo(() => buildAumSeries(clients), [clients]);

  const filteredClients = useMemo(
    () =>
      filterClientsByKey({
        clients,
        filter: activeFilter,
        scenarioRetirementAges,
        hasAssessment: (client) => hasAssessmentForClient(client, coverageLoaded, coverageSets),
        hasScenario: (client) => hasScenarioForClient(client, coverageLoaded, coverageSets),
        hasDocument: (client) => hasDocumentsForClient(client, coverageLoaded, coverageSets)
      }),
    [activeFilter, clients, coverageLoaded, coverageSets, scenarioRetirementAges]
  );

  const drillDownClients = useMemo(
    () =>
      filterClientsByKey({
        clients,
        filter: drillDownKey,
        scenarioRetirementAges,
        hasAssessment: (client) => hasAssessmentForClient(client, coverageLoaded, coverageSets),
        hasScenario: (client) => hasScenarioForClient(client, coverageLoaded, coverageSets),
        hasDocument: (client) => hasDocumentsForClient(client, coverageLoaded, coverageSets)
      }),
    [drillDownKey, clients, coverageLoaded, coverageSets, scenarioRetirementAges]
  );

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
              <Button onClick={reloadData} variant="outline">
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
          {clients.length > 0 && (
            <div className="space-y-6">
              <CashFlowCommandCenterCards
                stats={commandCenterStats}
                formatCompactCurrency={formatCompactCurrency}
                getInteractiveCardProps={getInteractiveCardProps}
              />

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <CashFlowPortfolioMomentumCard
                  aumSeries={aumSeries}
                  formatCompactCurrency={formatCompactCurrency}
                  formatCurrency={formatCurrency}
                  getInteractiveCardProps={getInteractiveCardProps}
                />
                <CashFlowRiskMixCard riskMix={riskMix} onSelect={handleRiskMixSelection} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <CashFlowAlertsCard
                  stats={commandCenterStats}
                  getInteractiveRowProps={getInteractiveRowProps}
                />
                <CashFlowCoverageFunnelCard
                  coverageSeries={coverageSeries}
                  onSelect={(key) => {
                    if (key) openDrillDown(key);
                  }}
                />
                <CashFlowRetirementDistributionCard
                  retirementDistribution={retirementDistribution}
                  onSelect={(key) => {
                    if (key) openDrillDown(key);
                  }}
                />
              </div>
            </div>
          )}

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
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>
                        Showing {filteredClients.length} of {clients.length} clients
                      </span>
                      {activeFilter !== 'all' && (
                        <Badge variant="outline">{FILTER_LABELS[activeFilter]}</Badge>
                      )}
                    </div>
                    {activeFilter !== 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveFilter('all')}
                      >
                        Clear filter
                      </Button>
                    )}
                  </div>

                  {filteredClients.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <Users className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No clients match this filter
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Try a different filter or clear to see all clients.
                      </p>
                      <Button variant="outline" onClick={() => setActiveFilter('all')}>
                        Clear Filter
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredClients.map((client) => {
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
                </>
              )}
            </CardContent>
          </Card>
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
                      Scenarios are using the client&apos;s {dashboardData.currentAssessment.riskProfile.overall} risk profile
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

      {isDrillDownOpen && (
        <CashFlowDrillDownModal
          isOpen={isDrillDownOpen}
          onClose={() => setIsDrillDownOpen(false)}
          title={DRILLDOWN_CONFIGS[drillDownKey]?.title || 'Client Drill Down'}
          description={DRILLDOWN_CONFIGS[drillDownKey]?.description}
          clients={drillDownClients}
          onSelectClient={handleClientSelectById}
          defaultSort={DRILLDOWN_CONFIGS[drillDownKey]?.sortField}
          highlightLabel={FILTER_LABELS[drillDownKey]}
          showOnboarded={DRILLDOWN_CONFIGS[drillDownKey]?.showOnboarded}
        />
      )}
    </div>
  );
}

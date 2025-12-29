// ================================================================
// src/components/cashflow/CashFlowDashboard.tsx - UPDATED
// Integrated real StressTestModal instead of placeholder
// All existing functionality preserved
// ================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Target,
  FileText,
  Zap,
  Eye,
  Plus,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { ProjectionEngine } from '@/lib/cashflow/projectionEngine';
import { clientService } from '@/services/ClientService';
import GenerateReportModal from '@/components/cashflow/EnhancedGenerateReportModal';
import { StressTestModal } from '@/components/cashflow/StressTestModal'; // NEW: Import real component
import { SustainabilityGauge } from '@/components/cashflow/SustainabilityGauge';
import { ProjectionChart } from '@/components/cashflow/ProjectionChart';

// FIX: Add proper type imports
import type { 
  CashFlowScenario, 
  ProjectionResult, 
  ProjectionSummary,
  ClientGoal,
  ScenarioType 
} from '@/types/cashflow';
import type { Client } from '@/types/client';

interface CashFlowDashboardProps {
  clientId: string;
}

export default function CashFlowDashboard({ clientId }: CashFlowDashboardProps) {
  const selectionStorageKey = `cashflow:selectedScenario:${clientId}`;
  // State management
  const [client, setClient] = useState<Client | null>(null);
  const [scenarios, setScenarios] = useState<CashFlowScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [projectionResult, setProjectionResult] = useState<ProjectionResult | null>(null);
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStressTestModal, setShowStressTestModal] = useState(false);
  const [useRealTerms, setUseRealTerms] = useState(false);

  const router = useRouter();

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, [clientId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load client data
      const clientData = await clientService.getClientById(clientId);
      setClient(clientData);

      // Load existing scenarios
      const clientScenarios = await CashFlowDataService.getClientScenarios(clientId);
      setScenarios(clientScenarios);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjections = useCallback(async (scenario: CashFlowScenario) => {
    try {
      const result = await ProjectionEngine.generateProjections(scenario);
      setProjectionResult(result);
    } catch (err) {
      console.error('Error loading projections:', err);
      setError('Failed to generate projections');
    }
  }, []);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) || null,
    [scenarios, selectedScenarioId]
  );

  const displayScenarios = useMemo(() => {
    const byType = new Map<ScenarioType, CashFlowScenario>();

    scenarios.forEach((scenario) => {
      const existing = byType.get(scenario.scenarioType);
      if (!existing) {
        byType.set(scenario.scenarioType, scenario);
        return;
      }

      const existingTimestamp = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const scenarioTimestamp = new Date(scenario.updatedAt || scenario.createdAt || 0).getTime();
      if (scenarioTimestamp >= existingTimestamp) {
        byType.set(scenario.scenarioType, scenario);
      }
    });

    return Array.from(byType.values()).sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [scenarios]);

  const visibleScenarios = useMemo(() => {
    if (selectedScenario) {
      return [selectedScenario];
    }
    return displayScenarios;
  }, [displayScenarios, selectedScenario]);

  const assetSplit = useMemo(() => {
    const investments = client?.financialProfile?.existingInvestments || [];
    const isaTotal = investments
      .filter((investment) => investment.type === 'isa')
      .reduce((sum, investment) => sum + (investment.currentValue || 0), 0);
    const giaTotal = investments
      .filter((investment) => investment.type === 'general_investment')
      .reduce((sum, investment) => sum + (investment.currentValue || 0), 0);
    const investmentTotal = isaTotal + giaTotal;

    if (investmentTotal <= 0) return null;

    return {
      isaRatio: isaTotal / investmentTotal,
      giaRatio: giaTotal / investmentTotal
    };
  }, [client?.financialProfile?.existingInvestments]);

  const milestones = useMemo(() => {
    if (!selectedScenario) return [];

    const eventList: Array<{ year: number; label: string; color?: string }> = [];
    const addEvent = (age: number | undefined, label: string, color?: string) => {
      if (!age || age < selectedScenario.clientAge) return;
      const year = age - selectedScenario.clientAge + 1;
      if (year < 1 || year > selectedScenario.projectionYears) return;
      eventList.push({ year, label, color });
    };

    addEvent(selectedScenario.retirementAge, 'Retirement', '#2563eb');
    addEvent(selectedScenario.statePensionAge, 'State Pension', '#16a34a');

    if (selectedScenario.mortgageBalance > 0 && selectedScenario.mortgagePayment > 0) {
      const yearsToPayoff = Math.ceil(selectedScenario.mortgageBalance / selectedScenario.mortgagePayment);
      addEvent(selectedScenario.clientAge + yearsToPayoff, 'Mortgage Paid Off', '#f59e0b');
    }

    const capitalEvents = (selectedScenario.vulnerabilityAdjustments as any)?.capitalExpenditures
      || (selectedScenario.vulnerabilityAdjustments as any)?.capitalEvents;
    if (Array.isArray(capitalEvents)) {
      capitalEvents.forEach((event: any) => {
        if (event?.age && event?.label) {
          addEvent(event.age, event.label, '#dc2626');
        }
      });
    }

    return eventList;
  }, [selectedScenario]);

  useEffect(() => {
    if (scenarios.length === 0) {
      setSelectedScenarioId(null);
      setProjectionResult(null);
      return;
    }

    const storedScenarioId = typeof window !== 'undefined'
      ? window.sessionStorage.getItem(selectionStorageKey)
      : null;

    const hasSelected = selectedScenarioId && scenarios.some((scenario) => scenario.id === selectedScenarioId);
    const hasStored = storedScenarioId && scenarios.some((scenario) => scenario.id === storedScenarioId);
    const displayScenarioIds = new Set(displayScenarios.map((scenario) => scenario.id));

    if (selectedScenarioId && hasSelected && !displayScenarioIds.has(selectedScenarioId)) {
      const selected = scenarios.find((scenario) => scenario.id === selectedScenarioId);
      const fallback = selected
        ? displayScenarios.find((scenario) => scenario.scenarioType === selected.scenarioType)
        : null;
      const fallbackId = fallback?.id || displayScenarios[0]?.id;
      if (fallbackId && fallbackId !== selectedScenarioId) {
        setSelectedScenarioId(fallbackId);
        return;
      }
    }

    const nextScenarioId = hasSelected
      ? selectedScenarioId
      : hasStored
        ? storedScenarioId
        : displayScenarios[0]?.id;

    if (nextScenarioId && nextScenarioId !== selectedScenarioId) {
      setSelectedScenarioId(nextScenarioId);
    }
  }, [scenarios, selectedScenarioId, selectionStorageKey, displayScenarios]);

  useEffect(() => {
    if (!selectedScenario) return;
    loadProjections(selectedScenario);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(selectionStorageKey, selectedScenario.id);
      window.dispatchEvent(new CustomEvent('cashflow:scenarioSelected', { detail: { scenario: selectedScenario } }));
    }
  }, [selectedScenario, loadProjections, selectionStorageKey]);

  const handleCreateScenario = async (scenarioType: ScenarioType = 'base') => {
    try {
      setIsCreatingScenario(true);
      setError(null);

      // Create new scenario from client data
      const newScenario = await CashFlowDataService.createScenarioFromClient(clientId, scenarioType);
      
      // Create associated goals if method exists
      try {
        if (typeof (CashFlowDataService as any).createGoalsFromClient === 'function') {
          await (CashFlowDataService as any).createGoalsFromClient(clientId, newScenario.id);
        }
      } catch (error) {
        console.log('createGoalsFromClient not implemented yet');
      }

      const updatedScenarios = await CashFlowDataService.getClientScenarios(clientId);
      setScenarios(updatedScenarios);
      setSelectedScenarioId(newScenario.id);

    } catch (err) {
      console.error('Error creating scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to create scenario');
    } finally {
      setIsCreatingScenario(false);
    }
  };

  // Navigate to scenario detail page
  const handleViewScenario = (scenarioId: string) => {
    router.push(`/cashflow/scenarios/${scenarioId}`);
  };

  const handleSelectScenario = async (scenario: CashFlowScenario) => {
    setSelectedScenarioId(scenario.id);
  };

  const handleScenarioTypeSelect = async (scenarioType: ScenarioType) => {
    const existingScenario = displayScenarios.find((scenario) => scenario.scenarioType === scenarioType);
    if (existingScenario) {
      await handleSelectScenario(existingScenario);
      return;
    }
    await handleCreateScenario(scenarioType);
  };

  const finalProjection = projectionResult?.projections?.[projectionResult.projections.length - 1];
  const finalPortfolioValue = useRealTerms
    ? finalProjection?.realTermsValue ?? projectionResult?.summary?.finalPortfolioValue ?? 0
    : projectionResult?.summary?.finalPortfolioValue ?? 0;

  // Safe age calculation with proper null checks
  const getClientAge = (client: Client | null): number => {
    if (!client?.personalDetails?.dateOfBirth) {
      return 0;
    }

    try {
      const dateOfBirth = client.personalDetails.dateOfBirth;
      if (!dateOfBirth || dateOfBirth.trim() === '') {
        return 0;
      }

      const birthDate = new Date(dateOfBirth);
      
      // Check if date is valid
      if (isNaN(birthDate.getTime())) {
        return 0;
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return Math.max(0, age);
    } catch (error) {
      console.warn('Error calculating age:', error);
      return 0;
    }
  };

  // Get badge color for sustainability rating
  const formatScenarioType = (scenarioType: ScenarioType): string => {
    switch (scenarioType) {
      case 'early_retirement':
        return 'Early Retirement';
      case 'high_inflation':
        return 'High-Inflation Crisis';
      case 'capacity_for_loss':
        return 'Capacity for Loss';
      case 'optimistic':
        return 'Optimistic';
      case 'pessimistic':
        return 'Pessimistic';
      case 'stress':
        return 'Stress Test';
      case 'base':
      default:
        return 'Base';
    }
  };

  // Format currency using existing utils
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cash flow dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={loadDashboardData} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cash Flow Planning</h1>
          {client && (
            <p className="text-gray-600 mt-1">
              {client.personalDetails?.firstName} {client.personalDetails?.lastName} • 
              Age {getClientAge(client)}
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setShowReportModal(true)}
            variant="outline"
            disabled={!selectedScenario}
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button
            onClick={() => setShowStressTestModal(true)}
            variant="outline"
            disabled={!selectedScenario}
          >
            <Zap className="w-4 h-4 mr-2" />
            Stress Test
          </Button>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Existing Scenarios */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">Scenarios</h2>
            <div className="flex flex-wrap gap-2">
              {([
                { type: 'base', label: 'Base Case' },
                { type: 'optimistic', label: 'Optimistic' },
                { type: 'pessimistic', label: 'Pessimistic' },
                { type: 'early_retirement', label: 'Early Retirement' },
                { type: 'high_inflation', label: 'High-Inflation Crisis' },
                { type: 'capacity_for_loss', label: 'Capacity for Loss' }
              ] as Array<{ type: ScenarioType; label: string }>).map((button) => {
                const isSelected = selectedScenario?.scenarioType === button.type;
                const exists = displayScenarios.some((scenario) => scenario.scenarioType === button.type);
                return (
                  <Button
                    key={button.type}
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleScenarioTypeSelect(button.type)}
                    disabled={isCreatingScenario}
                  >
                    {!exists && <Plus className="w-4 h-4 mr-1" />}
                    {button.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {displayScenarios.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No scenarios yet</h3>
                <p className="text-gray-500 text-center mb-4">
                  Create your first cash flow scenario to start planning
                </p>
                <Button
                  onClick={() => handleCreateScenario('base')}
                  disabled={isCreatingScenario}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isCreatingScenario ? 'Creating...' : 'Create Base Case'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {visibleScenarios.map((scenario) => (
                <Card 
                  key={scenario.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedScenario?.id === scenario.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleSelectScenario(scenario)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{scenario.scenarioName}</h3>
                        <p className="text-sm text-gray-600">
                          {formatScenarioType(scenario.scenarioType)} scenario • {scenario.projectionYears} years
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatScenarioType(scenario.scenarioType)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Retirement Age</p>
                        <p className="font-semibold">{scenario.retirementAge}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Equity Return</p>
                        <p className="font-semibold">{scenario.realEquityReturn}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Inflation</p>
                        <p className="font-semibold">{scenario.inflationRate}%</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Last updated: {new Date(scenario.updatedAt || scenario.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewScenario(scenario.id);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {projectionResult && selectedScenario && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Portfolio Growth Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectionChart
                  projections={projectionResult.projections}
                  height={360}
                  realTermsEnabled={useRealTerms}
                  onRealTermsToggle={setUseRealTerms}
                  milestones={milestones}
                  assetSplit={assetSplit || undefined}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          {projectionResult?.summary && (
            <>
              {/* Key Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Final Portfolio Value {useRealTerms ? '(Real Terms)' : ''}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(finalPortfolioValue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Value View</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUseRealTerms((prev) => !prev)}
                    >
                      {useRealTerms ? 'Show Nominal' : 'Show Real Terms'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Annual Return</span>
                    <span className="font-semibold">
                      {projectionResult.summary.averageAnnualReturn.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Goal Achievement</span>
                    <span className="font-semibold">
                      {Math.round(projectionResult.summary.goalAchievementRate)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sustainability</span>
                    <SustainabilityGauge rating={projectionResult.summary.sustainabilityRating} size="sm" />
                  </div>
                </CardContent>
              </Card>

              {/* Goal Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Goal Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Retirement Income</span>
                    {projectionResult.summary.retirementIncomeAchieved ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Emergency Fund</span>
                    {projectionResult.summary.emergencyFundAchieved ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Risk Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(projectionResult.summary.riskMetrics).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                      <Badge 
                        className={
                          value === 'Low' ? 'bg-green-100 text-green-800' :
                          value === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {String(value)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {projectionResult.summary.keyInsights?.length ? (
                    <div className="space-y-3">
                      {projectionResult.summary.keyInsights.map((insight, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-700">{insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No insights available</p>
                  )}
                </CardContent>
              </Card>

              {selectedScenario && (
                <Card>
                  <CardHeader>
                    <CardTitle>Assumptions At a Glance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Inflation</span>
                      <span className="font-semibold">
                        {selectedScenario.scenarioType === 'high_inflation'
                          ? `${(selectedScenario.inflationRate || 0).toFixed(1)}% (first 10y)`
                          : `${(selectedScenario.inflationRate || 0).toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Expected Real Growth</span>
                      <span className="font-semibold">
                        {projectionResult.summary.averageAnnualReturn.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Charges (assumed)</span>
                      <span className="font-semibold">0.75%</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => handleCreateScenario('base')}
                disabled={isCreatingScenario}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Scenario
              </Button>
              
              {selectedScenario && (
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => handleViewScenario(selectedScenario.id)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Current Scenario
                </Button>
              )}
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setShowReportModal(true)}
                disabled={!selectedScenario}
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generate Report Modal - Real Implementation */}
      <GenerateReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        scenario={selectedScenario}
      />

      {/* NEW: Real Stress Test Modal replacing placeholder */}
      <StressTestModal
        isOpen={showStressTestModal}
        onClose={() => setShowStressTestModal(false)}
        scenario={selectedScenario}
        client={client} // Pass client for mitigation strategies
      />
    </div>
  );
}

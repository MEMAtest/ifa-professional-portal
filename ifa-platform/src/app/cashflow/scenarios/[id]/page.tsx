// ================================================================
// src/app/cashflow/scenarios/[id]/page.tsx
// UPDATED: Replaced Monte Carlo with Stress Test
// All existing functionality preserved + Stress Test instead of Monte Carlo
// ================================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Target,
  Shield,
  Percent,
  AlertTriangle,
  FileText,
  Zap
} from 'lucide-react';
import { ProjectionChart } from '@/components/cashflow/ProjectionChart';
import { AssumptionEditor } from '@/components/cashflow/AssumptionEditor';
import { SustainabilityGauge } from '@/components/cashflow/SustainabilityGauge';
import { ProjectionEngine } from '@/lib/cashflow/projectionEngine';
import { CashFlowDataService } from '@/services/CashFlowDataService';
import { clientService } from '@/services/ClientService';

// ✅ UPDATED IMPORTS - Replaced MonteCarloAnalysis with StressTestAnalysis
import { StressTestAnalysis } from '@/components/cashflow/StressTestAnalysis';
import { SensitivityAnalysis } from '@/components/cashflow/SensitivityAnalysis';
import { RiskAnalysisDashboard } from '@/components/cashflow/RiskAnalysisDashboard';
import GenerateReportModal from '@/components/cashflow/EnhancedGenerateReportModal';

import type { 
  CashFlowScenario, 
  ProjectionResult, 
  CashFlowProjection 
} from '@/types/cashflow';
import type { Client } from '@/types/client';

interface ScenarioDetailPageProps {
  params: {
    id: string;
  };
}

export default function ScenarioDetailPage({ params }: ScenarioDetailPageProps) {
  // ✅ PRESERVED: All existing state
  const [scenario, setScenario] = useState<CashFlowScenario | null>(null);
  const [originalScenario, setOriginalScenario] = useState<CashFlowScenario | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [projectionResult, setProjectionResult] = useState<ProjectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [realTermsEnabled, setRealTermsEnabled] = useState(false);
  
  // ✅ PRESERVED: Report generation state
  const [showReportModal, setShowReportModal] = useState(false);

  const router = useRouter();

  const generateProjections = useCallback(async (scenarioData: CashFlowScenario) => {
    try {
      setIsCalculating(true);
      const result = await ProjectionEngine.generateProjections(scenarioData);
      setProjectionResult(result);
    } catch (err) {
      console.error('Error generating projections:', err);
      setError('Failed to generate projections');
    } finally {
      setIsCalculating(false);
    }
  }, []);

  // ✅ PRESERVED: All existing useEffect and functions
  const loadScenarioData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const scenarioData = await CashFlowDataService.getScenario(params.id);
      if (!scenarioData) {
        throw new Error('Scenario not found');
      }

      setScenario(scenarioData);
      setOriginalScenario({ ...scenarioData });

      const clientData = await clientService.getClientById(scenarioData.clientId);
      setClient(clientData);

      await generateProjections(scenarioData);

    } catch (err) {
      console.error('Error loading scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scenario');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, generateProjections]);

  useEffect(() => {
    loadScenarioData();
  }, [loadScenarioData]);

  const handleAssumptionChange = useCallback(async (updatedScenario: CashFlowScenario) => {
    setScenario(updatedScenario);
    
    if (isCalculating) return;
    
    await generateProjections(updatedScenario);
  }, [generateProjections, isCalculating]);

  const handleSave = async () => {
    if (!scenario) return;

    try {
      setIsSaving(true);
      setError(null);

      await CashFlowDataService.updateScenarioAssumptions(scenario.id, scenario);
      setOriginalScenario({ ...scenario });
      setIsEditing(false);

    } catch (err) {
      console.error('Error saving scenario:', err);
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalScenario) {
      setScenario({ ...originalScenario });
      generateProjections(originalScenario);
    }
    setIsEditing(false);
  };

  // ✅ PRESERVED: Handle sensitivity parameter changes
  const handleSensitivityChange = useCallback(async (parameterId: string, value: number) => {
    if (!scenario) return;
    
    const updatedScenario = { ...scenario };
    
    switch (parameterId) {
      case 'inflationRate':
        updatedScenario.inflationRate = value;
        break;
      case 'equityReturn':
        updatedScenario.realEquityReturn = value;
        break;
      case 'retirementAge':
        updatedScenario.retirementAge = Math.round(value);
        break;
    }
    
    await handleAssumptionChange(updatedScenario);
  }, [scenario, handleAssumptionChange]);

  // ✅ PRESERVED: All utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (rate: number): string => {
    return `${rate.toFixed(1)}%`;
  };

  const summary = projectionResult?.summary;
  const finalProjection = projectionResult?.projections?.[projectionResult.projections.length - 1];
  const finalPortfolioValue = realTermsEnabled
    ? finalProjection?.realTermsValue ?? summary?.finalPortfolioValue ?? 0
    : summary?.finalPortfolioValue ?? 0;

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
    if (!scenario) return [];

    const eventList: Array<{ year: number; label: string; color?: string }> = [];
    const addEvent = (age: number | undefined, label: string, color?: string) => {
      if (!age || age < scenario.clientAge) return;
      const year = age - scenario.clientAge + 1;
      if (year < 1 || year > scenario.projectionYears) return;
      eventList.push({ year, label, color });
    };

    addEvent(scenario.retirementAge, 'Retirement', '#2563eb');
    addEvent(scenario.statePensionAge, 'State Pension', '#16a34a');

    if (scenario.mortgageBalance > 0 && scenario.mortgagePayment > 0) {
      const yearsToPayoff = Math.ceil(scenario.mortgageBalance / scenario.mortgagePayment);
      addEvent(scenario.clientAge + yearsToPayoff, 'Mortgage Paid Off', '#f59e0b');
    }

    const capitalEvents = (scenario.vulnerabilityAdjustments as any)?.capitalExpenditures
      || (scenario.vulnerabilityAdjustments as any)?.capitalEvents;
    if (Array.isArray(capitalEvents)) {
      capitalEvents.forEach((event: any) => {
        if (event?.age && event?.label) {
          addEvent(event.age, event.label, '#dc2626');
        }
      });
    }

    return eventList;
  }, [scenario]);

  // ✅ PRESERVED: Loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scenario details...</p>
        </div>
      </div>
    );
  }

  if (error || !scenario || !client) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error || 'Scenario not found'}</p>
          <Button 
            onClick={() => router.back()} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* ✅ PRESERVED: Header with Generate Report button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {scenario.scenarioName}
            </h1>
            <p className="text-gray-600">
              {client.personalDetails?.firstName} {client.personalDetails?.lastName} • 
              Age {scenario.clientAge}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowReportModal(true)}
            variant="outline"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          
          {isEditing ? (
            <>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Assumptions
            </Button>
          )}
        </div>
      </div>

      {/* ✅ PRESERVED: Key Metrics Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">
                    Final Portfolio Value{realTermsEnabled ? ' (Real Terms)' : ''}
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(finalPortfolioValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Average Annual Return</p>
                  <p className="text-lg font-semibold">
                    {formatPercentage(summary.averageAnnualReturn)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Goal Achievement</p>
                  <p className="text-lg font-semibold">
                    {Math.round(summary.goalAchievementRate)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Sustainability</p>
                  <SustainabilityGauge rating={summary.sustainabilityRating} size="sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ UPDATED TABS: Replaced Monte Carlo with Stress Test */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="stress-test" className="flex items-center gap-1">
            <Zap className="w-4 h-4" />
            <span>Stress Test</span>
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="flex items-center gap-1">
            <Percent className="w-4 h-4" />
            <span>Sensitivity</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Risk</span>
          </TabsTrigger>
        </TabsList>

        {/* ✅ PRESERVED: All existing tabs content */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Portfolio Growth Projection</CardTitle>
              </CardHeader>
              <CardContent>
                {projectionResult ? (
                  <ProjectionChart 
                    projections={projectionResult.projections}
                    height={400}
                    realTermsEnabled={realTermsEnabled}
                    onRealTermsToggle={setRealTermsEnabled}
                    milestones={milestones}
                    assetSplit={assetSplit || undefined}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500">
                      {isCalculating ? 'Calculating projections...' : 'No projection data available'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary?.keyInsights ? (
                    <div className="space-y-3">
                      {summary.keyInsights.map((insight, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-700">{insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No insights available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assumptions At a Glance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Inflation</span>
                    <span className="font-semibold">
                      {scenario.scenarioType === 'high_inflation'
                        ? `${formatPercentage(scenario.inflationRate)} (first 10y)`
                        : formatPercentage(scenario.inflationRate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Expected Real Growth</span>
                    <span className="font-semibold">
                      {formatPercentage(summary?.averageAnnualReturn || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Charges (assumed)</span>
                    <span className="font-semibold">0.75%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Year-by-Year Projections</CardTitle>
            </CardHeader>
            <CardContent>
              {projectionResult ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Year</th>
                        <th className="text-left p-2">Age</th>
                        <th className="text-right p-2">Total Income</th>
                        <th className="text-right p-2">Total Expenses</th>
                        <th className="text-right p-2">Annual Flow</th>
                        <th className="text-right p-2">Portfolio Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectionResult.projections.slice(0, 20).map((projection) => (
                        <tr key={projection.projectionYear} className="border-b hover:bg-gray-50">
                          <td className="p-2">{projection.projectionYear + 1}</td>
                          <td className="p-2">{projection.clientAge}</td>
                          <td className="p-2 text-right">{formatCurrency(projection.totalIncome)}</td>
                          <td className="p-2 text-right">{formatCurrency(projection.totalExpenses)}</td>
                          <td className={`p-2 text-right ${projection.annualSurplusDeficit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(projection.annualSurplusDeficit)}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(projection.totalAssets)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {projectionResult.projections.length > 20 && (
                    <p className="text-center text-gray-500 mt-4">
                      Showing first 20 years of {projectionResult.projections.length} total projections
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {isCalculating ? 'Calculating projections...' : 'No projection data available'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assumptions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <AssumptionEditor
                  scenario={scenario}
                  onChange={handleAssumptionChange}
                  disabled={!isEditing}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Assumptions Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Inflation Rate</p>
                    <p className="font-semibold">{formatPercentage(scenario.inflationRate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Equity Return</p>
                    <p className="font-semibold">{formatPercentage(scenario.realEquityReturn)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bond Return</p>
                    <p className="font-semibold">{formatPercentage(scenario.realBondReturn)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cash Return</p>
                    <p className="font-semibold">{formatPercentage(scenario.realCashReturn)}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Asset Allocation</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="font-medium">{scenario.equityAllocation}%</p>
                      <p className="text-gray-500">Equity</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{scenario.bondAllocation}%</p>
                      <p className="text-gray-500">Bonds</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{scenario.cashAllocation}%</p>
                      <p className="text-gray-500">Cash</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.riskMetrics ? (
                  <div className="space-y-4">
                    {Object.entries(summary.riskMetrics).map(([key, value]) => (
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
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No risk analysis available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Goal Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Retirement Income Goal</span>
                    <Badge className={summary?.retirementIncomeAchieved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {summary?.retirementIncomeAchieved ? 'Achieved' : 'At Risk'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Emergency Fund Goal</span>
                    <Badge className={summary?.emergencyFundAchieved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {summary?.emergencyFundAchieved ? 'Achieved' : 'At Risk'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Goal Achievement</span>
                    <span className="font-semibold">
                      {summary ? Math.round(summary.goalAchievementRate) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ✅ UPDATED: Stress Test Tab instead of Monte Carlo */}
        <TabsContent value="stress-test">
          <StressTestAnalysis 
            scenario={scenario} 
            client={client}
          />
        </TabsContent>

        {/* ✅ PRESERVED: Sensitivity Analysis Tab */}
        <TabsContent value="sensitivity">
          <SensitivityAnalysis 
            scenario={scenario}
            onParameterChange={handleSensitivityChange}
          />
        </TabsContent>

        {/* ✅ PRESERVED: Enhanced Risk Analysis Tab */}
        <TabsContent value="risk">
          {summary && (
            <RiskAnalysisDashboard
              scenarioId={scenario.id}
              riskMetrics={summary.riskMetrics}
              clientAge={scenario.clientAge}
              retirementAge={scenario.retirementAge}
              projectionYears={scenario.projectionYears}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* ✅ PRESERVED: Report Generation Modal */}
      {showReportModal && (
        <GenerateReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          scenario={scenario}
        />
      )}
    </div>
  );
}

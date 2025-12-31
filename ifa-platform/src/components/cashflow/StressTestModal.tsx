// ================================================================
// src/components/cashflow/StressTestModal.tsx - ENHANCED VERSION
// Integrates new features while maintaining backward compatibility
// Adds personal crisis scenarios, custom parameters, and mitigation strategies
// ================================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  X, 
  Zap, 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  Target,
  Play,
  Settings,
  BarChart3,
  Shield,
  Sliders
} from 'lucide-react';
import { StressTestResults } from './advanced/StressTestResults';
import { CustomParametersPanel } from './advanced/CustomParametersPanel';
import { ParameterSlider } from '@/components/ui/ParameterSlider';
import { StressTestingEngine } from '@/services/StressTestingEngine';
import { MitigationStrategiesService } from '@/services/MitigationStrategiesService';
import type { CashFlowScenario } from '@/types/cashflow';
import type { Client } from '@/types/client';

// Core interfaces remain unchanged for backward compatibility
export interface StressTestParams {
  selectedScenarios: string[];
  severity: 'mild' | 'moderate' | 'severe';
  duration: number;
  customParameters?: Record<string, number>;
}

export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  survivalProbability: number;
  shortfallRisk: number;
  resilienceScore: number;
  worstCaseOutcome: number;
  recoveryTimeYears?: number;
  impactAnalysis: {
    portfolioDeclinePercent: number;
    incomeReductionPercent: number;
    expenseIncreasePercent: number;
  };
}

interface StressTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: CashFlowScenario | null;
  client?: Client | null; // NEW: Added for mitigation strategies
}

export function StressTestModal({ isOpen, onClose, scenario, client }: StressTestModalProps) {
  // Enhanced state management
  const [activeTab, setActiveTab] = useState<'scenarios' | 'parameters' | 'results' | 'mitigation'>('scenarios');
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [duration, setDuration] = useState(2);
  const [customParameters, setCustomParameters] = useState<Record<string, number>>({});
  const [showCustomParameters, setShowCustomParameters] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<StressTestResult[] | null>(null);
  const [mitigationPlans, setMitigationPlans] = useState<any[] | null>(null);
  const [progress, setProgress] = useState(0);

  // Get all available scenarios including new personal crisis ones
  const allScenarios = StressTestingEngine.getAvailableScenarios();
  const scenariosByCategory = StressTestingEngine.getScenariosByCategory();

  // Initialize with default selections on mount
  React.useEffect(() => {
    if (selectedScenarios.length === 0) {
      // Default selections include mix of market and personal scenarios
      const defaultSelections = [
        'market_crash_2008',
        'inflation_shock_1970s', 
        'covid_volatility',
        'longevity_extension',
        'job_loss_redundancy' // NEW: Include personal crisis by default
      ];
      setSelectedScenarios(defaultSelections);
    }
  }, [selectedScenarios.length]);

  if (!isOpen) return null;

  const handleScenarioToggle = (scenarioId: string) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const handleRunStressTest = async () => {
    if (!scenario || selectedScenarios.length === 0) return;

    setIsRunning(true);
    setProgress(0);
    setActiveTab('results');

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Run stress tests with custom parameters if provided
      const stressTestParams: StressTestParams = {
        selectedScenarios,
        severity,
        duration,
        customParameters: Object.keys(customParameters).length > 0 ? customParameters : undefined
      };

      const engineResults = await StressTestingEngine.runStressTests(
        scenario,
        selectedScenarios
      );

      // Transform engine results to UI format
      const transformedResults: StressTestResult[] = engineResults.map(result => ({
        scenarioId: result.scenario_id,
        scenarioName: allScenarios.find(s => s.id === result.scenario_id)?.name || 'Unknown',
        survivalProbability: result.survival_probability,
        shortfallRisk: result.shortfall_risk,
        resilienceScore: result.resilience_score,
        worstCaseOutcome: result.worst_case_outcome,
        recoveryTimeYears: result.recovery_time_years,
        impactAnalysis: {
          portfolioDeclinePercent: result.impact_analysis.portfolio_decline_percent,
          incomeReductionPercent: result.impact_analysis.income_reduction_percent,
          expenseIncreasePercent: result.impact_analysis.expense_increase_percent
        }
      }));

      // NEW: Generate mitigation strategies if client data is available
      if (client) {
        // Adapt scenario to match the expected CashFlowScenario type from /types/cashflow
        const scenarioForMitigation = {
          ...scenario,
          scenarioName: (scenario as any)?.scenarioName ?? (scenario as any)?.scenario_name ?? '',
          scenarioType: (scenario as any)?.scenarioType ?? (scenario as any)?.scenario_type ?? '',
          projectionYears: (scenario as any)?.projectionYears ?? (scenario as any)?.projection_years ?? 0,
          riskScore: (scenario as any)?.riskScore ?? (scenario as any)?.risk_score ?? 0,
          currentIncome: (scenario as any)?.currentIncome ?? (scenario as any)?.current_income ?? 0,
          investmentValue: (scenario as any)?.investmentValue ?? (scenario as any)?.investment_value ?? 0,
          retirementAge: (scenario as any)?.retirementAge ?? (scenario as any)?.retirement_age ?? 65,
          createdBy: '',
          // Add necessary properties with defaults to satisfy the type requirements
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          id: (scenario as any)?.id ?? '',
          clientId: client?.id ?? '',
          // Other required fields with sensible defaults
        } as CashFlowScenario; // Use the imported type from @/types/cashflow

        const plans = transformedResults.map(result => 
          MitigationStrategiesService.generateMitigationPlan(result, scenarioForMitigation, client)
        );
        setMitigationPlans(plans);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setResults(transformedResults);

    } catch (error) {
      console.error('Error running stress test:', error);
      // Handle error state
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setMitigationPlans(null);
    setProgress(0);
    setActiveTab('scenarios');
    setSelectedScenarios([]);
    setSeverity('moderate');
    setDuration(2);
    setCustomParameters({});
    setShowCustomParameters(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Advanced Stress Testing</h2>
              <p className="text-sm text-gray-600">
                {scenario?.scenarioName || 'No scenario selected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomParameters(!showCustomParameters)}
              className={showCustomParameters ? 'bg-blue-50' : ''}
            >
              <Sliders className="w-4 h-4 mr-2" />
              {showCustomParameters ? 'Hide' : 'Show'} Custom Parameters
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation - Enhanced with mitigation tab */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'scenarios'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Scenarios ({selectedScenarios.length})
          </button>
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'parameters'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Parameters
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            disabled={!results && !isRunning}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Results
          </button>
          {mitigationPlans && (
            <button
              onClick={() => setActiveTab('mitigation')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'mitigation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Mitigation Strategies
            </button>
          )}
        </div>

        {/* Content with optional custom parameters panel */}
        <div className="flex">
          {/* Main content area */}
          <div className={`flex-1 p-6 max-h-[60vh] overflow-y-auto ${showCustomParameters ? 'pr-3' : ''}`}>
            {/* Scenarios Tab - Enhanced with categories */}
            {activeTab === 'scenarios' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Select Stress Test Scenarios</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Choose scenarios to test your financial plan&apos;s resilience. We now include personal crisis scenarios.
                  </p>
                </div>

                {/* Scenarios grouped by category */}
                {Object.entries(scenariosByCategory).map(([category, categoryScenarios]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-700 mb-3">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {categoryScenarios.map((scenario) => (
                        <Card 
                          key={scenario.id}
                          className={`cursor-pointer transition-all ${
                            selectedScenarios.includes(scenario.id)
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handleScenarioToggle(scenario.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-medium mb-1">{scenario.name}</h4>
                                <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                              </div>
                              <div className="ml-3 flex flex-col items-end gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {scenario.category}
                                </Badge>
                                <Badge 
                                  className={`text-xs ${
                                    scenario.severity === 'severe' ? 'bg-red-100 text-red-800' :
                                    scenario.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {scenario.severity}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                {scenario.severity === 'severe' && <AlertTriangle className="w-4 h-4" />}
                                {scenario.severity === 'moderate' && <TrendingDown className="w-4 h-4" />}
                                {scenario.severity === 'mild' && <Clock className="w-4 h-4" />}
                                <span className="capitalize">{scenario.severity} Impact</span>
                              </div>
                              
                              <div className={`w-4 h-4 rounded border-2 ${
                                selectedScenarios.includes(scenario.id)
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {selectedScenarios.includes(scenario.id) && (
                                  <div className="w-2 h-2 bg-white rounded-sm m-0.5" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Parameters Tab - Original implementation */}
            {activeTab === 'parameters' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Test Parameters</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Adjust the severity and duration of stress scenarios. Use custom parameters for fine-tuning.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Stress Severity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(['mild', 'moderate', 'severe'] as const).map((level) => (
                        <div
                          key={level}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            severity === level
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSeverity(level)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium capitalize">{level}</div>
                              <div className="text-sm text-gray-600">
                                {level === 'mild' && 'Conservative stress assumptions'}
                                {level === 'moderate' && 'Balanced stress assumptions'}
                                {level === 'severe' && 'Aggressive stress assumptions'}
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              severity === level
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                            }`} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Stress Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ParameterSlider
                        label="Duration (Years)"
                        value={duration}
                        onChange={setDuration}
                        min={1}
                        max={10}
                        step={1}
                        formatValue={(val) => `${val} year${val !== 1 ? 's' : ''}`}
                      />
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm">
                          <div className="font-medium mb-1">Selected Duration: {duration} years</div>
                          <div className="text-gray-600">
                            {duration <= 2 && 'Short-term shock scenario'}
                            {duration > 2 && duration <= 5 && 'Medium-term stress period'}
                            {duration > 5 && 'Extended stress scenario'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                {isRunning ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium mb-2">Running Stress Tests</h3>
                    <p className="text-gray-600 mb-4">
                      Analyzing {selectedScenarios.length} scenarios with Monte Carlo simulation...
                    </p>
                    <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-500 mt-2">{progress}% complete</div>
                  </div>
                ) : results ? (
                  <StressTestResults results={results} scenario={scenario} />
                ) : (
                  <div className="text-center py-12">
                    <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Run Stress Tests</h3>
                    <p className="text-gray-600">
                      Configure your scenarios and parameters, then run the analysis.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* NEW: Mitigation Strategies Tab */}
            {activeTab === 'mitigation' && mitigationPlans && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Mitigation Strategies</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Actionable recommendations to improve your financial resilience.
                  </p>
                </div>
                
                {mitigationPlans.map((plan, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{plan.scenarioName}</span>
                        <Badge className={`
                          ${plan.overallRiskLevel === 'critical' ? 'bg-red-100 text-red-800' : ''}
                          ${plan.overallRiskLevel === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                          ${plan.overallRiskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${plan.overallRiskLevel === 'low' ? 'bg-green-100 text-green-800' : ''}
                        `}>
                          {plan.overallRiskLevel} Risk
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Key Recommendations */}
                      <div className="mb-6">
                        <h4 className="font-medium mb-2">Key Recommendations</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {plan.keyRecommendations.map((rec: string, i: number) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Immediate Actions */}
                      {plan.immediateActions.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2 text-red-700">Immediate Actions</h4>
                          <div className="space-y-2">
                            {plan.immediateActions.slice(0, 3).map((action: any) => (
                              <div key={action.id} className="p-3 bg-red-50 rounded-lg text-sm">
                                <div className="font-medium">{action.title}</div>
                                <div className="text-gray-600">{action.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Cost Estimate */}
                      <div className="text-sm text-gray-600">
                        Estimated cost: £{plan.estimatedCostRange.min.toLocaleString()} - £{plan.estimatedCostRange.max.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* NEW: Custom Parameters Panel - Sidebar */}
          {showCustomParameters && (
            <div className="w-96 border-l bg-gray-50 p-6 overflow-y-auto max-h-[60vh]">
              <CustomParametersPanel
                selectedScenario={selectedScenarios.length === 1 
                  ? allScenarios.find(s => s.id === selectedScenarios[0]) || null
                  : null
                }
                customParameters={customParameters}
                onParametersChange={setCustomParameters}
                onReset={() => setCustomParameters({})}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedScenarios.length} scenarios selected • {severity} severity • {duration} year duration
            {Object.keys(customParameters).length > 0 && ' • Custom parameters applied'}
          </div>
          <div className="flex items-center gap-3">
            {results && (
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {!results && (
              <Button
                onClick={handleRunStressTest}
                disabled={selectedScenarios.length === 0 || !scenario || isRunning}
                className="min-w-[120px]"
              >
                <Play className="w-4 h-4 mr-2" />
                {isRunning ? 'Running...' : 'Run Analysis'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// src/components/cashflow/CashFlowDashboard.tsx - UPDATED
// Integrated real StressTestModal instead of placeholder
// All existing functionality preserved
// ================================================================

'use client';

import React, { useState, useEffect } from 'react';
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
  // State management
  const [client, setClient] = useState<Client | null>(null);
  const [scenarios, setScenarios] = useState<CashFlowScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<CashFlowScenario | null>(null);
  const [projectionResult, setProjectionResult] = useState<ProjectionResult | null>(null);
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingScenario, setIsCreatingScenario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStressTestModal, setShowStressTestModal] = useState(false);

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

      // If we have scenarios, load the most recent one
      if (clientScenarios.length > 0) {
        const latestScenario = clientScenarios[0];
        setSelectedScenario(latestScenario);
        await loadProjections(latestScenario);
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjections = async (scenario: CashFlowScenario) => {
    try {
      const result = await ProjectionEngine.generateProjections(scenario);
      setProjectionResult(result);
    } catch (err) {
      console.error('Error loading projections:', err);
      setError('Failed to generate projections');
    }
  };

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

      // Refresh scenarios
      await loadDashboardData();
      
      // Auto-select the new scenario
      setSelectedScenario(newScenario);
      await loadProjections(newScenario);

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
  const getSustainabilityBadgeColor = (rating: string): string => {
    switch (rating) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-green-100 text-green-700';
      case 'Adequate': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="max-w-4xl mx-auto p-6">
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cash Flow Planning</h1>
          {client && (
            <p className="text-gray-600 mt-1">
              {client.personalDetails?.firstName} {client.personalDetails?.lastName} • 
              Age {getClientAge(client)}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Scenarios</h2>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleCreateScenario('base')}
                disabled={isCreatingScenario}
              >
                <Plus className="w-4 h-4 mr-1" />
                Base Case
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreateScenario('optimistic')}
                disabled={isCreatingScenario}
              >
                Optimistic
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreateScenario('pessimistic')}
                disabled={isCreatingScenario}
              >
                Pessimistic
              </Button>
            </div>
          </div>

          {scenarios.length === 0 ? (
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
              {scenarios.map((scenario) => (
                <Card 
                  key={scenario.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedScenario?.id === scenario.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleViewScenario(scenario.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{scenario.scenarioName}</h3>
                        <p className="text-sm text-gray-600">
                          {scenario.scenarioType.charAt(0).toUpperCase() + scenario.scenarioType.slice(1)} scenario • 
                          {scenario.projectionYears} years
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {scenario.scenarioType}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
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
                    <span className="text-sm text-gray-600">Final Portfolio Value</span>
                    <span className="font-semibold">
                      {formatCurrency(projectionResult.summary.finalPortfolioValue)}
                    </span>
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
                    <Badge className={getSustainabilityBadgeColor(projectionResult.summary.sustainabilityRating)}>
                      {String(projectionResult.summary.sustainabilityRating)}
                    </Badge>
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
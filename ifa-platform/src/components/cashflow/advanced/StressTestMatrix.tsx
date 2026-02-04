// ================================================================
// Enhanced StressTestMatrix.tsx - Comprehensive stress test results table
// Path: src/components/cashflow/advanced/StressTestMatrix.tsx
// Purpose: Grid showing all stress test results in comparison table with sorting
// ================================================================
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { 
  Shield, 
  TrendingDown, 
  TrendingUp, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { StressTestResult } from '@/types/stress-testing';
import { ResilienceScoreGauge } from './ResilienceScoreGauge';

interface StressTestMatrixProps {
  results: StressTestResult[];
  sortable?: boolean;
  showExportButton?: boolean;
  className?: string;
  onExport?: () => void;
  onRowClick?: (result: StressTestResult) => void;
}

type SortField = 'scenarioName' | 'survivalProbability' | 'resilienceScore' | 'shortfallRisk';
type SortDirection = 'asc' | 'desc';

export const StressTestMatrix: React.FC<StressTestMatrixProps> = ({
  results,
  sortable = true,
  showExportButton = true,
  className = '',
  onExport,
  onRowClick
}) => {
  const [sortField, setSortField] = useState<SortField>('resilienceScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get scenario display name
  const getScenarioName = (scenarioId: string, scenarioName?: string) => {
    if (scenarioName) return scenarioName;
    
    const names: Record<string, string> = {
      'market_crash_2008': '2008-Style Market Crash',
      'inflation_shock_1970s': '1970s Inflation Shock',
      'longevity_extension': 'Longevity Extension',
      'interest_rate_shock': 'Interest Rate Shock',
      'prolonged_recession': 'Prolonged Recession',
      'pandemic_disruption': 'Pandemic Disruption',
      'geopolitical_crisis': 'Geopolitical Crisis',
      'currency_crisis': 'Currency Crisis'
    };
    return names[scenarioId] || scenarioId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get resilience color and rating
  const getResilienceColor = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, text: 'Strong', color: 'text-green-700' };
    if (score >= 60) return { variant: 'secondary' as const, text: 'Moderate', color: 'text-yellow-700' };
    return { variant: 'destructive' as const, text: 'Weak', color: 'text-red-700' };
  };

  // Get survival probability status
  const getSurvivalStatus = (probability: number) => {
    if (probability >= 80) return { icon: CheckCircle2, color: 'text-green-600', text: 'High' };
    if (probability >= 60) return { icon: AlertTriangle, color: 'text-yellow-600', text: 'Medium' };
    return { icon: TrendingDown, color: 'text-red-600', text: 'Low' };
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort results
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'scenarioName':
          aValue = getScenarioName(a.scenarioId, a.scenarioName);
          bValue = getScenarioName(b.scenarioId, b.scenarioName);
          break;
        case 'survivalProbability':
          aValue = a.survivalProbability;
          bValue = b.survivalProbability;
          break;
        case 'resilienceScore':
          aValue = a.resilienceScore;
          bValue = b.resilienceScore;
          break;
        case 'shortfallRisk':
          aValue = a.shortfallRisk;
          bValue = b.shortfallRisk;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [results, sortField, sortDirection]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (results.length === 0) return null;

    const avgResilience = results.reduce((sum, r) => sum + r.resilienceScore, 0) / results.length;
    const avgSurvival = results.reduce((sum, r) => sum + r.survivalProbability, 0) / results.length;
    const worstCase = results.reduce((worst, r) => 
      r.resilienceScore < worst.resilienceScore ? r : worst
    );
    const bestCase = results.reduce((best, r) => 
      r.resilienceScore > best.resilienceScore ? r : best
    );

    return {
      averageResilienceScore: Math.round(avgResilience),
      averageSurvivalProbability: Math.round(avgSurvival),
      worstCaseScenario: getScenarioName(worstCase.scenarioId, worstCase.scenarioName),
      bestCaseScenario: getScenarioName(bestCase.scenarioId, bestCase.scenarioName),
      totalScenarios: results.length
    };
  }, [results]);

  // Render sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (!sortable) return null;
    
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  if (results.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No stress test results available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Stress Test Analysis Matrix
          </CardTitle>
          {showExportButton && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
        
        {/* Summary Statistics */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-600 font-medium">Total Scenarios</div>
              <div className="text-lg font-bold text-blue-800">{summary.totalScenarios}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-green-600 font-medium">Avg. Resilience</div>
              <div className="text-lg font-bold text-green-800">{summary.averageResilienceScore}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-xs text-purple-600 font-medium">Avg. Survival</div>
              <div className="text-lg font-bold text-purple-800">{summary.averageSurvivalProbability}%</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-xs text-orange-600 font-medium">Best Case</div>
              <div className="text-sm font-bold text-orange-800 truncate">{summary.bestCaseScenario}</div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => sortable && handleSort('scenarioName')}
                    className="flex items-center gap-2 h-auto p-0 hover:bg-transparent"
                    disabled={!sortable}
                  >
                    Scenario
                    <SortIcon field="scenarioName" />
                  </Button>
                </th>
                <th className="text-center py-3 px-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => sortable && handleSort('resilienceScore')}
                    className="flex items-center gap-2 h-auto p-0 hover:bg-transparent"
                    disabled={!sortable}
                  >
                    Resilience
                    <SortIcon field="resilienceScore" />
                  </Button>
                </th>
                <th className="text-center py-3 px-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => sortable && handleSort('survivalProbability')}
                    className="flex items-center gap-2 h-auto p-0 hover:bg-transparent"
                    disabled={!sortable}
                  >
                    Survival %
                    <SortIcon field="survivalProbability" />
                  </Button>
                </th>
                <th className="text-center py-3 px-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => sortable && handleSort('shortfallRisk')}
                    className="flex items-center gap-2 h-auto p-0 hover:bg-transparent"
                    disabled={!sortable}
                  >
                    Shortfall Risk
                    <SortIcon field="shortfallRisk" />
                  </Button>
                </th>
                <th className="text-center py-3 px-2">Worst Case</th>
                <th className="text-center py-3 px-2">Recovery</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result) => {
                const resilienceInfo = getResilienceColor(result.resilienceScore);
                const survivalInfo = getSurvivalStatus(result.survivalProbability);
                const SurvivalIcon = survivalInfo.icon;

                return (
                  <tr 
                    key={result.scenarioId} 
                    className={`border-b hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(result)}
                  >
                    <td className="py-4 px-2">
                      <div>
                        <div className="font-medium text-sm">
                          {getScenarioName(result.scenarioId, result.scenarioName)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {result.scenarioId}
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <ResilienceScoreGauge 
                          score={result.resilienceScore} 
                          size="sm" 
                          showLabel={false}
                        />
                        <Badge variant={resilienceInfo.variant} className="mt-1">
                          {resilienceInfo.text}
                        </Badge>
                      </div>
                    </td>
                    
                    <td className="py-4 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1">
                          <SurvivalIcon className={`h-4 w-4 ${survivalInfo.color}`} />
                          <span className="font-medium">
                            {result.survivalProbability.toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={result.survivalProbability} 
                          className="w-16 h-2"
                        />
                      </div>
                    </td>
                    
                    <td className="py-4 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-red-600">
                          {result.shortfallRisk.toFixed(1)}%
                        </span>
                        <Progress 
                          value={result.shortfallRisk} 
                          className="w-16 h-2"
                        />
                      </div>
                    </td>
                    
                    <td className="py-4 px-2 text-center">
                      <div className="text-sm">
                        <div className="font-medium text-red-600">
                          {formatCurrency(result.worstCaseOutcome)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Impact: {result.impactAnalysis.portfolioDeclinePercent.toFixed(1)}%
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-2 text-center">
                      {result.recoveryTimeYears ? (
                        <div className="flex flex-col items-center">
                          <Clock className="h-4 w-4 text-blue-600 mb-1" />
                          <span className="text-sm font-medium">
                            {result.recoveryTimeYears} years
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Demo component
export const StressTestMatrixDemo: React.FC = () => {
  const sampleResults: StressTestResult[] = [
    {
      scenarioId: 'market_crash_2008',
      scenarioName: '2008-Style Market Crash',
      survivalProbability: 67.8,
      resilienceScore: 72,
      shortfallRisk: 32.2,
      worstCaseOutcome: -125000,
      recoveryTimeYears: 4.2,
      impactAnalysis: {
        portfolioDeclinePercent: -28.5,
        incomeReductionPercent: -15.0,
        expenseIncreasePercent: 5.0
      }
    },
    {
      scenarioId: 'inflation_shock_1970s',
      scenarioName: '1970s Inflation Shock',
      survivalProbability: 78.5,
      resilienceScore: 65,
      shortfallRisk: 21.5,
      worstCaseOutcome: -85000,
      recoveryTimeYears: 6.1,
      impactAnalysis: {
        portfolioDeclinePercent: -12.3,
        incomeReductionPercent: -8.5,
        expenseIncreasePercent: 18.2
      }
    }
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Stress Test Matrix Demo</h2>
      <StressTestMatrix 
        results={sampleResults}
        sortable={true}
        showExportButton={true}
      />
    </div>
  );
};
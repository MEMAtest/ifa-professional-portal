// ================================================================
// src/components/stress-testing/ScenarioFocusView.tsx
// Focused card-by-card view for stress test results
// Shows one scenario at a time with navigation
// ================================================================

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  TrendingDown,
  TrendingUp,
  Clock,
  Target,
  Wallet,
  PiggyBank,
  FileText,
  Zap,
  ArrowRight,
  BarChart3
} from 'lucide-react';

interface StressTestResult {
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

interface ClientProfile {
  clientId: string;
  clientName: string;
  clientRef: string;
  portfolioValue: number;
  annualIncome: number;
  annualExpenses: number;
  pensionValue: number;
  savings: number;
  age: number;
  retirementAge?: number;
  riskScore?: number;
}

interface ScenarioFocusViewProps {
  results: StressTestResult[];
  clientProfile: ClientProfile;
  onGenerateReport: () => void;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toLocaleString()}`;
};

const getScoreInfo = (score: number) => {
  if (score >= 70) return { level: 'Robust', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', Icon: CheckCircle2 };
  if (score >= 50) return { level: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', Icon: Shield };
  if (score >= 30) return { level: 'Vulnerable', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', Icon: AlertTriangle };
  return { level: 'Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', Icon: XCircle };
};

// Generate scenario-specific vulnerabilities and recommendations
const getScenarioInsights = (result: StressTestResult, clientProfile: ClientProfile) => {
  const vulnerabilities: { text: string; severity: 'high' | 'medium' | 'low' }[] = [];
  const recommendations: string[] = [];

  const portfolioLoss = clientProfile.portfolioValue * (result.impactAnalysis.portfolioDeclinePercent / 100);
  const monthlyExpenses = clientProfile.annualExpenses / 12;
  const cashRunway = clientProfile.savings / monthlyExpenses;

  // Check survival probability
  if (result.survivalProbability < 60) {
    vulnerabilities.push({
      text: `Only ${result.survivalProbability.toFixed(0)}% chance of portfolio survival`,
      severity: result.survivalProbability < 40 ? 'high' : 'medium'
    });
    recommendations.push('Consider reducing withdrawal rate or building larger reserves');
  }

  // Check portfolio decline
  if (result.impactAnalysis.portfolioDeclinePercent > 30) {
    vulnerabilities.push({
      text: `Portfolio could drop ${result.impactAnalysis.portfolioDeclinePercent.toFixed(0)}% (${formatCurrency(portfolioLoss)} loss)`,
      severity: result.impactAnalysis.portfolioDeclinePercent > 45 ? 'high' : 'medium'
    });
    recommendations.push('Reduce equity exposure to limit maximum drawdown');
  }

  // Check recovery time
  if (result.recoveryTimeYears && result.recoveryTimeYears > 3) {
    vulnerabilities.push({
      text: `${result.recoveryTimeYears} years to recover - may affect retirement timeline`,
      severity: result.recoveryTimeYears > 5 ? 'high' : 'medium'
    });
    recommendations.push('Consider more defensive asset allocation as retirement approaches');
  }

  // Check cash buffer
  if (cashRunway < 12) {
    vulnerabilities.push({
      text: `Only ${cashRunway.toFixed(0)} months of expenses in emergency savings`,
      severity: cashRunway < 6 ? 'high' : 'medium'
    });
    recommendations.push(`Build emergency fund to ${formatCurrency(clientProfile.annualExpenses * 1.5)} (18 months)`);
  }

  // Check income impact
  if (result.impactAnalysis.incomeReductionPercent > 25) {
    vulnerabilities.push({
      text: `Income could drop by ${result.impactAnalysis.incomeReductionPercent.toFixed(0)}%`,
      severity: result.impactAnalysis.incomeReductionPercent > 50 ? 'high' : 'medium'
    });
    recommendations.push('Review income protection insurance coverage');
  }

  // Check expense spike
  if (result.impactAnalysis.expenseIncreasePercent > 25) {
    vulnerabilities.push({
      text: `Expenses could increase by ${result.impactAnalysis.expenseIncreasePercent.toFixed(0)}%`,
      severity: 'medium'
    });
    recommendations.push('Ensure adequate health and critical illness coverage');
  }

  // Add a positive if score is high
  if (result.resilienceScore >= 70 && vulnerabilities.length === 0) {
    vulnerabilities.push({
      text: 'Portfolio shows strong resilience to this scenario',
      severity: 'low'
    });
  }

  return { vulnerabilities, recommendations: recommendations.slice(0, 3) };
};

export const ScenarioFocusView: React.FC<ScenarioFocusViewProps> = ({
  results,
  clientProfile,
  onGenerateReport
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalCards = results.length + 1; // scenarios + summary card
  const isSummaryCard = currentIndex === results.length;

  const goNext = () => setCurrentIndex(i => Math.min(i + 1, totalCards - 1));
  const goPrev = () => setCurrentIndex(i => Math.max(i - 1, 0));
  const goToCard = (index: number) => setCurrentIndex(index);

  // Summary metrics
  const summary = useMemo(() => {
    const avgResilience = results.reduce((sum, r) => sum + r.resilienceScore, 0) / results.length;
    const avgSurvival = results.reduce((sum, r) => sum + r.survivalProbability, 0) / results.length;
    const sorted = [...results].sort((a, b) => a.resilienceScore - b.resilienceScore);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    const criticalCount = results.filter(r => r.resilienceScore < 50).length;
    const maxDecline = Math.max(...results.map(r => r.impactAnalysis.portfolioDeclinePercent));

    return { avgResilience, avgSurvival, worst, best, criticalCount, maxDecline };
  }, [results]);

  const currentResult = !isSummaryCard ? results[currentIndex] : null;
  const scoreInfo = currentResult ? getScoreInfo(currentResult.resilienceScore) : getScoreInfo(summary.avgResilience);
  const insights = currentResult ? getScenarioInsights(currentResult, clientProfile) : null;

  return (
    <div className="space-y-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 border shadow-sm">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isSummaryCard ? 'Summary' : `Scenario ${currentIndex + 1} of ${results.length}`}
          </p>
          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {results.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToCard(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-orange-500 scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={results[idx].scenarioName}
              />
            ))}
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button
              onClick={() => goToCard(results.length)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                isSummaryCard
                  ? 'bg-orange-500 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              title="Summary"
            />
          </div>
        </div>

        <Button
          variant="outline"
          onClick={goNext}
          disabled={currentIndex === totalCards - 1}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Card */}
      {!isSummaryCard && currentResult ? (
        // Individual Scenario Card
        <Card className={`border-2 ${scoreInfo.border} ${scoreInfo.bg}`}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="mb-2 text-xs">
                  Scenario {currentIndex + 1}
                </Badge>
                <CardTitle className="text-2xl">{currentResult.scenarioName}</CardTitle>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${scoreInfo.color}`}>
                  {currentResult.resilienceScore.toFixed(0)}
                  <span className="text-xl text-gray-400">/100</span>
                </div>
                <div className={`flex items-center gap-1 justify-end ${scoreInfo.color}`}>
                  <scoreInfo.Icon className="h-4 w-4" />
                  <span className="font-medium">{scoreInfo.level}</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Key Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500">Survival Probability</p>
                  <p className={`text-2xl font-bold ${
                    currentResult.survivalProbability >= 70 ? 'text-green-600' :
                    currentResult.survivalProbability >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {currentResult.survivalProbability.toFixed(0)}%
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500">Shortfall Risk</p>
                  <p className="text-2xl font-bold text-red-600">
                    {currentResult.shortfallRisk.toFixed(0)}%
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500">Portfolio Impact</p>
                  <p className="text-2xl font-bold text-gray-900">
                    -{currentResult.impactAnalysis.portfolioDeclinePercent.toFixed(0)}%
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="text-xs text-gray-500">Recovery Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentResult.recoveryTimeYears || '–'} {currentResult.recoveryTimeYears ? 'yrs' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Vulnerabilities */}
            {insights && insights.vulnerabilities.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Vulnerabilities for This Scenario
                </h4>
                <div className="space-y-2">
                  {insights.vulnerabilities.map((vuln, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        vuln.severity === 'high' ? 'bg-red-50 border-red-200' :
                        vuln.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                        'bg-green-50 border-green-200'
                      }`}
                    >
                      {vuln.severity === 'high' && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
                      {vuln.severity === 'medium' && <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />}
                      {vuln.severity === 'low' && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />}
                      <p className={`text-sm ${
                        vuln.severity === 'high' ? 'text-red-700' :
                        vuln.severity === 'medium' ? 'text-amber-700' :
                        'text-green-700'
                      }`}>
                        {vuln.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What This Means */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                What This Means
              </h4>
              <p className="text-gray-700">
                {currentResult.resilienceScore >= 70 && (
                  `${clientProfile.clientName}'s portfolio can weather this scenario with confidence. The ${currentResult.survivalProbability.toFixed(0)}% survival probability indicates strong resilience.`
                )}
                {currentResult.resilienceScore >= 50 && currentResult.resilienceScore < 70 && (
                  `This scenario presents moderate risk. While there's a ${currentResult.survivalProbability.toFixed(0)}% chance of success, a ${currentResult.impactAnalysis.portfolioDeclinePercent.toFixed(0)}% portfolio decline could impact ${clientProfile.clientName}'s financial goals.`
                )}
                {currentResult.resilienceScore >= 30 && currentResult.resilienceScore < 50 && (
                  `Significant vulnerability exists here. With only ${currentResult.survivalProbability.toFixed(0)}% survival probability and potential ${currentResult.impactAnalysis.portfolioDeclinePercent.toFixed(0)}% decline, protective measures should be considered.`
                )}
                {currentResult.resilienceScore < 30 && (
                  `Critical exposure to this scenario. A ${currentResult.impactAnalysis.portfolioDeclinePercent.toFixed(0)}% decline and ${(100 - currentResult.survivalProbability).toFixed(0)}% failure probability require immediate attention.`
                )}
              </p>
            </div>

            {/* Recommendations */}
            {insights && insights.recommendations.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Recommended Actions
                </h4>
                <ul className="space-y-2">
                  {insights.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                      <ArrowRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Summary Card
        <Card className="border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="mb-2 text-xs bg-gray-100">
                  Summary
                </Badge>
                <CardTitle className="text-2xl">All Scenarios Overview</CardTitle>
                <p className="text-gray-600 mt-1">Tested {results.length} stress scenarios</p>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${scoreInfo.color}`}>
                  {summary.avgResilience.toFixed(0)}
                  <span className="text-xl text-gray-400">/100</span>
                </div>
                <p className="text-sm text-gray-500">Average Resilience</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Best vs Worst */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-800">Most Vulnerable</span>
                </div>
                <p className="text-lg font-bold text-red-900">{summary.worst.scenarioName}</p>
                <p className="text-red-700">{summary.worst.resilienceScore.toFixed(0)}/100 resilience</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Most Resilient</span>
                </div>
                <p className="text-lg font-bold text-green-900">{summary.best.scenarioName}</p>
                <p className="text-green-700">{summary.best.resilienceScore.toFixed(0)}/100 resilience</p>
              </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border text-center">
                <p className="text-xs text-gray-500">Avg Survival</p>
                <p className="text-2xl font-bold text-gray-900">{summary.avgSurvival.toFixed(0)}%</p>
              </div>
              <div className="bg-white rounded-lg p-3 border text-center">
                <p className="text-xs text-gray-500">Critical Scenarios</p>
                <p className={`text-2xl font-bold ${summary.criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {summary.criticalCount}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border text-center">
                <p className="text-xs text-gray-500">Max Decline</p>
                <p className="text-2xl font-bold text-gray-900">-{summary.maxDecline.toFixed(0)}%</p>
              </div>
              <div className="bg-white rounded-lg p-3 border text-center">
                <p className="text-xs text-gray-500">Scenarios Tested</p>
                <p className="text-2xl font-bold text-gray-900">{results.length}</p>
              </div>
            </div>

            {/* Priority Actions */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Priority Actions
              </h4>
              <ul className="space-y-2">
                {summary.criticalCount > 0 && (
                  <li className="flex items-start gap-2 text-sm text-purple-800">
                    <Badge className="bg-red-100 text-red-700 text-xs">High</Badge>
                    <span>Address {summary.criticalCount} critical vulnerability scenario{summary.criticalCount > 1 ? 's' : ''}</span>
                  </li>
                )}
                {summary.maxDecline > 35 && (
                  <li className="flex items-start gap-2 text-sm text-purple-800">
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Medium</Badge>
                    <span>Review portfolio allocation to reduce maximum drawdown</span>
                  </li>
                )}
                {summary.avgSurvival < 70 && (
                  <li className="flex items-start gap-2 text-sm text-purple-800">
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Medium</Badge>
                    <span>Build larger cash reserves to improve survival odds</span>
                  </li>
                )}
                {summary.avgResilience >= 70 && (
                  <li className="flex items-start gap-2 text-sm text-purple-800">
                    <Badge className="bg-green-100 text-green-700 text-xs">Low</Badge>
                    <span>Portfolio shows strong resilience - maintain current strategy</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Generate Report Button */}
            <Button
              onClick={onGenerateReport}
              className="w-full bg-orange-500 hover:bg-orange-600"
              size="lg"
            >
              <FileText className="h-5 w-5 mr-2" />
              Generate Comprehensive Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation Footer */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <span>Jump to:</span>
        {results.map((r, idx) => (
          <button
            key={idx}
            onClick={() => goToCard(idx)}
            className={`px-2 py-1 rounded ${
              idx === currentIndex
                ? 'bg-orange-100 text-orange-700 font-medium'
                : 'hover:bg-gray-100'
            }`}
          >
            {idx + 1}
          </button>
        ))}
        <span className="text-gray-300">|</span>
        <button
          onClick={() => goToCard(results.length)}
          className={`px-2 py-1 rounded ${
            isSummaryCard
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'hover:bg-gray-100'
          }`}
        >
          Summary
        </button>
      </div>
    </div>
  );
};

export default ScenarioFocusView;

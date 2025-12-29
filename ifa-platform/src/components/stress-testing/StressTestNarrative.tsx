// ================================================================
// src/components/stress-testing/StressTestNarrative.tsx
// Plain English narrative explaining stress test results
// Provides actionable insights and recommendations
// ================================================================

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Target,
  Lightbulb,
  ArrowRight,
  Clock,
  Zap
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
  clientName: string;
  portfolioValue: number;
  annualIncome: number;
  age: number;
}

interface StressTestNarrativeProps {
  results: StressTestResult[];
  clientProfile: ClientProfile;
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

const getOverallAssessment = (avgResilience: number): {
  level: 'robust' | 'moderate' | 'vulnerable' | 'critical';
  color: string;
  bgColor: string;
  Icon: React.ElementType;
  message: string;
} => {
  if (avgResilience >= 70) {
    return {
      level: 'robust',
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200',
      Icon: CheckCircle2,
      message: 'The portfolio shows strong resilience across tested stress scenarios'
    };
  }
  if (avgResilience >= 50) {
    return {
      level: 'moderate',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
      Icon: AlertTriangle,
      message: 'The portfolio shows moderate resilience with some vulnerabilities'
    };
  }
  if (avgResilience >= 30) {
    return {
      level: 'vulnerable',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 border-orange-200',
      Icon: AlertTriangle,
      message: 'The portfolio shows significant vulnerability to stress events'
    };
  }
  return {
    level: 'critical',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    Icon: XCircle,
    message: 'The portfolio is critically exposed to stress scenarios - immediate action recommended'
  };
};

export const StressTestNarrative: React.FC<StressTestNarrativeProps> = ({
  results,
  clientProfile
}) => {
  // Calculate summary metrics
  const summary = useMemo(() => {
    if (results.length === 0) return null;

    const avgResilience = results.reduce((sum, r) => sum + r.resilienceScore, 0) / results.length;
    const avgSurvival = results.reduce((sum, r) => sum + r.survivalProbability, 0) / results.length;
    const criticalCount = results.filter(r => r.resilienceScore < 50).length;

    // Find worst and best scenarios
    const sorted = [...results].sort((a, b) => a.resilienceScore - b.resilienceScore);
    const worstScenario = sorted[0];
    const bestScenario = sorted[sorted.length - 1];

    // Calculate max portfolio decline
    const maxDecline = Math.max(...results.map(r => r.impactAnalysis.portfolioDeclinePercent));
    const avgRecovery = results
      .filter(r => r.recoveryTimeYears)
      .reduce((sum, r) => sum + (r.recoveryTimeYears || 0), 0) / results.length;

    return {
      avgResilience,
      avgSurvival,
      criticalCount,
      worstScenario,
      bestScenario,
      maxDecline,
      avgRecovery,
      totalScenarios: results.length
    };
  }, [results]);

  // Generate recommendations based on results (must be called before early return)
  const recommendations = useMemo(() => {
    if (!summary) return [];

    const recs: { text: string; priority: 'high' | 'medium' | 'low'; icon: React.ElementType }[] = [];

    if (summary.criticalCount > 0) {
      recs.push({
        text: `Address ${summary.criticalCount} critical vulnerability scenario${summary.criticalCount > 1 ? 's' : ''} immediately`,
        priority: 'high',
        icon: AlertTriangle
      });
    }

    if (summary.maxDecline > 40) {
      recs.push({
        text: 'Consider reducing equity exposure to limit maximum drawdown',
        priority: 'high',
        icon: TrendingDown
      });
    }

    if (summary.avgResilience < 60) {
      recs.push({
        text: 'Build an emergency cash buffer of 12-24 months expenses',
        priority: 'medium',
        icon: Shield
      });
    }

    const hasPersonalRisk = results.some(r =>
      r.scenarioName.toLowerCase().includes('job') ||
      r.scenarioName.toLowerCase().includes('health') ||
      r.scenarioName.toLowerCase().includes('divorce')
    );

    if (hasPersonalRisk) {
      const personalResults = results.filter(r =>
        r.scenarioName.toLowerCase().includes('job') ||
        r.scenarioName.toLowerCase().includes('health') ||
        r.scenarioName.toLowerCase().includes('divorce')
      );
      const avgPersonalResilience = personalResults.reduce((sum, r) => sum + r.resilienceScore, 0) / personalResults.length;

      if (avgPersonalResilience < 60) {
        recs.push({
          text: 'Review income protection and critical illness coverage',
          priority: 'medium',
          icon: Target
        });
      }
    }

    if (summary.avgResilience >= 70) {
      recs.push({
        text: 'Portfolio shows strong resilience - maintain current strategy with annual reviews',
        priority: 'low',
        icon: CheckCircle2
      });
    }

    if (summary.avgRecovery > 3) {
      recs.push({
        text: 'Consider increasing bond allocation for faster recovery potential',
        priority: 'medium',
        icon: Clock
      });
    }

    return recs.slice(0, 4); // Max 4 recommendations
  }, [summary, results]);

  // Generate scenario insights (must be called before early return)
  const scenarioInsights = useMemo(() => {
    if (!summary) return [];

    const insights: string[] = [];

    // Worst case insight
    if (summary.worstScenario) {
      const decline = summary.worstScenario.impactAnalysis.portfolioDeclinePercent;
      const lossAmount = clientProfile.portfolioValue * (decline / 100);
      insights.push(
        `In the worst case (${summary.worstScenario.scenarioName}), the portfolio could decline by ${decline.toFixed(0)}% (${formatCurrency(lossAmount)})`
      );
    }

    // Best case insight
    if (summary.bestScenario && summary.bestScenario.resilienceScore >= 70) {
      insights.push(
        `The portfolio performs well under ${summary.bestScenario.scenarioName} with ${summary.bestScenario.resilienceScore.toFixed(0)}% resilience`
      );
    }

    // Recovery insight
    if (summary.avgRecovery > 0) {
      insights.push(
        `Average recovery time across scenarios is ${summary.avgRecovery.toFixed(1)} years`
      );
    }

    return insights;
  }, [summary, clientProfile]);

  // Early return after all hooks
  if (!summary) {
    return null;
  }

  const assessment = getOverallAssessment(summary.avgResilience);
  const AssessmentIcon = assessment.Icon;

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          What This Means for {clientProfile.clientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall Assessment */}
        <div className={`p-4 rounded-lg border-l-4 ${assessment.bgColor} border`}>
          <div className="flex items-start gap-3">
            <AssessmentIcon className={`h-6 w-6 ${assessment.color} mt-0.5`} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-bold text-lg ${assessment.color} uppercase`}>
                  {assessment.level}
                </span>
                <Badge variant="outline" className="text-xs">
                  {summary.avgResilience.toFixed(0)}/100 avg resilience
                </Badge>
              </div>
              <p className="text-gray-700">{assessment.message}</p>
            </div>
          </div>
        </div>

        {/* Plain English Summary */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <p className="text-gray-800 leading-relaxed">
            Based on <strong>{summary.totalScenarios} stress scenarios</strong> tested,{' '}
            {clientProfile.clientName}&apos;s portfolio has an average survival probability of{' '}
            <strong className={summary.avgSurvival >= 70 ? 'text-green-700' : summary.avgSurvival >= 50 ? 'text-amber-700' : 'text-red-700'}>
              {summary.avgSurvival.toFixed(0)}%
            </strong>.{' '}
            {summary.criticalCount > 0 ? (
              <>
                <strong className="text-red-700">{summary.criticalCount} scenario{summary.criticalCount > 1 ? 's show' : ' shows'} critical vulnerability</strong>{' '}
                requiring attention.
              </>
            ) : (
              'No critical vulnerabilities were identified.'
            )}
          </p>
        </div>

        {/* Scenario Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weakest Scenario */}
          <div className="p-4 rounded-lg border bg-red-50 border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-800">Most Vulnerable</span>
            </div>
            <p className="font-bold text-lg text-red-900">
              {summary.worstScenario.scenarioName}
            </p>
            <div className="mt-2 space-y-1 text-sm text-red-700">
              <p>Resilience: {summary.worstScenario.resilienceScore.toFixed(0)}/100</p>
              <p>Portfolio Impact: -{summary.worstScenario.impactAnalysis.portfolioDeclinePercent.toFixed(0)}%</p>
              {summary.worstScenario.recoveryTimeYears && (
                <p>Recovery: {summary.worstScenario.recoveryTimeYears} years</p>
              )}
            </div>
          </div>

          {/* Strongest Scenario */}
          <div className="p-4 rounded-lg border bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Most Resilient</span>
            </div>
            <p className="font-bold text-lg text-green-900">
              {summary.bestScenario.scenarioName}
            </p>
            <div className="mt-2 space-y-1 text-sm text-green-700">
              <p>Resilience: {summary.bestScenario.resilienceScore.toFixed(0)}/100</p>
              <p>Survival: {summary.bestScenario.survivalProbability.toFixed(0)}%</p>
              <p>Portfolio Impact: -{summary.bestScenario.impactAnalysis.portfolioDeclinePercent.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        {scenarioInsights.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Key Insights</span>
            </div>
            <ul className="space-y-2">
              {scenarioInsights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <span className="font-medium text-gray-900">Recommendations</span>
            </div>
            <ul className="space-y-3">
              {recommendations.map((rec, index) => {
                const priorityColors = {
                  high: 'bg-red-100 text-red-700 border-red-200',
                  medium: 'bg-amber-100 text-amber-700 border-amber-200',
                  low: 'bg-green-100 text-green-700 border-green-200'
                };
                return (
                  <li key={index} className="flex items-start gap-3">
                    <Badge className={`${priorityColors[rec.priority]} text-xs capitalize`}>
                      {rec.priority}
                    </Badge>
                    <span className="text-sm text-gray-800">{rec.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Quick Stats Footer */}
        <div className="grid grid-cols-4 gap-3 pt-4 border-t text-center text-sm">
          <div>
            <p className="text-gray-500">Scenarios</p>
            <p className="font-bold text-lg">{summary.totalScenarios}</p>
          </div>
          <div>
            <p className="text-gray-500">Critical</p>
            <p className={`font-bold text-lg ${summary.criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.criticalCount}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Max Decline</p>
            <p className="font-bold text-lg text-gray-900">-{summary.maxDecline.toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-gray-500">Avg Recovery</p>
            <p className="font-bold text-lg text-gray-900">{summary.avgRecovery.toFixed(1)} yrs</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StressTestNarrative;

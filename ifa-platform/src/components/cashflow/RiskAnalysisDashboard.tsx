// ================================================================
// src/components/cashflow/RiskAnalysisDashboard.tsx
// Comprehensive risk visualization with detailed explanations
// ================================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Info,
  ChevronDown,
  ChevronUp,
  BarChart,
  Target
} from 'lucide-react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { RiskMetrics } from '@/types/cashflow';
import { EnhancedScenarioBuilder, type RiskAnalysisDetail } from '@/services/EnhancedScenarioBuilder';

interface RiskAnalysisDashboardProps {
  scenarioId: string;
  riskMetrics: RiskMetrics;
  clientAge: number;
  retirementAge: number;
  projectionYears: number;
}

export const RiskAnalysisDashboard: React.FC<RiskAnalysisDashboardProps> = ({
  scenarioId,
  riskMetrics,
  clientAge,
  retirementAge,
  projectionYears
}) => {
  const [selectedRisk, setSelectedRisk] = useState<keyof RiskMetrics | null>(null);
  const [showMitigationStrategies, setShowMitigationStrategies] = useState(false);

  // Get detailed risk analysis
  const riskDetails = EnhancedScenarioBuilder.generateDetailedRiskAnalysis(
    { clientAge, retirementAge } as any,
    riskMetrics
  );

  // Convert risk levels to numeric values for visualization
  const getRiskScore = (level: 'Low' | 'Medium' | 'High'): number => {
    switch (level) {
      case 'Low': return 25;
      case 'Medium': return 50;
      case 'High': return 75;
      default: return 0;
    }
  };

  // Prepare data for radar chart
  const radarData = [
    { risk: 'Shortfall', value: getRiskScore(riskMetrics.shortfallRisk), fullMark: 100 },
    { risk: 'Longevity', value: getRiskScore(riskMetrics.longevityRisk), fullMark: 100 },
    { risk: 'Inflation', value: getRiskScore(riskMetrics.inflationRisk), fullMark: 100 },
    { risk: 'Sequence', value: getRiskScore(riskMetrics.sequenceRisk), fullMark: 100 }
  ];

  // Prepare data for impact timeline
  const impactData = [
    { 
      period: 'Years 1-5', 
      sequenceRisk: getRiskScore(riskMetrics.sequenceRisk),
      inflationRisk: getRiskScore(riskMetrics.inflationRisk) * 0.5,
      shortfallRisk: getRiskScore(riskMetrics.shortfallRisk) * 0.3
    },
    { 
      period: 'Years 6-15', 
      sequenceRisk: getRiskScore(riskMetrics.sequenceRisk) * 0.7,
      inflationRisk: getRiskScore(riskMetrics.inflationRisk) * 0.8,
      shortfallRisk: getRiskScore(riskMetrics.shortfallRisk) * 0.6
    },
    { 
      period: 'Years 16-25', 
      sequenceRisk: getRiskScore(riskMetrics.sequenceRisk) * 0.4,
      inflationRisk: getRiskScore(riskMetrics.inflationRisk),
      shortfallRisk: getRiskScore(riskMetrics.shortfallRisk)
    },
    { 
      period: 'Years 26+', 
      sequenceRisk: getRiskScore(riskMetrics.sequenceRisk) * 0.2,
      inflationRisk: getRiskScore(riskMetrics.inflationRisk),
      shortfallRisk: getRiskScore(riskMetrics.shortfallRisk),
      longevityRisk: getRiskScore(riskMetrics.longevityRisk)
    }
  ];

  const getRiskIcon = (riskType: keyof RiskMetrics) => {
    switch (riskType) {
      case 'shortfallRisk': return DollarSign;
      case 'longevityRisk': return Clock;
      case 'inflationRisk': return TrendingUp;
      case 'sequenceRisk': return BarChart;
      default: return AlertTriangle;
    }
  };

  const getRiskColor = (level: 'Low' | 'Medium' | 'High') => {
    switch (level) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const selectedRiskDetail = selectedRisk 
    ? riskDetails.find(d => d.riskType === selectedRisk)
    : null;

  return (
    <div className="space-y-6">
      {/* Overall Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Risk Analysis Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risk Radar Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Profile Visualization</h4>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="risk" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Risk Level"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(riskMetrics).map(([key, value]) => {
                const Icon = getRiskIcon(key as keyof RiskMetrics);
                const riskDetail = riskDetails.find(d => d.riskType === key);
                
                return (
                  <div
                    key={key}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedRisk === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedRisk(key as keyof RiskMetrics)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-5 h-5 ${getRiskColor(value as any)}`} />
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
                    <p className="text-xs font-medium text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {riskDetail?.probabilityRange.min}-{riskDetail?.probabilityRange.max}% probability
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Timeline Impact */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Impact Over Time</h4>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsBarChart data={impactData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sequenceRisk" stackId="a" fill="#3b82f6" name="Sequence Risk" />
                <Bar dataKey="inflationRisk" stackId="a" fill="#f59e0b" name="Inflation Risk" />
                <Bar dataKey="shortfallRisk" stackId="a" fill="#ef4444" name="Shortfall Risk" />
                <Bar dataKey="longevityRisk" stackId="a" fill="#8b5cf6" name="Longevity Risk" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Risk Analysis */}
      {selectedRiskDetail && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {React.createElement(getRiskIcon(selectedRisk!), { className: 'w-5 h-5' })}
                {selectedRisk?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
              <Badge 
                className={
                  selectedRiskDetail.level === 'Low' ? 'bg-green-100 text-green-800' :
                  selectedRiskDetail.level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }
              >
                {selectedRiskDetail.level} Risk
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div>
              <h4 className="font-medium text-gray-900 mb-1">What is this risk?</h4>
              <p className="text-sm text-gray-600">{selectedRiskDetail.description}</p>
            </div>

            {/* Contributing Factors */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Contributing Factors</h4>
              <ul className="space-y-1">
                {selectedRiskDetail.factors.map((factor, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-blue-500 mt-0.5">•</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            {/* Potential Impact */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 text-sm">Potential Impact</h4>
                  <p className="text-sm text-red-700 mt-1">{selectedRiskDetail.potentialImpact}</p>
                </div>
              </div>
            </div>

            {/* Mitigation Strategies */}
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMitigationStrategies(!showMitigationStrategies)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Mitigation Strategies
                </span>
                {showMitigationStrategies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              
              {showMitigationStrategies && (
                <div className="mt-3 space-y-2">
                  {selectedRiskDetail.mitigationStrategies.map((strategy, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 bg-green-50 rounded-lg">
                      <span className="text-green-600 font-medium">{index + 1}.</span>
                      <p className="text-sm text-green-800">{strategy}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 text-sm mb-2">Risk Assessment</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Probability Range</span>
                    <span className="font-medium">
                      {selectedRiskDetail.probabilityRange.min}% - {selectedRiskDetail.probabilityRange.max}%
                    </span>
                  </div>
                  <Progress 
                    value={(selectedRiskDetail.probabilityRange.min + selectedRiskDetail.probabilityRange.max) / 2} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Risk Management Summary</h4>
              <p className="text-sm text-blue-800">
                Based on your risk profile, focus on {
                  Object.entries(riskMetrics)
                    .filter(([_, level]) => level === 'High')
                    .map(([risk]) => risk.replace(/([A-Z])/g, ' $1').toLowerCase())
                    .join(' and ')
                } first. Regular reviews and adjustments to your strategy can significantly improve outcomes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ================================================================
// src/components/monte-carlo/charts/LongevityHeatmap.tsx
// Longevity Risk Heatmap - Success probability by life expectancy
// Stoplight color coding: green (safe) / amber (caution) / red (danger)
// ================================================================

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Heart, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface LongevityData {
  targetAge: number;
  yearsFromNow: number;
  successProbability: number;
  medianWealth: number;
  p10Wealth: number;
}

interface LongevityHeatmapProps {
  currentAge: number;
  baseSuccessProbability: number;
  longevityData: LongevityData[];
  retirementAge?: number;
  height?: number;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  if (value < 0) {
    return `-£${Math.abs(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toFixed(0)}`;
};

const getStatusColor = (probability: number): {
  bg: string;
  text: string;
  border: string;
  label: string;
  icon: React.ReactNode;
} => {
  if (probability >= 85) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      label: 'Safe',
      icon: <CheckCircle className="h-4 w-4 text-green-600" />
    };
  }
  if (probability >= 70) {
    return {
      bg: 'bg-lime-100',
      text: 'text-lime-800',
      border: 'border-lime-300',
      label: 'Good',
      icon: <CheckCircle className="h-4 w-4 text-lime-600" />
    };
  }
  if (probability >= 50) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300',
      label: 'Caution',
      icon: <AlertTriangle className="h-4 w-4 text-amber-600" />
    };
  }
  if (probability >= 30) {
    return {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      label: 'At Risk',
      icon: <AlertTriangle className="h-4 w-4 text-orange-600" />
    };
  }
  return {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    label: 'Danger',
    icon: <XCircle className="h-4 w-4 text-red-600" />
  };
};

const getHeatmapGradient = (probability: number): string => {
  if (probability >= 85) return 'from-green-400 to-green-500';
  if (probability >= 70) return 'from-lime-400 to-lime-500';
  if (probability >= 50) return 'from-amber-400 to-amber-500';
  if (probability >= 30) return 'from-orange-400 to-orange-500';
  return 'from-red-400 to-red-500';
};

export const LongevityHeatmap: React.FC<LongevityHeatmapProps> = ({
  currentAge,
  baseSuccessProbability,
  longevityData,
  retirementAge = 65
}) => {
  // Calculate key insights
  const insights = useMemo(() => {
    if (longevityData.length === 0) return null;

    // Find the age where success drops below 70%
    const cautionAge = longevityData.find(d => d.successProbability < 70);
    // Find the age where success drops below 50%
    const dangerAge = longevityData.find(d => d.successProbability < 50);
    // Find the last safe age
    const safeData = longevityData.filter(d => d.successProbability >= 70);
    const lastSafeAge = safeData.length > 0 ? safeData[safeData.length - 1].targetAge : null;

    // Average life expectancy assumption
    const avgLifeExpectancy = 85;
    const avgData = longevityData.find(d => d.targetAge === avgLifeExpectancy);

    return {
      cautionAge: cautionAge?.targetAge || null,
      dangerAge: dangerAge?.targetAge || null,
      lastSafeAge,
      avgLifeExpectancyData: avgData
    };
  }, [longevityData]);

  // Default data if none provided
  const displayData = longevityData.length > 0 ? longevityData : [
    { targetAge: 85, yearsFromNow: 85 - currentAge, successProbability: baseSuccessProbability, medianWealth: 0, p10Wealth: 0 },
    { targetAge: 90, yearsFromNow: 90 - currentAge, successProbability: baseSuccessProbability * 0.9, medianWealth: 0, p10Wealth: 0 },
    { targetAge: 95, yearsFromNow: 95 - currentAge, successProbability: baseSuccessProbability * 0.75, medianWealth: 0, p10Wealth: 0 },
    { targetAge: 100, yearsFromNow: 100 - currentAge, successProbability: baseSuccessProbability * 0.55, medianWealth: 0, p10Wealth: 0 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-600" />
          Longevity Risk Analysis
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          How long can your portfolio sustain your lifestyle?
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Context Banner */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Your current age:</strong> {currentAge} years.
              This analysis shows the probability your portfolio lasts if you live to various ages.
            </div>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {displayData.map((data) => {
            const status = getStatusColor(data.successProbability);
            const gradient = getHeatmapGradient(data.successProbability);

            return (
              <div
                key={data.targetAge}
                className={`relative rounded-lg border-2 ${status.border} overflow-hidden`}
              >
                {/* Gradient Header */}
                <div className={`bg-gradient-to-r ${gradient} p-3 text-white`}>
                  <div className="text-2xl font-bold">{data.targetAge}</div>
                  <div className="text-sm opacity-90">years old</div>
                </div>

                {/* Content */}
                <div className={`p-3 ${status.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${status.text}`}>
                      {data.yearsFromNow} years from now
                    </span>
                    {status.icon}
                  </div>

                  <div className="mb-2">
                    <div className="text-3xl font-bold text-gray-900">
                      {data.successProbability.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-600">success probability</div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                      style={{ width: `${data.successProbability}%` }}
                    />
                  </div>

                  {data.medianWealth > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      Median: {formatCurrency(data.medianWealth)}
                    </div>
                  )}
                </div>

                {/* Status Label */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                  {status.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Insights */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Safe Zone */}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Safe Zone</span>
              </div>
              <div className="text-sm text-green-700">
                {insights.lastSafeAge ? (
                  <>Your plan is robust until age <strong>{insights.lastSafeAge}</strong></>
                ) : (
                  <>Consider increasing your safety margin</>
                )}
              </div>
            </div>

            {/* Caution Zone */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800">Caution Point</span>
              </div>
              <div className="text-sm text-amber-700">
                {insights.cautionAge ? (
                  <>Risk increases after age <strong>{insights.cautionAge}</strong></>
                ) : (
                  <>Your plan maintains good probability across all ages</>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">Danger Point</span>
              </div>
              <div className="text-sm text-red-700">
                {insights.dangerAge ? (
                  <>Higher failure risk after age <strong>{insights.dangerAge}</strong></>
                ) : (
                  <>No significant danger point identified</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Average Life Expectancy Highlight */}
        {insights?.avgLifeExpectancyData && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">At average life expectancy (85 years)</div>
                <div className="text-2xl font-bold text-gray-900">
                  {insights.avgLifeExpectancyData.successProbability.toFixed(1)}% success rate
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Expected remaining wealth</div>
                <div className="text-xl font-semibold text-blue-700">
                  {formatCurrency(insights.avgLifeExpectancyData.medianWealth)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Safe (85%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-lime-500" />
            <span>Good (70-84%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Caution (50-69%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>At Risk (30-49%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Danger (&lt;30%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LongevityHeatmap;

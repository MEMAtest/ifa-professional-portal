// ================================================================
// src/components/monte-carlo/charts/SustainabilityGauge.tsx
// Sustainability Gauge - Speedometer-style withdrawal safety indicator
// Shows Safe / Caution / Danger zones with animated needle
// ================================================================

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Gauge, Info, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface SustainabilityGaugeProps {
  successProbability: number;
  withdrawalRate: number;
  safeWithdrawalRate: number; // 4% rule benchmark
  currentWithdrawal: number;
  portfolioValue: number;
  height?: number;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toFixed(0)}`;
};

// SVG Gauge Component
const GaugeChart: React.FC<{
  value: number;
  size?: number;
}> = ({ value, size = 240 }) => {
  // Gauge parameters - adjusted for better proportions
  const cx = size / 2;
  const cy = size * 0.45; // Moved up slightly to fit content
  const radius = size * 0.35; // Slightly smaller for better fit
  const strokeWidth = size * 0.1;
  const innerRadius = radius - strokeWidth / 2;
  const svgHeight = Math.max(size * 0.7, 180); // Increased height ratio

  // Needle parameters
  const needleLength = radius * 0.75;
  const needleBase = size * 0.03;

  // Arc calculations (180 degree arc, from 180° to 0°)
  const startAngle = 180;
  const endAngle = 0;
  const range = startAngle - endAngle;

  // Convert value (0-100) to angle
  const clampedValue = Math.max(0, Math.min(100, value));
  const needleAngle = startAngle - (clampedValue / 100) * range;
  const needleRadians = (needleAngle * Math.PI) / 180;

  // Needle endpoint
  const needleX = cx + needleLength * Math.cos(needleRadians);
  const needleY = cy - needleLength * Math.sin(needleRadians);

  // Arc path helper
  const polarToCartesian = (angle: number, r: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(radians),
      y: cy - r * Math.sin(radians)
    };
  };

  const describeArc = (startAng: number, endAng: number) => {
    const start = polarToCartesian(startAng, innerRadius);
    const end = polarToCartesian(endAng, innerRadius);
    const largeArc = Math.abs(endAng - startAng) > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  // Zone boundaries (angles)
  const dangerEnd = 150; // 0-30%
  const cautionEnd = 126; // 30-50%
  const okEnd = 90; // 50-70%
  const goodEnd = 54; // 70-85%
  // safe: 85-100% (54° to 0°)

  return (
    <svg width={size} height={svgHeight} viewBox={`0 0 ${size} ${svgHeight}`}>
      {/* Background track */}
      <path
        d={describeArc(180, 0)}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Danger zone (0-30%) - Red */}
      <path
        d={describeArc(180, dangerEnd)}
        fill="none"
        stroke="#ef4444"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />

      {/* Caution zone (30-50%) - Orange */}
      <path
        d={describeArc(dangerEnd, cautionEnd)}
        fill="none"
        stroke="#f97316"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />

      {/* OK zone (50-70%) - Amber */}
      <path
        d={describeArc(cautionEnd, okEnd)}
        fill="none"
        stroke="#eab308"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />

      {/* Good zone (70-85%) - Lime */}
      <path
        d={describeArc(okEnd, goodEnd)}
        fill="none"
        stroke="#84cc16"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />

      {/* Safe zone (85-100%) - Green */}
      <path
        d={describeArc(goodEnd, 0)}
        fill="none"
        stroke="#22c55e"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Center circle */}
      <circle
        cx={cx}
        cy={cy}
        r={size * 0.06}
        fill="#374151"
      />

      {/* Needle */}
      <g style={{ transition: 'transform 1s ease-out' }}>
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#1f2937"
          strokeWidth={needleBase}
          strokeLinecap="round"
        />
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.04}
          fill="#1f2937"
        />
      </g>

      {/* Labels */}
      <text x={size * 0.08} y={cy + 5} fontSize={size * 0.05} fill="#6b7280" textAnchor="start">0%</text>
      <text x={size * 0.92} y={cy + 5} fontSize={size * 0.05} fill="#6b7280" textAnchor="end">100%</text>

      {/* Value display */}
      <text
        x={cx}
        y={cy + size * 0.15}
        fontSize={size * 0.12}
        fontWeight="bold"
        fill="#111827"
        textAnchor="middle"
      >
        {value.toFixed(0)}%
      </text>
    </svg>
  );
};

const getStatusInfo = (probability: number): {
  label: string;
  color: string;
  bgColor: string;
  message: string;
} => {
  if (probability >= 85) {
    return {
      label: 'SAFE',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      message: 'Your withdrawal strategy is highly sustainable'
    };
  }
  if (probability >= 70) {
    return {
      label: 'GOOD',
      color: 'text-lime-700',
      bgColor: 'bg-lime-100',
      message: 'Good sustainability with minor adjustments recommended'
    };
  }
  if (probability >= 50) {
    return {
      label: 'MODERATE',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
      message: 'Consider reducing withdrawal or increasing portfolio'
    };
  }
  if (probability >= 30) {
    return {
      label: 'CAUTION',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
      message: 'High risk - significant adjustments needed'
    };
  }
  return {
    label: 'DANGER',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    message: 'Unsustainable - immediate action required'
  };
};

export const SustainabilityGauge: React.FC<SustainabilityGaugeProps> = ({
  successProbability,
  withdrawalRate,
  safeWithdrawalRate = 4.0,
  currentWithdrawal,
  portfolioValue
}) => {
  const status = useMemo(() => getStatusInfo(successProbability), [successProbability]);

  // Calculate metrics
  const rateComparison = withdrawalRate - safeWithdrawalRate;
  const safeWithdrawalAmount = (portfolioValue * safeWithdrawalRate) / 100;
  const excessWithdrawal = currentWithdrawal - safeWithdrawalAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-blue-600" />
          Sustainability Assessment
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          How sustainable is your current withdrawal strategy?
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Gauge */}
        <div className="flex justify-center mb-4">
          <GaugeChart value={successProbability} size={260} />
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mb-4">
          <div className={`px-4 py-2 rounded-full ${status.bgColor} ${status.color} font-bold text-lg`}>
            {status.label}
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center text-gray-600 mb-6">
          {status.message}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Current Withdrawal Rate */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Your Withdrawal Rate</div>
            <div className="text-2xl font-bold text-gray-900">
              {withdrawalRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              {formatCurrency(currentWithdrawal)}/year
            </div>
          </div>

          {/* Safe Withdrawal Rate */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Safe Rate (4% Rule)</div>
            <div className="text-2xl font-bold text-gray-900">
              {safeWithdrawalRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              {formatCurrency(safeWithdrawalAmount)}/year
            </div>
          </div>
        </div>

        {/* Rate Comparison */}
        <div className={`p-4 rounded-lg mb-4 ${
          rateComparison <= 0 ? 'bg-green-50 border border-green-200' :
          rateComparison <= 1 ? 'bg-amber-50 border border-amber-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {rateComparison <= 0 ? (
                <TrendingDown className="h-5 w-5 text-green-600" />
              ) : rateComparison <= 1 ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <TrendingUp className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${
                rateComparison <= 0 ? 'text-green-800' :
                rateComparison <= 1 ? 'text-amber-800' :
                'text-red-800'
              }`}>
                {rateComparison <= 0
                  ? 'Below safe withdrawal rate'
                  : rateComparison <= 1
                  ? 'Slightly above safe rate'
                  : 'Significantly above safe rate'}
              </span>
            </div>
            <span className={`font-bold ${
              rateComparison <= 0 ? 'text-green-700' :
              rateComparison <= 1 ? 'text-amber-700' :
              'text-red-700'
            }`}>
              {rateComparison > 0 ? '+' : ''}{rateComparison.toFixed(2)}%
            </span>
          </div>
          {excessWithdrawal > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Withdrawing {formatCurrency(excessWithdrawal)}/year more than the safe rate
            </div>
          )}
        </div>

        {/* Recommendations */}
        {successProbability < 85 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-blue-800 mb-1">Recommendations to Improve</div>
                <ul className="text-sm text-blue-700 space-y-1">
                  {withdrawalRate > safeWithdrawalRate && (
                    <li>• Reduce annual withdrawal by {formatCurrency(excessWithdrawal)} to match safe rate</li>
                  )}
                  {successProbability < 70 && (
                    <li>• Consider part-time income to reduce portfolio drawdown</li>
                  )}
                  {successProbability < 50 && (
                    <li>• Delay retirement or reduce lifestyle expenses</li>
                  )}
                  <li>• Review asset allocation for better risk-adjusted returns</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Safe (85%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-lime-500" />
            <span>Good (70-84%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Moderate (50-69%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Caution (30-49%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Danger (&lt;30%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SustainabilityGauge;

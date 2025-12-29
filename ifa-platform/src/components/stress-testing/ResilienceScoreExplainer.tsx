// ================================================================
// src/components/stress-testing/ResilienceScoreExplainer.tsx
// Visual explanation of what resilience scores mean
// Shows score scale and plain English interpretation
// ================================================================

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield
} from 'lucide-react';

interface ResilienceScoreExplainerProps {
  currentScore?: number;
  showCurrentScore?: boolean;
  defaultExpanded?: boolean;
}

interface ScoreZone {
  name: string;
  range: [number, number];
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  Icon: React.ElementType;
  description: string;
  shortDescription: string;
}

const scoreZones: ScoreZone[] = [
  {
    name: 'Critical',
    range: [0, 29],
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    Icon: XCircle,
    description: 'High risk of portfolio depletion under this stress scenario. Immediate protective action recommended.',
    shortDescription: 'Immediate action needed'
  },
  {
    name: 'Vulnerable',
    range: [30, 49],
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    Icon: AlertTriangle,
    description: 'Significant vulnerability to this stress scenario. Consider protective measures such as increasing cash reserves or reducing risk exposure.',
    shortDescription: 'Consider protective measures'
  },
  {
    name: 'Moderate',
    range: [50, 69],
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    Icon: Shield,
    description: 'Portfolio shows reasonable resilience but has some vulnerabilities. Minor adjustments may improve outcomes.',
    shortDescription: 'Some vulnerabilities exist'
  },
  {
    name: 'Robust',
    range: [70, 100],
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    Icon: CheckCircle2,
    description: 'Strong resilience to this stress scenario. Portfolio can weather this event with high confidence.',
    shortDescription: 'Strong resilience'
  }
];

const getZoneForScore = (score: number): ScoreZone => {
  for (const zone of scoreZones) {
    if (score >= zone.range[0] && score <= zone.range[1]) {
      return zone;
    }
  }
  return scoreZones[0]; // Default to Critical
};

export const ResilienceScoreExplainer: React.FC<ResilienceScoreExplainerProps> = ({
  currentScore,
  showCurrentScore = true,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const currentZone = currentScore !== undefined ? getZoneForScore(currentScore) : null;

  // Calculate position percentage for the score indicator
  const getScorePosition = (score: number): number => {
    return Math.min(100, Math.max(0, score));
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader
        className="pb-2 cursor-pointer hover:bg-blue-100/50 transition-colors rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-sm text-blue-800">
          <HelpCircle className="h-4 w-4" />
          What does the resilience score mean?
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2 space-y-4">
          {/* Current Score Highlight */}
          {showCurrentScore && currentScore !== undefined && currentZone && (
            <div className={`p-3 rounded-lg border ${currentZone.bgColor} ${currentZone.borderColor}`}>
              <div className="flex items-center gap-2">
                <currentZone.Icon className={`h-5 w-5 ${currentZone.textColor}`} />
                <span className={`font-bold ${currentZone.textColor}`}>
                  Your Score: {currentScore}/100 - {currentZone.name}
                </span>
              </div>
              <p className={`text-sm mt-1 ${currentZone.textColor}`}>
                {currentZone.description}
              </p>
            </div>
          )}

          {/* Visual Scale */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Score Scale
            </p>

            {/* Scale Bar */}
            <div className="relative h-8 rounded-lg overflow-hidden flex">
              {scoreZones.map((zone, index) => (
                <div
                  key={zone.name}
                  className={`${zone.color} flex-1 flex items-center justify-center relative`}
                  style={{ width: `${zone.range[1] - zone.range[0] + 1}%` }}
                >
                  <span className="text-white text-xs font-bold hidden sm:block">
                    {zone.name}
                  </span>
                  {/* Zone boundary labels */}
                  {index === 0 && (
                    <span className="absolute left-1 text-white/80 text-[10px]">0</span>
                  )}
                </div>
              ))}

              {/* Score Indicator */}
              {currentScore !== undefined && (
                <div
                  className="absolute top-0 bottom-0 flex items-end justify-center"
                  style={{ left: `${getScorePosition(currentScore)}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="relative">
                    {/* Triangle pointer */}
                    <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[10px] border-l-transparent border-r-transparent border-b-gray-800 absolute -top-[10px] left-1/2 -translate-x-1/2" />
                    {/* Score label */}
                    <div className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded -mb-6">
                      {currentScore}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Range Labels */}
            <div className="flex text-[10px] text-gray-500">
              <span className="flex-1 text-left">0</span>
              <span className="flex-1 text-center">30</span>
              <span className="flex-1 text-center">50</span>
              <span className="flex-1 text-center">70</span>
              <span className="text-right">100</span>
            </div>
          </div>

          {/* Zone Descriptions */}
          <div className="grid grid-cols-2 gap-2">
            {scoreZones.map((zone) => (
              <div
                key={zone.name}
                className={`p-2 rounded border ${zone.bgColor} ${zone.borderColor} ${
                  currentZone?.name === zone.name ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <zone.Icon className={`h-3.5 w-3.5 ${zone.textColor}`} />
                  <span className={`font-semibold text-xs ${zone.textColor}`}>
                    {zone.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {zone.range[0]}-{zone.range[1]}
                  </Badge>
                </div>
                <p className={`text-xs ${zone.textColor} opacity-90`}>
                  {zone.shortDescription}
                </p>
              </div>
            ))}
          </div>

          {/* Simple Explanation */}
          <div className="text-xs text-gray-600 bg-white/50 p-3 rounded border border-gray-200">
            <p className="font-medium text-gray-700 mb-1">How is this calculated?</p>
            <p>
              The resilience score measures how likely your portfolio is to survive this stress
              scenario without running out of funds. It considers the survival probability across
              thousands of simulated outcomes, weighted by the severity of the scenario.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Inline tooltip version for scenario cards
export const ResilienceScoreTooltip: React.FC<{ score: number }> = ({ score }) => {
  const zone = getZoneForScore(score);

  return (
    <div className="text-xs p-2 max-w-xs">
      <div className="flex items-center gap-1.5 mb-1">
        <zone.Icon className={`h-3.5 w-3.5 ${zone.textColor}`} />
        <span className="font-semibold">{zone.name} Resilience</span>
      </div>
      <p className="text-gray-600">{zone.description}</p>
    </div>
  );
};

// Export zone getter for external use
export { getZoneForScore, scoreZones };

export default ResilienceScoreExplainer;

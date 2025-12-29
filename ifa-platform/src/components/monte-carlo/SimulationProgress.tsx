// ================================================================
// src/components/monte-carlo/SimulationProgress.tsx
// Enhanced Simulation Progress Component
// Shows staged progress with visual feedback
// ================================================================

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import {
  Loader2,
  Database,
  Cpu,
  BarChart3,
  CheckCircle,
  Play,
  AlertCircle
} from 'lucide-react';

export type SimulationStage =
  | 'idle'
  | 'initializing'
  | 'running'
  | 'analyzing'
  | 'complete'
  | 'error';

interface SimulationProgressProps {
  stage: SimulationStage;
  progress: number;
  simulationCount: number;
  currentSimulation: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

const stageConfig: Record<SimulationStage, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = {
  idle: {
    label: 'Ready',
    description: 'Click "Run Simulation" to begin',
    icon: <Play className="h-5 w-5" />,
    color: 'text-gray-500'
  },
  initializing: {
    label: 'Initializing',
    description: 'Preparing simulation parameters...',
    icon: <Database className="h-5 w-5 animate-pulse" />,
    color: 'text-blue-500'
  },
  running: {
    label: 'Running Simulations',
    description: 'Processing Monte Carlo scenarios...',
    icon: <Cpu className="h-5 w-5 animate-spin" />,
    color: 'text-indigo-500'
  },
  analyzing: {
    label: 'Analyzing Results',
    description: 'Computing statistics and percentiles...',
    icon: <BarChart3 className="h-5 w-5 animate-pulse" />,
    color: 'text-purple-500'
  },
  complete: {
    label: 'Complete',
    description: 'Simulation finished successfully',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'text-green-500'
  },
  error: {
    label: 'Error',
    description: 'Simulation encountered an error',
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'text-red-500'
  }
};

const stages: SimulationStage[] = ['initializing', 'running', 'analyzing', 'complete'];

export const SimulationProgress: React.FC<SimulationProgressProps> = ({
  stage,
  progress,
  simulationCount,
  currentSimulation,
  estimatedTimeRemaining,
  error
}) => {
  const config = stageConfig[stage];

  // Calculate stage index for step indicator
  const currentStageIndex = stages.indexOf(stage);

  if (stage === 'idle') {
    return null;
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardContent className="p-6">
        {/* Stage Steps */}
        <div className="flex items-center justify-between mb-6">
          {stages.map((s, index) => {
            const isActive = currentStageIndex >= index;
            const isCurrent = stage === s;
            const stepConfig = stageConfig[s];

            return (
              <React.Fragment key={s}>
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isCurrent ? `${stepConfig.color} bg-white shadow-lg ring-2 ring-offset-2 ring-blue-500` :
                      isActive ? 'text-green-500 bg-green-100' : 'text-gray-400 bg-gray-100'}
                  `}>
                    {isActive && index < currentStageIndex ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      stepConfig.icon
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${
                    isCurrent ? stepConfig.color : isActive ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {stepConfig.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < stages.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                    currentStageIndex > index ? 'bg-green-400' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Main Progress */}
        <div className="space-y-3">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stage === 'running' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              <span className={`font-semibold ${config.color}`}>
                {config.description}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-600">
              {progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <Progress value={progress} className="h-3" />
            {stage === 'running' && (
              <div
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"
                style={{ width: '100%' }}
              />
            )}
          </div>

          {/* Simulation Counter */}
          {stage === 'running' && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Simulations:</span>
                <span className="font-mono font-bold text-indigo-600 tabular-nums">
                  {currentSimulation.toLocaleString()}
                </span>
                <span className="text-gray-400">/</span>
                <span className="font-mono text-gray-500 tabular-nums">
                  {simulationCount.toLocaleString()}
                </span>
              </div>

              {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                <span className="text-gray-500">
                  ~{Math.ceil(estimatedTimeRemaining / 1000)}s remaining
                </span>
              )}
            </div>
          )}

          {/* Stage-specific messages */}
          {stage === 'analyzing' && (
            <div className="text-sm text-purple-600 animate-pulse">
              Computing confidence intervals, percentiles, and risk metrics...
            </div>
          )}

          {stage === 'complete' && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              All {simulationCount.toLocaleString()} simulations complete!
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Progress Animations CSS */}
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 1.5s infinite;
          }
        `}</style>
      </CardContent>
    </Card>
  );
};

export default SimulationProgress;

// ================================================================
// ResilienceScoreGauge.tsx - Circular progress gauge for resilience scores
// Path: src/components/cashflow/advanced/ResilienceScoreGauge.tsx
// Purpose: Visual gauge showing resilience score (0-100) with color coding
// ================================================================
import React from 'react';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { GaugeProps } from '@/types/stress-testing';



interface ResilienceScoreGaugeProps extends Omit<GaugeProps, 'colors'> {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  breakdown?: {
    diversification: number;
    liquidity: number;
    timeHorizon: number;
    riskCapacity: number;
  };
  className?: string;
}

export const ResilienceScoreGauge: React.FC<ResilienceScoreGaugeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  label = 'Resilience Score',
  breakdown,
  className = ''
}) => {
  // Clamp score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  // Size configurations
  const sizeConfig = {
    sm: { 
      radius: 35, 
      strokeWidth: 6, 
      textSize: 'text-sm', 
      iconSize: 'h-4 w-4',
      containerSize: 'w-20 h-20'
    },
    md: { 
      radius: 50, 
      strokeWidth: 8, 
      textSize: 'text-lg', 
      iconSize: 'h-5 w-5',
      containerSize: 'w-28 h-28'
    },
    lg: { 
      radius: 70, 
      strokeWidth: 10, 
      textSize: 'text-2xl', 
      iconSize: 'h-6 w-6',
      containerSize: 'w-40 h-40'
    }
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Color determination based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return { 
      primary: '#10b981', // green-500
      secondary: '#d1fae5', // green-100
      text: 'text-green-700',
      bg: 'bg-green-50',
      icon: TrendingUp
    };
    if (score >= 60) return { 
      primary: '#f59e0b', // amber-500
      secondary: '#fef3c7', // amber-100
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      icon: Shield
    };
    return { 
      primary: '#ef4444', // red-500
      secondary: '#fee2e2', // red-100
      text: 'text-red-700',
      bg: 'bg-red-50',
      icon: AlertTriangle
    };
  };

  const colors = getScoreColor(normalizedScore);
  const IconComponent = colors.icon;

  // Rating text
  const getRatingText = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Strong';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Weak';
    return 'Critical';
  };

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {/* Circular Gauge */}
      <div className={`relative ${config.containerSize} ${colors.bg} rounded-full p-2`}>
        <svg 
          className="transform -rotate-90 w-full h-full"
          viewBox={`0 0 ${(config.radius + config.strokeWidth) * 2} ${(config.radius + config.strokeWidth) * 2}`}
        >
          {/* Background circle */}
          <circle
            cx={config.radius + config.strokeWidth}
            cy={config.radius + config.strokeWidth}
            r={config.radius}
            fill="transparent"
            stroke={colors.secondary}
            strokeWidth={config.strokeWidth}
            className="opacity-30"
          />
          
          {/* Progress circle */}
          <circle
            cx={config.radius + config.strokeWidth}
            cy={config.radius + config.strokeWidth}
            r={config.radius}
            fill="transparent"
            stroke={colors.primary}
            strokeWidth={config.strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <IconComponent className={`${config.iconSize} ${colors.text} mb-1`} />
          <span className={`font-bold ${config.textSize} ${colors.text}`}>
            {Math.round(normalizedScore)}
          </span>
          {size !== 'sm' && (
            <span className={`text-xs ${colors.text} opacity-75`}>
              {getRatingText(normalizedScore)}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <div className="text-sm font-medium text-gray-700">{label}</div>
          {size === 'lg' && (
            <div className={`text-xs ${colors.text} font-medium`}>
              {getRatingText(normalizedScore)} ({Math.round(normalizedScore)}/100)
            </div>
          )}
        </div>
      )}

      {/* Breakdown (only for large size) */}
      {breakdown && size === 'lg' && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Diversification:</span>
            <span className="font-medium">{breakdown.diversification}/25</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Liquidity:</span>
            <span className="font-medium">{breakdown.liquidity}/25</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Time Horizon:</span>
            <span className="font-medium">{breakdown.timeHorizon}/25</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Risk Capacity:</span>
            <span className="font-medium">{breakdown.riskCapacity}/25</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Example usage component for testing
export const ResilienceScoreGaugeDemo: React.FC = () => {
  const sampleBreakdown = {
    diversification: 18,
    liquidity: 15,
    timeHorizon: 22,
    riskCapacity: 17
  };

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-xl font-bold mb-4">Resilience Score Gauge Examples</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Small gauge */}
        <div className="text-center">
          <h3 className="text-sm font-medium mb-2">Small (85/100)</h3>
          <ResilienceScoreGauge 
            score={85} 
            size="sm" 
            label="Portfolio A"
          />
        </div>

        {/* Medium gauge */}
        <div className="text-center">
          <h3 className="text-sm font-medium mb-2">Medium (62/100)</h3>
          <ResilienceScoreGauge 
            score={62} 
            size="md" 
            label="Portfolio B"
          />
        </div>

        {/* Large gauge with breakdown */}
        <div className="text-center">
          <h3 className="text-sm font-medium mb-2">Large with Breakdown (72/100)</h3>
          <ResilienceScoreGauge 
            score={72} 
            size="lg" 
            label="Portfolio C"
            breakdown={sampleBreakdown}
          />
        </div>
      </div>

      {/* Critical score example */}
      <div className="text-center">
        <h3 className="text-sm font-medium mb-2">Critical Score (28/100)</h3>
        <ResilienceScoreGauge 
          score={28} 
          size="md" 
          label="High Risk Portfolio"
        />
      </div>
    </div>
  );
};
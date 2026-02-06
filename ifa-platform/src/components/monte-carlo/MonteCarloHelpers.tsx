// src/components/monte-carlo/MonteCarloHelpers.tsx
// Intelligent helpers and validation for Monte Carlo simulation

import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, HelpCircle, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Types
interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

interface SimulationParameters {
  initialPortfolio: number;
  timeHorizon: number;
  annualWithdrawal: number;
  riskScore: number;
  inflationRate: number;
}

interface HelperTooltipProps {
  title: string;
  content: string;
  example?: string;
  warning?: string;
}

// Calculate withdrawal rate as percentage
export const calculateWithdrawalRate = (withdrawal: number, portfolio: number): number => {
  if (portfolio <= 0) return 0;
  return (withdrawal / portfolio) * 100;
};

// Calculate expected return based on risk score
export const calculateExpectedReturn = (riskScore: number): number => {
  // Conservative to aggressive allocation
  const equityWeight = 0.1 + (riskScore - 1) * 0.08;
  const bondWeight = 0.8 - (riskScore - 1) * 0.07;
  const cashWeight = 1 - equityWeight - bondWeight;
  
  // Expected returns
  const equityReturn = 0.08; // 8%
  const bondReturn = 0.04;   // 4%
  const cashReturn = 0.02;    // 2%
  
  return (equityWeight * equityReturn + bondWeight * bondReturn + cashWeight * cashReturn) * 100;
};

// Validate simulation parameters
export const validateParameters = (params: SimulationParameters): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    suggestions: []
  };

  const withdrawalRate = calculateWithdrawalRate(params.annualWithdrawal, params.initialPortfolio);
  const expectedReturn = calculateExpectedReturn(params.riskScore);
  const realReturn = expectedReturn - params.inflationRate;

  // Critical errors
  if (params.initialPortfolio <= 0) {
    result.errors.push('Initial portfolio must be greater than £0');
    result.isValid = false;
  }

  if (params.annualWithdrawal <= 0) {
    result.errors.push('Annual Portfolio Withdrawal must be greater than £0. Enter the amount you need to withdraw from your portfolio each year (excluding other income sources like State Pension).');
    result.isValid = false;
  }

  if (params.timeHorizon <= 0) {
    result.errors.push('Time horizon must be at least 1 year');
    result.isValid = false;
  }

  // Withdrawal rate checks based on industry-standard guidance
  // ≤4%: Safe (traditional 4% rule)
  // 4-5%: Moderate (acceptable for shorter time horizons or higher risk tolerance)
  // >5%: Elevated risk (warning zone)
  // >7%: High risk (critical warning)
  // >10%: Unsustainable (error)
  if (withdrawalRate > 10) {
    result.errors.push(`Your withdrawal rate of ${withdrawalRate.toFixed(1)}% is unsustainable and will very likely deplete your portfolio`);
    result.isValid = false;
  } else if (withdrawalRate > 7) {
    result.warnings.push(`Your withdrawal rate of ${withdrawalRate.toFixed(1)}% is high. Consider reducing to 4-5% for better long-term sustainability`);
  } else if (withdrawalRate > 5) {
    result.warnings.push(`Your withdrawal rate of ${withdrawalRate.toFixed(1)}% is above the moderate range. The traditional 4% rule provides a more conservative baseline`);
  } else if (withdrawalRate > 4) {
    // 4-5% is moderate - only warn if time horizon is very long
    if (params.timeHorizon > 30) {
      result.warnings.push(`Your withdrawal rate of ${withdrawalRate.toFixed(1)}% may be elevated for a ${params.timeHorizon}-year time horizon. Consider 3.5-4% for longer retirements`);
    }
  }

  // Real return check
  if (withdrawalRate > realReturn) {
    result.warnings.push(`Your withdrawal rate (${withdrawalRate.toFixed(1)}%) exceeds expected real returns (${realReturn.toFixed(1)}%). This significantly increases failure risk`);
  }

  // Risk score vs withdrawal mismatch
  if (params.riskScore <= 3 && withdrawalRate > 3) {
    result.warnings.push('Conservative portfolio (low risk score) with high withdrawals increases failure risk');
    result.suggestions.push('Consider increasing risk score or reducing withdrawals');
  }

  // Long time horizon with high withdrawal
  if (params.timeHorizon > 30 && withdrawalRate > 4) {
    result.warnings.push('Long retirement periods require lower withdrawal rates for sustainability');
    result.suggestions.push(`For a ${params.timeHorizon}-year retirement, consider a ${(3.5).toFixed(1)}% withdrawal rate`);
  }

  // Inflation check
  if (params.inflationRate > 5) {
    result.warnings.push('High inflation significantly impacts purchasing power over time');
    result.suggestions.push('Consider inflation-protected investments or adjusting withdrawal strategy');
  }

  // Positive suggestions based on the 4% rule
  if (withdrawalRate <= 4 && realReturn > withdrawalRate) {
    result.suggestions.push('Your withdrawal rate is within the safe range (≤4%) based on the traditional 4% rule');
  } else if (withdrawalRate > 4 && withdrawalRate <= 5 && realReturn > withdrawalRate) {
    result.suggestions.push('Your withdrawal rate is moderate (4-5%). This may be acceptable for shorter time horizons or with flexible spending');
  }

  return result;
};

// Helper Tooltip Component
export const HelperTooltip: React.FC<HelperTooltipProps> = ({ title, content, example, warning }) => {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative inline-block">
      <button
        className="ml-1 text-gray-400 hover:text-gray-600"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      
      {show && (
        <div className="absolute z-10 w-64 p-3 bg-white border rounded-lg shadow-lg -top-2 left-6">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-gray-600 mb-2">{content}</p>
          {example && (
            <div className="bg-blue-50 p-2 rounded text-xs mb-2">
              <strong>Example:</strong> {example}
            </div>
          )}
          {warning && (
            <div className="bg-yellow-50 p-2 rounded text-xs">
              <strong>Warning:</strong> {warning}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Validation Display Component
interface ValidationDisplayProps {
  validation: ValidationResult;
  withdrawalRate: number;
  expectedReturn: number;
}

export const ValidationDisplay: React.FC<ValidationDisplayProps> = ({ 
  validation, 
  withdrawalRate, 
  expectedReturn 
}) => {
  if (validation.errors.length === 0 && validation.warnings.length === 0 && validation.suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Current Analysis */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <p className="text-sm font-medium">Withdrawal Rate</p>
              <p className={`text-2xl font-bold ${
                withdrawalRate > 7 ? 'text-red-600' :
                withdrawalRate > 5 ? 'text-orange-600' :
                withdrawalRate > 4 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {withdrawalRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {withdrawalRate > 7 ? 'High risk' :
                 withdrawalRate > 5 ? 'Elevated' :
                 withdrawalRate > 4 ? 'Moderate' :
                 'Safe range'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Expected Return</p>
              <p className="text-2xl font-bold text-blue-600">
                {expectedReturn.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              {validation.errors.map((error, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              {validation.warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">{warning}</p>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {validation.suggestions.length > 0 && (
            <div className="space-y-2">
              {validation.suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-blue-100 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Tips Component
export const MonteCarloQuickTips: React.FC = () => {
  const [showAll, setShowAll] = React.useState(false);

  const tips = [
    {
      icon: DollarSign,
      title: "4% Rule",
      content: "The traditional safe withdrawal rate is 4% of your initial portfolio, adjusted for inflation each year.",
      color: "text-green-600"
    },
    {
      icon: TrendingUp,
      title: "Risk & Return",
      content: "Higher risk scores mean more stocks, which offer higher expected returns but more volatility.",
      color: "text-blue-600"
    },
    {
      icon: AlertTriangle,
      title: "Sequence Risk",
      content: "Poor returns early in retirement have a bigger impact than poor returns later.",
      color: "text-yellow-600"
    },
    {
      icon: Info,
      title: "Success Rate",
      content: "A 75%+ success rate is generally considered acceptable. 90%+ is very conservative.",
      color: "text-purple-600"
    }
  ];

  const displayTips = showAll ? tips : tips.slice(0, 2);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quick Tips
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'Show More'}
          </Button>
        </div>
        
        <div className="grid gap-3">
          {displayTips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <Icon className={`h-5 w-5 ${tip.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <h4 className="font-medium text-sm">{tip.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{tip.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Preset Scenarios Component
interface PresetScenario {
  name: string;
  description: string;
  params: SimulationParameters;
  targetUser: string;
}

export const PresetScenarios: React.FC<{ onSelect: (params: SimulationParameters) => void }> = ({ onSelect }) => {
  const presets: PresetScenario[] = [
    {
      name: "Conservative Retirement",
      description: "Low risk, sustainable withdrawals",
      params: {
        initialPortfolio: 1000000,
        timeHorizon: 30,
        annualWithdrawal: 35000,
        riskScore: 3,
        inflationRate: 2.5
      },
      targetUser: "Risk-averse retirees"
    },
    {
      name: "Balanced Approach",
      description: "Moderate risk, 4% withdrawal",
      params: {
        initialPortfolio: 750000,
        timeHorizon: 25,
        annualWithdrawal: 30000,
        riskScore: 5,
        inflationRate: 3
      },
      targetUser: "Typical retirees"
    },
    {
      name: "Growth Focused",
      description: "Higher risk for wealth building",
      params: {
        initialPortfolio: 500000,
        timeHorizon: 20,
        annualWithdrawal: 20000,
        riskScore: 7,
        inflationRate: 2.5
      },
      targetUser: "Younger retirees"
    },
    {
      name: "Early Retirement",
      description: "Extended timeline for those retiring in their 50s",
      params: {
        initialPortfolio: 1200000,
        timeHorizon: 40,
        annualWithdrawal: 40000,
        riskScore: 6,
        inflationRate: 2.5
      },
      targetUser: "Early retirees (50-55) with long runway"
    },
    {
      name: "Legacy Builder",
      description: "Lower withdrawals to preserve capital for heirs",
      params: {
        initialPortfolio: 800000,
        timeHorizon: 25,
        annualWithdrawal: 25000,
        riskScore: 4,
        inflationRate: 2.5
      },
      targetUser: "Those prioritizing inheritance"
    },
    {
      name: "Income Maximiser",
      description: "Higher spending, lifestyle over legacy",
      params: {
        initialPortfolio: 600000,
        timeHorizon: 20,
        annualWithdrawal: 36000,
        riskScore: 6,
        inflationRate: 3
      },
      targetUser: "Lifestyle-focused retirees"
    }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3">Quick Start Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presets.map((preset, index) => (
            <div key={index} className="p-3 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{preset.name}</h4>
                  <p className="text-sm text-gray-600 line-clamp-1">{preset.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Best for: {preset.targetUser}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">£{(preset.params.initialPortfolio / 1000).toFixed(0)}K</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{preset.params.timeHorizon}yr</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">Risk {preset.params.riskScore}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(preset.params)}
                  className="flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors"
                >
                  Use
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Safe Withdrawal Rate Calculator
export const SafeWithdrawalCalculator: React.FC<{ portfolio: number; timeHorizon: number }> = ({ 
  portfolio, 
  timeHorizon 
}) => {
  // Adjust safe withdrawal rate based on time horizon
  const getSafeRate = (years: number): number => {
    if (years <= 20) return 5.0;
    if (years <= 25) return 4.5;
    if (years <= 30) return 4.0;
    if (years <= 35) return 3.5;
    return 3.0; // 35+ years
  };

  const safeRate = getSafeRate(timeHorizon);
  const safeWithdrawal = (portfolio * safeRate) / 100;

  return (
    <div className="p-3 bg-blue-50 rounded-lg">
      <h4 className="text-sm font-medium mb-2">Suggested Safe Portfolio Withdrawal</h4>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-blue-600">
          £{safeWithdrawal.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
        </span>
        <span className="text-sm text-gray-600">per year ({safeRate}%)</span>
      </div>
      <p className="text-xs text-gray-600 mt-1">
        Based on {timeHorizon}-year time horizon. This is the suggested amount to withdraw from your portfolio annually (excluding other income sources).
      </p>
    </div>
  );
};
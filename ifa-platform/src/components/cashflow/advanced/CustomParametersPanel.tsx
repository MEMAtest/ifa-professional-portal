// ================================================================
// src/components/cashflow/advanced/CustomParametersPanel.tsx
// Advanced UI for customizing stress test parameters
// Integrates seamlessly with StressTestModal
// ================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ParameterSlider } from '@/components/ui/ParameterSlider';
import { 
  Sliders, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Home,
  Heart,
  Briefcase,
  AlertTriangle,
  RotateCcw,
  Info
} from 'lucide-react';
// FIX: Import StressScenario from the types module where it's defined
import type { StressScenario } from '@/types/stress-testing';

// Constants for parameter ranges
const PARAMETER_RANGES = {
  equity_decline: { min: -80, max: 0, step: 5, unit: '%' },
  bond_decline: { min: -40, max: 10, step: 2, unit: '%' },
  property_decline: { min: -50, max: 0, step: 5, unit: '%' },
  inflation_spike: { min: 0, max: 15, step: 0.5, unit: '%' },
  interest_rate_change: { min: -5, max: 10, step: 0.5, unit: '%' },
  volatility_multiplier: { min: 1, max: 5, step: 0.1, unit: 'x' },
  income_reduction_percent: { min: -100, max: 0, step: 10, unit: '%' },
  income_disruption_months: { min: 0, max: 36, step: 1, unit: 'months' },
  healthcare_cost_increase: { min: 0, max: 500, step: 25, unit: '%' },
  emergency_expense: { min: 0, max: 100000, step: 5000, unit: '£' },
  divorce_settlement_percent: { min: -75, max: 0, step: 5, unit: '%' },
  legal_costs: { min: 0, max: 50000, step: 1000, unit: '£' },
} as const;

// Type-safe parameter configuration
interface ParameterConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'market' | 'economic' | 'personal' | 'expense';
  range: {
    min: number;
    max: number;
    step: number;
    unit: string;
  };
}

// Map of all configurable parameters
const PARAMETER_CONFIGS: Record<string, ParameterConfig> = {
  equity_decline: {
    key: 'equity_decline',
    label: 'Equity Market Decline',
    description: 'Percentage decline in equity markets',
    icon: TrendingDown,
    category: 'market',
    range: PARAMETER_RANGES.equity_decline
  },
  bond_decline: {
    key: 'bond_decline',
    label: 'Bond Market Impact',
    description: 'Change in bond market values',
    icon: TrendingDown,
    category: 'market',
    range: PARAMETER_RANGES.bond_decline
  },
  property_decline: {
    key: 'property_decline',
    label: 'Property Value Impact',
    description: 'Change in property values',
    icon: Home,
    category: 'market',
    range: PARAMETER_RANGES.property_decline
  },
  inflation_spike: {
    key: 'inflation_spike',
    label: 'Inflation Increase',
    description: 'Additional inflation above baseline',
    icon: TrendingDown,
    category: 'economic',
    range: PARAMETER_RANGES.inflation_spike
  },
  income_reduction_percent: {
    key: 'income_reduction_percent',
    label: 'Income Reduction',
    description: 'Percentage reduction in income',
    icon: DollarSign,
    category: 'personal',
    range: PARAMETER_RANGES.income_reduction_percent
  },
  income_disruption_months: {
    key: 'income_disruption_months',
    label: 'Income Disruption Duration',
    description: 'Months of income disruption',
    icon: Clock,
    category: 'personal',
    range: PARAMETER_RANGES.income_disruption_months
  },
  healthcare_cost_increase: {
    key: 'healthcare_cost_increase',
    label: 'Healthcare Cost Increase',
    description: 'Percentage increase in healthcare expenses',
    icon: Heart,
    category: 'expense',
    range: PARAMETER_RANGES.healthcare_cost_increase
  },
  emergency_expense: {
    key: 'emergency_expense',
    label: 'One-time Emergency Expense',
    description: 'Unexpected lump sum expense',
    icon: AlertTriangle,
    category: 'expense',
    range: PARAMETER_RANGES.emergency_expense
  }
};

interface CustomParametersPanelProps {
  selectedScenario: StressScenario | null;
  customParameters: Record<string, number>;
  onParametersChange: (parameters: Record<string, number>) => void;
  onReset: () => void;
}

export function CustomParametersPanel({
  selectedScenario,
  customParameters,
  onParametersChange,
  onReset
}: CustomParametersPanelProps) {
  const [localParameters, setLocalParameters] = useState<Record<string, number>>(customParameters);
  const [hasChanges, setHasChanges] = useState(false);

  // Get relevant parameters for the selected scenario
  const relevantParameters = useMemo(() => {
    if (!selectedScenario) return [];

    const params: ParameterConfig[] = [];
    
    // Add parameters based on scenario type
    switch (selectedScenario.type) {
      case 'market_crash':
        params.push(
          PARAMETER_CONFIGS.equity_decline,
          PARAMETER_CONFIGS.bond_decline,
          PARAMETER_CONFIGS.property_decline,
          PARAMETER_CONFIGS.volatility_multiplier || {
            key: 'volatility_multiplier',
            label: 'Volatility Multiplier',
            description: 'Market volatility increase factor',
            icon: TrendingDown,
            category: 'market',
            range: { min: 1, max: 5, step: 0.1, unit: 'x' }
          }
        );
        break;
        
      case 'inflation_shock':
        params.push(
          PARAMETER_CONFIGS.inflation_spike,
          PARAMETER_CONFIGS.real_return_erosion || {
            key: 'real_return_erosion',
            label: 'Real Return Erosion',
            description: 'Reduction in real returns',
            icon: TrendingDown,
            category: 'economic',
            range: { min: -10, max: 0, step: 0.5, unit: '%' }
          }
        );
        break;
        
      case 'personal_crisis':
        if (selectedScenario.id === 'job_loss_redundancy') {
          params.push(
            PARAMETER_CONFIGS.income_reduction_percent,
            PARAMETER_CONFIGS.income_disruption_months,
            {
              key: 'severance_months',
              label: 'Severance Package',
              description: 'Months of severance pay',
              icon: Briefcase,
              category: 'personal',
              range: { min: 0, max: 12, step: 1, unit: 'months' }
            }
          );
        } else if (selectedScenario.id === 'major_health_event') {
          params.push(
            PARAMETER_CONFIGS.income_reduction_percent,
            PARAMETER_CONFIGS.healthcare_cost_increase,
            PARAMETER_CONFIGS.emergency_expense
          );
        } else if (selectedScenario.id === 'divorce_separation') {
          params.push(
            PARAMETER_CONFIGS.divorce_settlement_percent,
            PARAMETER_CONFIGS.legal_costs
          );
        }
        break;
    }

    return params;
  }, [selectedScenario]);

  // Handle parameter change
  const handleParameterChange = useCallback((key: string, value: number) => {
    setLocalParameters(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  }, []);

  // Apply changes
  const handleApplyChanges = useCallback(() => {
    onParametersChange(localParameters);
    setHasChanges(false);
  }, [localParameters, onParametersChange]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    if (!selectedScenario) return;
    
    // Reset to scenario defaults
    const defaultParams: Record<string, number> = {};
    Object.entries(selectedScenario.parameters).forEach(([key, value]) => {
      defaultParams[key] = value as number;
    });
    
    setLocalParameters(defaultParams);
    onReset();
    setHasChanges(false);
  }, [selectedScenario, onReset]);

  if (!selectedScenario) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sliders className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a scenario to customize parameters</p>
        </CardContent>
      </Card>
    );
  }

  // Group parameters by category
  const parametersByCategory = relevantParameters.reduce((acc, param) => {
    if (!acc[param.category]) {
      acc[param.category] = [];
    }
    acc[param.category].push(param);
    return acc;
  }, {} as Record<string, ParameterConfig[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-blue-600" />
              <CardTitle>Custom Parameters</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  Unsaved Changes
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Customizing: {selectedScenario.name}</p>
              <p className="text-blue-700 mt-1">
                Adjust parameters below to model specific variations of this stress scenario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parameter Categories */}
      {Object.entries(parametersByCategory).map(([category, params]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base capitalize">
              {category} Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {params.map((param) => {
              const Icon = param.icon;
              const currentValue = localParameters[param.key] ?? 
                selectedScenario.parameters[param.key] ?? 
                param.range.min;

              return (
                <div key={param.key} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg mt-1">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <label className="font-medium text-sm">
                          {param.label}
                        </label>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {param.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-medium">
                        {param.range.unit === '£' && '£'}
                        {currentValue.toFixed(param.range.step < 1 ? 1 : 0)}
                        {param.range.unit !== '£' && param.range.unit}
                      </span>
                      {currentValue !== (selectedScenario.parameters[param.key] ?? param.range.min) && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Modified
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <ParameterSlider
                    label={param.label}
                    value={currentValue}
                    onChange={(value) => handleParameterChange(param.key, value)}
                    min={param.range.min}
                    max={param.range.max}
                    step={param.range.step}
                    formatValue={(val) => {
                      if (param.range.unit === '£') {
                        return `£${val.toLocaleString()}`;
                      }
                      if (param.range.unit === 'months') {
                        return `${val} ${val === 1 ? 'month' : 'months'}`;
                      }
                      return `${val}${param.range.unit}`;
                    }}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Action Buttons */}
      {hasChanges && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Apply your custom parameters to the stress test
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalParameters(customParameters);
                    setHasChanges(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleApplyChanges}>
                  Apply Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
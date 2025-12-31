// ================================================================
// src/components/cashflow/AssumptionEditor.tsx
// Interactive assumption editor with real-time updates - FIXED
// ================================================================

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/Slider';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Target, 
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CashFlowScenario } from '@/types/cashflow';

interface AssumptionEditorProps {
  scenario: CashFlowScenario;
  onChange: (updatedScenario: CashFlowScenario) => void;
  disabled?: boolean;
}

interface AssumptionSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  fields: AssumptionField[];
}

interface AssumptionField {
  key: keyof CashFlowScenario;
  label: string;
  type: 'slider' | 'input' | 'currency';
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  helpText?: string;
  validation?: (value: number) => string | null;
}

export const AssumptionEditor: React.FC<AssumptionEditorProps> = ({
  scenario,
  onChange,
  disabled = false
}) => {
  const [localScenario, setLocalScenario] = useState<CashFlowScenario>(scenario);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Sync with parent when scenario changes
  useEffect(() => {
    setLocalScenario(scenario);
    setIsDirty(false);
  }, [scenario]);

  // Debounced change handler
  const debouncedOnChange = useMemo(() => {
    return debounce((updatedScenario: CashFlowScenario) => {
      onChange(updatedScenario);
    }, 500);
  }, [onChange]);

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  const handleFieldChange = useCallback((field: keyof CashFlowScenario, value: number) => {
    const updated = { ...localScenario, [field]: value };
    setLocalScenario(updated);
    setIsDirty(true);
    
    // Validate the change
    const errors = { ...validationErrors };
    const fieldConfig = getFieldConfig(field);
    
    if (fieldConfig?.validation) {
      const error = fieldConfig.validation(value);
      if (error) {
        errors[field] = error;
      } else {
        delete errors[field];
      }
    }
    
    setValidationErrors(errors);
    
    // Only trigger onChange if no validation errors
    if (Object.keys(errors).length === 0) {
      debouncedOnChange(updated);
    }
  }, [localScenario, validationErrors, debouncedOnChange]);

  // Reset to original values
  const handleReset = () => {
    setLocalScenario(scenario);
    setValidationErrors({});
    setIsDirty(false);
  };

  // Load market data defaults
  const loadMarketDefaults = () => {
    const marketDefaults = {
      inflationRate: 2.5,
      realEquityReturn: 5.0,
      realBondReturn: 1.5,
      realCashReturn: 0.5
    };
    
    const updated = { ...localScenario, ...marketDefaults };
    setLocalScenario(updated);
    setIsDirty(true);
    debouncedOnChange(updated);
  };

  // Assumption sections configuration
  const assumptionSections: AssumptionSection[] = [
    {
      id: 'market_assumptions',
      title: 'Market Assumptions',
      icon: TrendingUp,
      fields: [
        {
          key: 'inflationRate',
          label: 'Inflation Rate',
          type: 'slider',
          min: 0,
          max: 6,
          step: 0.1,
          suffix: '%',
          helpText: 'Long-term expected inflation rate',
          validation: (value) => value < 0 ? 'Inflation rate cannot be negative' : null
        },
        {
          key: 'realEquityReturn',
          label: 'Real Equity Return',
          type: 'slider',
          min: 0,
          max: 10,
          step: 0.1,
          suffix: '%',
          helpText: 'Expected real return on equity investments (above inflation)',
          validation: (value) => value < 0 ? 'Return cannot be negative' : null
        },
        {
          key: 'realBondReturn',
          label: 'Real Bond Return',
          type: 'slider',
          min: -2,
          max: 5,
          step: 0.1,
          suffix: '%',
          helpText: 'Expected real return on bond investments (above inflation)'
        },
        {
          key: 'realCashReturn',
          label: 'Real Cash Return',
          type: 'slider',
          min: -3,
          max: 3,
          step: 0.1,
          suffix: '%',
          helpText: 'Expected real return on cash savings (above inflation)'
        }
      ]
    },
    {
      id: 'financial_position',
      title: 'Financial Position',
      icon: DollarSign,
      fields: [
        {
          key: 'currentIncome',
          label: 'Current Annual Income',
          type: 'currency',
          min: 0,
          max: 1000000,
          step: 1000,
          helpText: 'Current gross annual income from employment'
        },
        {
          key: 'currentExpenses',
          label: 'Current Annual Expenses',
          type: 'currency',
          min: 0,
          max: 500000,
          step: 1000,
          helpText: 'Current annual living expenses'
        },
        {
          key: 'pensionContributions',
          label: 'Annual Pension Contributions',
          type: 'currency',
          min: 0,
          max: 100000,
          step: 500,
          helpText: 'Total annual pension contributions (employee + employer)'
        },
        {
          key: 'currentSavings',
          label: 'Current Cash Savings',
          type: 'currency',
          min: 0,
          max: 1000000,
          step: 1000,
          helpText: 'Current cash savings and readily accessible funds'
        }
      ]
    },
    {
      id: 'retirement_planning',
      title: 'Retirement Planning',
      icon: Calendar,
      fields: [
        {
          key: 'retirementAge',
          label: 'Retirement Age',
          type: 'slider',
          min: 50,
          max: 75,
          step: 1,
          helpText: 'Planned retirement age',
          validation: (value) => value <= localScenario.clientAge ? 'Retirement age must be greater than current age' : null
        },
        {
          key: 'lifeExpectancy',
          label: 'Life Expectancy',
          type: 'slider',
          min: 75,
          max: 100,
          step: 1,
          helpText: 'Expected life expectancy for planning purposes',
          validation: (value) => value <= localScenario.retirementAge ? 'Life expectancy should be greater than retirement age' : null
        },
        {
          key: 'statePensionAge',
          label: 'State Pension Age',
          type: 'slider',
          min: 65,
          max: 68,
          step: 1,
          helpText: 'Age when state pension becomes available'
        },
        {
          key: 'statePensionAmount',
          label: 'Annual State Pension',
          type: 'currency',
          min: 0,
          max: 25000,
          step: 100,
          helpText: 'Expected annual state pension amount'
        }
      ]
    },
    {
      id: 'goals_targets',
      title: 'Goals & Targets',
      icon: Target,
      fields: [
        {
          key: 'retirementIncomeTarget',
          label: 'Target Retirement Income',
          type: 'currency',
          min: 0,
          max: 200000,
          step: 1000,
          helpText: 'Desired annual income in retirement'
        },
        {
          key: 'emergencyFundTarget',
          label: 'Emergency Fund Target',
          type: 'currency',
          min: 0,
          max: 100000,
          step: 1000,
          helpText: 'Target emergency fund amount'
        },
        {
          key: 'legacyTarget',
          label: 'Legacy Target',
          type: 'currency',
          min: 0,
          max: 1000000,
          step: 5000,
          helpText: 'Amount to leave as inheritance (optional)'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Assumption Editor</h3>
          {isDirty && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Unsaved Changes
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadMarketDefaults}
            disabled={disabled}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Market Defaults
          </Button>
          {isDirty && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={disabled}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Validation errors summary */}
      {Object.keys(validationErrors).length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 mb-1">Please correct the following:</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {Object.values(validationErrors).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assumption sections */}
      <div className="grid gap-6">
        {assumptionSections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="w-5 h-5" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {section.fields.map((field) => (
                <AssumptionField
                  key={field.key}
                  field={field}
                  value={localScenario[field.key] as number}
                  onChange={(value) => handleFieldChange(field.key, value)}
                  disabled={disabled}
                  error={validationErrors[field.key]}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Individual field component
interface AssumptionFieldProps {
  field: AssumptionField;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  error?: string;
}

const AssumptionField: React.FC<AssumptionFieldProps> = ({
  field,
  value,
  onChange,
  disabled,
  error
}) => {
  const formatValue = (val: number) => {
    if (field.type === 'currency') {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(val);
    }
    return `${val.toFixed(field.step && field.step < 1 ? 1 : 0)}${field.suffix || ''}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    if (field.min !== undefined && newValue < field.min) return;
    if (field.max !== undefined && newValue > field.max) return;
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
          </label>
          {field.helpText && (
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {field.helpText}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={cn("font-semibold", error ? 'text-red-600' : 'text-gray-900')}>
          {formatValue(value)}
        </div>
      </div>

      {field.type === 'slider' ? (
        <div className="px-2">
          <Slider
            value={[value]}
            onValueChange={([newValue]) => onChange(newValue)}
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{field.min}{field.suffix}</span>
            <span>{field.max}{field.suffix}</span>
          </div>
        </div>
      ) : (
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 border rounded-md text-sm",
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
            disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
          )}
        />
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

// Helper function to get field configuration
function getFieldConfig(fieldKey: keyof CashFlowScenario): AssumptionField | undefined {
  const allSections: AssumptionSection[] = [
    {
      id: 'market_assumptions',
      title: 'Market Assumptions',
      icon: TrendingUp,
      fields: [
        {
          key: 'inflationRate',
          label: 'Inflation Rate',
          type: 'slider',
          min: 0,
          max: 6,
          step: 0.1,
          suffix: '%',
          validation: (value) => value < 0 ? 'Inflation rate cannot be negative' : null
        },
        {
          key: 'realEquityReturn',
          label: 'Real Equity Return',
          type: 'slider',
          min: 0,
          max: 10,
          step: 0.1,
          suffix: '%',
          validation: (value) => value < 0 ? 'Return cannot be negative' : null
        }
      ]
    }
  ];

  for (const section of allSections) {
    const field = section.fields.find(f => f.key === fieldKey);
    if (field) return field;
  }
  return undefined;
}

// Debounce utility with cancel method
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | undefined;
  const debouncedFn = (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };
  return debouncedFn;
}

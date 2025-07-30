// ===================================================================
// src/components/ui/Progress.tsx - PRODUCTION READY - Error Free
// ===================================================================

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ===================================================================
// INTERFACES
// ===================================================================

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number | null | undefined
  max?: number
  className?: string
  indicatorClassName?: string
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Safely parse and clamp progress value
 */
function normalizeProgressValue(value: number | null | undefined, max: number = 100): number {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 0;
  }
  
  const numValue = Number(value);
  return Math.min(Math.max(numValue, 0), max);
}

/**
 * Get variant-specific styles
 */
function getVariantStyles(variant: ProgressProps['variant']) {
  switch (variant) {
    case 'success':
      return 'bg-green-600';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-600';
    default:
      return 'bg-blue-600';
  }
}

/**
 * Get size-specific styles
 */
function getSizeStyles(size: ProgressProps['size']) {
  switch (size) {
    case 'sm':
      return 'h-1';
    case 'lg':
      return 'h-3';
    default:
      return 'h-2';
  }
}

// ===================================================================
// PROGRESS COMPONENT
// ===================================================================

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    indicatorClassName,
    value, 
    max = 100,
    showPercentage = false,
    size = 'md',
    variant = 'default',
    ...props 
  }, ref) => {
    // Normalize the progress value
    const normalizedValue = normalizeProgressValue(value, max);
    const percentage = max > 0 ? (normalizedValue / max) * 100 : 0;
    
    // Get dynamic styles
    const variantStyles = getVariantStyles(variant);
    const sizeStyles = getSizeStyles(size);
    
    return (
      <div className={cn("relative", className)}>
        <div
          ref={ref}
          className={cn(
            "relative w-full overflow-hidden rounded-full bg-gray-200",
            sizeStyles,
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "h-full w-full flex-1 transition-all duration-300 ease-in-out",
              variantStyles,
              indicatorClassName
            )}
            style={{ 
              transform: `translateX(-${100 - percentage}%)`,
              transformOrigin: 'left'
            }}
          />
        </div>
        
        {showPercentage && (
          <div className="mt-1 flex justify-between text-xs text-gray-600">
            <span>{Math.round(percentage)}%</span>
            <span>{normalizedValue} / {max}</span>
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

// ===================================================================
// CIRCULAR PROGRESS COMPONENT
// ===================================================================

interface CircularProgressProps {
  value?: number | null | undefined
  max?: number
  size?: number
  strokeWidth?: number
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  showPercentage?: boolean
}

const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  ({
    value,
    max = 100,
    size = 40,
    strokeWidth = 4,
    className,
    variant = 'default',
    showPercentage = false,
    ...props
  }, ref) => {
    // Normalize the progress value
    const normalizedValue = normalizeProgressValue(value, max);
    const percentage = max > 0 ? (normalizedValue / max) * 100 : 0;
    
    // Calculate circle properties
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    // Get color based on variant
    const getStrokeColor = () => {
      switch (variant) {
        case 'success':
          return '#16a34a'; // green-600
        case 'warning':
          return '#eab308'; // yellow-500
        case 'error':
          return '#dc2626'; // red-600
        default:
          return '#2563eb'; // blue-600
      }
    };
    
    return (
      <div className={cn("relative inline-flex items-center justify-center", className)}>
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          {...props}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb" // gray-200
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-900">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

// ===================================================================
// STEP PROGRESS COMPONENT
// ===================================================================

interface StepProgressProps {
  steps: string[]
  currentStep: number
  completedSteps?: number[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const StepProgress = React.forwardRef<HTMLDivElement, StepProgressProps>(
  ({
    steps,
    currentStep,
    completedSteps = [],
    className,
    orientation = 'horizontal',
    variant = 'default',
    ...props
  }, ref) => {
    // Normalize current step
    const normalizedCurrentStep = Math.max(0, Math.min(currentStep, steps.length - 1));
    
    // Get variant colors
    const getStepStyles = (stepIndex: number) => {
      const isCompleted = completedSteps.includes(stepIndex) || stepIndex < normalizedCurrentStep;
      const isCurrent = stepIndex === normalizedCurrentStep;
      
      if (isCompleted) {
        switch (variant) {
          case 'success':
            return 'bg-green-600 text-white border-green-600';
          case 'warning':
            return 'bg-yellow-500 text-white border-yellow-500';
          case 'error':
            return 'bg-red-600 text-white border-red-600';
          default:
            return 'bg-blue-600 text-white border-blue-600';
        }
      } else if (isCurrent) {
        switch (variant) {
          case 'success':
            return 'bg-green-100 text-green-700 border-green-300';
          case 'warning':
            return 'bg-yellow-100 text-yellow-700 border-yellow-300';
          case 'error':
            return 'bg-red-100 text-red-700 border-red-300';
          default:
            return 'bg-blue-100 text-blue-700 border-blue-300';
        }
      } else {
        return 'bg-gray-100 text-gray-500 border-gray-300';
      }
    };
    
    const getConnectorStyles = (stepIndex: number) => {
      if (stepIndex >= steps.length - 1) return 'opacity-0';
      
      const isCompleted = completedSteps.includes(stepIndex) || stepIndex < normalizedCurrentStep;
      
      if (isCompleted) {
        switch (variant) {
          case 'success':
            return 'bg-green-600';
          case 'warning':
            return 'bg-yellow-500';
          case 'error':
            return 'bg-red-600';
          default:
            return 'bg-blue-600';
        }
      } else {
        return 'bg-gray-300';
      }
    };
    
    if (orientation === 'vertical') {
      return (
        <div ref={ref} className={cn("flex flex-col", className)} {...props}>
          {steps.map((step, index) => (
            <div key={index} className="flex items-start">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium",
                    getStepStyles(index)
                  )}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mt-1 h-8 w-0.5 transition-colors duration-200",
                      getConnectorStyles(index)
                    )}
                  />
                )}
              </div>
              <div className="ml-3 pb-8">
                <div className="text-sm font-medium text-gray-900">{step}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div ref={ref} className={cn("flex items-center", className)} {...props}>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors duration-200",
                  getStepStyles(index)
                )}
              >
                {index + 1}
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center max-w-20">
                {step}
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors duration-200",
                  getConnectorStyles(index)
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

StepProgress.displayName = "StepProgress";

// ===================================================================
// PROGRESS WITH LABEL COMPONENT
// ===================================================================

interface ProgressWithLabelProps extends ProgressProps {
  label?: string
  description?: string
}

const ProgressWithLabel = React.forwardRef<HTMLDivElement, ProgressWithLabelProps>(
  ({ label, description, value, max = 100, className, ...props }, ref) => {
    const normalizedValue = normalizeProgressValue(value, max);
    const percentage = max > 0 ? (normalizedValue / max) * 100 : 0;
    
    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {(label || description) && (
          <div className="flex justify-between items-end">
            <div>
              {label && <div className="text-sm font-medium text-gray-900">{label}</div>}
              {description && <div className="text-xs text-gray-600">{description}</div>}
            </div>
            <div className="text-sm text-gray-600">
              {Math.round(percentage)}%
            </div>
          </div>
        )}
        <Progress value={value} max={max} {...props} />
      </div>
    );
  }
);

ProgressWithLabel.displayName = "ProgressWithLabel";

// ===================================================================
// EXPORTS
// ===================================================================

export { 
  Progress, 
  CircularProgress, 
  StepProgress, 
  ProgressWithLabel,
  type ProgressProps,
  type CircularProgressProps,
  type StepProgressProps,
  type ProgressWithLabelProps
};
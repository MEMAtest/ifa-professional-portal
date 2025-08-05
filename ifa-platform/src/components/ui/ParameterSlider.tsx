// ================================================================
// src/components/ui/ParameterSlider.tsx - PHASE 3 SUPPORTING
// Reusable slider component for stress test parameters
// Professional styling with real-time value display
// ================================================================

'use client';

import React from 'react';

interface ParameterSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function ParameterSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue = (val) => val.toString(),
  description,
  disabled = false,
  className = ''
}: ParameterSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label and Value */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
          <span className="text-sm text-gray-600 min-w-[60px]">
            {formatValue(value)}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          value={value}
          onChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
          }}
        />
        
        {/* Slider thumb styling with CSS */}
        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #3b82f6;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .slider::-webkit-slider-thumb:hover {
            background: #2563eb;
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }
          
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #3b82f6;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            border: none;
            transition: all 0.2s ease;
          }
          
          .slider::-moz-range-thumb:hover {
            background: #2563eb;
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }
          
          .slider:disabled::-webkit-slider-thumb {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
          }
          
          .slider:disabled::-moz-range-thumb {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
          }
        `}</style>
      </div>

      {/* Min/Max Labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 mt-2">
          {description}
        </p>
      )}

      {/* Visual indicators for common ranges */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span className={value <= min + (max - min) * 0.33 ? 'text-green-600 font-medium' : ''}>
          Low
        </span>
        <span className={value > min + (max - min) * 0.33 && value <= min + (max - min) * 0.66 ? 'text-yellow-600 font-medium' : ''}>
          Medium
        </span>
        <span className={value > min + (max - min) * 0.66 ? 'text-red-600 font-medium' : ''}>
          High
        </span>
      </div>
    </div>
  );
}

// Additional specialized sliders for common stress test parameters
export function VolatilitySlider({ value, onChange, disabled }: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <ParameterSlider
      label="Market Volatility"
      value={value}
      onChange={onChange}
      min={0.1}
      max={0.5}
      step={0.05}
      formatValue={(val) => `${(val * 100).toFixed(0)}%`}
      description="Higher volatility increases uncertainty in projections"
      disabled={disabled}
    />
  );
}

export function CorrelationSlider({ value, onChange, disabled }: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <ParameterSlider
      label="Asset Correlation"
      value={value}
      onChange={onChange}
      min={0}
      max={1}
      step={0.1}
      formatValue={(val) => `${(val * 100).toFixed(0)}%`}
      description="Higher correlation means assets move together more during stress"
      disabled={disabled}
    />
  );
}

export function DurationSlider({ value, onChange, disabled }: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <ParameterSlider
      label="Stress Duration"
      value={value}
      onChange={onChange}
      min={1}
      max={10}
      step={1}
      formatValue={(val) => `${val} year${val !== 1 ? 's' : ''}`}
      description="How long the stress conditions persist"
      disabled={disabled}
    />
  );
}
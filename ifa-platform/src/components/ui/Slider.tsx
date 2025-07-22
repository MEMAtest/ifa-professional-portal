// src/components/ui/Slider.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ value = [5], onValueChange, min = 0, max = 100, step = 1, disabled = false, className, id }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value[0]);

    React.useEffect(() => {
      if (value && value[0] !== undefined) {
        setInternalValue(value[0]);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      setInternalValue(newValue);
      if (onValueChange) {
        onValueChange([newValue]);
      }
    };

    const percentage = ((internalValue - min) / (max - min)) * 100;

    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={internalValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
            "slider-thumb:appearance-none slider-thumb:w-5 slider-thumb:h-5",
            "slider-thumb:bg-blue-600 slider-thumb:rounded-full slider-thumb:cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          )}
          style={{
            background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${percentage}%, rgb(229 231 235) ${percentage}%, rgb(229 231 235) 100%)`
          }}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';

// Add CSS to your global styles or in a style tag:
const sliderStyles = `
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: rgb(59 130 246);
    border-radius: 50%;
    cursor: pointer;
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: rgb(59 130 246);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
`;
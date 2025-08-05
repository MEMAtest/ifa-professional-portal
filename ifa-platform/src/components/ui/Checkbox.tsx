// ================================================================
// File: src/components/ui/Checkbox.tsx
// Updated Checkbox component with onCheckedChange support
// ================================================================

'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, onCheckedChange, onChange, ...props }, ref) => {
    
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      // Support both onChange and onCheckedChange
      if (onChange) {
        onChange(event);
      }
      if (onCheckedChange) {
        onCheckedChange(event.target.checked);
      }
    };
    
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            ref={ref}
            onChange={handleChange}
            {...props}
          />
        </div>
        {label && (
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700 cursor-pointer">
              {label}
            </label>
            {helperText && <p className="text-gray-500">{helperText}</p>}
            {error && <p className="text-red-600">{error}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
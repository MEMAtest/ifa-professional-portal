// ================================================================
// src/components/cashflow/SustainabilityGauge.tsx
// Simple color-coded gauge for sustainability rating
// ================================================================

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { ProjectionSummary } from '@/types/cashflow';

type SustainabilityRating = ProjectionSummary['sustainabilityRating'];

interface SustainabilityGaugeProps {
  rating: SustainabilityRating;
  size?: 'sm' | 'md';
  className?: string;
}

const ratingScoreMap: Record<SustainabilityRating, number> = {
  Excellent: 90,
  Good: 75,
  Adequate: 55,
  Poor: 35,
  Critical: 15
};

const ratingColorMap: Record<SustainabilityRating, { text: string; marker: string }> = {
  Excellent: { text: 'text-green-700', marker: 'bg-green-500' },
  Good: { text: 'text-green-700', marker: 'bg-green-500' },
  Adequate: { text: 'text-amber-700', marker: 'bg-amber-500' },
  Poor: { text: 'text-red-700', marker: 'bg-red-500' },
  Critical: { text: 'text-red-700', marker: 'bg-red-500' }
};

export const SustainabilityGauge: React.FC<SustainabilityGaugeProps> = ({
  rating,
  size = 'md',
  className
}) => {
  const score = ratingScoreMap[rating] ?? 50;
  const colors = ratingColorMap[rating] ?? ratingColorMap.Adequate;
  const widthClass = size === 'sm' ? 'w-20' : 'w-28';
  const markerLeft = `calc(${score}% - 6px)`;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('relative', widthClass)}>
        <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-green-500" />
        <span
          className={cn(
            'absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white shadow-sm',
            colors.marker
          )}
          style={{ left: markerLeft }}
          aria-hidden="true"
        />
      </div>
      <span className={cn('text-sm font-medium', colors.text)}>{rating}</span>
    </div>
  );
};


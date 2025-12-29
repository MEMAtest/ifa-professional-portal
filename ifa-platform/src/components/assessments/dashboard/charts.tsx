import React from 'react';
import { Label } from 'recharts';

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
      {label ? <div className="text-xs font-medium text-gray-900 mb-1">{label}</div> : null}
      <div className="space-y-1">
        {payload
          .filter((item) => item && item.value != null && Number(item.value) !== 0)
          .map((item) => (
            <div key={item.dataKey || item.name} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2 text-gray-600">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
                {item.name}
              </span>
              <span className="font-semibold text-gray-900 tabular-nums">{item.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

interface CenteredTotalLabelProps {
  value: number;
  subtitle: string;
}

export function CenteredTotalLabel({ value, subtitle }: CenteredTotalLabelProps) {
  return (
    <Label
      content={({ viewBox }: any) => {
        if (!viewBox) return null;
        const cx = viewBox.cx;
        const cy = viewBox.cy;
        return (
          <g>
            <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle" className="fill-gray-900">
              <tspan className="text-base font-bold tabular-nums">{value}</tspan>
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" className="fill-gray-500">
              <tspan className="text-[10px]">{subtitle}</tspan>
            </text>
          </g>
        );
      }}
    />
  );
}

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { RiskMixEntry } from './types';

interface CashFlowRiskMixCardProps {
  riskMix: RiskMixEntry[];
  onSelect: (label?: string) => void;
}

export function CashFlowRiskMixCard({ riskMix, onSelect }: CashFlowRiskMixCardProps) {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Risk Mix</CardTitle>
        <p className="text-xs text-gray-500">Click a bar to drill down</p>
      </CardHeader>
      <CardContent className="h-[220px]">
        {riskMix.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskMix}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} onClick={(data) => onSelect(data?.payload?.label)}>
                {riskMix.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} cursor="pointer" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            Add risk profiles to visualize mix.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

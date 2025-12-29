import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { ClientFilterKey, RetirementDistributionEntry } from './types';

interface CashFlowRetirementDistributionCardProps {
  retirementDistribution: RetirementDistributionEntry[];
  onSelect: (key?: ClientFilterKey) => void;
}

export function CashFlowRetirementDistributionCard({
  retirementDistribution,
  onSelect
}: CashFlowRetirementDistributionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Retirement Age Distribution</CardTitle>
        <p className="text-xs text-gray-500">Based on recorded retirement ages</p>
      </CardHeader>
      <CardContent className="h-[240px]">
        {retirementDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={retirementDistribution}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                onClick={(data) => onSelect(data?.payload?.key as ClientFilterKey | undefined)}
              >
                {retirementDistribution.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} cursor="pointer" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            Add retirement age data to visualize distribution.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

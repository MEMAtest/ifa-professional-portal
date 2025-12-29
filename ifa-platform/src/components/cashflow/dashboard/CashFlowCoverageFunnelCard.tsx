import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { ClientFilterKey, CoverageSeriesEntry } from './types';

interface CashFlowCoverageFunnelCardProps {
  coverageSeries: CoverageSeriesEntry[];
  onSelect: (key?: ClientFilterKey) => void;
}

export function CashFlowCoverageFunnelCard({
  coverageSeries,
  onSelect
}: CashFlowCoverageFunnelCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Coverage Funnel</CardTitle>
        <p className="text-xs text-gray-500">Live progress from assessments, scenarios, and reports</p>
      </CardHeader>
      <CardContent className="h-[240px]">
        {coverageSeries.some((entry) => entry.count > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={coverageSeries}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              barSize={16}
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                formatter={(_value: number, _name: string, props) => {
                  const count = props.payload?.count ?? 0;
                  const percent = props.payload?.percent ?? 0;
                  return [`${count} (${percent}%)`, 'Clients'];
                }}
              />
              <Bar
                dataKey="percent"
                radius={[6, 6, 6, 6]}
                onClick={(data) => onSelect(data?.payload?.key as ClientFilterKey | undefined)}
              >
                {coverageSeries.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} cursor="pointer" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            Add coverage data to visualize readiness.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

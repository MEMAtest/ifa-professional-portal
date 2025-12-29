import React from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { AumSeriesPoint, ClientFilterKey } from './types';

interface InteractiveCardProps {
  role?: string;
  tabIndex?: number;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  title?: string;
}

interface CashFlowPortfolioMomentumCardProps {
  aumSeries: AumSeriesPoint[];
  formatCompactCurrency: (amount: number) => string;
  formatCurrency: (amount: number) => string;
  getInteractiveCardProps: (filter: ClientFilterKey, baseClassName?: string) => InteractiveCardProps;
}

export function CashFlowPortfolioMomentumCard({
  aumSeries,
  formatCompactCurrency,
  formatCurrency,
  getInteractiveCardProps
}: CashFlowPortfolioMomentumCardProps) {
  return (
    <Card
      {...getInteractiveCardProps('top_aum')}
      title="Click to view top AUM clients"
      className="xl:col-span-3"
    >
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Portfolio Momentum</CardTitle>
          <p className="text-xs text-gray-500">
            Cumulative AUM growth based on client onboarding
          </p>
        </div>
        <Badge variant="outline">Last {aumSeries.length} data points</Badge>
      </CardHeader>
      <CardContent className="h-[320px]">
        {aumSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={aumSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="aumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCompactCurrency(Number(value))}
              />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'aum') {
                    return [formatCurrency(Number(value)), 'AUM'];
                  }
                  if (name === 'clients') {
                    return [Math.round(Number(value)), 'Clients'];
                  }
                  return [value, name];
                }}
                labelStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="aum"
                yAxisId="left"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#aumGradient)"
              />
              <Line type="monotone" dataKey="clients" yAxisId="right" stroke="#10b981" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            Add client data to populate portfolio momentum.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ClientFilterKey, CommandCenterStats } from './types';

interface InteractiveRowProps {
  role?: string;
  tabIndex?: number;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
}

interface CashFlowAlertsCardProps {
  stats: CommandCenterStats;
  getInteractiveRowProps: (filter: ClientFilterKey, baseClassName?: string) => InteractiveRowProps;
}

export function CashFlowAlertsCard({ stats, getInteractiveRowProps }: CashFlowAlertsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts & Next Actions</CardTitle>
        <p className="text-xs text-gray-500">Across all active clients</p>
      </CardHeader>
      <CardContent className="h-[240px] flex flex-col justify-between text-sm">
        <div className="space-y-3">
          <div {...getInteractiveRowProps('review_due', 'flex items-start justify-between')}>
            <div>
              <p className="font-medium text-gray-900">Review due</p>
              <p className="text-xs text-gray-500">Clients needing annual review</p>
            </div>
            <Badge variant="outline">{stats.reviewDue}</Badge>
          </div>
          <div {...getInteractiveRowProps('high_risk', 'flex items-start justify-between')}>
            <div>
              <p className="font-medium text-gray-900">High risk watchlist</p>
              <p className="text-xs text-gray-500">Growth or aggressive profiles</p>
            </div>
            <Badge variant="outline">{stats.highRisk}</Badge>
          </div>
          <div {...getInteractiveRowProps('missing_assessment', 'flex items-start justify-between')}>
            <div>
              <p className="font-medium text-gray-900">Missing assessments</p>
              <p className="text-xs text-gray-500">No recorded ATR</p>
            </div>
            <Badge variant="outline">{stats.missingAssessments}</Badge>
          </div>
          <div {...getInteractiveRowProps('missing_plan', 'flex items-start justify-between')}>
            <div>
              <p className="font-medium text-gray-900">No cash flow plan</p>
              <p className="text-xs text-gray-500">No scenario built yet</p>
            </div>
            <Badge variant="outline">{stats.missingPlans}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

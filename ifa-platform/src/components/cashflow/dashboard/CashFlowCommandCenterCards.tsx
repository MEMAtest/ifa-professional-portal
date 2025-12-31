import React from 'react';
import { AlertCircle, Calculator, FileText, Shield, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import type { ClientFilterKey, CommandCenterStats } from './types';

interface InteractiveCardProps {
  role?: string;
  tabIndex?: number;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  title?: string;
}

interface CashFlowCommandCenterCardsProps {
  stats: CommandCenterStats;
  formatCompactCurrency: (amount: number) => string;
  getInteractiveCardProps: (filter: ClientFilterKey, baseClassName?: string) => InteractiveCardProps;
}

export function CashFlowCommandCenterCards({
  stats,
  formatCompactCurrency,
  getInteractiveCardProps
}: CashFlowCommandCenterCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card {...getInteractiveCardProps('all')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Clients</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalClients}</p>
            </div>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      <Card {...getInteractiveCardProps('review_due')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Reviews Due</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.reviewDue}</p>
            </div>
            <Shield className="h-5 w-5 text-amber-500" />
          </div>
        </CardContent>
      </Card>
      <Card {...getInteractiveCardProps('high_risk')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">High Risk</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.highRisk}</p>
            </div>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        </CardContent>
      </Card>
      <Card {...getInteractiveCardProps('missing_assessment')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Assessments Missing</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.missingAssessments}</p>
            </div>
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      <Card {...getInteractiveCardProps('missing_plan')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Plans Missing</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.missingPlans}</p>
            </div>
            <Calculator className="h-5 w-5 text-indigo-500" />
          </div>
        </CardContent>
      </Card>
      <Card {...getInteractiveCardProps('top_aum')}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total AUM</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCompactCurrency(stats.totalAum)}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

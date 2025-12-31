import React from 'react';
import { CheckCircle, PoundSterling, Upload, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { DashboardStats } from '@/components/dashboard/types';

interface DashboardKpiCardsProps {
  stats: DashboardStats;
  formatCurrency: (value: number) => string;
}

export function DashboardKpiCards({ stats, formatCurrency }: DashboardKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalClients}</div>
          <p className="text-xs text-muted-foreground">+{stats.thisWeek.clientsOnboarded} this week</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assets Under Management</CardTitle>
          <PoundSterling className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalAUM)}</div>
          <p className="text-xs text-muted-foreground">+5.2% from last quarter</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assessments This Week</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.thisWeek.assessmentsCompleted}</div>
          <p className="text-xs text-muted-foreground">{stats.assessmentsDue} pending review</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documents Generated</CardTitle>
          <Upload className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.thisWeek.documentsGenerated}</div>
          <p className="text-xs text-muted-foreground">This week&apos;s activity</p>
        </CardContent>
      </Card>
    </div>
  );
}

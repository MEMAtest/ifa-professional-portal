// ================================================================
// src/components/stress-testing/ClientProfilePanel.tsx
// Client Financial Profile Panel for Stress Testing
// Shows the client's current financial situation being tested
// ================================================================

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  User,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Briefcase,
  Calendar,
  Target,
  Info
} from 'lucide-react';

interface ClientFinancialProfile {
  clientId: string;
  clientName: string;
  clientRef: string;
  portfolioValue: number;
  annualIncome: number;
  annualExpenses: number;
  pensionValue: number;
  savings: number;
  age: number;
  retirementAge?: number;
  riskScore?: number;
}

interface ClientProfilePanelProps {
  profile: ClientFinancialProfile;
  compact?: boolean;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toLocaleString()}`;
};

const getRiskLabel = (score: number): { label: string; color: string } => {
  if (score <= 3) return { label: 'Conservative', color: 'bg-blue-100 text-blue-700' };
  if (score <= 5) return { label: 'Balanced', color: 'bg-green-100 text-green-700' };
  if (score <= 7) return { label: 'Growth', color: 'bg-amber-100 text-amber-700' };
  return { label: 'Aggressive', color: 'bg-red-100 text-red-700' };
};

export const ClientProfilePanel: React.FC<ClientProfilePanelProps> = ({
  profile,
  compact = false
}) => {
  const netCashflow = profile.annualIncome - profile.annualExpenses;
  const savingsRate = profile.annualIncome > 0
    ? ((netCashflow / profile.annualIncome) * 100).toFixed(0)
    : 0;
  const totalWealth = profile.portfolioValue + profile.pensionValue + profile.savings;
  const yearsToRetirement = profile.retirementAge
    ? Math.max(0, profile.retirementAge - profile.age)
    : null;
  const riskInfo = profile.riskScore ? getRiskLabel(profile.riskScore) : null;

  if (compact) {
    return (
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                {profile.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{profile.clientName}</p>
                <p className="text-sm text-gray-500">{profile.clientRef}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Total Wealth</p>
                <p className="font-bold text-lg">{formatCurrency(totalWealth)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Age</p>
                <p className="font-bold text-lg">{profile.age}</p>
              </div>
              {riskInfo && (
                <Badge className={riskInfo.color}>{riskInfo.label}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-orange-500" />
            Client Profile Being Tested
          </div>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-normal text-gray-500">
              This is the financial situation used in stress scenarios
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client Header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl">
            {profile.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{profile.clientName}</h3>
            <p className="text-gray-500">{profile.clientRef}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Wealth</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalWealth)}</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Portfolio */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Wallet className="h-4 w-4 text-blue-500" />
              Portfolio
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(profile.portfolioValue)}
            </p>
          </div>

          {/* Pension */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Briefcase className="h-4 w-4 text-purple-500" />
              Pension
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(profile.pensionValue)}
            </p>
          </div>

          {/* Savings */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <PiggyBank className="h-4 w-4 text-green-500" />
              Savings
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(profile.savings)}
            </p>
          </div>

          {/* Age */}
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Calendar className="h-4 w-4 text-orange-500" />
              Age
            </div>
            <p className="text-xl font-bold text-gray-900">
              {profile.age} years
            </p>
            {yearsToRetirement !== null && (
              <p className="text-xs text-gray-500">{yearsToRetirement} yrs to retirement</p>
            )}
          </div>
        </div>

        {/* Income & Expenses Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Annual Income */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Annual Income
            </div>
            <p className="text-xl font-bold text-green-800">
              {formatCurrency(profile.annualIncome)}
            </p>
          </div>

          {/* Annual Expenses */}
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-700 text-sm mb-1">
              <TrendingDown className="h-4 w-4" />
              Annual Expenses
            </div>
            <p className="text-xl font-bold text-red-800">
              {formatCurrency(profile.annualExpenses)}
            </p>
          </div>

          {/* Net Cashflow */}
          <div className={`p-3 rounded-lg border ${
            netCashflow >= 0
              ? 'bg-blue-50 border-blue-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`flex items-center gap-2 text-sm mb-1 ${
              netCashflow >= 0 ? 'text-blue-700' : 'text-amber-700'
            }`}>
              <Target className="h-4 w-4" />
              Net Cashflow
            </div>
            <p className={`text-xl font-bold ${
              netCashflow >= 0 ? 'text-blue-800' : 'text-amber-800'
            }`}>
              {netCashflow >= 0 ? '+' : ''}{formatCurrency(netCashflow)}
            </p>
            <p className="text-xs text-gray-500">{savingsRate}% savings rate</p>
          </div>
        </div>

        {/* Risk Profile (if available) */}
        {riskInfo && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-gray-600">Risk Profile</span>
            <Badge className={`${riskInfo.color} text-sm`}>
              {riskInfo.label} (Score: {profile.riskScore}/10)
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientProfilePanel;

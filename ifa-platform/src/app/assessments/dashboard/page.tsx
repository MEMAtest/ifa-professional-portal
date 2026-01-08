// =====================================================
// FILE: src/app/assessments/dashboard/page.tsx
// COMPLETE DASHBOARD WITH PIE CHART & ALL ASSESSMENTS
// =====================================================

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle,
  FileText,
  BarChart3,
  ArrowRight,
  AlertTriangle,
  Shield,
  Activity,
  DollarSign,
  MapPin,
  UserCheck,
  Loader2,
  RefreshCw,
  Info,
  PieChart as PieChartIcon,
  Calendar,
  Target,
  Award,
  Brain,
  Calculator,
  LineChart as LineChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { getAssessmentResumeUrl, normalizeAssessmentType } from '@/lib/assessments/routing';
import { GRID_COLOR, RISK_COLORS, STATUS_COLORS } from '@/components/assessments/dashboard/constants';
import { ChartTooltip, CenteredTotalLabel } from '@/components/assessments/dashboard/charts';
import { useAssessmentDashboard } from '@/components/assessments/dashboard/hooks';
import { formatCurrency, getAssessmentIcon, getAssessmentName } from '@/components/assessments/dashboard/utils';


export default function AssessmentDashboard() {
  const router = useRouter();
  const {
    metrics,
    incompleteAssessments,
    incompleteTotalCount,
    isLoading,
    error,
    lastRefresh,
    refresh
  } = useAssessmentDashboard();

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Failed to load dashboard metrics'}
            <Button onClick={refresh} variant="outline" size="sm" className="mt-2">
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if we have demographic/financial data (treat "not specified" as valid data to avoid empty charts)
  const genderTotal =
    metrics.demographics.gender.male +
    metrics.demographics.gender.female +
    metrics.demographics.gender.other +
    metrics.demographics.gender.notSpecified;
  const hasGenderData = genderTotal > 0;

  const hasAgeData = Object.values(metrics.demographics.ageGroups).some((count) => count > 0);

  const hasFinancialData =
    Object.values(metrics.financialInsights.wealthDistribution).some((count) => count > 0) ||
    metrics.financialInsights.clientsWithFinancialData > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessment Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Real-time overview of client assessments and compliance status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card
          className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
          onClick={() => router.push('/assessments')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold mt-1">{metrics.summary.totalClients}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.clientCoverage.percentage}% assessed
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3 flex items-center">
              View client assessments <ArrowRight className="h-3 w-3 ml-1" />
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg hover:border-green-300 transition-all"
          onClick={() => router.push('/assessments?status=completed')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assessments Completed</p>
                <p className="text-2xl font-bold mt-1">{metrics.assessmentStats.completedTotal}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.assessmentStats.completionRate}% of {metrics.assessmentStats.totalPossible} possible
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 flex items-center">
              View assessments <ArrowRight className="h-3 w-3 ml-1" />
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg hover:border-yellow-300 transition-all"
          onClick={() => router.push('/assessments?status=needs_review')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reviews Due</p>
                <p className="text-2xl font-bold mt-1">{metrics.complianceStatus.needReview + metrics.complianceStatus.overdue}</p>
                <p className="text-xs text-red-600 mt-1">
                  {metrics.complianceStatus.overdue} overdue
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-3 flex items-center">
              View reviews <ArrowRight className="h-3 w-3 ml-1" />
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg hover:border-purple-300 transition-all"
          onClick={() => router.push('/assessments')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold mt-1">{metrics.activityMetrics.last7Days}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Last 7 days
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-3 flex items-center">
              View activity <ArrowRight className="h-3 w-3 ml-1" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Moved to top */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/clients')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">View All Clients</h3>
                  <p className="text-sm text-gray-600">Manage assessments</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/reports')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Generate Reports</h3>
                  <p className="text-sm text-gray-600">Compliance & analytics</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/documents')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Documents</h3>
                  <p className="text-sm text-gray-600">View generated docs</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessments to Complete Widget */}
      {incompleteAssessments.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Assessments to Complete
              <Badge variant="secondary" className="ml-2">{incompleteTotalCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incompleteAssessments
                .sort((a, b) => b.progress_percentage - a.progress_percentage)
                .slice(0, 5)
                .map((assessment) => {
                  const normalizedType = normalizeAssessmentType(assessment.assessment_type);
                  const Icon = getAssessmentIcon(normalizedType);
                  const colorClass = {
                    'atr': 'text-blue-600 bg-blue-50',
                    'cfl': 'text-green-600 bg-green-50',
                    'persona': 'text-purple-600 bg-purple-50',
                    'suitability': 'text-indigo-600 bg-indigo-50',
                    'monte_carlo': 'text-orange-600 bg-orange-50',
                    'cashflow': 'text-teal-600 bg-teal-50'
                  }[normalizedType] || 'text-gray-600 bg-gray-50';

                  const progressColorClass = {
                    'atr': 'bg-blue-600',
                    'cfl': 'bg-green-600',
                    'persona': 'bg-purple-600',
                    'suitability': 'bg-indigo-600',
                    'monte_carlo': 'bg-orange-600',
                    'cashflow': 'bg-teal-600'
                  }[normalizedType] || 'bg-gray-600';

                  return (
                    <div
                      key={assessment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{assessment.client_name}</p>
                          <p className="text-xs text-gray-500">{getAssessmentName(normalizedType)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{assessment.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${progressColorClass}`}
                              style={{ width: `${assessment.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(getAssessmentResumeUrl(normalizedType, assessment.client_id))}
                          className="whitespace-nowrap"
                        >
                          Resume
                        </Button>
                      </div>
                    </div>
                  );
                })}
              {incompleteTotalCount > 5 && (
                <div className="text-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/assessments/dashboard/incomplete')}
                    className="text-blue-600"
                  >
                    View all {incompleteTotalCount} incomplete assessments
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage + Risk Distribution (drillable charts) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Assessment Coverage
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/assessments')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.clientCoverage.breakdown && metrics.clientCoverage.breakdown.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.clientCoverage.breakdown}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 70, bottom: 10 }}
                  >
                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={130}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#374151' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      stackId="a"
                      fill={STATUS_COLORS.completed}
                      cursor="pointer"
                      onClick={(data: any) =>
                        router.push(`/assessments?type=${encodeURIComponent(data?.payload?.key)}&status=completed`)
                      }
                    />
                    <Bar
                      dataKey="inProgress"
                      name="In progress"
                      stackId="a"
                      fill={STATUS_COLORS.inProgress}
                      cursor="pointer"
                      onClick={(data: any) =>
                        router.push(`/assessments?type=${encodeURIComponent(data?.payload?.key)}&status=in_progress`)
                      }
                    />
                    <Bar
                      dataKey="needsReview"
                      name="Needs review"
                      stackId="a"
                      fill={STATUS_COLORS.needsReview}
                      cursor="pointer"
                      onClick={(data: any) =>
                        router.push(`/assessments?type=${encodeURIComponent(data?.payload?.key)}&status=needs_review`)
                      }
                    />
                    <Bar
                      dataKey="notStarted"
                      name="Not started"
                      stackId="a"
                      fill={STATUS_COLORS.notStarted}
                      cursor="pointer"
                      onClick={(data: any) =>
                        router.push(`/assessments?type=${encodeURIComponent(data?.payload?.key)}&status=not_started`)
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No coverage data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Risk Distribution
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/risk')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const riskTotal = Object.values(metrics.riskDistribution).reduce((sum, v) => sum + v, 0);
              if (riskTotal <= 0) {
                return (
                  <div className="text-center text-gray-500 py-8">
                    <PieChartIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No risk data available</p>
                  </div>
                );
              }

              const data = Object.entries(metrics.riskDistribution)
                .map(([name, value]) => ({ name, value }))
                .filter((d) => d.value > 0);

              return (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={96}
                        paddingAngle={2}
                        stroke="#ffffff"
                        strokeWidth={2}
                        onClick={(d: any) => router.push(`/risk?bucket=${encodeURIComponent(d?.name || d?.payload?.name)}`)}
                      >
                        {data.map((entry) => (
                          <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#6b7280'} />
                        ))}
                        <CenteredTotalLabel value={riskTotal} subtitle="clients" />
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Activity + Compliance (drillable charts) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Activity Trend (12 weeks)
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/assessments')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.activityTrend && metrics.activityTrend.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.activityTrend} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Completed assessments"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <LineChartIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No activity data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Review Compliance
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/assessments?status=needs_review')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const total =
                metrics.complianceStatus.upToDate + metrics.complianceStatus.needReview + metrics.complianceStatus.overdue;
              if (total <= 0) {
                return (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No compliance data available</p>
                  </div>
                );
              }

              const data = [
                { name: 'Up to date', key: 'up_to_date', value: metrics.complianceStatus.upToDate, color: '#22c55e' },
                { name: 'Needs review', key: 'needs_review', value: metrics.complianceStatus.needReview, color: '#f59e0b' },
                { name: 'Overdue', key: 'overdue', value: metrics.complianceStatus.overdue, color: '#ef4444' }
              ].filter((d) => d.value > 0);

              return (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={96}
                        paddingAngle={2}
                        stroke="#ffffff"
                        strokeWidth={2}
                        onClick={(d: any) => router.push(`/assessments?status=${encodeURIComponent(d?.key || d?.payload?.key)}`)}
                      >
                        {data.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                        <CenteredTotalLabel value={total} subtitle="clients" />
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Demographics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Gender Distribution
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/clients')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!hasGenderData ? (
              <div className="text-center text-gray-500 py-4">
                <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Gender data not available</p>
                <p className="text-xs mt-1">Data collection in progress</p>
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Male', value: metrics.demographics.gender.male, color: '#3b82f6' },
                        { name: 'Female', value: metrics.demographics.gender.female, color: '#ec4899' },
                        {
                          name: 'Other / Not specified',
                          value: metrics.demographics.gender.other + metrics.demographics.gender.notSpecified,
                          color: '#94a3b8'
                        }
                      ].filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      onClick={() => router.push('/clients')}
                      cursor="pointer"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {[
                        { key: 'male', value: metrics.demographics.gender.male, color: '#3b82f6' },
                        { key: 'female', value: metrics.demographics.gender.female, color: '#ec4899' },
                        {
                          key: 'other',
                          value: metrics.demographics.gender.other + metrics.demographics.gender.notSpecified,
                          color: '#94a3b8'
                        }
                      ]
                        .filter((d) => d.value > 0)
                        .map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      <CenteredTotalLabel
                        value={
                          metrics.demographics.gender.male +
                          metrics.demographics.gender.female +
                          metrics.demographics.gender.other +
                          metrics.demographics.gender.notSpecified
                        }
                        subtitle="clients"
                      />
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Age Distribution
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/clients')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!hasAgeData ? (
              <div className="text-center text-gray-500 py-4">
                <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Age data being calculated</p>
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(metrics.demographics.ageGroups)
                      .map(([group, count]) => ({ group, count }))
                      .filter((d) => d.count > 0)}
                    margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="group"
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Clients"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={() => router.push('/clients')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Top Locations
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/clients')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.demographics.topCities.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Location data not available</p>
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.demographics.topCities.map((c) => ({ city: c.city, count: c.count }))}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="city"
                      width={90}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#374151' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Clients"
                      fill="#10b981"
                      radius={[0, 6, 6, 0]}
                      cursor="pointer"
                      onClick={() => router.push('/clients')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Wealth Distribution
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/clients/financials')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!hasFinancialData ? (
              <div className="text-center text-gray-500 py-8">
                <Info className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Financial data not available</p>
                <p className="text-xs mt-1">{metrics.summary.totalClients} clients pending financial assessment</p>
              </div>
            ) : (
              <>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(metrics.financialInsights.wealthDistribution)
                        .map(([bracket, count]) => ({ bracket, count }))
                        .filter((d) => d.count > 0)}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="bracket"
                        width={120}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Clients"
                        fill="#6366f1"
                        radius={[0, 6, 6, 0]}
                        cursor="pointer"
                        onClick={() => router.push('/clients/financials')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {metrics.financialInsights.averageNetWorth > 0 && (
                  <div className="mt-4 pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Net Worth</span>
                      <span className="text-sm font-bold">{formatCurrency(metrics.financialInsights.averageNetWorth)}</span>
                    </div>
                    {metrics.financialInsights.averageAnnualIncome > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Annual Income</span>
                        <span className="text-sm font-bold">{formatCurrency(metrics.financialInsights.averageAnnualIncome)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Clients with data</span>
                      <span className="text-sm">{metrics.financialInsights.clientsWithNetWorth} of {metrics.summary.totalClients}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Vulnerable Clients
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/compliance?tab=registers&sub=vulnerability')}
                className="text-blue-600"
              >
                View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{metrics.demographics.vulnerableClients.count}</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  {metrics.demographics.vulnerableClients.percentage}% of clients
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Vulnerable', value: metrics.demographics.vulnerableClients.count, color: '#f97316' },
                        {
                          name: 'Not vulnerable',
                          value: Math.max(0, metrics.summary.totalClients - metrics.demographics.vulnerableClients.count),
                          color: '#22c55e'
                        }
                      ].filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      onClick={() => router.push('/compliance?tab=registers&sub=vulnerability')}
                      cursor="pointer"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {[
                        { key: 'vulnerable', value: metrics.demographics.vulnerableClients.count, color: '#f97316' },
                        {
                          key: 'not_vulnerable',
                          value: Math.max(0, metrics.summary.totalClients - metrics.demographics.vulnerableClients.count),
                          color: '#22c55e'
                        }
                      ]
                        .filter((d) => d.value > 0)
                        .map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      <CenteredTotalLabel value={metrics.demographics.vulnerableClients.count} subtitle="vulnerable" />
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="h-[220px]">
                {metrics.demographics.vulnerableClients.topFactors.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.demographics.vulnerableClients.topFactors.map((f) => ({
                        factor: f.factor,
                        count: f.count
                      }))}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="factor"
                        width={120}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Clients"
                        fill="#f97316"
                        radius={[0, 6, 6, 0]}
                        cursor="pointer"
                        onClick={() => router.push('/compliance?tab=registers&sub=vulnerability')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-gray-500 py-10">
                    <p className="text-sm">No vulnerability factors recorded</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alert */}
      {metrics.complianceStatus.overdue > 0 && (
        <Alert className="mt-8 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{metrics.complianceStatus.overdue} assessments are overdue for review.</strong>
            <span className="block mt-1">
              Annual reviews are required for regulatory compliance. 
              <Button 
                variant="link" 
                className="text-orange-700 underline p-0 h-auto ml-1"
                onClick={() => router.push('/assessments?status=overdue')}
              >
                View overdue assessments
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

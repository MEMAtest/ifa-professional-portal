// =====================================================
// FILE: src/app/assessments/dashboard/page.tsx
// COMPLETE DASHBOARD WITH PIE CHART & ALL ASSESSMENTS
// =====================================================

'use client';

import React, { useState, useEffect } from 'react';
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
  PieChart,
  Calendar,
  Target,
  Award,
  Brain,
  Calculator,
  LineChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';

// Simple Pie Chart Component
const SimplePieChart = ({ data, title }: { data: Record<string, number>, title: string }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  
  if (total === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <PieChart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const colors = {
    'Very Low': '#10b981',
    'Low': '#3b82f6', 
    'Medium': '#eab308',
    'High': '#f97316',
    'Very High': '#ef4444'
  };

  // Calculate angles for pie slices
  let currentAngle = -90; // Start at top
  const slices: Array<{ category: string; percentage: number; startAngle: number; endAngle: number; color: string }> = [];
  
  Object.entries(data).forEach(([category, count]) => {
    if (count > 0) {
      const percentage = (count / total) * 100;
      const angle = (count / total) * 360;
      slices.push({
        category,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: colors[category as keyof typeof colors] || '#6b7280'
      });
      currentAngle += angle;
    }
  });

  // Create SVG path for each slice
  const createPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(100, 100, 80, endAngle);
    const end = polarToCartesian(100, 100, 80, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", 100, 100,
      "L", start.x, start.y,
      "A", 80, 80, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">{title}</h4>
      <div className="flex items-center justify-center">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {slices.map((slice, index) => (
            <path
              key={index}
              d={createPath(slice.startAngle, slice.endAngle)}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{`${slice.category}: ${slice.percentage.toFixed(1)}%`}</title>
            </path>
          ))}
        </svg>
      </div>
      <div className="mt-4 space-y-2">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: slice.color }}
              />
              <span>{slice.category}</span>
            </div>
            <span className="font-medium">
              {data[slice.category]} ({slice.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface DashboardMetrics {
  clientCoverage: {
    assessed: number;
    total: number;
    percentage: number;
    byType: {
      atr: number;
      cfl: number;
      persona: number;
      suitability: number;
      monte_carlo: number;
      cashflow: number;
    };
  };
  complianceStatus: {
    needReview: number;
    upToDate: number;
    overdue: number;
  };
  riskDistribution: {
    'Very Low': number;
    'Low': number;
    'Medium': number;
    'High': number;
    'Very High': number;
  };
  activityMetrics: {
    last7Days: number;
    last30Days: number;
    averagePerMonth: number;
  };
  demographics: {
    gender: {
      male: number;
      female: number;
      other: number;
      notSpecified: number;
    };
    ageGroups: {
      'Under 30': number;
      '30-40': number;
      '40-50': number;
      '50-60': number;
      '60-70': number;
      'Over 70': number;
    };
    topCities: Array<{ city: string; count: number }>;
    vulnerableClients: {
      count: number;
      percentage: number;
      topFactors: Array<{ factor: string; count: number }>;
    };
  };
  financialInsights: {
    averageNetWorth: number;
    averageAnnualIncome: number;
    wealthDistribution: {
      'Under £100k': number;
      '£100k-£250k': number;
      '£250k-£500k': number;
      '£500k-£1M': number;
      'Over £1M': number;
    };
    clientsWithFinancialData: number;
    clientsWithNetWorth: number;
    clientsWithIncome: number;
  };
  assessmentStats: {
    byType: {
      atr: number;
      cfl: number;
      persona: number;
      suitability: number;
      monte_carlo: number;
      cashflow: number;
    };
    totalAssessments: number;
    averageVersions: number;
    maxVersionReached: number;
  };
  summary: {
    totalClients: number;
    assessedClients: number;
    overdueReviews: number;
    recentActivity: number;
    femaleClients: number;
    maleClients: number;
    over60Clients: number;
    highRiskClients: number;
    vulnerableClients: number;
    clientsWithData: number;
  };
}

export default function AssessmentDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/assessments/metrics');
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await response.json();
      
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
        setLastRefresh(new Date());
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchMetrics();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'atr': return Shield;
      case 'cfl': return TrendingUp;
      case 'persona': return Users;
      case 'suitability': return FileText;
      case 'monte_carlo': return LineChart;
      case 'cashflow': return Calculator;
      default: return FileText;
    }
  };

  const getAssessmentName = (type: string) => {
    switch (type) {
      case 'atr': return 'Attitude to Risk';
      case 'cfl': return 'Capacity for Loss';
      case 'persona': return 'Investor Persona';
      case 'suitability': return 'Suitability';
      case 'monte_carlo': return 'Monte Carlo';
      case 'cashflow': return 'Cash Flow';
      default: return type;
    }
  };

  const getAssessmentColor = (type: string) => {
    switch (type) {
      case 'atr': return 'bg-blue-600';
      case 'cfl': return 'bg-green-600';
      case 'persona': return 'bg-purple-600';
      case 'suitability': return 'bg-indigo-600';
      case 'monte_carlo': return 'bg-orange-600';
      case 'cashflow': return 'bg-teal-600';
      default: return 'bg-gray-600';
    }
  };

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
            <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-2">
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if we have demographic data
  const hasGenderData = metrics.demographics.gender.male > 0 || metrics.demographics.gender.female > 0;
  const hasAgeData = Object.values(metrics.demographics.ageGroups).some(count => count > 0);
  const hasFinancialData = metrics.financialInsights.clientsWithFinancialData > 0;

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
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assessments Complete</p>
                <p className="text-2xl font-bold mt-1">{metrics.assessmentStats.totalAssessments}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg {metrics.assessmentStats.averageVersions} versions
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reviews Due</p>
                <p className="text-2xl font-bold mt-1">{metrics.complianceStatus.needReview}</p>
                <p className="text-xs text-red-600 mt-1">
                  {metrics.complianceStatus.overdue} overdue
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
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
          </CardContent>
        </Card>
      </div>

      {/* Client Coverage & Risk Distribution with Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Client Coverage by Assessment Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.clientCoverage.byType).map(([type, count]) => {
                const Icon = getAssessmentIcon(type);
                const percentage = metrics.summary.totalClients > 0 
                  ? Math.round((count / metrics.summary.totalClients) * 100)
                  : 0;
                
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">{getAssessmentName(type)}</span>
                      </div>
                      <span className="text-sm text-gray-600">{count} clients</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getAssessmentColor(type)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePieChart 
              data={metrics.riskDistribution} 
              title="Client Risk Categories"
            />
          </CardContent>
        </Card>
      </div>

      {/* Demographics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Gender Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasGenderData ? (
              <div className="text-center text-gray-500 py-4">
                <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Gender data not available</p>
                <p className="text-xs mt-1">Data collection in progress</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Male</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{metrics.demographics.gender.male}</span>
                    <span className="text-xs text-gray-500">
                      ({Math.round((metrics.demographics.gender.male / metrics.summary.totalClients) * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Female</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{metrics.demographics.gender.female}</span>
                    <span className="text-xs text-gray-500">
                      ({Math.round((metrics.demographics.gender.female / metrics.summary.totalClients) * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Not Specified</span>
                  <span className="text-sm font-medium">
                    {metrics.demographics.gender.notSpecified + metrics.demographics.gender.other}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Age Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasAgeData ? (
              <div className="text-center text-gray-500 py-4">
                <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Age data being calculated</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {Object.entries(metrics.demographics.ageGroups).map(([group, count]) => (
                    count > 0 && (
                      <div key={group} className="flex items-center justify-between">
                        <span className="text-sm">{group}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    )
                  ))}
                </div>
                {metrics.summary.over60Clients > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Over 60</span>
                      <Badge variant="outline">{metrics.summary.over60Clients} clients</Badge>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Top Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.demographics.topCities.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Location data not available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {metrics.demographics.topCities.map((city, index) => (
                  <div key={city.city} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">#{index + 1}</span>
                      <span className="text-sm">{city.city}</span>
                    </div>
                    <span className="text-sm font-medium">{city.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Wealth Distribution
            </CardTitle>
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
                <div className="space-y-3">
                  {Object.entries(metrics.financialInsights.wealthDistribution).map(([bracket, count]) => (
                    count > 0 && (
                      <div key={bracket} className="flex items-center justify-between">
                        <span className="text-sm">{bracket}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium">{count} clients</span>
                          <div className="w-20">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${(count / metrics.summary.totalClients) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
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
            <CardTitle className="flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Vulnerable Clients
            </CardTitle>
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
            {metrics.demographics.vulnerableClients.topFactors.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">Top Vulnerability Factors</p>
                <div className="space-y-2">
                  {metrics.demographics.vulnerableClients.topFactors.map((factor) => (
                    <div key={factor.factor} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{factor.factor}</span>
                      <span className="text-sm font-medium">{factor.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <p className="text-sm">No vulnerability factors recorded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/assessments')}
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
                onClick={() => router.push('/assessments?filter=overdue')}
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
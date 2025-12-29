// ================================================================
// src/app/stress-testing/[scenarioId]/page.tsx
// Stress Scenario Detail Page
// ================================================================

'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import {
  ArrowLeft,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  Shield,
  Briefcase,
  Heart,
  DollarSign,
  BarChart3,
  ChevronRight,
  Play,
  FileText
} from 'lucide-react';

interface StressScenario {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
  durationYears: number;
  parameters: Record<string, number>;
}

interface PageProps {
  params: Promise<{ scenarioId: string }>;
}

export default function ScenarioDetailPage({ params }: PageProps) {
  const { scenarioId } = use(params);
  const router = useRouter();
  const [scenario, setScenario] = useState<StressScenario | null>(null);
  const [relatedScenarios, setRelatedScenarios] = useState<StressScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenario = async () => {
      try {
        const response = await fetch(`/api/stress-testing/${scenarioId}`);
        const data = await response.json();

        if (data.success) {
          setScenario(data.scenario);
          setRelatedScenarios(data.relatedScenarios || []);
        } else {
          setError(data.error || 'Failed to load scenario');
        }
      } catch (err) {
        console.error('Error fetching scenario:', err);
        setError('Failed to load scenario details');
      } finally {
        setLoading(false);
      }
    };

    fetchScenario();
  }, [scenarioId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'mild': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Market Risk': return <TrendingDown className="h-5 w-5" />;
      case 'Personal Risk': return <Heart className="h-5 w-5" />;
      case 'Inflation Risk': return <DollarSign className="h-5 w-5" />;
      case 'Interest Rate Risk': return <BarChart3 className="h-5 w-5" />;
      case 'Currency Risk': return <Briefcase className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const formatParameterName = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatParameterValue = (key: string, value: number) => {
    if (key.includes('percent') || key.includes('decline') || key.includes('increase') || key.includes('reduction')) {
      return `${value}%`;
    }
    if (key.includes('multiplier') || key.includes('factor')) {
      return `${value}x`;
    }
    if (key.includes('months') || key.includes('years')) {
      const unit = key.includes('months') ? 'months' : 'years';
      return `${value} ${unit}`;
    }
    return value.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <h2 className="text-lg font-semibold text-red-800">
                    Scenario Not Found
                  </h2>
                  <p className="text-red-600">
                    {error || 'The requested stress scenario could not be found.'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push('/stress-testing')}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Stress Testing
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/stress-testing" className="hover:text-gray-700">
              Stress Testing
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900">{scenario.name}</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                scenario.category === 'Personal Risk' ? 'bg-purple-100' :
                scenario.category === 'Market Risk' ? 'bg-red-100' :
                'bg-orange-100'
              }`}>
                {getCategoryIcon(scenario.category)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {scenario.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  {scenario.description}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <Badge className={getSeverityColor(scenario.severity)}>
                    {scenario.severity.charAt(0).toUpperCase() + scenario.severity.slice(1)} Severity
                  </Badge>
                  <Badge variant="outline">
                    {scenario.category}
                  </Badge>
                  <span className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {scenario.durationYears} year duration
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/stress-testing')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => router.push(`/stress-testing?runScenario=${scenario.id}`)}
              >
                <Play className="h-4 w-4 mr-2" />
                Run This Test
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Scenario Parameters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(scenario.parameters).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="text-sm text-gray-600">
                        {formatParameterName(key)}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mt-1">
                        {formatParameterValue(key, value)}
                      </div>
                      <Progress
                        value={Math.min(Math.abs(value), 100)}
                        className="h-1.5 mt-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Impact Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Expected Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scenario.type === 'market_crash' && (
                    <>
                      <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <div className="font-medium text-red-800">Portfolio Impact</div>
                        <p className="text-sm text-red-600 mt-1">
                          Equity investments may decline by {Math.abs(scenario.parameters.equity_decline || 30)}%
                          during the crisis period. Bond holdings could provide some buffer with
                          {scenario.parameters.bond_decline ? ` ${Math.abs(scenario.parameters.bond_decline)}% decline` : ' limited impact'}.
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="font-medium text-amber-800">Recovery Outlook</div>
                        <p className="text-sm text-amber-600 mt-1">
                          Historical data suggests recovery typically takes {scenario.durationYears * 1.5} to {scenario.durationYears * 2} years
                          following similar market events.
                        </p>
                      </div>
                    </>
                  )}

                  {scenario.category === 'Personal Risk' && (
                    <>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="font-medium text-purple-800">Financial Impact</div>
                        <p className="text-sm text-purple-600 mt-1">
                          Personal crisis scenarios can affect multiple areas: income stability,
                          asset values, and ongoing expenses. Building emergency reserves is crucial.
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="font-medium text-blue-800">Mitigation Options</div>
                        <p className="text-sm text-blue-600 mt-1">
                          Insurance products, emergency funds, and flexible withdrawal strategies
                          can help mitigate the impact of personal crisis events.
                        </p>
                      </div>
                    </>
                  )}

                  {scenario.type === 'inflation_shock' && (
                    <>
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                        <div className="font-medium text-orange-800">Purchasing Power</div>
                        <p className="text-sm text-orange-600 mt-1">
                          High inflation erodes purchasing power. With {scenario.parameters.inflation_increase || 5}%
                          additional inflation, expenses could increase by {((1 + (scenario.parameters.inflation_increase || 5) / 100) ** scenario.durationYears * 100 - 100).toFixed(0)}%
                          over {scenario.durationYears} years.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mitigation Strategies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Recommended Mitigations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {scenario.category === 'Market Risk' && (
                    <>
                      <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium">Diversify Asset Allocation</div>
                          <p className="text-sm text-gray-600">
                            Spread investments across uncorrelated asset classes to reduce concentration risk.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium">Maintain Cash Buffer</div>
                          <p className="text-sm text-gray-600">
                            Keep 12-24 months of expenses in liquid assets to avoid forced selling during downturns.
                          </p>
                        </div>
                      </li>
                    </>
                  )}
                  {scenario.category === 'Personal Risk' && (
                    <>
                      <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium">Review Insurance Coverage</div>
                          <p className="text-sm text-gray-600">
                            Ensure adequate life, health, and income protection insurance is in place.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Briefcase className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium">Build Emergency Fund</div>
                          <p className="text-sm text-gray-600">
                            Aim for 6-12 months of essential expenses in easily accessible savings.
                          </p>
                        </div>
                      </li>
                    </>
                  )}
                  <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Regular Plan Review</div>
                      <p className="text-sm text-gray-600">
                        Conduct annual stress tests and adjust financial plan based on changing circumstances.
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Scenario Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Category</div>
                  <div className="font-medium">{scenario.category}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Scenario Type</div>
                  <div className="font-medium capitalize">
                    {scenario.type.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Duration</div>
                  <div className="font-medium">{scenario.durationYears} years</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Parameters</div>
                  <div className="font-medium">
                    {Object.keys(scenario.parameters).length} variables
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Scenarios */}
            {relatedScenarios.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Related Scenarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {relatedScenarios.map(related => (
                      <Link
                        key={related.id}
                        href={`/stress-testing/${related.id}`}
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="font-medium text-sm">{related.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${getSeverityColor(related.severity)} text-xs`}>
                            {related.severity}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {related.durationYears}yr
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Run Test CTA */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <Play className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-blue-900">
                  Ready to Test?
                </h3>
                <p className="text-sm text-blue-700 mt-1 mb-4">
                  Run this stress test against your client portfolio
                </p>
                <Button
                  className="w-full"
                  onClick={() => router.push(`/stress-testing?runScenario=${scenario.id}`)}
                >
                  Run Stress Test
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

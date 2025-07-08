// ================================================================
// CORRECTED: AdvancedAnalyticsDashboard.tsx using your existing components
// Path: ifa-platform/src/components/cashflow/advanced/AdvancedAnalyticsDashboard.tsx
// ================================================================
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';  
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';  // Your existing Tabs
import { Zap, Download, FileText } from 'lucide-react';
import { StressTestMatrix } from './StressTestMatrix';
import { ComplianceDashboard } from './ComplianceDashboard';
import { AdvancedAnalyticsService } from '@/services/AdvancedAnalyticsService';
import { CashFlowScenario, StressTestResults, ComplianceReport } from '@/types/advanced-analytics';

interface AdvancedAnalyticsDashboardProps {
  clientId: string;
  scenario: CashFlowScenario;
}

interface AnalyticsData {
  stress_tests: StressTestResults[];
  compliance_report: ComplianceReport;
  executive_summary: string;
}

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({ 
  clientId, 
  scenario 
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stress-tests');
  const [error, setError] = useState<string | null>(null);

  const runAdvancedAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const analyticsService = new AdvancedAnalyticsService();
      const results = await analyticsService.runCompleteAnalysis(scenario);
      setAnalyticsData(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Analytics failed:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">❌ Analytics Failed</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={runAdvancedAnalytics}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData && !loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Advanced Analytics Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Run comprehensive stress testing, compliance validation, and goal analysis
            </p>
            <Button onClick={runAdvancedAnalytics} size="lg">
              Run Advanced Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Running advanced analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analytics data is guaranteed to be non-null here
  const data = analyticsData!;

  return (
    <div className="w-full space-y-6">
      {/* Analytics Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Advanced Analytics Results
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Compliance Doc
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.compliance_report.compliance_score}%
              </div>
              <div className="text-sm text-gray-600">FCA Compliance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(data.stress_tests.reduce((sum, test) => sum + test.resilience_score, 0) / data.stress_tests.length)}
              </div>
              <div className="text-sm text-gray-600">Avg Resilience</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.stress_tests.length}
              </div>
              <div className="text-sm text-gray-600">Stress Tests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stress-tests">Stress Tests</TabsTrigger>
          <TabsTrigger value="compliance">FCA Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="stress-tests">
          <StressTestMatrix stressTests={data.stress_tests} />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard complianceReport={data.compliance_report} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
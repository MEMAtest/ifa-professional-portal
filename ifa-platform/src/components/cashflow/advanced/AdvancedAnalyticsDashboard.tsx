// ================================================================
// FIXED: AdvancedAnalyticsDashboard.tsx
// Path: src/components/cashflow/advanced/AdvancedAnalyticsDashboard.tsx
// ================================================================
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';  
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Zap, Download, FileText } from 'lucide-react';
import { StressTestMatrix } from './StressTestMatrix';
import { ComplianceDashboard } from './ComplianceDashboard';
import { AdvancedAnalyticsService } from '@/services/AdvancedAnalyticsService';
import { 
  StressTestResults, 
  ComplianceReport 
} from '@/types/advanced-analytics';
import { CashFlowScenario } from '@/types/cashflow';

// Remove the import from non-existent '@/types/stress-test'
// Define the type locally or import from the correct location
interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  survivalProbability: number;
  shortfallRisk: number;
  resilienceScore: number;
  worstCaseOutcome: number;
  impactAnalysis: {
    portfolioDeclinePercent: number;
    incomeReductionPercent: number;
    expenseIncreasePercent: number;
  };
}

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

  const exportReport = async () => {
    // Implementation for exporting report
    console.log('Exporting report...');
  };

  const exportComplianceDoc = async () => {
    // Implementation for exporting compliance doc
    console.log('Exporting compliance doc...');
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

  // Transform StressTestResults to StressTestResult format expected by StressTestMatrix
  const transformedResults: StressTestResult[] = data.stress_tests.map(test => ({
    scenarioId: test.scenario_id || '',
    scenarioName: test.scenario_id || 'Unknown Scenario', // You might want to map this differently
    survivalProbability: test.survival_probability || 0,
    shortfallRisk: test.shortfall_risk || 0,
    resilienceScore: test.resilience_score || 0,
    worstCaseOutcome: test.worst_case_outcome || 0,
    impactAnalysis: {
      portfolioDeclinePercent: test.impact_analysis?.portfolio_decline_percent || 0,
      incomeReductionPercent: test.impact_analysis?.income_reduction_percent || 0,
      expenseIncreasePercent: test.impact_analysis?.expense_increase_percent || 0,
    }
  }));

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
              <Button variant="outline" size="sm" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm" onClick={exportComplianceDoc}>
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
                {Math.round(
                  data.stress_tests.reduce((sum, test) => sum + test.resilience_score, 0) / 
                  Math.max(data.stress_tests.length, 1)
                )}
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
          <StressTestMatrix results={transformedResults} />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard complianceReport={data.compliance_report} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
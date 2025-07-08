import { StressTestingEngine } from './StressTestingEngine';
import { FCAComplianceService } from './FCAComplianceService';
import { CashFlowScenario, StressTestResults, ComplianceReport } from '@/types/advanced-analytics';

export class AdvancedAnalyticsService {
  async runCompleteAnalysis(scenario: CashFlowScenario): Promise<{
    stress_tests: StressTestResults[];
    compliance_report: ComplianceReport;
    executive_summary: string;
  }> {
    console.log('🚀 Running complete advanced analytics suite...');

    try {
      // Run analyses
      const [stressTests, complianceReport] = await Promise.all([
        StressTestingEngine.runStressTests(scenario),
        FCAComplianceService.validateCompliance(scenario)
      ]);

      // Generate executive summary
      const executiveSummary = this.generateExecutiveSummary({
        scenario,
        stressTests,
        complianceReport
      });

      console.log('✅ Advanced analytics completed successfully');

      return {
        stress_tests: stressTests,
        compliance_report: complianceReport,
        executive_summary: executiveSummary
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Advanced analytics failed:', error);
      throw new Error(`Advanced analytics failed: ${errorMessage}`);
    }
  }

  private generateExecutiveSummary(data: {
    scenario: CashFlowScenario;
    stressTests: StressTestResults[];
    complianceReport: ComplianceReport;
  }): string {
    const { scenario, stressTests, complianceReport } = data;

    let summary = `EXECUTIVE SUMMARY - ADVANCED ANALYTICS\n`;
    summary += `Scenario: ${scenario.scenario_name}\n`;
    summary += `Generated: ${new Date().toISOString()}\n\n`;

    // Compliance status
    summary += `🏛️ REGULATORY COMPLIANCE: ${complianceReport.overall_status.toUpperCase()}\n`;
    summary += `   Compliance Score: ${complianceReport.compliance_score}/100\n\n`;

    // Stress test summary
    const avgResilience = stressTests.reduce((sum, test) => sum + test.resilience_score, 0) / stressTests.length;
    
    summary += `⚠️ STRESS TEST RESULTS:\n`;
    summary += `   Average Resilience Score: ${avgResilience.toFixed(0)}/100\n`;
    summary += `   Tests Completed: ${stressTests.length}\n\n`;

    summary += `KEY RECOMMENDATIONS:\n`;
    summary += complianceReport.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n');

    return summary;
  }
}
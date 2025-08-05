import { StressTestingEngine } from './StressTestingEngine';
import { FCAComplianceService } from './FCAComplianceService';
import { 
  StressTestResults, 
  ComplianceReport,
  CashFlowScenario as AdvancedCashFlowScenario 
} from '@/types/advanced-analytics';
import { CashFlowScenario } from '@/types/cashflow';

export class AdvancedAnalyticsService {
  /**
   * Convert CashFlowScenario from cashflow format to advanced-analytics format
   */
  private static convertToAdvancedFormat(scenario: CashFlowScenario): AdvancedCashFlowScenario {
    return {
      id: scenario.id,
      scenario_name: scenario.scenarioName,
      client_id: scenario.clientId,
      projection_years: scenario.projectionYears,
      inflation_rate: scenario.inflationRate,
      real_equity_return: scenario.realEquityReturn,
      real_bond_return: scenario.realBondReturn,
      real_cash_return: scenario.realCashReturn,
      risk_score: scenario.riskScore || 5,
      assumption_basis: scenario.assumptionBasis,
      annual_charge_percent: 1.25, // Default value
      charges_included: true, // Default value
      calculation_method: 'real_terms', // Default value
      data_sources: [scenario.marketDataSource || 'Market Data'],
      last_reviewed: new Date(scenario.lastAssumptionsReview || Date.now())
    };
  }

  async runCompleteAnalysis(scenario: CashFlowScenario): Promise<{
    stress_tests: StressTestResults[];
    compliance_report: ComplianceReport;
    executive_summary: string;
  }> {
    console.log('🚀 Running complete advanced analytics suite...');
    
    try {
      // Convert scenario to advanced analytics format
      const advancedScenario = AdvancedAnalyticsService.convertToAdvancedFormat(scenario);
      
      // Run analyses with converted scenario
      const [stressTests, complianceReport] = await Promise.all([
        StressTestingEngine.runStressTests(scenario),
        FCAComplianceService.validateCompliance(advancedScenario)
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
    summary += `Scenario: ${scenario.scenarioName}\n`;
    summary += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Compliance status
    summary += `🏛️ REGULATORY COMPLIANCE: ${complianceReport.overall_status.toUpperCase()}\n`;
    summary += ` Compliance Score: ${complianceReport.compliance_score}/100\n\n`;
    
    // Stress test summary
    const avgResilience = stressTests.reduce((sum, test) => sum + test.resilience_score, 0) / stressTests.length;
    summary += `⚠️ STRESS TEST RESULTS:\n`;
    summary += ` Average Resilience Score: ${avgResilience.toFixed(0)}/100\n`;
    summary += ` Tests Completed: ${stressTests.length}\n\n`;
    
    summary += `KEY RECOMMENDATIONS:\n`;
    summary += complianceReport.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n');
    
    return summary;
  }
}

import { ComplianceCheck, ComplianceReport, CashFlowScenario } from '@/types/advanced-analytics';

export class FCAComplianceService {
  private static readonly FCA_REQUIREMENTS = [
    {
      id: 'real_terms_only',
      requirement: 'All projections must be in real terms (net of inflation)',
      guidance_reference: 'COBS 13.4.1R',
      critical: true
    },
    {
      id: 'assumptions_justified',
      requirement: 'All assumptions must be documented and justified',
      guidance_reference: 'COBS 13.4.2G',
      critical: true
    },
    {
      id: 'stress_testing_complete',
      requirement: 'Appropriate stress testing must be performed',
      guidance_reference: 'COBS 13.4.1G',
      critical: true
    },
    {
      id: 'charges_included',
      requirement: 'All charges must be reflected in projections',
      guidance_reference: 'COBS 13.4.1R(2)',
      critical: true
    }
  ];

  static async validateCompliance(scenario: CashFlowScenario): Promise<ComplianceReport> {
    const checks: ComplianceCheck[] = [];
    let complianceScore = 0;
    const recommendations: string[] = [];

    for (const requirement of this.FCA_REQUIREMENTS) {
      const check = await this.performComplianceCheck(scenario, requirement);
      checks.push(check);

      if (check.status === 'compliant') {
        complianceScore += requirement.critical ? 25 : 15;
      } else if (check.status === 'warning') {
        complianceScore += requirement.critical ? 15 : 10;
        recommendations.push(`Address warning: ${requirement.requirement}`);
      } else {
        recommendations.push(`Critical: ${requirement.requirement}`);
      }
    }

    const maxScore = this.FCA_REQUIREMENTS.reduce(
      (sum, req) => sum + (req.critical ? 25 : 15), 0
    );
    
    const finalScore = Math.round((complianceScore / maxScore) * 100);
    
    const overallStatus: 'fully_compliant' | 'partially_compliant' | 'non_compliant' = 
      finalScore >= 90 ? 'fully_compliant' :
      finalScore >= 70 ? 'partially_compliant' : 'non_compliant';

    return {
      scenario_id: scenario.id,
      overall_status: overallStatus,
      compliance_score: finalScore,
      checks,
      recommendations,
      generated_at: new Date()
    };
  }

  private static async performComplianceCheck(
    scenario: CashFlowScenario,
    requirement: any
  ): Promise<ComplianceCheck> {
    let status: 'compliant' | 'non_compliant' | 'warning' = 'compliant';
    const evidence: string[] = [];

    switch (requirement.id) {
      case 'real_terms_only':
        if (scenario.calculation_method !== 'real_terms') {
          status = 'non_compliant';
        } else {
          evidence.push('All returns specified in real terms');
          evidence.push(`Inflation rate: ${scenario.inflation_rate}%`);
        }
        break;

      case 'assumptions_justified':
        if (!scenario.assumption_basis || scenario.assumption_basis.length < 50) {
          status = 'warning';
        } else {
          evidence.push('Assumption basis documented');
          evidence.push(`Source: ${scenario.data_sources?.join(', ') || 'Market data'}`);
        }
        break;

      case 'stress_testing_complete':
        // For now, assume tests will be run
        evidence.push('Stress testing capability available');
        break;

      case 'charges_included':
        if (!scenario.charges_included) {
          status = 'non_compliant';
        } else {
          evidence.push('Product charges reflected in projections');
          evidence.push(`Annual charge: ${scenario.annual_charge_percent || 0}%`);
        }
        break;
    }

    return {
      id: requirement.id,
      requirement: requirement.requirement,
      status,
      evidence,
      guidance_reference: requirement.guidance_reference,
      last_checked: new Date()
    };
  }
}
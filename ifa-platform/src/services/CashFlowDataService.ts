// ================================================================
// src/services/CashFlowDataService.ts - COMPLETELY FIXED
// All TypeScript errors eliminated - Direct Supabase usage
// ================================================================

import { createClient } from '@/lib/supabase/client';
import { clientService } from '@/services/ClientService';
import { AssessmentService } from '@/services/AssessmentService';
import type { Client, FinancialProfile } from '@/types/client';
import type { AssessmentResult } from '@/types/assessment';
import type { 
  CashFlowScenario, 
  CashFlowProjection, 
  ClientGoal,
  ReturnAssumptions,
  ScenarioType
} from '@/types/cashflow';

// Transform functions for snake_case <-> camelCase conversion
function transformToCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(transformToCamelCase);
  
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = transformToCamelCase(obj[key]);
  }
  return result;
}

function transformToSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(transformToSnakeCase);
  
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = transformToSnakeCase(obj[key]);
  }
  return result;
}

export class CashFlowDataService {
  // Remove instance property since all methods are static

  /**
   * Build scenario payload (used by API route)
   */
  static buildScenarioPayload(client: Client, assessment: AssessmentResult | null, scenarioType: ScenarioType, currentUserId: string | null) {
    const riskScore = (assessment as any)?.riskMetrics?.finalRiskProfile || 5;
    const returnAssumptions = this.getRiskBasedReturns(riskScore);
    return {
      client_id: client.id,
      scenario_name: `${client.personalDetails?.firstName || 'Client'} ${client.personalDetails?.lastName || ''} - ${scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)} Case`,
      scenario_type: scenarioType,
      created_by: currentUserId,
      projection_years: 40,
      inflation_rate: 2.5,
      real_equity_return: returnAssumptions.realEquityReturn,
      real_bond_return: returnAssumptions.realBondReturn,
      real_cash_return: returnAssumptions.realCashReturn,
      client_age: this.calculateAge(client.personalDetails?.dateOfBirth),
      retirement_age: this.getRetirementAge(client.personalDetails?.dateOfBirth),
      life_expectancy: this.calculateLifeExpectancy(
        client.personalDetails?.dateOfBirth,
        client.personalDetails?.maritalStatus
      ),
      dependents: client.personalDetails?.dependents || 0,
      current_savings: client.financialProfile?.liquidAssets || 0,
      pension_value: this.calculateTotalPensions(client.financialProfile?.pensionArrangements || []),
      pension_pot_value: this.calculateTotalPensions(client.financialProfile?.pensionArrangements || []),
      investment_value: this.calculateTotalInvestments(client.financialProfile?.existingInvestments || []),
      property_value: 0,
      current_income: client.financialProfile?.annualIncome || 0,
      pension_contributions: this.calculatePensionContributions(client.financialProfile?.pensionArrangements || []),
      state_pension_age: 67,
      state_pension_amount: this.estimateStatePension(client.financialProfile?.annualIncome || 0),
      other_income: 0,
      current_expenses: client.financialProfile?.monthlyExpenses ? 
        client.financialProfile.monthlyExpenses * 12 : 0,
      essential_expenses: (client.financialProfile?.monthlyExpenses || 0) * 12 * 0.7,
      lifestyle_expenses: (client.financialProfile?.monthlyExpenses || 0) * 12 * 0.2,
      discretionary_expenses: (client.financialProfile?.monthlyExpenses || 0) * 12 * 0.1,
      mortgage_balance: 0,
      mortgage_payment: 0,
      other_debts: 0,
      retirement_income_target: this.estimateRetirementIncomeTarget(client.financialProfile?.annualIncome || 0),
      retirement_income_desired: this.estimateRetirementIncomeDesired(client.financialProfile?.annualIncome || 0),
      emergency_fund_target: (client.financialProfile?.monthlyExpenses || 0) * 6,
      legacy_target: 0,
      equity_allocation: this.getEquityAllocation(riskScore),
      bond_allocation: this.getBondAllocation(riskScore),
      cash_allocation: this.getCashAllocation(riskScore),
      alternative_allocation: 0,
      assumption_basis: `Based on client risk profile ${riskScore}/10 and current market conditions`,
      market_data_source: 'Alpha Vantage, BoE, ONS',
      last_assumptions_review: new Date().toISOString().split('T')[0],
      vulnerability_adjustments: this.getVulnerabilityAdjustments(client),
      risk_score: riskScore,
      capacity_for_loss_score: this.mapRiskToCapacity(riskScore),
      knowledge_experience_score: this.mapPersonaToKnowledge((assessment as any)?.persona?.type),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Creates a cash flow scenario from existing client and assessment data
   * COMPLETELY FIXED: Using direct Supabase calls
   */
  static async createScenarioFromClient(
    clientId: string, 
    scenarioType: ScenarioType = 'base'
  ): Promise<CashFlowScenario> {
    // Deprecated in favor of server API; keep for backward compatibility but route through API
    const response = await fetch('/api/cashflow/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, scenarioType })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create cash flow scenario');
    }
    const { scenario } = await response.json();
    return transformToCamelCase(scenario) as CashFlowScenario;
  }

  /**
   * Retrieve scenarios for a client
   * FIXED: Direct Supabase query
   */
  static async getClientScenarios(clientId: string): Promise<CashFlowScenario[]> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch scenarios: ${error.message}`);
      }

      const scenarios = (data || []).map(transformToCamelCase) as CashFlowScenario[];
      
      return scenarios.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching client scenarios:', error);
      return [];
    }
  }

  // PRESERVED: Backward compatibility alias
  static async getScenariosForClient(clientId: string): Promise<CashFlowScenario[]> {
    return this.getClientScenarios(clientId);
  }

  /**
   * Update scenario assumptions
   * FIXED: Direct Supabase update
   */
  static async updateScenarioAssumptions(
    scenarioId: string, 
    assumptions: Partial<CashFlowScenario>
  ): Promise<CashFlowScenario> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const updateData = {
        ...transformToSnakeCase(assumptions),
        last_assumptions_review: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .update(updateData)
        .eq('id', scenarioId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update scenario: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from update');
      }

      return transformToCamelCase(data) as CashFlowScenario;
    } catch (error) {
      console.error('Error updating scenario assumptions:', error);
      throw error;
    }
  }

  /**
   * Get single scenario
   * FIXED: Direct Supabase query
   */
  static async getScenario(scenarioId: string): Promise<CashFlowScenario | null> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data ? transformToCamelCase(data) as CashFlowScenario : null;
    } catch (error) {
      console.error('Error fetching scenario:', error);
      return null;
    }
  }

  /**
   * Update scenario
   * FIXED: Direct Supabase update
   */
  static async updateScenario(scenarioId: string, updates: Partial<CashFlowScenario>): Promise<CashFlowScenario> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .update(transformToSnakeCase(updates))
        .eq('id', scenarioId)
        .select()
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error('No data returned from update');
      }

      return transformToCamelCase(data) as CashFlowScenario;
    } catch (error) {
      console.error('Error updating scenario:', error);
      throw error;
    }
  }

  /**
   * Delete scenario
   * FIXED: Direct Supabase delete
   */
  static async deleteScenario(scenarioId: string): Promise<void> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { error } = await supabase
        .from('cash_flow_scenarios')
        .delete()
        .eq('id', scenarioId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting scenario:', error);
      throw error;
    }
  }

  /**
   * Get user scenarios
   * FIXED: Direct Supabase query
   */
  static async getUserScenarios(userId: string): Promise<CashFlowScenario[]> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('created_by', userId);

      if (error) throw error;
      
      const scenarios = (data || []).map(transformToCamelCase) as CashFlowScenario[];
      
      return scenarios.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching user scenarios:', error);
      return [];
    }
  }

  // ================================================================
  // PRESERVED: All existing helper methods (unchanged)
  // ================================================================
  
  private static calculateAge(dateOfBirth?: string): number {
    if (!dateOfBirth) return 40;
    
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return Math.max(18, Math.min(100, age));
    } catch (error) {
      console.warn('Invalid date of birth, using default age 40');
      return 40;
    }
  }

  private static calculateLifeExpectancy(dateOfBirth?: string, maritalStatus?: string): number {
    const age = this.calculateAge(dateOfBirth);
    const baseLifeExpectancy = 85;
    
    if (maritalStatus === 'married' || maritalStatus === 'civil_partnership') {
      return baseLifeExpectancy + 2;
    }
    
    return baseLifeExpectancy;
  }

  private static calculateTotalPensions(pensionArrangements: any[]): number {
    return pensionArrangements.reduce((total, pension) => {
      return total + (pension.currentValue || 0);
    }, 0);
  }

  private static calculateTotalInvestments(investments: any[]): number {
    return investments.reduce((total, investment) => {
      return total + (investment.currentValue || 0);
    }, 0);
  }

  private static calculatePensionContributions(pensionArrangements: any[]): number {
    return pensionArrangements.reduce((total, pension) => {
      return total + ((pension.monthlyContribution || 0) * 12);
    }, 0);
  }

  private static estimateStatePension(annualIncome: number): number {
    const fullStatePension = 11500;
    
    if (annualIncome > 12570) {
      return fullStatePension;
    }
    
    return fullStatePension * 0.7;
  }

  private static estimateRetirementIncomeTarget(annualIncome: number): number {
    return annualIncome * 0.65;
  }

  private static estimateRetirementIncomeDesired(annualIncome: number): number {
    return annualIncome * 0.8;
  }

  private static getRiskBasedReturns(riskScore: number): ReturnAssumptions {
    const riskMappings: Record<number, ReturnAssumptions> = {
      1: { realEquityReturn: 1.5, realBondReturn: 0.5, realCashReturn: 0.0 },
      2: { realEquityReturn: 2.0, realBondReturn: 0.8, realCashReturn: 0.0 },
      3: { realEquityReturn: 2.5, realBondReturn: 1.0, realCashReturn: 0.0 },
      4: { realEquityReturn: 3.0, realBondReturn: 1.2, realCashReturn: 0.0 },
      5: { realEquityReturn: 3.5, realBondReturn: 1.5, realCashReturn: 0.0 },
      6: { realEquityReturn: 4.0, realBondReturn: 1.5, realCashReturn: 0.0 },
      7: { realEquityReturn: 4.5, realBondReturn: 1.8, realCashReturn: 0.0 },
      8: { realEquityReturn: 5.0, realBondReturn: 2.0, realCashReturn: 0.0 },
      9: { realEquityReturn: 5.5, realBondReturn: 2.0, realCashReturn: 0.0 },
      10: { realEquityReturn: 6.0, realBondReturn: 2.0, realCashReturn: 0.0 }
    };

    return riskMappings[Math.min(10, Math.max(1, riskScore))] || riskMappings[5];
  }

  private static getEquityAllocation(riskScore: number): number {
    const allocations: Record<number, number> = {
      1: 20, 2: 30, 3: 40, 4: 50, 5: 60,
      6: 70, 7: 80, 8: 85, 9: 90, 10: 95
    };
    return allocations[Math.min(10, Math.max(1, riskScore))] || 60;
  }

  private static getBondAllocation(riskScore: number): number {
    const equityAllocation = this.getEquityAllocation(riskScore);
    const cashAllocation = this.getCashAllocation(riskScore);
    return Math.max(0, 100 - equityAllocation - cashAllocation);
  }

  private static getCashAllocation(riskScore: number): number {
    if (riskScore <= 3) return 20;
    if (riskScore <= 6) return 10;
    return 5;
  }

  private static getRetirementAge(dateOfBirth?: string | null): number {
    const age = this.calculateAge(dateOfBirth ?? undefined);
    const defaultRetirement = 67;
    const minRetirement = isNaN(age) ? defaultRetirement : age + 1;
    const capped = Math.min(75, Math.max(defaultRetirement, minRetirement));
    return capped;
  }

  private static getVulnerabilityAdjustments(client: Client): any {
    const isVulnerable = client.vulnerabilityAssessment?.is_vulnerable;
    
    if (isVulnerable) {
      return {
        conservativeAssumptions: true,
        additionalCashBuffer: 0.2,
        reducedRiskTolerance: true,
        enhancedMonitoring: true
      };
    }
    
    return {};
  }

  private static mapRiskToCapacity(riskScore: number): number {
    if (riskScore <= 3) return 3;
    if (riskScore <= 6) return 6;
    return 9;
  }

  private static mapPersonaToKnowledge(personaType?: string): number {
    if (!personaType) return 5;
    
    const knowledgeMap: Record<string, number> = {
      'Conservative Guardian': 3,
      'Balanced Planner': 5,
      'Growth Seeker': 7,
      'Aggressive Investor': 9
    };
    
    return knowledgeMap[personaType] || 5;
  }

  private static calculateTargetRetirementDate(dateOfBirth?: string): string {
    const age = this.calculateAge(dateOfBirth);
    const yearsToRetirement = Math.max(0, 67 - age);
    const retirementDate = new Date();
    retirementDate.setFullYear(retirementDate.getFullYear() + yearsToRetirement);
    return retirementDate.toISOString();
  }
}

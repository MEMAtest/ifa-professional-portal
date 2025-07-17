// ================================================================
// src/services/CashFlowDataService.ts - COMPLETELY FIXED
// All TypeScript errors eliminated + Enhanced with auto-transform
// ================================================================

import { supabase, dbTransform, cashFlowDB } from '@/lib/supabase'; // Using completely fixed supabase
import { clientService } from '@/services/ClientService';
import AssessmentService from '@/services/AssessmentService';
import type { Client, FinancialProfile } from '@/types/client';
import type { AssessmentResult } from '@/types/assessment';
import type { 
  CashFlowScenario, 
  CashFlowProjection, 
  ClientGoal,
  ReturnAssumptions,
  ScenarioType
} from '@/types/cashflow';

export class CashFlowDataService {
  /**
   * Creates a cash flow scenario from existing client and assessment data
   * COMPLETELY FIXED: All type errors resolved + enhanced with auto-transform
   */
  static async createScenarioFromClient(
    clientId: string, 
    scenarioType: ScenarioType = 'base'
  ): Promise<CashFlowScenario> {
    try {
      const client = await clientService.getClientById(clientId);
      const assessment = await AssessmentService.getLatestAssessment(clientId);
      
      if (!client) {
        throw new Error('Client not found');
      }

      // Get current user ID safely
      // Get actual authenticated user
const { data: { user } } = await supabase.auth.getUser();
const currentUserId = user?.id || null;

      // Get risk-based returns - ensure riskScore is a number
      const riskScore = assessment?.riskMetrics?.finalRiskProfile || 5;
      const returnAssumptions = this.getRiskBasedReturns(riskScore);

      // FIXED: Use correct FinancialProfile property names + camelCase for auto-transform
      const scenario = {
        clientId, // Auto-converts to client_id
        scenarioName: `${client.personalDetails?.firstName || 'Client'} ${client.personalDetails?.lastName || ''} - ${scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1)} Case`,
        scenarioType,
        createdBy: currentUserId,
        
        // Projection Settings
        projectionYears: 40,
        inflationRate: 2.5,
        
        // Risk-based return assumptions
        realEquityReturn: returnAssumptions.realEquityReturn,
        realBondReturn: returnAssumptions.realBondReturn,
        realCashReturn: returnAssumptions.realCashReturn,
        
        // Client Demographics
        clientAge: this.calculateAge(client.personalDetails?.dateOfBirth),
        retirementAge: 67,
        lifeExpectancy: this.calculateLifeExpectancy(
          client.personalDetails?.dateOfBirth,
          client.personalDetails?.maritalStatus
        ),
        dependents: client.personalDetails?.dependents || 0,
        
        // Financial Position - FIXED: Use correct FinancialProfile properties
        currentSavings: client.financialProfile?.liquidAssets || 0, // ✅ FIXED: liquidAssets exists
        pensionValue: this.calculateTotalPensions(client.financialProfile?.pensionArrangements || []),
        pensionPotValue: this.calculateTotalPensions(client.financialProfile?.pensionArrangements || []),
        investmentValue: this.calculateTotalInvestments(client.financialProfile?.existingInvestments || []), // ✅ FIXED: existingInvestments exists
        propertyValue: 0, // ✅ FIXED: Default value, not from FinancialProfile
        
        // Income - FIXED: Use correct FinancialProfile properties
        currentIncome: client.financialProfile?.annualIncome || 0, // ✅ FIXED: annualIncome exists
        pensionContributions: this.calculatePensionContributions(client.financialProfile?.pensionArrangements || []),
        statePensionAge: 67,
        statePensionAmount: this.estimateStatePension(client.financialProfile?.annualIncome || 0),
        otherIncome: 0, // ✅ FIXED: Default value, not from FinancialProfile
        
        // Expenses - FIXED: Use correct FinancialProfile properties
        currentExpenses: client.financialProfile?.monthlyExpenses ? 
          client.financialProfile.monthlyExpenses * 12 : 0, // ✅ FIXED: monthlyExpenses exists
        essentialExpenses: (client.financialProfile?.monthlyExpenses || 0) * 12 * 0.7,
        lifestyleExpenses: (client.financialProfile?.monthlyExpenses || 0) * 12 * 0.2,
        discretionaryExpenses: (client.financialProfile?.monthlyExpenses || 0) * 12 * 0.1,
        
        // Debt - FIXED: Default values, not from FinancialProfile
        mortgageBalance: 0, // ✅ FIXED: Default value
        mortgagePayment: 0, // ✅ FIXED: Default value
        otherDebts: 0, // ✅ FIXED: Default value
        
        // Goals - FIXED: Use correct calculations
        retirementIncomeTarget: this.estimateRetirementIncomeTarget(client.financialProfile?.annualIncome || 0),
        retirementIncomeDesired: this.estimateRetirementIncomeDesired(client.financialProfile?.annualIncome || 0),
        emergencyFundTarget: (client.financialProfile?.monthlyExpenses || 0) * 6,
        legacyTarget: 0, // ✅ FIXED: Default value
        
        // Asset Allocation - camelCase auto-converts to snake_case
        equityAllocation: this.getEquityAllocation(riskScore),
        bondAllocation: this.getBondAllocation(riskScore),
        cashAllocation: this.getCashAllocation(riskScore),
        alternativeAllocation: 0, // ✅ This converts to alternative_allocation!
        
        // Assumptions and Documentation
        assumptionBasis: `Based on client risk profile ${riskScore}/10 and current market conditions`,
        marketDataSource: 'Alpha Vantage, BoE, ONS',
        lastAssumptionsReview: new Date().toISOString().split('T')[0],
        
        // Vulnerability adjustments
        vulnerabilityAdjustments: this.getVulnerabilityAdjustments(client),
        
        // Optional assessment scores
        riskScore: riskScore,
        capacityForLossScore: this.mapRiskToCapacity(riskScore),
        knowledgeExperienceScore: this.mapPersonaToKnowledge(assessment?.persona?.type)
      };

      // FIXED: Use simple helper that returns proper types
      const result = await dbTransform.insert('cash_flow_scenarios', scenario);

      if (result.error) {
        console.error('Database error details:', result.error);
        throw new Error(`Failed to create cash flow scenario: ${result.error || 'Unknown error'}`);
      }

      // FIXED: Proper type handling
      if (!result.data) {
        throw new Error('No data returned from database');
      }

      return result.data as CashFlowScenario;
      
    } catch (error) {
      console.error('Error creating cash flow scenario from client:', error);
      throw error;
    }
  }

  /**
   * Retrieve scenarios for a client
   * FIXED: Proper return type handling
   */
  static async getClientScenarios(clientId: string): Promise<CashFlowScenario[]> {
  try {
    // Change from clientId to client_id
    const result = await dbTransform.select('cash_flow_scenarios', '*', { 
      client_id: clientId,  // ✅ FIXED: was 'clientId'
      is_active: true       // ✅ FIXED: was 'isActive'
    });

      if (result.error) {
        throw new Error(`Failed to fetch scenarios: ${result.error || 'Unknown error'}`);
      }

      // FIXED: Proper type handling with fallback
      const scenarios = (result.data || []) as CashFlowScenario[];
      
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
   * FIXED: Proper return type handling
   */
  static async updateScenarioAssumptions(
    scenarioId: string, 
    assumptions: Partial<CashFlowScenario>
  ): Promise<CashFlowScenario> {
    try {
      const updateData = {
        ...assumptions,
        lastAssumptionsReview: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };

      const result = await dbTransform.update('cash_flow_scenarios', updateData, { id: scenarioId });

      if (result.error) {
        throw new Error(`Failed to update scenario: ${result.error || 'Unknown error'}`);
      }

      if (!result.data) {
        throw new Error('No data returned from update');
      }

      return result.data as CashFlowScenario;
    } catch (error) {
      console.error('Error updating scenario assumptions:', error);
      throw error;
    }
  }

  /**
   * Get single scenario
   * FIXED: Proper return type handling
   */
  static async getScenario(scenarioId: string): Promise<CashFlowScenario | null> {
    try {
      const result = await cashFlowDB.getById(scenarioId);

      if (result.error) {
        if ((result.error as any)?.code === 'PGRST116') return null;
        throw result.error;
      }

      return result.data as CashFlowScenario | null;
    } catch (error) {
      console.error('Error fetching scenario:', error);
      return null;
    }
  }

  /**
   * Update scenario
   * FIXED: Proper return type handling
   */
  static async updateScenario(scenarioId: string, updates: Partial<CashFlowScenario>): Promise<CashFlowScenario> {
    try {
      const result = await dbTransform.update('cash_flow_scenarios', updates, { id: scenarioId });

      if (result.error) throw result.error;
      
      if (!result.data) {
        throw new Error('No data returned from update');
      }

      return result.data as CashFlowScenario;
    } catch (error) {
      console.error('Error updating scenario:', error);
      throw error;
    }
  }

  /**
   * Delete scenario
   */
  static async deleteScenario(scenarioId: string): Promise<void> {
    try {
      const result = await dbTransform.delete('cash_flow_scenarios', { id: scenarioId });
      if (result.error) throw result.error;
    } catch (error) {
      console.error('Error deleting scenario:', error);
      throw error;
    }
  }

  /**
   * Get user scenarios
   * FIXED: Proper return type handling
   */
  static async getUserScenarios(userId: string): Promise<CashFlowScenario[]> {
    try {
      const result = await dbTransform.select('cash_flow_scenarios', '*', { createdBy: userId });

      if (result.error) throw result.error;
      
      const scenarios = (result.data || []) as CashFlowScenario[];
      
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
// src/services/CashFlowScenarioService.ts
// ✅ COMPLETE FIXED VERSION - All queries use correct Supabase syntax

import { createClient } from '@/lib/supabase/client';
import type { CashFlowScenario, CashFlowProjection, ClientGoal, ScenarioSummary, ClientOption } from '@/types/cash-flow-scenario';

export class CashFlowScenarioService {
  // Remove instance property since all methods are static
  
  /**
   * ✅ FIXED: Get active scenarios with correct query syntax
   * This might be the method causing the 400 error on dashboard
   */
  static async getActiveScenarios() {
    const supabase = createClient(); // Create client for this method
    
    try {
      // ✅ CORRECT SYNTAX: Use .not('column', 'is', null)
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('id, client_id, last_analysis_date')
        .not('client_id', 'is', null)  // ✅ FIXED: Correct syntax
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching active scenarios:', error);
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getActiveScenarios:', error);
      return { data: [], error };
    }
  }

  /**
   * ✅ NEW: Get scenarios for dashboard display
   */
  static async getDashboardScenarios() {
    const supabase = createClient(); // Create client for this method
    
    try {
      // Get scenarios with client info
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select(`
          id,
          client_id,
          scenario_name,
          scenario_type,
          last_analysis_date,
          updated_at,
          is_active
        `)
        .eq('is_active', true)
        .not('client_id', 'is', null)  // ✅ Correct syntax
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching dashboard scenarios:', error);
      return [];
    }
  }

  /**
   * Get all clients with their scenario counts for dropdown
   */
  static async getClientsWithScenarios(): Promise<ClientOption[]> {
    const supabase = createClient(); // Create client for this method
    
    try {
      // Get all clients
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, personal_details, client_ref')
        .order('created_at', { ascending: false });

      if (clientError) throw clientError;

      // Get scenario counts
      const { data: scenarios, error: scenarioError } = await supabase
        .from('cash_flow_scenarios')
        .select('client_id')
        .not('client_id', 'is', null);  // ✅ Correct syntax

      if (scenarioError) throw scenarioError;

      // Count scenarios per client
      const scenarioCounts = scenarios.reduce((acc: Record<string, number>, scenario: any) => {
        if (scenario.client_id) {
          acc[scenario.client_id] = (acc[scenario.client_id] || 0) + 1;
        }
        return acc;
      }, {});

      return (clients || []).map((client: any) => {
        let name = `Client ${client.client_ref || client.id.slice(0, 8)}`;
        let age: number | undefined = undefined;

        try {
          const personalDetails = typeof client.personal_details === 'string'
            ? JSON.parse(client.personal_details)
            : client.personal_details;

          if (personalDetails?.firstName && personalDetails?.lastName) {
            name = `${personalDetails.firstName} ${personalDetails.lastName}`;
          }
          
          // Parse age if available
          if (personalDetails?.dateOfBirth) {
            const birthDate = new Date(personalDetails.dateOfBirth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }
        } catch (e) {
          console.warn('Could not parse personal details:', e);
        }

        return {
          id: client.id,
          name,
          age,
          scenarioCount: scenarioCounts[client.id] || 0
        };
      });
    } catch (error) {
      console.error('Error fetching clients with scenarios:', error);
      throw new Error('Failed to load clients');
    }
  }

  /**
   * Get all scenarios for a specific client
   */
  static async getClientScenarios(clientId: string): Promise<CashFlowScenario[]> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching client scenarios:', error);
      throw new Error('Failed to load scenarios');
    }
  }

  /**
   * Get scenario with projections and goals
   */
  static async getScenarioSummary(scenarioId: string): Promise<ScenarioSummary> {
    const supabase = createClient(); // Create client for this method
    
    try {
      // Get scenario details
      const { data: scenario, error: scenarioError } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();

      if (scenarioError) throw scenarioError;

      // Get projections
      let projections: CashFlowProjection[] = [];
      try {
        const { data, error } = await supabase
          .from('cash_flow_projections')
          .select('*')
          .eq('scenario_id', scenarioId)
          .order('projection_year');

        if (!error && data) {
          projections = data;
        }
      } catch (e) {
        console.warn('Projections table may not exist:', e);
      }

      // Get related goals
      let goals: ClientGoal[] = [];
      try {
        const { data, error } = await supabase
          .from('client_goals')
          .select('*')
          .eq('client_id', scenario.client_id)
          .eq('is_active', true);

        if (!error && data) {
          goals = data;
        }
      } catch (e) {
        console.warn('Goals table may not exist:', e);
      }

      // Calculate summary metrics
      const finalProjection = projections[projections.length - 1];
      const totalProjectedFund = finalProjection?.total_assets || 0;
      
      const successProbability = this.calculateBasicSuccessProbability(scenario, projections);
      const shortfallRisk = 100 - successProbability;

      return {
        scenario,
        projections,
        goals,
        totalProjectedFund,
        successProbability,
        shortfallRisk
      };
    } catch (error) {
      console.error('Error fetching scenario summary:', error);
      throw new Error('Failed to load scenario details');
    }
  }

  /**
   * Create a basic scenario for a client
   */
  static async createBasicScenario(
    clientId: string, 
    scenarioData: Partial<CashFlowScenario>
  ): Promise<CashFlowScenario> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const resolvedClientAge = Number(scenarioData.client_age ?? 45);
      const resolvedRetirementAge = this.getSafeRetirementAge(
        resolvedClientAge,
        Number(scenarioData.retirement_age)
      );
      const resolvedLifeExpectancy = this.getSafeLifeExpectancy(
        resolvedClientAge,
        resolvedRetirementAge,
        Number(scenarioData.life_expectancy)
      );

      // Get current user's firm_id
      const { data: { user } } = await supabase.auth.getUser();
      
      let firmId = '00000000-0000-0000-0000-000000000000'; // Default
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('firm_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.firm_id) {
          firmId = profile.firm_id;
        }
      }

      const insertData = {
        client_id: clientId,
        scenario_name: scenarioData.scenario_name || 'New Scenario',
        scenario_type: scenarioData.scenario_type || 'base',
        firm_id: firmId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        // Set defaults for required fields
        projection_years: scenarioData.projection_years || 25,
        inflation_rate: scenarioData.inflation_rate || 2.5,
        real_equity_return: scenarioData.real_equity_return || 5.0,
        real_bond_return: scenarioData.real_bond_return || 2.0,
        real_cash_return: scenarioData.real_cash_return || 0.5,
        current_savings: scenarioData.current_savings || 0,
        pension_value: scenarioData.pension_value || 0,
        investment_value: scenarioData.investment_value || 0,
        current_income: scenarioData.current_income || 50000,
        current_expenses: scenarioData.current_expenses || 40000,
        state_pension_age: scenarioData.state_pension_age || 67,
        state_pension_amount: scenarioData.state_pension_amount || 11502,
        risk_score: scenarioData.risk_score || 5,
        vulnerability_adjustments: scenarioData.vulnerability_adjustments || {},
        assumption_basis: scenarioData.assumption_basis || 'Default assumptions based on current market conditions',
        // Allocation fields
        equity_allocation: (scenarioData as any).equity_allocation || 60,
        bond_allocation: (scenarioData as any).bond_allocation || 30,
        cash_allocation: (scenarioData as any).cash_allocation || 10,
        alternative_allocation: (scenarioData as any).alternative_allocation || 0,
        ...scenarioData,
        client_age: resolvedClientAge,
        retirement_age: resolvedRetirementAge,
        life_expectancy: resolvedLifeExpectancy
      };

      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Save activity to activity_log for Activity Timeline
      try {
        await supabase
          .from('activity_log')
          .insert({
            client_id: clientId,
            action: `Cash flow scenario created: ${data.scenario_name}`,
            type: 'cashflow',
            user_name: null,
            date: new Date().toISOString()
          });
      } catch (activityError) {
        console.warn('Failed to save cash flow activity:', activityError);
        // Don't fail the request if activity logging fails
      }

      return data;
    } catch (error) {
      console.error('Error creating scenario:', error);
      throw new Error('Failed to create scenario');
    }
  }

  /**
   * Check if client has any scenarios, create default if not
   */
  static async ensureClientHasScenario(clientId: string): Promise<CashFlowScenario> {
    const supabase = createClient(); // Create client for this method
    
    try {
      // Check for existing scenarios
      const scenarios = await this.getClientScenarios(clientId);
      
      if (scenarios.length > 0) {
        return scenarios[0];
      }

      // Get client details
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('personal_details, client_ref')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      let clientName = 'Client';
      let clientAge = 45; // Default age
      
      try {
        const personalDetails = typeof client.personal_details === 'string' 
          ? JSON.parse(client.personal_details) 
          : client.personal_details;

        if (personalDetails?.firstName && personalDetails?.lastName) {
          clientName = `${personalDetails.firstName} ${personalDetails.lastName}`;
        }
        
        // Calculate age if date of birth is available
        if (personalDetails?.dateOfBirth) {
          const birthDate = new Date(personalDetails.dateOfBirth);
          const today = new Date();
          clientAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            clientAge--;
          }
        }
      } catch (e) {
        clientName = `Client ${client.client_ref || clientId.slice(0, 8)}`;
      }

      const retirementAge = this.getSafeRetirementAge(clientAge, 67);
      const lifeExpectancy = this.getSafeLifeExpectancy(clientAge, retirementAge, 85);

      // Create default scenario
      return await this.createBasicScenario(clientId, {
        scenario_name: `${clientName} - Base Case Projection`,
        scenario_type: 'base',
        projection_years: 25,
        inflation_rate: 2.5,
        real_equity_return: 5.0,
        real_bond_return: 2.0,
        real_cash_return: 0.5,
        client_age: clientAge,
        retirement_age: retirementAge,
        life_expectancy: lifeExpectancy,
        current_savings: 0,
        pension_value: 0,
        investment_value: 0,
        current_income: 50000,
        current_expenses: 40000,
        state_pension_age: 67,
        state_pension_amount: 11502,
        risk_score: 5,
        vulnerability_adjustments: {},
        assumption_basis: 'Default assumptions based on current market conditions'
      } as any);
    } catch (error) {
      console.error('Error ensuring client scenario:', error);
      throw new Error('Failed to create default scenario');
    }
  }

  private static getSafeRetirementAge(clientAge: number, retirementAge?: number): number {
    const base = Number.isFinite(retirementAge) ? Number(retirementAge) : 67;
    if (!Number.isFinite(clientAge)) return base;
    return Math.max(base, Math.round(clientAge) + 1);
  }

  private static getSafeLifeExpectancy(
    clientAge: number,
    retirementAge: number,
    lifeExpectancy?: number
  ): number {
    const base = Number.isFinite(lifeExpectancy) ? Number(lifeExpectancy) : 85;
    const min = Math.max(clientAge + 5, retirementAge + 5);
    return Math.max(base, min);
  }

  /**
   * Basic success probability calculation
   */
  private static calculateBasicSuccessProbability(
    scenario: CashFlowScenario, 
    projections: CashFlowProjection[]
  ): number {
    if (!projections.length) return 50;

    const finalProjection = projections[projections.length - 1];
    const sustainabilityRatio = finalProjection?.sustainability_ratio || 0;

    if (sustainabilityRatio > 1.5) return 90;
    if (sustainabilityRatio > 1.0) return 75;
    if (sustainabilityRatio > 0.5) return 60;
    if (sustainabilityRatio > 0) return 40;
    return 20;
  }

  /**
   * Get Monte Carlo results for scenario
   */
  static async getMonteCarloResults(clientId: string): Promise<any> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { data, error } = await supabase
        .from('monte_carlo_results')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Error fetching Monte Carlo results:', error);
        return null;
      }
      
      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching Monte Carlo results:', error);
      return null;
    }
  }

  /**
   * ✅ FIXED: Get scenarios summary for polling with correct query
   */
  static async getScenariosSummary(): Promise<Array<{id: string, client_id: string | null, updated_at: string}>> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .select('id, client_id, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Return with proper typing
      return (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id || null,
        updated_at: item.updated_at
      }));
    } catch (error) {
      console.error('Error fetching scenarios summary:', error);
      return [];
    }
  }

  /**
   * ✅ NEW: Update scenario last analysis date
   */
  static async updateLastAnalysisDate(scenarioId: string): Promise<void> {
    const supabase = createClient(); // Create client for this method
    
    try {
      const { error } = await supabase
        .from('cash_flow_scenarios')
        .update({ 
          last_analysis_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', scenarioId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating last analysis date:', error);
    }
  }
}

// ================================================================
// Cash Flow Scenario Service - Interface with your existing database
// ================================================================

import { supabase } from '@/lib/supabase';
import type { CashFlowScenario, CashFlowProjection, ClientGoal, ScenarioSummary, ClientOption } from '@/types/cash-flow-scenario';

export class CashFlowScenarioService {
  
  /**
   * Get all clients with their scenario counts for dropdown
   */
  static async getClientsWithScenarios(): Promise<ClientOption[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          personal_details,
          cash_flow_scenarios!cash_flow_scenarios_client_id_fkey(count)
        `);

      if (error) throw error;

      return data.map(client => ({
        id: client.id,
        name: client.personal_details?.firstName && client.personal_details?.lastName 
          ? `${client.personal_details.firstName} ${client.personal_details.lastName}`
          : `Client ${client.id.slice(0, 8)}`,
        age: client.personal_details?.age,
        scenarioCount: client.cash_flow_scenarios?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching clients with scenarios:', error);
      throw new Error('Failed to load clients');
    }
  }

  /**
   * Get all scenarios for a specific client
   */
  static async getClientScenarios(clientId: string): Promise<CashFlowScenario[]> {
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
    try {
      // Get scenario details
      const { data: scenario, error: scenarioError } = await supabase
        .from('cash_flow_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();

      if (scenarioError) throw scenarioError;

      // Get projections
      const { data: projections, error: projectionsError } = await supabase
        .from('cash_flow_projections')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('projection_year');

      if (projectionsError) throw projectionsError;

      // Get related goals
      const { data: goals, error: goalsError } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', scenario.client_id);

      if (goalsError) throw goalsError;

      // Calculate summary metrics
      const finalProjection = projections?.[projections.length - 1];
      const totalProjectedFund = finalProjection?.total_assets || 0;
      
      // Basic success probability calculation (will be enhanced in Phase 2)
      const successProbability = this.calculateBasicSuccessProbability(scenario, projections || []);
      const shortfallRisk = 100 - successProbability;

      return {
        scenario,
        projections: projections || [],
        goals: goals || [],
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
    try {
      const { data, error } = await supabase
        .from('cash_flow_scenarios')
        .insert([{
          client_id: clientId,
          scenario_name: scenarioData.scenario_name || 'New Scenario',
          scenario_type: scenarioData.scenario_type || 'base',
          ...scenarioData
        }])
        .select()
        .single();

      if (error) throw error;
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
    try {
      // Check for existing scenarios
      const scenarios = await this.getClientScenarios(clientId);
      
      if (scenarios.length > 0) {
        return scenarios[0]; // Return most recent
      }

      // Create default scenario if none exist
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('personal_details')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      const clientName = client.personal_details?.firstName && client.personal_details?.lastName
        ? `${client.personal_details.firstName} ${client.personal_details.lastName}`
        : 'Client';

      return await this.createBasicScenario(clientId, {
        scenario_name: `${clientName} - Base Case Projection`,
        scenario_type: 'base',
        projection_years: 25,
        inflation_rate: 2.5,
        real_equity_return: 5.0,
        real_bond_return: 2.0,
        real_cash_return: 0.5,
        client_age: client.personal_details?.age || 45,
        retirement_age: 67,
        life_expectancy: 85,
        current_savings: 0,
        pension_value: 0,
        investment_value: 0,
        current_income: 50000,
        current_expenses: 40000,
        state_pension_age: 67,
        state_pension_amount: 11502, // Current full state pension
        risk_score: 5,
        vulnerability_adjustments: {},
        assumption_basis: 'Default assumptions based on current market conditions',
        alternative_allocation: 0.0
      });
    } catch (error) {
      console.error('Error ensuring client scenario:', error);
      throw new Error('Failed to create default scenario');
    }
  }

  /**
   * Basic success probability calculation (Phase 1 implementation)
   */
  private static calculateBasicSuccessProbability(
    scenario: CashFlowScenario, 
    projections: CashFlowProjection[]
  ): number {
    if (!projections.length) return 50; // Default

    // Simple calculation based on final sustainability ratio
    const finalProjection = projections[projections.length - 1];
    const sustainabilityRatio = finalProjection?.sustainability_ratio || 0;

    // Convert sustainability ratio to probability (Phase 1 approximation)
    if (sustainabilityRatio > 1.5) return 90;
    if (sustainabilityRatio > 1.0) return 75;
    if (sustainabilityRatio > 0.5) return 60;
    if (sustainabilityRatio > 0) return 40;
    return 20;
  }

  /**
   * Get Monte Carlo results for scenario (if they exist)
   */
  static async getMonteCarloResults(clientId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('monte_carlo_results')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching Monte Carlo results:', error);
      return null;
    }
  }
}
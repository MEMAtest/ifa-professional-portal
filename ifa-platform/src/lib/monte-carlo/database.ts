// src/lib/monte-carlo/database.ts
// FINAL, COMPLETE, AND CORRECTED CODE

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MonteCarloResults, SimulationInput } from './engine';
import clientLogger from '@/lib/logging/clientLogger';

/**
 * Database interfaces
 */
interface MonteCarloResultRecord {
  id?: string;
  scenario_id: string;
  client_id?: string | null;
  simulation_count: number;
  success_probability: number;
  average_final_wealth: number;
  median_final_wealth: number;
  confidence_intervals: Record<string, number>;
  shortfall_risk: number;
  average_shortfall_amount: number;
  years_to_depletion_p50?: number;
  wealth_volatility: number;
  maximum_drawdown: number;
  simulation_duration_ms: number;
  calculation_status: string;
  created_at?: string;
  updated_at?: string;
}

interface MonteCarloAssumptionRecord {
  id?: string;
  scenario_id: string;
  initial_wealth: number;
  time_horizon_years: number;
  withdrawal_amount: number;
  withdrawal_strategy: string;
  risk_score: number;
  inflation_rate: number;
  asset_allocation: Record<string, number>;
  rebalance_frequency: string;
  created_at?: string;
}

interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Monte Carlo Database Service
 */
export class MonteCarloDatabase {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Save Monte Carlo simulation results
   */
  async saveResults(
    scenarioId: string,
    results: MonteCarloResults,
    input: SimulationInput
  ): Promise<DatabaseResult<MonteCarloResultRecord>> {
    try {
      const inputAny = input as any
      const clientId = inputAny.client_id || inputAny.clientId || null

      // Prepare results record
      const resultRecord: MonteCarloResultRecord = {
        scenario_id: scenarioId,
        client_id: clientId,
        simulation_count: results.simulations.length,
        success_probability: results.successProbability,
        average_final_wealth: results.averageFinalWealth,
        median_final_wealth: results.medianFinalWealth,
        confidence_intervals: results.confidenceIntervals,
        shortfall_risk: results.shortfallRisk,
        average_shortfall_amount: results.averageShortfall,
        wealth_volatility: results.volatility,
        maximum_drawdown: results.maxDrawdown,
        simulation_duration_ms: results.executionTime,
        calculation_status: 'completed'
      };

      // Insert results
      const { data: resultData, error: resultError } = await this.supabase
        .from('monte_carlo_results')
        .insert(resultRecord)
        .select()
        .single();

      if (resultError) {
        throw new Error(`Failed to save results: ${resultError.message}`);
      }

      // Save assumptions separately
      await this.saveAssumptions(scenarioId, input);

      return {
        success: true,
        data: resultData
      };

    } catch (error) {
      clientLogger.error('Error saving Monte Carlo results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Save simulation assumptions
   */
  async saveAssumptions(
    scenarioId: string,
    input: SimulationInput
  ): Promise<DatabaseResult<MonteCarloAssumptionRecord>> {
    try {
      // Convert AssetAllocation to Record<string, number>
      const assetAllocationRecord: Record<string, number> = input.assetAllocation
        ? {
            equity: input.assetAllocation.equity,
            bonds: input.assetAllocation.bonds,
            cash: input.assetAllocation.cash,
            ...(input.assetAllocation.alternatives !== undefined && {
              alternatives: input.assetAllocation.alternatives
            })
          }
        : {};

      const assumptionRecord: MonteCarloAssumptionRecord = {
        scenario_id: scenarioId,
        initial_wealth: input.initialWealth,
        time_horizon_years: input.timeHorizon,
        withdrawal_amount: input.withdrawalAmount,
        withdrawal_strategy: 'fixed_amount', // Default strategy
        risk_score: input.riskScore,
        inflation_rate: input.inflationRate ?? 0.025,
        asset_allocation: assetAllocationRecord,
        rebalance_frequency: 'annual'
      };

      const { data, error } = await this.supabase
        .from('monte_carlo_assumptions')
        .insert(assumptionRecord)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save assumptions: ${error.message}`);
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      clientLogger.error('Error saving Monte Carlo assumptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Retrieve Monte Carlo results by scenario ID
   */
  async getResults(scenarioId: string): Promise<DatabaseResult<MonteCarloResultRecord>> {
    try {
      const { data, error } = await this.supabase
        .from('monte_carlo_results')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'No results found for this scenario'
          };
        }
        throw new Error(`Failed to retrieve results: ${error.message}`);
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      clientLogger.error('Error retrieving Monte Carlo results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Retrieve simulation assumptions by scenario ID
   */
  async getAssumptions(scenarioId: string): Promise<DatabaseResult<MonteCarloAssumptionRecord>> {
    try {
      const { data, error } = await this.supabase
        .from('monte_carlo_assumptions')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'No assumptions found for this scenario'
          };
        }
        throw new Error(`Failed to retrieve assumptions: ${error.message}`);
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      clientLogger.error('Error retrieving Monte Carlo assumptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * List all scenarios with pagination
   */
  async listScenarios(
    page: number = 1,
    pageSize: number = 20
  ): Promise<DatabaseResult<MonteCarloResultRecord[]>> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await this.supabase
        .from('monte_carlo_results')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to list scenarios: ${error.message}`);
      }

      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      clientLogger.error('Error listing Monte Carlo scenarios:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Delete scenario and all related data
   */
  async deleteScenario(scenarioId: string): Promise<DatabaseResult<boolean>> {
    try {
      // Delete assumptions first (foreign key constraint)
      const { error: assumptionsError } = await this.supabase
        .from('monte_carlo_assumptions')
        .delete()
        .eq('scenario_id', scenarioId);

      if (assumptionsError) {
        throw new Error(`Failed to delete assumptions: ${assumptionsError.message}`);
      }

      // Delete results
      const { error: resultsError } = await this.supabase
        .from('monte_carlo_results')
        .delete()
        .eq('scenario_id', scenarioId);

      if (resultsError) {
        throw new Error(`Failed to delete results: ${resultsError.message}`);
      }

      return {
        success: true,
        data: true
      };

    } catch (error) {
      clientLogger.error('Error deleting Monte Carlo scenario:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Update calculation status
   */
  async updateStatus(
    scenarioId: string,
    status: 'pending' | 'running' | 'completed' | 'failed'
  ): Promise<DatabaseResult<boolean>> {
    try {
      const { error } = await this.supabase
        .from('monte_carlo_results')
        .update({
          calculation_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('scenario_id', scenarioId);

      if (error) {
        throw new Error(`Failed to update status: ${error.message}`);
      }

      return {
        success: true,
        data: true
      };

    } catch (error) {
      clientLogger.error('Error updating Monte Carlo status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Clean up old results (older than specified days)
   */
  async cleanupOldResults(olderThanDays: number = 90): Promise<DatabaseResult<number>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffISO = cutoffDate.toISOString();

      // Get scenario IDs to delete
      const { data: oldResults, error: selectError } = await this.supabase
        .from('monte_carlo_results')
        .select('scenario_id')
        .lt('created_at', cutoffISO);

      if (selectError) {
        throw new Error(`Failed to query old results: ${selectError.message}`);
      }

      if (!oldResults || oldResults.length === 0) {
        return {
          success: true,
          data: 0
        };
      }

      const scenarioIds = oldResults.map(r => r.scenario_id);

      // Delete assumptions first
      const { error: assumptionsError } = await this.supabase
        .from('monte_carlo_assumptions')
        .delete()
        .in('scenario_id', scenarioIds);

      if (assumptionsError) {
        throw new Error(`Failed to delete old assumptions: ${assumptionsError.message}`);
      }

      // Delete results
      const { error: resultsError } = await this.supabase
        .from('monte_carlo_results')
        .delete()
        .in('scenario_id', scenarioIds);

      if (resultsError) {
        throw new Error(`Failed to delete old results: ${resultsError.message}`);
      }

      return {
        success: true,
        data: scenarioIds.length
      };

    } catch (error) {
      clientLogger.error('Error cleaning up old Monte Carlo results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Get database health status
   */
async getHealthStatus(): Promise<DatabaseResult<{ status: string; count: number | null }>> {
  try {
    // ✅ USE THIS EXACT SYNTAX IN ALL FILES
    const { count, error } = await this.supabase
      .from('monte_carlo_results')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }

    return {
      success: true,
      data: {
        status: 'healthy',
        count: count
      }
    };

  } catch (error) {
    clientLogger.error('Database health check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database unhealthy'
    };
  }
}
}

/**
 * Factory function for creating database instance
 */
export function createMonteCarloDatabase(): MonteCarloDatabase {
  return new MonteCarloDatabase();
}

/**
 * Singleton instance for use across the application
 */
let dbInstance: MonteCarloDatabase | null = null;

export function getMonteCarloDatabase(): MonteCarloDatabase {
  if (!dbInstance) {
    dbInstance = new MonteCarloDatabase();
  }
  return dbInstance;
}

export type {
  MonteCarloResultRecord,
  MonteCarloAssumptionRecord,
  DatabaseResult
};

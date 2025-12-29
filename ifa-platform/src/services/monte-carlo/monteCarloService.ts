import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MonteCarloDashboardStats,
  MonteCarloScenario,
  ScenarioWithResult
} from '@/components/monte-carlo/types';

export const fetchMonteCarloStats = async (
  supabase: SupabaseClient
): Promise<MonteCarloDashboardStats> => {
  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  const { count: scenariosCount } = await supabase
    .from('monte_carlo_scenarios')
    .select('*', { count: 'exact', head: true });

  const { data: resultsData } = await supabase
    .from('monte_carlo_results')
    .select('success_probability')
    .not('success_probability', 'is', null);

  const avgSuccess = resultsData && resultsData.length > 0
    ? resultsData.reduce((sum: number, r: any) => sum + (r.success_probability || 0), 0) /
      resultsData.length
    : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentScenarios } = await supabase
    .from('monte_carlo_scenarios')
    .select('client_id')
    .gte('created_at', thirtyDaysAgo.toISOString());

  const uniqueActiveClients = new Set(recentScenarios?.map((s: any) => s.client_id) || []);

  return {
    totalClients: clientCount || 0,
    activeClients: uniqueActiveClients.size,
    totalScenarios: scenariosCount || 0,
    averageSuccessRate: avgSuccess
  };
};

export const fetchMonteCarloScenarios = async (
  supabase: SupabaseClient,
  clientId: string
): Promise<ScenarioWithResult[]> => {
  const { data: scenarios, error: scenarioError } = await supabase
    .from('monte_carlo_scenarios')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (scenarioError) throw scenarioError;

  if (!scenarios || scenarios.length === 0) {
    return [];
  }

  const scenarioIds = scenarios.map((s: MonteCarloScenario) => s.id);
  const { data: results, error: resultsError } = await supabase
    .from('monte_carlo_results')
    .select('*')
    .in('scenario_id', scenarioIds);

  if (resultsError) throw resultsError;

  return scenarios.map((scenario: MonteCarloScenario) => {
    const result = results?.find((r: any) => r.scenario_id === scenario.id);

    return {
      ...scenario,
      result: result as any,
      success_probability: result?.success_probability ?? 0,
      simulation_count: result?.simulation_count ?? 0,
      average_final_wealth: result?.average_final_wealth,
      median_final_wealth: result?.median_final_wealth,
      confidence_intervals: result?.confidence_intervals as any,
      shortfall_risk: result?.shortfall_risk,
      volatility: result?.wealth_volatility,
      max_drawdown: result?.maximum_drawdown
    };
  });
};

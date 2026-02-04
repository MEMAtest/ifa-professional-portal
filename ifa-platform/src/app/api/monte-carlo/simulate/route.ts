// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { log } from '@/lib/logging/structured';
import { createMonteCarloEngine } from '@/lib/monte-carlo/engine';
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth';
import { notifyMonteCarloCompleted } from '@/lib/notifications/notificationService';
import { parseRequestBody } from '@/app/api/utils'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient';
import { requireClientAccess } from '@/lib/auth/requireClientAccess';

const requestSchema = z.object({
  scenario_id: z.string().min(1),
  simulation_count: z.number().int().min(100).max(100000).optional(),
  seed: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const firmResult = requireFirmId(auth.context);
    if (!('firmId' in firmResult)) {
      return firmResult;
    }

    let parsedBody: z.infer<typeof requestSchema>
    try {
      parsedBody = await parseRequestBody(request, requestSchema);
    } catch (error) {
      log.warn('Invalid Monte Carlo request body', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { scenario_id, simulation_count = 5000, seed } = parsedBody;
    const userId = auth.context.userId;
    const supabase = getSupabaseServiceClient();

    log.info('Starting enhanced Monte Carlo', { simulationCount: simulation_count });

    // Try to find scenario in cash_flow_scenarios first
    let scenario: any = null;
    let scenarioError: any = null;

    const { data: cashFlowScenario, error: cashFlowError } = await supabase
      .from('cash_flow_scenarios')
      .select('*')
      .eq('id', scenario_id)
      .single();

    if (cashFlowScenario) {
      scenario = cashFlowScenario;
      log.info('Found scenario in cash_flow_scenarios', { scenario_id, client_id: scenario.client_id });
    } else {
      // If not found, try monte_carlo_scenarios table
      const { data: mcScenario, error: mcError } = await supabase
        .from('monte_carlo_scenarios')
        .select('*')
        .eq('id', scenario_id)
        .single();

      if (mcScenario) {
        scenario = mcScenario;
        log.info('Found scenario in monte_carlo_scenarios', { scenario_id, client_id: scenario.client_id });
      } else {
        scenarioError = mcError || cashFlowError;
      }
    }

    if (!scenario) {
      log.error('Monte Carlo scenario not found in any table', { scenario_id, error: scenarioError });
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    if (!scenario.client_id) {
      return NextResponse.json(
        { success: false, error: 'Scenario missing client' },
        { status: 404 }
      );
    }

    const access = await requireClientAccess({
      supabase,
      clientId: scenario.client_id,
      ctx: auth.context,
      select: 'id, firm_id'
    });
    if (!access.ok) {
      return access.response;
    }

    const input = buildSimulationInput(scenario, simulation_count);
    const engine = createMonteCarloEngine();
    if (Number.isFinite(seed)) {
      engine.setSeed(Number(seed));
    }
    const rawResults = await engine.runSimulation(input);
    const enrichedResults = {
      success_probability: rawResults.successProbability,
      average_final_wealth: rawResults.averageFinalWealth,
      median_final_wealth: rawResults.medianFinalWealth,
      confidence_intervals: rawResults.confidenceIntervals,
      shortfall_risk: rawResults.shortfallRisk,
      average_shortfall_amount: rawResults.averageShortfall,
      years_to_depletion_p50: calculateMedianDepletionYear(rawResults.simulations),
      wealth_volatility: rawResults.volatility,
      maximum_drawdown: rawResults.maxDrawdown,
      simulation_duration_ms: rawResults.executionTime
    };

    // FIX: Sanitize results to prevent NaN/Infinity from being stored in database
    const results = sanitizeMonteCarloResult(enrichedResults);

    // Save to database - include client_id from scenario for activity tracking
    const { data: savedResult, error } = await supabase
      .from('monte_carlo_results')
      .insert({
        scenario_id: scenario.id,
        client_id: scenario.client_id, // FIX: Include client_id for activity timeline
        scenario_name: scenario.scenario_name || 'Analysis completed', // FIX: Include scenario_name
        simulation_count: simulation_count,
        success_probability: results.success_probability,
        average_final_wealth: results.average_final_wealth,
        median_final_wealth: results.median_final_wealth,
        confidence_intervals: results.confidence_intervals,
        shortfall_risk: results.shortfall_risk,
        average_shortfall_amount: results.average_shortfall_amount,
        years_to_depletion_p50: results.years_to_depletion_p50,
        wealth_volatility: results.wealth_volatility,
        maximum_drawdown: results.maximum_drawdown,
        simulation_duration_ms: results.simulation_duration_ms,
        calculation_status: 'completed'
      })
      .select()
      .single();

    if (error) {
      log.error('Monte Carlo database error', error);
      throw error;
    }

    log.info('Enhanced simulation completed', { successProbability: results.success_probability });

    // Send bell notification
    if (userId && scenario.client_id && savedResult) {
      try {
        // Fetch client name for notification
        const { data: clientData } = await supabase
          .from('clients')
          .select('personal_details')
          .eq('id', scenario.client_id)
          .single();
        const personalDetails = clientData?.personal_details as Record<string, unknown> | null;
        const clientName = (personalDetails?.firstName || personalDetails?.first_name || 'Client') as string;
        await notifyMonteCarloCompleted(userId, scenario.client_id, clientName, savedResult.id);
      } catch (notifyError) {
        log.warn('Failed to send Monte Carlo notification', { error: notifyError instanceof Error ? notifyError.message : String(notifyError) });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Monte Carlo completed: ${simulation_count} simulations`
    });

  } catch (error) {
    log.error('Enhanced simulation failed', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Monte Carlo simulation failed',
        message: 'Monte Carlo simulation failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Sanitize a number to prevent NaN/Infinity from being stored
 */
function sanitizeNumber(value: number, fallback: number = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Sanitize Monte Carlo results to ensure all values are finite numbers
 */
function sanitizeMonteCarloResult(result: {
  success_probability: number;
  average_final_wealth: number;
  median_final_wealth: number;
  confidence_intervals: { p10: number; p25: number; p50: number; p75: number; p90: number };
  shortfall_risk: number;
  average_shortfall_amount: number;
  years_to_depletion_p50: number;
  wealth_volatility: number;
  maximum_drawdown: number;
  simulation_duration_ms: number;
}) {
  return {
    success_probability: sanitizeNumber(result.success_probability, 0),
    average_final_wealth: sanitizeNumber(result.average_final_wealth, 0),
    median_final_wealth: sanitizeNumber(result.median_final_wealth, 0),
    confidence_intervals: {
      p10: sanitizeNumber(result.confidence_intervals.p10, 0),
      p25: sanitizeNumber(result.confidence_intervals.p25, 0),
      p50: sanitizeNumber(result.confidence_intervals.p50, 0),
      p75: sanitizeNumber(result.confidence_intervals.p75, 0),
      p90: sanitizeNumber(result.confidence_intervals.p90, 0),
    },
    shortfall_risk: sanitizeNumber(result.shortfall_risk, 0),
    average_shortfall_amount: sanitizeNumber(result.average_shortfall_amount, 0),
    years_to_depletion_p50: sanitizeNumber(result.years_to_depletion_p50, 0),
    wealth_volatility: sanitizeNumber(result.wealth_volatility, 0),
    maximum_drawdown: sanitizeNumber(result.maximum_drawdown, 0),
    simulation_duration_ms: sanitizeNumber(result.simulation_duration_ms, 0),
  };
}

// Enhanced helper functions
function generateNormalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function selectMarketRegime(regimes: any[]): any {
  const random = Math.random();
  let cumulative = 0;
  
  for (const regime of regimes) {
    cumulative += regime.probability;
    if (random <= cumulative) return regime;
  }
  
  return regimes[0]; // Fallback
}

function calculateVolatility(values: number[]): number {
  // FIX: Guard against empty array and zero/invalid mean
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  // Guard against zero or invalid mean to prevent NaN/Infinity
  if (!Number.isFinite(mean) || mean === 0) return 0;

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const volatility = (Math.sqrt(variance) / mean) * 100;

  // Sanitize result
  return Number.isFinite(volatility) ? Math.round(volatility * 10) / 10 : 0;
}

function calculateMaxDrawdown(values: number[]): number {
  // FIX: Guard against empty array
  if (values.length === 0) return 0;

  let maxDrawdown = 0;
  let peak = values[0] || 0;

  for (const value of values) {
    if (value > peak) peak = value;
    // FIX: Guard against zero peak to prevent divide-by-zero
    if (peak > 0) {
      const drawdown = ((peak - value) / peak) * 100;
      if (Number.isFinite(drawdown)) {
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
  }

  return Number.isFinite(maxDrawdown) ? Math.round(maxDrawdown * 10) / 10 : 0;
}

function normalizeAllocation(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [0.6, 0.3, 0.1, 0];
  return values.map((value) => value / total);
}

function buildSimulationInput(scenario: any, simulationCount: number) {
  const initialWealth =
    (scenario.current_savings ?? 0) +
    (scenario.investment_value ?? 0) +
    (scenario.pension_pot_value ?? scenario.pension_value ?? 0);
  const timeHorizon = scenario.projection_years ?? 30;
  const inflationRate = (scenario.inflation_rate ?? 2.5) / 100;
  const retirementTarget = scenario.retirement_income_target || scenario.current_expenses || 0;
  const guaranteedIncome = (scenario.state_pension_amount ?? 0) + (scenario.other_income ?? 0);
  const withdrawalAmount = Math.max(0, retirementTarget - guaranteedIncome);
  const riskScore = scenario.risk_score ?? 5;

  const rawAllocations = [
    (scenario.equity_allocation ?? 0) / 100,
    (scenario.bond_allocation ?? 0) / 100,
    (scenario.cash_allocation ?? 0) / 100,
    (scenario.alternative_allocation ?? 0) / 100
  ];
  const [equity, bonds, cash, alternatives] = normalizeAllocation(rawAllocations);
  const inflationPercent = scenario.inflation_rate ?? 2.5;
  const realEquity = scenario.real_equity_return ?? 0;
  const realBond = scenario.real_bond_return ?? 0;
  const realCash = scenario.real_cash_return ?? 0;
  const nominalEquity = (realEquity + inflationPercent) / 100;
  const nominalBond = (realBond + inflationPercent) / 100;
  const nominalCash = (realCash + inflationPercent) / 100;

  return {
    initialWealth,
    timeHorizon,
    withdrawalAmount,
    riskScore,
    inflationRate,
    simulationCount,
    assetAllocation: {
      equity,
      bonds,
      cash,
      alternatives: alternatives > 0 ? alternatives : undefined
    },
    returnAssumptions: {
      equity: nominalEquity,
      bonds: nominalBond,
      cash: nominalCash,
      alternatives: nominalEquity
    }
  };
}

function calculateMedianDepletionYear(simulations: Array<{ yearlyWealth: number[] }>): number {
  const depletionYears = simulations
    .map((sim) => sim.yearlyWealth.findIndex((value) => value <= 0))
    .filter((yearIndex) => yearIndex >= 0)
    .map((yearIndex) => yearIndex + 1)
    .sort((a, b) => a - b);

  if (depletionYears.length === 0) return 0;
  const mid = Math.floor(depletionYears.length / 2);
  return depletionYears.length % 2 === 0
    ? Math.round((depletionYears[mid - 1] + depletionYears[mid]) / 2)
    : depletionYears[mid];
}

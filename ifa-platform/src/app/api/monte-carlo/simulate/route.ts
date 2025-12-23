// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { log } from '@/lib/logging/structured';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario_id, simulation_count = 5000 } = body;

    log.info('Starting enhanced Monte Carlo', { simulationCount: simulation_count });

    // Enhanced scenario with better defaults
    const scenario = {
      id: scenario_id || 'enhanced-scenario',
      client_id: 'test-client',
      scenario_name: 'Enhanced Monte Carlo Scenario',
      projection_years: 30,
      inflation_rate: 2.5,
      real_equity_return: 5.0,
      real_bond_return: 2.0,
      real_cash_return: 0.5,
      risk_score: 5
    };

    // Run enhanced simulation
    const rawResults = await runEnhancedMonteCarloSimulation(scenario, simulation_count);

    // FIX: Sanitize results to prevent NaN/Infinity from being stored in database
    const results = sanitizeMonteCarloResult(rawResults);

    // Save to database
    const { data: savedResult, error } = await supabase
      .from('monte_carlo_results')
      .insert({
        scenario_id: scenario.id,
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

    return NextResponse.json({
      success: true,
      data: results,
      message: `Enhanced Monte Carlo completed: ${simulation_count} simulations`
    });

  } catch (error) {
    log.error('Enhanced simulation failed', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: 'Enhanced Monte Carlo simulation failed'
      },
      { status: 500 }
    );
  }
}

// Enhanced Monte Carlo with better math and features
async function runEnhancedMonteCarloSimulation(scenario: any, simulationCount: number) {
  const startTime = Date.now();
  
  let successfulRuns = 0;
  let totalDepletionYears = 0;
  let depletionCount = 0;
  let totalShortfallAmount = 0;
  
  const finalWealths: number[] = [];
  const initialWealth = 500000;
  const withdrawalRate = 0.04;
  
  // Enhanced parameters
  const marketRegimes = [
    { name: 'normal', probability: 0.80, multiplier: 1.0 },
    { name: 'bull', probability: 0.10, multiplier: 1.3 },
    { name: 'bear', probability: 0.10, multiplier: 0.7 }
  ];
  
  for (let run = 0; run < simulationCount; run++) {
    let wealth = initialWealth;
    let minWealth = wealth;
    let maxWealth = wealth;
    let depletionYear: number | null = null;
    
    for (let year = 0; year < scenario.projection_years; year++) {
      // Select market regime
      const regime = selectMarketRegime(marketRegimes);
      
      // Generate correlated returns with regime adjustment
      const baseEquityReturn = generateNormalRandom(scenario.real_equity_return, 15) / 100;
      const baseBondReturn = generateNormalRandom(scenario.real_bond_return, 5) / 100;
      const baseCashReturn = generateNormalRandom(scenario.real_cash_return, 1) / 100;
      
      // Apply market regime
      const equityReturn = baseEquityReturn * regime.multiplier;
      const bondReturn = baseBondReturn * regime.multiplier;
      const cashReturn = baseCashReturn;
      
      // Dynamic allocation based on risk score and age
      const ageAdjustment = Math.max(0.1, 1 - (year * 0.01)); // Reduce equity over time
      const baseEquityAllocation = Math.min(0.9, Math.max(0.1, (scenario.risk_score - 1) * 0.1));
      const equityAllocation = baseEquityAllocation * ageAdjustment;
      const bondAllocation = Math.min(0.8, 1 - equityAllocation - 0.1);
      const cashAllocation = 1 - equityAllocation - bondAllocation;
      
      // Calculate portfolio return
      const portfolioReturn = 
        equityAllocation * equityReturn + 
        bondAllocation * bondReturn + 
        cashAllocation * cashReturn;
      
      // Apply return
      wealth *= (1 + portfolioReturn);
      
      // Calculate inflation-adjusted withdrawal
      const inflationMultiplier = Math.pow(1 + scenario.inflation_rate/100, year);
      const withdrawal = initialWealth * withdrawalRate * inflationMultiplier;
      wealth -= withdrawal;
      
      // Track wealth statistics
      minWealth = Math.min(minWealth, wealth);
      maxWealth = Math.max(maxWealth, wealth);
      
      // Check for depletion
      if (wealth <= 0 && depletionYear === null) {
        depletionYear = year + 1;
        totalDepletionYears += depletionYear;
        depletionCount++;
        totalShortfallAmount += Math.abs(wealth);
        break;
      }
    }
    
    finalWealths.push(Math.max(0, wealth));
    if (wealth > 0) successfulRuns++;
  }
  
  // Enhanced analysis
  finalWealths.sort((a, b) => a - b);
  const successProbability = (successfulRuns / simulationCount) * 100;
  const averageWealth = finalWealths.reduce((sum, w) => sum + w, 0) / finalWealths.length;
  const medianWealth = finalWealths[Math.floor(finalWealths.length / 2)];
  
  const executionTime = Date.now() - startTime;
  
  return {
    success_probability: Math.round(successProbability * 10) / 10,
    average_final_wealth: Math.round(averageWealth),
    median_final_wealth: Math.round(medianWealth),
    confidence_intervals: {
      p10: Math.round(finalWealths[Math.floor(finalWealths.length * 0.1)]),
      p25: Math.round(finalWealths[Math.floor(finalWealths.length * 0.25)]),
      p50: Math.round(medianWealth),
      p75: Math.round(finalWealths[Math.floor(finalWealths.length * 0.75)]),
      p90: Math.round(finalWealths[Math.floor(finalWealths.length * 0.9)])
    },
    shortfall_risk: Math.round((100 - successProbability) * 10) / 10,
    average_shortfall_amount: depletionCount > 0 ? Math.round(totalShortfallAmount / depletionCount) : 0,
    years_to_depletion_p50: depletionCount > 0 ? Math.round(totalDepletionYears / depletionCount) : 0,
    wealth_volatility: calculateVolatility(finalWealths),
    maximum_drawdown: calculateMaxDrawdown(finalWealths),
    simulation_duration_ms: executionTime
  };
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
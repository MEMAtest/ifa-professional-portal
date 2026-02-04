// =====================================================
// FILE: src/app/api/monte-carlo/simulate/__tests__/simulate.test.ts
// Tests for the Monte Carlo simulation API route
// =====================================================

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

describe('Monte Carlo Simulate API', () => {
  let POST: typeof import('../route').POST
  let mockFrom: ReturnType<typeof vi.fn>
  let mockSingle: ReturnType<typeof vi.fn>
  let mockScenarioSingle: ReturnType<typeof vi.fn>
  let mockResultsSingle: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    mockFrom = vi.fn()
    mockSingle = vi.fn()
    mockScenarioSingle = vi.fn()
    mockResultsSingle = vi.fn()

    // Mock Supabase service client
    vi.doMock('@/lib/supabase/serviceClient', () => ({
      getSupabaseServiceClient: vi.fn().mockReturnValue({
        from: mockFrom
      })
    }))

    // Mock auth helpers
    vi.doMock('@/lib/auth/apiAuth', () => ({
      getAuthContext: vi.fn().mockResolvedValue({
        success: true,
        context: { userId: 'user-123', firmId: 'firm-123' }
      }),
      requireFirmId: vi.fn(() => ({ firmId: 'firm-123' }))
    }))

    // Mock client access
    vi.doMock('@/lib/auth/requireClientAccess', () => ({
      requireClientAccess: vi.fn().mockResolvedValue({ ok: true })
    }))

    // Mock notification helper
    vi.doMock('@/lib/notifications/notificationService', () => ({
      notifyMonteCarloCompleted: vi.fn().mockResolvedValue(undefined)
    }))

    // Mock Monte Carlo engine for deterministic results
    vi.doMock('@/lib/monte-carlo/engine', () => ({
      createMonteCarloEngine: () => ({
        setSeed: vi.fn(),
        runSimulation: vi.fn().mockResolvedValue({
          successProbability: 75.5,
          averageFinalWealth: 100000,
          medianFinalWealth: 90000,
          confidenceIntervals: { p10: 50000, p25: 70000, p50: 90000, p75: 110000, p90: 130000 },
          shortfallRisk: 24.5,
          averageShortfall: 12000,
          simulations: [],
          volatility: 0.12,
          maxDrawdown: 0.25,
          executionTime: 10
        })
      })
    }))

    // Mock structured logging
    vi.doMock('@/lib/logging/structured', () => ({
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
      }
    }))

    // Import after mocking
    const route = await import('../route')
    POST = route.POST
  })

  beforeEach(() => {
    vi.clearAllMocks()
    const scenarioChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockScenarioSingle
    }

    const resultsChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: mockResultsSingle
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'cash_flow_scenarios') {
        return scenarioChain
      }
      if (table === 'monte_carlo_results') {
        return resultsChain
      }
      return resultsChain
    })

    mockScenarioSingle.mockResolvedValue({
      data: {
        id: 'test-scenario',
        client_id: 'client-123',
        scenario_name: 'Test Scenario',
        current_savings: 50000,
        investment_value: 200000,
        pension_pot_value: 150000,
        projection_years: 30,
        inflation_rate: 2.5,
        retirement_income_target: 40000,
        state_pension_amount: 11500,
        other_income: 0,
        risk_score: 5,
        equity_allocation: 60,
        bond_allocation: 30,
        cash_allocation: 10,
        alternative_allocation: 0,
        real_equity_return: 3.5,
        real_bond_return: 1.5,
        real_cash_return: 0.0
      },
      error: null
    })

    mockResultsSingle.mockResolvedValue({
      data: {
        id: 'result-123',
        scenario_id: 'test-scenario',
        success_probability: 75.5
      },
      error: null
    })
  })

  describe('POST /api/monte-carlo/simulate', () => {
    it('should run simulation with default simulation count', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.message).toContain('5000 simulations') // Default
    })

    it('should run simulation with custom simulation count', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario-123',
          simulation_count: 1000
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('1000 simulations')
    })

    it('should return valid Monte Carlo results structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario',
          simulation_count: 100 // Small count for faster test
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const results = data.data
      expect(results).toHaveProperty('success_probability')
      expect(results).toHaveProperty('average_final_wealth')
      expect(results).toHaveProperty('median_final_wealth')
      expect(results).toHaveProperty('confidence_intervals')
      expect(results).toHaveProperty('shortfall_risk')
      expect(results).toHaveProperty('average_shortfall_amount')
      expect(results).toHaveProperty('years_to_depletion_p50')
      expect(results).toHaveProperty('wealth_volatility')
      expect(results).toHaveProperty('maximum_drawdown')
      expect(results).toHaveProperty('simulation_duration_ms')
    })

    it('should have confidence intervals at correct percentiles', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario',
          simulation_count: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      const ci = data.data.confidence_intervals
      expect(ci).toHaveProperty('p10')
      expect(ci).toHaveProperty('p25')
      expect(ci).toHaveProperty('p50')
      expect(ci).toHaveProperty('p75')
      expect(ci).toHaveProperty('p90')

      // Confidence intervals should be in ascending order
      expect(ci.p10).toBeLessThanOrEqual(ci.p25)
      expect(ci.p25).toBeLessThanOrEqual(ci.p50)
      expect(ci.p50).toBeLessThanOrEqual(ci.p75)
      expect(ci.p75).toBeLessThanOrEqual(ci.p90)
    })

    it('should return success probability between 0 and 100', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario',
          simulation_count: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.success_probability).toBeGreaterThanOrEqual(0)
      expect(data.data.success_probability).toBeLessThanOrEqual(100)
    })

    it('should return shortfall risk as complement of success probability', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario',
          simulation_count: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      const total = data.data.success_probability + data.data.shortfall_risk
      // Should sum to approximately 100 (allowing for rounding)
      expect(total).toBeCloseTo(100, 1)
    })

    it('should save results to database', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario',
          simulation_count: 100
        })
      })

      await POST(request)

      // Verify database insert was called
      expect(mockFrom).toHaveBeenCalledWith('cash_flow_scenarios')
      expect(mockFrom).toHaveBeenCalledWith('monte_carlo_results')
    })

    it('should return 500 on database error', async () => {
      mockResultsSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'DB_ERROR', message: 'Connection failed' }
      })

      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should handle missing scenario_id gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({}) // No scenario_id
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return non-negative wealth values', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario',
          simulation_count: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.average_final_wealth).toBeGreaterThanOrEqual(0)
      expect(data.data.median_final_wealth).toBeGreaterThanOrEqual(0)
      expect(data.data.confidence_intervals.p10).toBeGreaterThanOrEqual(0)
    })

    it('should include simulation duration in results', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario',
          simulation_count: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // Duration is a number (could be 0 if very fast)
      expect(typeof data.data.simulation_duration_ms).toBe('number')
      expect(data.data.simulation_duration_ms).toBeGreaterThanOrEqual(0)
    })

    it('should sanitize results to prevent NaN/Infinity', async () => {
      const request = new NextRequest('http://localhost:3000/api/monte-carlo/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenario_id: 'test-scenario',
          simulation_count: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // All numeric fields should be finite
      expect(Number.isFinite(data.data.success_probability)).toBe(true)
      expect(Number.isFinite(data.data.average_final_wealth)).toBe(true)
      expect(Number.isFinite(data.data.median_final_wealth)).toBe(true)
      expect(Number.isFinite(data.data.shortfall_risk)).toBe(true)
      expect(Number.isFinite(data.data.wealth_volatility)).toBe(true)
      expect(Number.isFinite(data.data.maximum_drawdown)).toBe(true)
    })
  })
})

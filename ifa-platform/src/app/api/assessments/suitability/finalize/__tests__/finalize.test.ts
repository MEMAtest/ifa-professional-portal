// =====================================================
// FILE: src/app/api/assessments/suitability/finalize/__tests__/finalize.test.ts
// Tests for the suitability assessment finalize API route
// =====================================================

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

describe('Suitability Finalize API', () => {
  let POST: typeof import('../route').POST
  let mockFrom: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    mockFrom = vi.fn()

    // Mock Supabase service client
    vi.doMock('@/lib/supabase/serviceClient', () => ({
      getSupabaseServiceClient: vi.fn().mockReturnValue({
        from: mockFrom
      })
    }))

    // Mock auth
    vi.doMock('@/lib/auth/apiAuth', () => ({
      getAuthContext: vi.fn().mockResolvedValue({
        success: true,
        context: {
          userId: 'user-uuid-123',
          firmId: 'firm-uuid-789',
          role: 'advisor'
        }
      })
    }))

    // Mock client access
    vi.doMock('@/lib/auth/requireClientAccess', () => ({
      requireClientAccess: vi.fn().mockResolvedValue({
        ok: true,
        client: {
          id: 'client-uuid-456',
          firm_id: 'firm-uuid-789'
        }
      })
    }))

    // Mock logger
    vi.doMock('@/lib/logging/structured', () => ({
      createRequestLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        logRequestComplete: vi.fn()
      }),
      getRequestMetadata: () => ({
        requestId: 'test-req-123',
        path: '/api/assessments/suitability/finalize'
      })
    }))

    // Mock suitability mappers
    vi.doMock('@/lib/suitability/mappers', () => ({
      mapSuitabilityFormDataToAssessmentUpdate: vi.fn().mockReturnValue({
        form_data: { section1: { field1: 'value1' } },
        metadata: { completionPercentage: 100 }
      })
    }))

    // Mock domain queries
    vi.doMock('@/domain/queries', () => ({
      getCurrentAssessment: vi.fn().mockResolvedValue(null)
    }))

    // Import after mocking
    const route = await import('../route')
    POST = route.POST
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to setup query builder
  function setupQueryBuilder(result: { data: unknown; error: unknown }) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result)
    }
    mockFrom.mockReturnValue(chain)
    return chain
  }

  describe('POST /api/assessments/suitability/finalize', () => {
    it('should return 400 when clientId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessments/suitability/finalize', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('clientId is required')
    })

    it('should return 401 when authentication fails', async () => {
      // Re-mock auth to fail
      const { getAuthContext } = await import('@/lib/auth/apiAuth')
      vi.mocked(getAuthContext).mockResolvedValueOnce({
        success: false,
        error: 'Invalid token'
      })

      const request = new NextRequest('http://localhost:3000/api/assessments/suitability/finalize', {
        method: 'POST',
        body: JSON.stringify({ clientId: 'client-uuid-456' })
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

	    it('should return 403 when client access is denied', async () => {
	      const { requireClientAccess } = await import('@/lib/auth/requireClientAccess')
	      vi.mocked(requireClientAccess).mockResolvedValueOnce({
	        ok: false,
	        response: NextResponse.json({ error: 'Access denied' }, { status: 403 })
	      })

      const request = new NextRequest('http://localhost:3000/api/assessments/suitability/finalize', {
        method: 'POST',
        body: JSON.stringify({ clientId: 'client-uuid-456' })
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('should create new assessment when assessmentId not provided', async () => {
      // First call: get latest version
      // Second call: insert new assessment
      // Third/Fourth: mirror operations
      const chain = setupQueryBuilder({ data: { version_number: 2 }, error: null })
      chain.maybeSingle
        .mockResolvedValueOnce({ data: { version_number: 2 }, error: null })
        .mockResolvedValueOnce({ data: { id: 'new-assessment-id', version_number: 3 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/suitability/finalize', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-uuid-456',
          formData: {
            clientBackground: { occupation: 'Engineer' },
            _metadata: { completionPercentage: 100 }
          },
          completionPercentage: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.assessmentId).toBeDefined()
    })

    it('should update existing assessment when assessmentId provided', async () => {
      const chain = setupQueryBuilder({ data: { id: 'existing-id', version_number: 1 }, error: null })
      chain.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'existing-id', version_number: 1 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/suitability/finalize', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-uuid-456',
          assessmentId: 'existing-assessment-id',
          formData: {
            clientBackground: { occupation: 'Doctor' },
            _metadata: { completionPercentage: 100 }
          },
          completionPercentage: 100
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle default completion percentage when not provided', async () => {
      const chain = setupQueryBuilder({ data: { version_number: 1 }, error: null })
      chain.maybeSingle
        .mockResolvedValueOnce({ data: { version_number: 1 }, error: null })
        .mockResolvedValueOnce({ data: { id: 'new-id', version_number: 2 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/suitability/finalize', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-uuid-456',
          formData: {} // No _metadata.completionPercentage
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.completionPercentage).toBe(0) // Default
    })

    it('should return 500 on database error', async () => {
      setupQueryBuilder({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database connection failed' }
      })

      const request = new NextRequest('http://localhost:3000/api/assessments/suitability/finalize', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-uuid-456',
          formData: { _metadata: { completionPercentage: 100 } }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})

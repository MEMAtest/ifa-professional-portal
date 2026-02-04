// =====================================================
// FILE: src/app/api/assessments/share/__tests__/share-token.test.ts
// Tests for the assessment share token API route
// =====================================================

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

// Test data factory
function createMockShare(overrides: Record<string, unknown> = {}) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return {
    id: 'share-uuid-123',
    token: 'test-token-abc123',
    client_id: 'client-uuid-456',
    firm_id: 'firm-uuid-789',
    assessment_type: 'atr',
    client_name: 'John Doe',
    status: 'pending',
    expires_at: expiresAt.toISOString(),
    access_count: 0,
    max_access_count: 10,
    metadata: {
      advisor_name: 'Jane Smith',
      advisor_email: 'advisor@test.com'
    },
    password_hash: null,
    custom_message: null,
    response_data: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    completed_at: null,
    ...overrides
  }
}

describe('Assessment Share Token API', () => {
  // Store mocks and route handlers
  let GET: typeof import('../[token]/route').GET
  let POST: typeof import('../[token]/route').POST
  let PATCH: typeof import('../[token]/route').PATCH
  let mockFrom: ReturnType<typeof vi.fn>
  let mockSingle: ReturnType<typeof vi.fn>

  beforeAll(async () => {
    // Create mocks
    mockSingle = vi.fn()
    mockFrom = vi.fn()

    // Setup query builder chain
    const createChain = (result: { data: unknown; error: unknown }) => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
      maybeSingle: vi.fn().mockResolvedValue(result),
      onConflict: vi.fn().mockReturnThis()
    })

    // Mock modules before importing the route
    vi.doMock('@/lib/supabase/serviceClient', () => ({
      getSupabaseServiceClient: vi.fn().mockReturnValue({
        from: mockFrom
      })
    }))

    vi.doMock('@/lib/errors', () => ({
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      },
      getErrorMessage: (e: Error) => e?.message || 'Unknown error'
    }))

    vi.doMock('@/lib/audit', () => ({
      createAuditLogger: () => ({
        logShareAccessed: vi.fn().mockResolvedValue(undefined),
        logShareCompleted: vi.fn().mockResolvedValue(undefined)
      }),
      getClientIP: () => '127.0.0.1',
      getUserAgent: () => 'test-agent'
    }))

    vi.doMock('@/lib/notifications/notificationService', () => ({
      notifyAssessmentCompleted: vi.fn().mockResolvedValue(undefined)
    }))

    // Import after mocking
    const route = await import('../[token]/route')
    GET = route.GET
    POST = route.POST
    PATCH = route.PATCH
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
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
      maybeSingle: vi.fn().mockResolvedValue(result),
      onConflict: vi.fn().mockReturnThis()
    }
    mockFrom.mockReturnValue(chain)
    return chain
  }

  describe('GET /api/assessments/share/[token]', () => {
    it('should return 404 for invalid token', async () => {
      setupQueryBuilder({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/invalid-token')
      const params = Promise.resolve({ token: 'invalid-token' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.code).toBe('INVALID_TOKEN')
    })

    it('should return 410 for expired share', async () => {
      const expiredShare = createMockShare({
        expires_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      })

      setupQueryBuilder({ data: expiredShare, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token')
      const params = Promise.resolve({ token: 'test-token' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data.code).toBe('EXPIRED')
    })

    it('should return 410 for revoked share', async () => {
      const revokedShare = createMockShare({ status: 'revoked' })
      setupQueryBuilder({ data: revokedShare, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token')
      const params = Promise.resolve({ token: 'test-token' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data.code).toBe('REVOKED')
    })

    it('should return 410 for already completed share', async () => {
      const completedShare = createMockShare({ status: 'completed' })
      setupQueryBuilder({ data: completedShare, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token')
      const params = Promise.resolve({ token: 'test-token' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data.code).toBe('COMPLETED')
    })

    it('should return 410 when max access count reached', async () => {
      const maxAccessShare = createMockShare({
        access_count: 10,
        max_access_count: 10
      })
      setupQueryBuilder({ data: maxAccessShare, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token')
      const params = Promise.resolve({ token: 'test-token' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data.code).toBe('ACCESS_LIMIT')
    })

    it('should return assessment info for valid token', async () => {
      const validShare = createMockShare()
      setupQueryBuilder({ data: validShare, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token')
      const params = Promise.resolve({ token: 'test-token' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.assessment).toBeDefined()
      expect(data.assessment.type).toBe('atr')
      expect(data.assessment.clientName).toBe('John Doe')
    })
  })

  describe('POST /api/assessments/share/[token]', () => {
    it('should return 404 for invalid token', async () => {
      setupQueryBuilder({ data: null, error: { code: 'PGRST116' } })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/invalid-token', {
        method: 'POST',
        body: JSON.stringify({ responses: { q1: 'answer1' } })
      })
      const params = Promise.resolve({ token: 'invalid-token' })

      const response = await POST(request, { params })

      expect(response.status).toBe(404)
    })

    it('should return 400 for already completed assessment', async () => {
      const completedShare = createMockShare({ status: 'completed' })
      setupQueryBuilder({ data: completedShare, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token', {
        method: 'POST',
        body: JSON.stringify({ responses: { q1: 'answer1' } })
      })
      const params = Promise.resolve({ token: 'test-token' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('already been submitted')
    })

    it('should return 400 when missing responses', async () => {
      const validShare = createMockShare({ status: 'started' })
      setupQueryBuilder({ data: validShare, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token', {
        method: 'POST',
        body: JSON.stringify({}) // No responses
      })
      const params = Promise.resolve({ token: 'test-token' })

      const response = await POST(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing assessment responses')
    })
  })

  describe('PATCH /api/assessments/share/[token]', () => {
    it('should return 400 for invalid status', async () => {
      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid_status' })
      })
      const params = Promise.resolve({ token: 'test-token' })

      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid status')
    })

    it('should successfully update status to started', async () => {
      setupQueryBuilder({ data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/assessments/share/test-token', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'started' })
      })
      const params = Promise.resolve({ token: 'test-token' })

      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})

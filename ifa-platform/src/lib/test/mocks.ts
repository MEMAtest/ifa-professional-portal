// =====================================================
// FILE: src/lib/test/mocks.ts
// Mock utilities for API testing
// =====================================================

import { vi } from 'vitest'

// =====================================================
// Mock Supabase Client
// =====================================================

export interface MockSupabaseQueryBuilder {
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
}

export function createMockSupabase() {
  const queryBuilder: MockSupabaseQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis()
  }

  const mockSupabase = {
    from: vi.fn().mockReturnValue(queryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  }

  return { mockSupabase, queryBuilder }
}

// =====================================================
// Mock NextRequest/NextResponse
// =====================================================

export function createMockRequest(
  method: string = 'GET',
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): Request {
  const url = 'http://localhost:3000/api/test'
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  return new Request(url, init)
}

export function createMockHeaders(custom?: Record<string, string>): Headers {
  const headers = new Headers({
    'content-type': 'application/json',
    'user-agent': 'vitest-mock',
    'x-forwarded-for': '127.0.0.1',
    ...custom
  })
  return headers
}

// =====================================================
// Test Data Factories
// =====================================================

export function createMockAssessmentShare(overrides?: Partial<{
  id: string
  token: string
  client_id: string
  firm_id: string
  assessment_type: string
  client_name: string
  status: string
  expires_at: string
  access_count: number
  max_access_count: number
  metadata: Record<string, unknown>
  password_hash: string | null
  custom_message: string | null
  response_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
  completed_at: string | null
}>) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

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

export function createMockSuitabilityAssessment(overrides?: Partial<{
  id: string
  client_id: string
  firm_id: string
  version_number: number
  status: string
  is_current: boolean
  is_draft: boolean
  is_final: boolean
  completion_percentage: number
  form_data: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  completed_at: string | null
}>) {
  const now = new Date()

  return {
    id: 'suitability-uuid-123',
    client_id: 'client-uuid-456',
    firm_id: 'firm-uuid-789',
    version_number: 1,
    status: 'draft',
    is_current: true,
    is_draft: true,
    is_final: false,
    completion_percentage: 50,
    form_data: {
      clientBackground: { occupation: 'Engineer' },
      investmentKnowledge: { experienceLevel: 'intermediate' }
    },
    metadata: {},
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    completed_at: null,
    ...overrides
  }
}

export function createMockClient(overrides?: Partial<{
  id: string
  firm_id: string
  client_ref: string
  status: string
  personal_details: Record<string, unknown>
  contact_info: Record<string, unknown>
  financial_profile: Record<string, unknown>
  risk_profile: Record<string, unknown>
  created_at: string
  updated_at: string
}>) {
  const now = new Date()

  return {
    id: 'client-uuid-456',
    firm_id: 'firm-uuid-789',
    client_ref: 'CLI-001',
    status: 'active',
    personal_details: {
      firstName: 'John',
      lastName: 'Doe',
      title: 'Mr',
      dateOfBirth: '1980-01-15'
    },
    contact_info: {
      email: 'john.doe@test.com',
      phone: '+44 123 456 7890'
    },
    financial_profile: {
      annualIncome: 75000,
      totalAssets: 500000
    },
    risk_profile: {
      attitudeToRisk: 6,
      capacityForLoss: 'medium'
    },
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides
  }
}

export function createMockAuthContext(overrides?: Partial<{
  userId: string
  firmId: string
  role: string
  email: string
}>) {
  return {
    userId: 'user-uuid-123',
    firmId: 'firm-uuid-789',
    role: 'advisor',
    email: 'advisor@test.com',
    ...overrides
  }
}

// =====================================================
// Response Helpers
// =====================================================

export async function parseJsonResponse(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

import { describe, it, expect, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

describe('POST /api/documents/generate-assessment-report', () => {
  let POST: typeof import('../route').POST

  const clientRow = {
    id: 'client-1',
    firm_id: 'firm-1',
    advisor_id: null,
    client_ref: 'CLI123456',
    personal_details: { title: 'Mrs', first_name: 'Test', last_name: 'User' }
  }

  const assessmentRow = {
    id: 'suitability-1',
    client_id: 'client-1',
    status: 'completed',
    completion_percentage: 94,
    version_number: 2,
    completed_at: '2025-12-10T22:35:00.000Z',
    updated_at: '2025-12-10T22:35:00.000Z'
  }

  beforeAll(async () => {
    const mockFrom = vi.fn()

    const mockStorageUpload = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockStorageSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://example.com/report.pdf' }, error: null })

    const mockSupabase = {
      from: mockFrom,
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockStorageUpload,
          createSignedUrl: mockStorageSignedUrl
        })
      }
    }

    const createBuilder = (table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'clients') return { data: clientRow, error: null }
          if (table === 'suitability_assessments') return { data: assessmentRow, error: null }
          if (table === 'documents') return { data: { id: 'doc-1', file_path: 'reports/client-1/test.pdf' }, error: null }
          return { data: null, error: null }
        })
      }
      return builder
    }

    mockFrom.mockImplementation((table: string) => createBuilder(table))

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => mockSupabase)
    }))

    vi.doMock('@/lib/auth/apiAuth', () => ({
      ROLES: { ADMIN: 'admin' },
      getAuthContext: vi.fn(async () => ({
        success: true,
        context: {
          role: 'admin',
          userId: 'user-1',
          firmId: 'firm-1'
        }
      })),
      canAccessClient: vi.fn(() => true)
    }))

    vi.doMock('@/services/AdvisorContextService', () => ({
      advisorContextService: {
        getReportContext: vi.fn(async () => ({
          firmName: 'Demo Financial Advisers Ltd',
          firmLogoUrl: null,
          firmPrimaryColor: null,
          firmAccentColor: null,
          firmFooterText: null,
          advisorName: 'Financial Advisor'
        }))
      }
    }))

    vi.doMock('@/lib/suitability/mappers', () => ({
      mapSuitabilityAssessmentRowToFormData: vi.fn(() => ({}))
    }))

    vi.doMock('@/lib/suitability/reporting/buildSuitabilityReportModel', () => ({
      buildSuitabilityReportModel: vi.fn(({ mode }: { mode: 'draft' | 'final' }) => ({
        dataQuality: {
          missing:
            mode === 'final'
              ? [{ key: 'objectives.advice_scope', message: 'Advice scope is required' }]
              : []
        }
      }))
    }))

    vi.doMock('@/lib/pdf-templates/suitability-report', () => ({
      generateSuitabilityReportPDF: vi.fn(async () => new ArrayBuffer(8))
    }))

    const route = await import('../route')
    POST = route.POST
  })

  it('downgrades final suitability requests to draft for legacy/incomplete assessments', async () => {
    const request = new NextRequest('http://localhost:3000/api/documents/generate-assessment-report', {
      method: 'POST',
      body: JSON.stringify({
        assessmentType: 'suitability',
        assessmentId: assessmentRow.id,
        clientId: clientRow.id,
        reportType: 'fullReport'
      })
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.modeUsed).toBe('draft')
    expect(json.downgradedToDraft).toBe(true)
    expect(Array.isArray(json.missingForFinal)).toBe(true)
    expect(json.missingForFinal[0]?.key).toBe('objectives.advice_scope')
    expect(typeof json.inlinePdf).toBe('string')
  })
})


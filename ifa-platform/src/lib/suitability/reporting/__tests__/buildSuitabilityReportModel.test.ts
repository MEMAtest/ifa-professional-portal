import { describe, expect, it } from 'vitest'

import type { ReportContext } from '@/services/AdvisorContextService'
import type { SuitabilityFormData } from '@/types/suitability'
import { buildSuitabilityReportModel } from '@/lib/suitability/reporting/buildSuitabilityReportModel'

function makeReportContext(): ReportContext {
  const generatedAt = new Date().toISOString()

  return {
    advisorName: 'Financial Advisor',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Financial Advisers Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: 'Confidential - Prepared for the client',
    complianceRef: 'TEST-REF',
    generatedAt,
    generatedDate: generatedAt.slice(0, 10)
  }
}

function makeFormData(partial: Partial<SuitabilityFormData>): SuitabilityFormData {
  const now = new Date().toISOString()

  return {
    _metadata: {
      version: 'test',
      createdAt: now,
      updatedAt: now,
      completionPercentage: 0,
      aiEnabled: false,
      pulledData: {}
    },
    _aiSuggestions: {},
    _chartData: {},
    ...partial
  } as SuitabilityFormData
}

describe('buildSuitabilityReportModel', () => {
  it('infers scope for legacy assessments without adding a missing-scope blocker in draft mode', () => {
    const client = {
      id: 'client-1',
      client_ref: 'CLI123',
      firm_id: 'firm-1',
      personal_details: { title: 'Mrs', firstName: 'Test', lastName: 'User2', dateOfBirth: '1950-08-12' },
      contact_info: {
        email: 'test@example.com',
        phone: '+447700900123',
        address: { line1: '1 High St', city: 'London', postcode: 'N1 1AA', country: 'UK' }
      }
    } as any

    const formData = makeFormData({
      personal_information: {
        client_name: 'Mrs Test User2',
        date_of_birth: '1950-08-12',
        marital_status: 'Single',
        dependents: 0
      },
      objectives: {
        primary_objective: 'Capital Growth'
      } as any,
      existing_arrangements: {
        has_pension: 'No',
        pension_type: ''
      } as any,
      financial_situation: {
        income_total: 0,
        exp_total_essential: 0
      } as any
    })

    const report = buildSuitabilityReportModel({
      client,
      formData,
      reportContext: makeReportContext(),
      reportDateISO: '2025-12-14',
      mode: 'draft'
    })

    expect(report.scope.selected).toContain('Investment Planning')
    expect(report.scope.includePensions).toBe(false)
    expect(report.conditionality.showPensionDetails).toBe(false)

    expect(report.dataQuality.warnings).toContain('Advice scope was inferred for this legacy assessment.')
    expect(report.dataQuality.missing.some((m) => m.key === 'objectives.advice_scope')).toBe(false)

    expect(report.client.contactDetails.address).toBe('1 High St, London, N1 1AA, UK')

    expect(report.dataQuality.missing.some((m) => m.key === 'financial.income_total')).toBe(false)
    expect(report.dataQuality.missing.some((m) => m.key === 'financial.exp_total_essential')).toBe(false)
  })

  it('flags inferred scope as missing in final mode (FCA-ready gating)', () => {
    const client = {
      id: 'client-2',
      client_ref: 'CLI999',
      firm_id: 'firm-1',
      personal_details: { title: 'Mr', firstName: 'Legacy', lastName: 'Client', dateOfBirth: '1970-01-01' },
      contact_info: { email: 'legacy@example.com' }
    } as any

    const formData = makeFormData({
      personal_information: { client_name: 'Mr Legacy Client' },
      objectives: { primary_objective: 'Capital Growth' } as any
    })

    const report = buildSuitabilityReportModel({
      client,
      formData,
      reportContext: makeReportContext(),
      reportDateISO: '2025-12-14',
      mode: 'final'
    })

    expect(report.dataQuality.missing.some((m) => m.key === 'objectives.advice_scope')).toBe(true)
  })
})


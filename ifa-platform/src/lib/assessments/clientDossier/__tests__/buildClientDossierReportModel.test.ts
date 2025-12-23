import { describe, expect, it } from 'vitest'

import type { ReportContext } from '@/services/AdvisorContextService'
import { buildClientDossierReportModel } from '@/lib/assessments/clientDossier/buildClientDossierReportModel'

function makeReportContext(): ReportContext {
  const generatedAt = new Date('2025-12-14T10:00:00.000Z').toISOString()

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

describe('buildClientDossierReportModel', () => {
  it('renders ATR key results using a normalized ten-point score', () => {
    const client = {
      id: 'client-1',
      client_ref: 'CLI469902',
      personal_details: { title: 'Mrs', firstName: 'Test', lastName: 'User2', dateOfBirth: '1950-08-12' },
      contact_info: { email: 'michaela@memaconsultants.com', address: { line1: '1 High St', city: 'London', postcode: 'N1 1AA', country: 'UK' } }
    } as any

    const atr = {
      id: 'atr-1',
      client_id: 'client-1',
      assessment_date: '2025-09-10',
      risk_level: 4, // 1–5 scale in standalone ATR UI
      risk_category: 'High',
      total_score: 72,
      answers: {}
    } as any

    const cfl = {
      id: 'cfl-1',
      client_id: 'client-1',
      assessment_date: '2025-09-10',
      capacity_level: 5,
      capacity_category: 'Medium',
      total_score: 50,
      confidence_level: 80,
      max_loss_percentage: 20,
      answers: {}
    } as any

    const dossier = buildClientDossierReportModel({
      client,
      atr,
      cfl,
      persona: null,
      suitability: null,
      reportContext: makeReportContext(),
      reportDateISO: '2025-12-14'
    })

    expect(dossier.reconciledRisk?.atrScore).toBe(8)
    expect(dossier.assessments.atr?.keyResult).toContain('High (8/10)')
    expect(dossier.client.address).toContain('1 High St')
    expect(dossier.warnings.length).toBe(0)
  })
})


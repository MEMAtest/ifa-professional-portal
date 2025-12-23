import { describe, expect, it } from 'vitest'

import { buildClientProfileReportModel } from '@/lib/clients/profileReport/buildClientProfileReportModel'

describe('buildClientProfileReportModel', () => {
  it('normalizes ATR 1–5 risk level to a ten-point score for reporting', () => {
    const client = {
      id: 'client-1',
      client_ref: 'CLI469902',
      personal_details: { title: 'Mrs', firstName: 'Test', lastName: 'User2', dateOfBirth: '1950-08-12' },
      contact_info: { email: 'michaela@memaconsultants.com', phone: '+447700900123', address: { line1: '1 High St', city: 'London', postcode: 'N1 1AA', country: 'UK' } }
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
      capacity_level: 5, // already 1–10
      capacity_category: 'Medium',
      total_score: 50,
      confidence_level: 80,
      max_loss_percentage: 20,
      answers: {}
    } as any

    const model = buildClientProfileReportModel({
      client,
      reportContext: { firmName: 'Demo Financial Advisers Ltd', advisorName: 'Financial Advisor' },
      reportDateISO: '2025-12-14',
      atr,
      cfl
    })

    expect(model.risk.atrScore).toBe(8)
    expect(model.assessments.atr?.score).toBe(8)
    expect(model.assessments.atr?.category).toBe('High')
    expect(model.risk.cflScore).toBe(5)
    expect(model.risk.reconciled?.finalRiskScore).toBe(6)
  })

  it('does not double ATR scores already on a ten-point scale', () => {
    const client = { id: 'client-2', client_ref: 'CLI999', personal_details: {}, contact_info: {} } as any

    const atr = {
      id: 'atr-2',
      client_id: 'client-2',
      risk_level: 8,
      risk_category: 'High',
      total_score: 85,
      answers: {}
    } as any

    const model = buildClientProfileReportModel({
      client,
      reportContext: { firmName: 'Demo Financial Advisers Ltd', advisorName: 'Financial Advisor' },
      reportDateISO: '2025-12-14',
      atr
    })

    expect(model.risk.atrScore).toBe(8)
    expect(model.assessments.atr?.score).toBe(8)
  })
})


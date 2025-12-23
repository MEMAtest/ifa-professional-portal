import assert from 'node:assert/strict'
import { test } from 'node:test'

import { suitabilitySections } from '@/config/suitability/sections'
import { calculateReconciledRisk } from '@/lib/assessments/riskReconciliation'
import { buildClientDossierReportModel } from '@/lib/assessments/clientDossier/buildClientDossierReportModel'
import { buildSuitabilityReportModel } from '@/lib/suitability/reporting/buildSuitabilityReportModel'
import { generateSuitabilityReportPDF } from '@/lib/pdf-templates/suitability-report'
import { generateClientDossierReportPDF } from '@/lib/pdf-templates/client-dossier-report'
import { buildClientProfileReportModel } from '@/lib/clients/profileReport/buildClientProfileReportModel'
import { generateClientProfileReportPDF } from '@/lib/pdf-templates/client-profile-report'
import { AutoGenerationService } from '@/services/suitability/AutoGenerationService'
import { getMissingRequiredFieldErrorsForSection } from '@/lib/suitability/requiredFields'
import { validationEngine } from '@/lib/suitability/validationEngine'
import { fillEmptyFieldsFromClient } from '@/hooks/suitability/useSuitabilityForm.helpers'

test('buildSuitabilityReportModel: uses ATR when CFL missing (no fake defaults)', () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122'
    }
  }

  const formData = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0
    },
    objectives: {
      advice_scope: ['Investment Planning'],
      primary_objective: 'Capital Growth',
      investment_timeline: '5-10'
    },
    financial_situation: {
      annual_income: '78000',
      monthly_expenses: '900'
      // investment_amount intentionally omitted
    },
    risk_assessment: {},
    existing_arrangements: {
      has_pension: 'No'
    }
  }

  const report = buildSuitabilityReportModel({
    client: client as any,
    formData: formData as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft',
    pulledDataOverride: {
      atrScore: 8,
      atrCategory: 'High'
    } as any
  })

  assert.equal(report.riskAssessment.attitudeToRisk, 8)
  assert.equal(report.riskAssessment.capacityForLoss, undefined)
  assert.notEqual(report.riskAssessment.riskCategory, 'Not assessed')

  assert.equal(report.facts.hasPensions, false)

  // No placeholder recommendations/products or investment amount should be injected.
  assert.equal(report.recommendation.products.length, 0)
  assert.equal(report.client.financialDetails.investmentAmount, undefined)
})

test('buildSuitabilityReportModel: infers advice scope for legacy assessments', () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122'
    }
  }

  const formData = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0
    },
    objectives: {
      primary_objective: 'Capital Growth',
      investment_timeline: '5-10'
    },
    existing_arrangements: {
      has_pension: 'No'
    }
  }

  const report = buildSuitabilityReportModel({
    client: client as any,
    formData: formData as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft'
  })

  assert.ok(report.scope.selected.length > 0)
  assert.equal(report.scope.includeInvestments, true)
  assert.equal(report.provenance['scope.selected']?.source, 'system')
  assert.equal(
    report.dataQuality.missing.some((m) => m.key === 'objectives.advice_scope'),
    false
  )
})

test('buildSuitabilityReportModel: blocks final report when scope inferred', () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorEmail: 'advisor@example.com',
    advisorPhone: '123',
    firmName: 'Demo Financial Advisers Ltd',
    firmAddress: '1 Demo Street',
    firmFcaNumber: '123456',
    firmWebsite: 'https://example.com'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    }
  }

  const formData = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0
    },
    objectives: {
      primary_objective: 'Capital Growth',
      investment_timeline: '5-10'
    },
    existing_arrangements: {
      has_pension: 'No'
    }
  }

  const report = buildSuitabilityReportModel({
    client: client as any,
    formData: formData as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'final'
  })

  assert.ok(report.scope.selected.length > 0)
  assert.equal(report.dataQuality.missing.some((m) => m.key === 'objectives.advice_scope'), true)
  assert.equal(report.provenance['scope.selected']?.status, 'not_provided')
})

test('generateSuitabilityReportPDF: returns a non-empty PDF (no runtime crash)', async () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122'
    }
  }

  const formData = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0
    },
    objectives: {
      advice_scope: ['Investment Planning'],
      primary_objective: 'Capital Growth',
      investment_timeline: '5-10'
    },
    financial_situation: {
      annual_income: '78000',
      monthly_expenses: '900'
    },
    risk_assessment: {},
    existing_arrangements: {
      has_pension: 'No'
    }
  }

  const report = buildSuitabilityReportModel({
    client: client as any,
    formData: formData as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft',
    pulledDataOverride: {
      atrScore: 8,
      atrCategory: 'High'
    } as any
  })

  const pdf = await generateSuitabilityReportPDF(
    report as any,
    { firmName: reportContext.firmName } as any,
    {},
    'executiveSummary'
  )

  assert.ok(Buffer.isBuffer(pdf))
  assert.ok(pdf.length > 1000)
  assert.equal(pdf.toString('utf8', 0, 4), '%PDF')
})

test('buildSuitabilityReportModel: includes investor persona when provided', () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122'
    }
  }

  const formData = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0
    },
    objectives: {
      advice_scope: ['Investment Planning'],
      primary_objective: 'Capital Growth',
      investment_timeline: '5-10'
    },
    existing_arrangements: {
      has_pension: 'No'
    }
  }

  const report = buildSuitabilityReportModel({
    client: client as any,
    formData: formData as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft',
    persona: {
      client_id: 'client-1',
      persona_type: 'The Security Seeker',
      persona_level: '1',
      confidence: 60,
      motivations: ['Capital protection'],
      fears: ['Market volatility'],
      assessment_date: '2025-01-01',
      created_at: '2025-01-01'
    } as any
  })

  assert.equal(report.investorPersona?.personaType, 'The Security Seeker')
  assert.equal(report.investorPersona?.personaLevel, '1')
  assert.equal(report.investorPersona?.confidence, 60)
  assert.deepEqual(report.investorPersona?.motivations, ['Capital protection'])
  assert.deepEqual(report.investorPersona?.fears, ['Market volatility'])
})

test('buildSuitabilityReportModel: does not show DB transfer question when pensions not declared', () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122'
    }
  }

  const formData = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0
    },
    objectives: {
      advice_scope: ['Pension Planning']
    },
    existing_arrangements: {
      has_pension: 'No',
      db_transfer_considered: 'Yes'
    }
  }

  const report = buildSuitabilityReportModel({
    client: client as any,
    formData: formData as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft'
  })

  assert.equal(report.facts.hasPensions, false)
  assert.equal(report.facts.hasDbPension, false)
  assert.equal(report.conditionality.showDbTransferQuestion, false)
  assert.equal(report.conditionality.showDbTransferDetails, false)
})

test('buildSuitabilityReportModel: shows DB transfer question only for DB pension scheme', () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122'
    }
  }

  const formDataDB = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0,
      pension_scheme: 'Defined Benefit'
    },
    objectives: {
      advice_scope: ['Pension Planning']
    },
    existing_arrangements: {
      has_pension: 'Yes',
      db_transfer_considered: 'No'
    }
  }

  const reportDB = buildSuitabilityReportModel({
    client: client as any,
    formData: formDataDB as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft'
  })

  assert.equal(reportDB.facts.hasPensions, true)
  assert.equal(reportDB.facts.hasDbPension, true)
  assert.equal(reportDB.conditionality.showDbTransferQuestion, true)
  assert.equal(reportDB.conditionality.showDbTransferDetails, false)

  const formDataDC = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0,
      pension_scheme: 'Defined Contribution'
    },
    objectives: {
      advice_scope: ['Pension Planning']
    },
    existing_arrangements: {
      has_pension: 'Yes',
      db_transfer_considered: 'No'
    }
  }

  const reportDC = buildSuitabilityReportModel({
    client: client as any,
    formData: formDataDC as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft'
  })

  assert.equal(reportDC.facts.hasPensions, true)
  assert.equal(reportDC.facts.hasDbPension, false)
  assert.equal(reportDC.conditionality.showDbTransferQuestion, false)
  assert.equal(reportDC.conditionality.showDbTransferDetails, false)
})

test('buildSuitabilityReportModel: partner conditionality uses logic engine', () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122'
    }
  }

  const formData = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Married'
    },
    objectives: {
      advice_scope: ['Investment Planning']
    },
    existing_arrangements: {
      has_pension: 'No'
    }
  }

  const report = buildSuitabilityReportModel({
    client: client as any,
    formData: formData as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft'
  })

  assert.equal(report.conditionality.showPartnerDetails, true)
})

test('buildSuitabilityReportModel: keeps explicit 0 retirement income totals', () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122'
    }
  }

  const formData = {
    personal_information: {
      client_reference: 'CLI123',
      marital_status: 'Single',
      dependents: 0
    },
    objectives: {
      advice_scope: ['Investment Planning']
    },
    financial_situation: {
      income_state_pension: '0'
    },
    existing_arrangements: {
      has_pension: 'No'
    }
  }

  const report = buildSuitabilityReportModel({
    client: client as any,
    formData: formData as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01',
    mode: 'draft'
  })

  assert.equal(report.financialAnalysis.income.totalAtRetirement, 0)
})

test('AutoGeneration: avoids calculating surplus without income AND expenses', () => {
  const financialSection = suitabilitySections.find((s) => s.id === 'financial_situation')
  assert.ok(financialSection, 'financial_situation section exists')

  const monthlySurplusField = financialSection!.fields.find((f) => f.id === 'monthly_surplus') as any
  assert.ok(monthlySurplusField?.calculate, 'monthly_surplus is a calculated field')

  const baseFormData = { financial_situation: {} } as any

  const missingIncome = AutoGenerationService.calculateSingleField(
    monthlySurplusField,
    { ...baseFormData, financial_situation: { monthly_expenses: '900' } },
    'financial_situation'
  )
  assert.equal(missingIncome, undefined)

  const missingExpenses = AutoGenerationService.calculateSingleField(
    monthlySurplusField,
    { ...baseFormData, financial_situation: { annual_income: '78000' } },
    'financial_situation'
  )
  assert.equal(missingExpenses, undefined)

  const computed = AutoGenerationService.calculateSingleField(
    monthlySurplusField,
    { ...baseFormData, financial_situation: { annual_income: '78000', monthly_expenses: '900' } },
    'financial_situation'
  )
  assert.equal(computed, 5600)
})

test('Required fields: includes conditional required fields (marriage cascade)', () => {
  const formData = {
    personal_information: {
      marital_status: 'Married',
      // partner fields omitted on purpose
    }
  } as any

  const pulledData = {} as any

  const required = getMissingRequiredFieldErrorsForSection('personal_information', formData, pulledData)
  const requiredKeys = new Set(required.map((e) => `${e.sectionId}.${e.fieldId}`))

  assert.ok(requiredKeys.has('personal_information.partner_name'))
  assert.ok(requiredKeys.has('personal_information.partner_date_of_birth'))
  assert.ok(requiredKeys.has('personal_information.partner_employment_status'))
  assert.ok(requiredKeys.has('personal_information.joint_assessment'))

  const sectionValidation = validationEngine.validateSection('personal_information', formData, pulledData)
  const validationKeys = new Set(sectionValidation.errors.map((e) => `${e.sectionId}.${e.fieldId}`))
  assert.ok(validationKeys.has('personal_information.partner_name'))
})

test('Emergency fund smart default: does not inject 0 when expenses missing', () => {
  const financialSection = suitabilitySections.find((s) => s.id === 'financial_situation')
  assert.ok(financialSection, 'financial_situation section exists')

  const emergencyFundField = financialSection!.fields.find((f) => f.id === 'emergency_fund') as any
  assert.ok(emergencyFundField?.smartDefault, 'emergency_fund has a smart default')

  const empty = emergencyFundField!.smartDefault!({ financial_situation: {} } as any, {})
  assert.equal(empty, undefined)

  const computed = emergencyFundField!.smartDefault!(
    { financial_situation: { monthly_expenses: '900' } } as any,
    {}
  )
  assert.equal(computed, 5400)
})

test('calculateReconciledRisk: flags critical ATR/CFL mismatch', () => {
  const result = calculateReconciledRisk({ atrScore: 8, cflScore: 3 })

  assert.equal(result.finalRiskScore, 5)
  assert.equal(result.alignment, 'significant_mismatch')
  assert.ok(
    result.flags.some((f) => f.type === 'capacity_below_tolerance' && f.severity === 'critical')
  )
  assert.ok(result.flags.some((f) => f.type === 'extreme_mismatch' && f.severity === 'critical'))
})

test('generateClientDossierReportPDF: returns a non-empty PDF (no runtime crash)', async () => {
  const reportContext = {
    advisorName: 'Test Adviser',
    advisorTitle: '',
    advisorQualifications: '',
    advisorSignatureUrl: '',
    firmName: 'Demo Firm Ltd',
    firmAddress: '',
    firmPhone: '',
    firmEmail: '',
    firmFcaNumber: '',
    firmWebsite: '',
    firmLogoUrl: '',
    firmPrimaryColor: '#1e3a5f',
    firmAccentColor: '#2563eb',
    firmFooterText: '',
    complianceRef: 'TEST',
    generatedAt: new Date().toISOString(),
    generatedDate: '2025-01-01'
  }

  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122',
      address: {
        country: 'United Kingdom',
        postcode: 'SW1A 1AA',
        city: 'London',
        line1: '10 Downing Street'
      }
    }
  }

  const dossier = buildClientDossierReportModel({
    client: client as any,
    reportContext: reportContext as any,
    reportDateISO: '2025-01-01'
  })

  // Address objects should be rendered as a readable string, never "[object Object]".
  assert.ok(typeof dossier.client.address === 'string')
  assert.ok(dossier.client.address.includes('United Kingdom'))

  const pdf = await generateClientDossierReportPDF(
    dossier as any,
    { firmName: reportContext.firmName } as any
  )

  assert.ok(Buffer.isBuffer(pdf))
  assert.ok(pdf.length > 1000)
  assert.equal(pdf.toString('utf8', 0, 4), '%PDF')
})

test('generateClientProfileReportPDF: returns a non-empty PDF (no runtime crash)', async () => {
  const client = {
    id: 'client-1',
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mrs',
      first_name: 'Lopas',
      last_name: 'Turner',
      date_of_birth: '1997-01-31'
    },
    contact_info: {
      email: 'lotus@des.com',
      phone: '+44 7800 231122',
      address: {
        line1: '1 High Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom'
      }
    },
    financial_profile: {
      annualIncome: 78000
    }
  }

  const model = buildClientProfileReportModel({
    client: client as any,
    reportContext: { firmName: 'Demo Firm Ltd', advisorName: 'Test Adviser' },
    reportDateISO: '2025-01-01T00:00:00.000Z'
  })

  const pdf = await generateClientProfileReportPDF(model, { firmName: 'Demo Firm Ltd' })
  assert.ok(Buffer.isBuffer(pdf))
  assert.ok(pdf.length > 1000)
  assert.equal(pdf.toString('utf8', 0, 4), '%PDF')
})

test('fillEmptyFieldsFromClient: supports snake_case client shapes', () => {
  const formData: any = {
    personal_information: {},
    contact_details: {}
  }

  const client: any = {
    client_ref: 'CLI123',
    personal_details: {
      title: 'Mr',
      first_name: 'John',
      last_name: 'Smith',
      date_of_birth: '1980-01-02',
      employment_status: 'Employed',
      marital_status: 'single'
    },
    contact_info: {
      email: 'john@example.com',
      phone: '+44 7000 000000',
      address: { line1: '1 High Street', postcode: 'SW1A 1AA', country: 'United Kingdom' },
      preferred_contact: 'phone'
    }
  }

  const filled = fillEmptyFieldsFromClient(formData, client) as any
  assert.equal(filled.personal_information.client_name, 'Mr John Smith')
  assert.equal(filled.personal_information.client_reference, 'CLI123')
  assert.equal(filled.personal_information.date_of_birth, '1980-01-02')
  assert.equal(filled.contact_details.email, 'john@example.com')
  assert.equal(filled.contact_details.phone, '+44 7000 000000')
  assert.ok(String(filled.contact_details.address).includes('1 High Street'))
  assert.equal(filled.contact_details.preferred_contact, 'Phone')
})

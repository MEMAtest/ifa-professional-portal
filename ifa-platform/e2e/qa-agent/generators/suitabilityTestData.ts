/**
 * OSO QA Agent - Suitability Test Data Generator
 * Valid test data for suitability form happy path testing
 *
 * IMPORTANT: Field IDs must match actual form field IDs from:
 * - src/config/suitability/sections/personalInformation.ts
 * - src/config/suitability/sections/contactDetails.ts
 * - src/config/suitability/sections/financialSituation.ts
 * - src/config/suitability/sections/riskAssessment.ts
 * - src/config/suitability/sections/objectives.ts
 * - src/config/suitability/sections/recommendation.ts
 */

// ============================================
// VALID CLIENT PROFILES
// ============================================

export interface TestClientProfile {
  name: string
  description: string
  personalInformation: Record<string, string | number | boolean>
  contactDetails: Record<string, string>
  financialSituation: Record<string, string | number>
  riskAssessment: Record<string, string>
  objectives: Record<string, string | number | string[]>
  recommendation: Record<string, string | number>
}

export const ValidClients: TestClientProfile[] = [
  {
    name: 'Young Professional',
    description: '28-year-old professional, high income, high risk tolerance',
    personalInformation: {
      client_name: 'James Smith',
      date_of_birth: '1996-03-15',
      ni_number: 'AB123456C',
      marital_status: 'Single',
      employment_status: 'Employed',
      occupation: 'Software Engineer',
      employer_name: 'Tech Corp Ltd',
      years_with_employer: 3,
      target_retirement_age: 65,
      health_status: 'Excellent',
      smoker: 'No',
      has_dependents: 'No',
    },
    contactDetails: {
      address: '123 High Street, London',
      postcode: 'SW1A 1AA',
      phone: '07123456789',
      email: 'james.smith@example.com',
      preferred_contact: 'Email',
      best_contact_time: 'Evening (5pm-8pm)',
    },
    financialSituation: {
      annual_income: 72000,
      monthly_expenses: 3000,
      savings: 50000,
      has_property: 'No',
      has_mortgage: 'No',
      other_debts: 0,
      emergency_fund: 18000,
      investment_amount: 25000,
      income_employment: 72000,
      exp_housing: 18000,
      exp_utilities: 2400,
      exp_transport: 2400,
      exp_food: 4800,
      exp_leisure: 3000,
      exp_holidays: 2000,
      exp_other: 3400,
    },
    riskAssessment: {
      attitude_to_risk: 'High - I can accept significant fluctuations',
      max_acceptable_loss: '20-30%',
      reaction_to_loss: 'Buy more at lower prices',
      capacity_for_loss: 'Minor - would not materially affect me',
      investment_volatility: 'Comfortable',
    },
    objectives: {
      primary_objective: 'Capital Growth',
      advice_scope: ['Investment Planning', 'Pension Planning'],
      investment_timeline: 'More than 15',
      target_return: 8,
      requires_investment_income: 'No',
      ethical_investing: 'Yes',
    },
    recommendation: {
      recommended_portfolio: 'Adventurous Growth',
      allocation_equities: 80,
      allocation_bonds: 10,
      allocation_cash: 5,
      allocation_alternatives: 5,
      product_1_name: 'Stocks & Shares ISA',
      product_1_provider: 'Vanguard',
      product_1_amount: 20000,
      product_1_reason: 'Tax-efficient wrapper for long-term growth',
    },
  },
  {
    name: 'Pre-Retiree',
    description: '58-year-old, approaching retirement, moderate risk',
    personalInformation: {
      client_name: 'Susan Williams',
      date_of_birth: '1966-08-22',
      ni_number: 'CD234567D',
      marital_status: 'Married',
      employment_status: 'Employed',
      occupation: 'Finance Director',
      employer_name: 'Global Finance PLC',
      years_with_employer: 12,
      target_retirement_age: 60,
      health_status: 'Good',
      smoker: 'No',
      has_dependents: 'No',
    },
    contactDetails: {
      address: '45 Oak Avenue, Manchester',
      postcode: 'M1 1AA',
      phone: '07987654321',
      email: 'susan.williams@example.com',
      preferred_contact: 'Phone',
      best_contact_time: 'Afternoon (12pm-5pm)',
    },
    financialSituation: {
      annual_income: 144000,
      monthly_expenses: 6000,
      savings: 100000,
      has_property: 'Yes',
      property_value: 650000,
      has_mortgage: 'No',
      other_debts: 0,
      emergency_fund: 50000,
      investment_amount: 450000,
      income_employment: 120000,
      income_rental: 24000,
      income_state_pension: 11500,
      income_defined_benefit: 25000,
      exp_housing: 0,
      exp_utilities: 4800,
      exp_transport: 7200,
      exp_food: 9600,
      exp_healthcare: 2400,
      exp_leisure: 12000,
      exp_holidays: 6000,
      exp_other: 30000,
    },
    riskAssessment: {
      attitude_to_risk: 'Medium - I can accept moderate fluctuations',
      max_acceptable_loss: '10-20%',
      reaction_to_loss: 'Hold and wait for recovery',
      capacity_for_loss: 'Moderate - would delay some goals',
      investment_volatility: 'Neutral',
    },
    objectives: {
      primary_objective: 'Retirement Planning',
      advice_scope: ['Pension Planning', 'Investment Planning', 'Tax Planning'],
      investment_timeline: '5-10',
      target_return: 5,
      requires_investment_income: 'Yes',
      income_frequency: 'Quarterly',
      ethical_investing: 'Unsure',
    },
    recommendation: {
      recommended_portfolio: 'Balanced Income',
      allocation_equities: 50,
      allocation_bonds: 35,
      allocation_cash: 10,
      allocation_alternatives: 5,
      product_1_name: 'SIPP',
      product_1_provider: 'AJ Bell',
      product_1_amount: 50000,
      product_1_reason: 'Consolidate existing pensions for better management',
    },
  },
  {
    name: 'First-Time Investor',
    description: '35-year-old, new to investing, cautious',
    personalInformation: {
      client_name: 'Emily Brown',
      date_of_birth: '1989-11-30',
      ni_number: 'EF345678E',
      marital_status: 'Single',
      employment_status: 'Employed',
      occupation: 'Marketing Manager',
      employer_name: 'Brand Agency Ltd',
      years_with_employer: 4,
      target_retirement_age: 67,
      health_status: 'Good',
      smoker: 'No',
      has_dependents: 'Yes',
      dependents: 1,
    },
    contactDetails: {
      address: '78 Maple Lane, Birmingham',
      postcode: 'B1 1AA',
      phone: '07555123456',
      email: 'emily.brown@example.com',
      preferred_contact: 'Email',
      best_contact_time: 'Evening (5pm-8pm)',
    },
    financialSituation: {
      annual_income: 54000,
      monthly_expenses: 3500,
      savings: 30000,
      has_property: 'Yes',
      property_value: 280000,
      has_mortgage: 'Yes',
      mortgage_outstanding: 220000,
      other_debts: 5000,
      emergency_fund: 10000,
      investment_amount: 15000,
      income_employment: 54000,
      exp_housing: 14400,
      exp_utilities: 2400,
      exp_transport: 3600,
      exp_food: 6000,
      exp_childcare: 9600,
      exp_leisure: 2400,
      exp_holidays: 1800,
      exp_other: 1800,
    },
    riskAssessment: {
      attitude_to_risk: 'Low - I can accept minimal fluctuations',
      max_acceptable_loss: '5-10%',
      reaction_to_loss: 'Sell some investments',
      capacity_for_loss: 'Significant - would affect lifestyle',
      investment_volatility: 'Uncomfortable',
    },
    objectives: {
      primary_objective: 'Capital Growth',
      advice_scope: ['Investment Planning'],
      investment_timeline: '10-15',
      target_return: 5,
      requires_investment_income: 'No',
      ethical_investing: 'Yes',
    },
    recommendation: {
      recommended_portfolio: 'Cautious Growth',
      allocation_equities: 40,
      allocation_bonds: 40,
      allocation_cash: 15,
      allocation_alternatives: 5,
      product_1_name: 'Junior ISA',
      product_1_provider: 'Fidelity',
      product_1_amount: 9000,
      product_1_reason: 'Tax-efficient savings for child education',
    },
  },
  {
    name: 'High Net Worth',
    description: '50-year-old business owner, complex needs',
    personalInformation: {
      client_name: 'Richard Thompson',
      date_of_birth: '1974-05-10',
      ni_number: 'GH456789F',
      marital_status: 'Married',
      employment_status: 'Self-Employed',
      occupation: 'Company Director',
      target_retirement_age: 60,
      health_status: 'Good',
      smoker: 'Former',
      has_dependents: 'Yes',
      dependents: 3,
    },
    contactDetails: {
      address: 'The Manor House, Surrey',
      postcode: 'GU1 1AA',
      phone: '07700900123',
      email: 'richard.thompson@company.com',
      preferred_contact: 'Phone',
      best_contact_time: 'Morning (9am-12pm)',
    },
    financialSituation: {
      annual_income: 360000,
      monthly_expenses: 15000,
      savings: 500000,
      has_property: 'Yes',
      property_value: 2500000,
      has_mortgage: 'Yes',
      mortgage_outstanding: 500000,
      other_debts: 100000,
      emergency_fund: 200000,
      investment_amount: 2000000,
      income_employment: 180000,
      income_dividends: 120000,
      income_rental: 60000,
      exp_housing: 36000,
      exp_utilities: 12000,
      exp_transport: 24000,
      exp_food: 18000,
      exp_childcare: 24000,
      exp_healthcare: 6000,
      exp_leisure: 24000,
      exp_holidays: 18000,
      exp_other: 18000,
    },
    riskAssessment: {
      attitude_to_risk: 'High - I can accept significant fluctuations',
      max_acceptable_loss: '20-30%',
      reaction_to_loss: 'Hold and wait for recovery',
      capacity_for_loss: 'Minor - would not materially affect me',
      investment_volatility: 'Very Comfortable',
    },
    objectives: {
      primary_objective: 'Estate Planning',
      advice_scope: ['Investment Planning', 'Pension Planning', 'Tax Planning', 'Estate Planning'],
      investment_timeline: '10-15',
      target_return: 7,
      requires_investment_income: 'No',
      ethical_investing: 'No',
    },
    recommendation: {
      recommended_portfolio: 'Growth',
      allocation_equities: 60,
      allocation_bonds: 20,
      allocation_cash: 5,
      allocation_alternatives: 15,
      product_1_name: 'Investment Bond',
      product_1_provider: 'Prudential',
      product_1_amount: 500000,
      product_1_reason: 'Tax-efficient wrapper for large investment',
    },
  },
]

// ============================================
// CONDITIONAL LOGIC TEST CASES
// Based on actual conditional rules in src/config/suitability/sections/
// ============================================

export interface ConditionalTestCase {
  name: string
  section: string
  triggerField: string
  triggerValue: string | boolean
  targetFields: {
    fieldId: string
    shouldBeVisible: boolean
  }[]
}

export const ConditionalLogicTests: ConditionalTestCase[] = [
  // Personal Information conditionals
  {
    name: 'Dependent count when has_dependents is Yes',
    section: 'personal_information',
    triggerField: 'has_dependents',
    triggerValue: 'Yes',
    targetFields: [
      { fieldId: 'dependents', shouldBeVisible: true },
    ],
  },
  {
    name: 'Dependent count when has_dependents is No',
    section: 'personal_information',
    triggerField: 'has_dependents',
    triggerValue: 'No',
    targetFields: [
      { fieldId: 'dependents', shouldBeVisible: false },
    ],
  },

  // Financial Situation conditionals
  {
    name: 'Property value when has_property is Yes',
    section: 'financial_situation',
    triggerField: 'has_property',
    triggerValue: 'Yes',
    targetFields: [
      { fieldId: 'property_value', shouldBeVisible: true },
    ],
  },
  {
    name: 'Property value when has_property is No',
    section: 'financial_situation',
    triggerField: 'has_property',
    triggerValue: 'No',
    targetFields: [
      { fieldId: 'property_value', shouldBeVisible: false },
    ],
  },
  {
    name: 'Mortgage amount when has_mortgage is Yes',
    section: 'financial_situation',
    triggerField: 'has_mortgage',
    triggerValue: 'Yes',
    targetFields: [
      { fieldId: 'mortgage_outstanding', shouldBeVisible: true },
    ],
  },
  {
    name: 'Mortgage amount when has_mortgage is No',
    section: 'financial_situation',
    triggerField: 'has_mortgage',
    triggerValue: 'No',
    targetFields: [
      { fieldId: 'mortgage_outstanding', shouldBeVisible: false },
    ],
  },
  {
    name: 'Employment income when Employed',
    section: 'financial_situation',
    triggerField: 'employment_status', // Note: this is in personal_information section
    triggerValue: 'Employed',
    targetFields: [
      { fieldId: 'income_employment', shouldBeVisible: true },
    ],
  },
  {
    name: 'Childcare expense when has_dependents is Yes',
    section: 'financial_situation',
    triggerField: 'has_dependents', // Note: this is in personal_information section
    triggerValue: 'Yes',
    targetFields: [
      { fieldId: 'exp_childcare', shouldBeVisible: true },
    ],
  },

  // Objectives conditionals
  {
    name: 'Income frequency when requires_investment_income is Yes',
    section: 'objectives',
    triggerField: 'requires_investment_income',
    triggerValue: 'Yes',
    targetFields: [
      { fieldId: 'income_frequency', shouldBeVisible: true },
    ],
  },
  {
    name: 'Income frequency when requires_investment_income is No',
    section: 'objectives',
    triggerField: 'requires_investment_income',
    triggerValue: 'No',
    targetFields: [
      { fieldId: 'income_frequency', shouldBeVisible: false },
    ],
  },
]

// ============================================
// VALIDATION TEST CASES
// ============================================

export interface ValidationTestCase {
  name: string
  section: string
  fieldId: string
  value: string | number
  shouldFail: boolean
  expectedError?: string
}

export const ValidationTests: ValidationTestCase[] = [
  // Required field validation - Personal Information
  { name: 'Empty client name', section: 'personal_information', fieldId: 'client_name', value: '', shouldFail: true, expectedError: 'required' },
  { name: 'Valid client name', section: 'personal_information', fieldId: 'client_name', value: 'John Smith', shouldFail: false },

  // Contact Details validation
  { name: 'Empty email', section: 'contact_details', fieldId: 'email', value: '', shouldFail: true, expectedError: 'required' },
  { name: 'Invalid email format', section: 'contact_details', fieldId: 'email', value: 'notanemail', shouldFail: true, expectedError: 'email' },
  { name: 'Valid email', section: 'contact_details', fieldId: 'email', value: 'test@example.com', shouldFail: false },

  // NI Number validation
  { name: 'Invalid NI number', section: 'personal_information', fieldId: 'ni_number', value: 'invalid', shouldFail: true, expectedError: 'national insurance' },
  { name: 'Valid NI number', section: 'personal_information', fieldId: 'ni_number', value: 'AB123456C', shouldFail: false },

  // Financial validation
  { name: 'Negative annual income', section: 'financial_situation', fieldId: 'annual_income', value: -1000, shouldFail: true, expectedError: 'positive' },
  { name: 'Zero annual income', section: 'financial_situation', fieldId: 'annual_income', value: 0, shouldFail: false },
  { name: 'Valid annual income', section: 'financial_situation', fieldId: 'annual_income', value: 50000, shouldFail: false },

  // Allocation validation
  { name: 'Equities over 100%', section: 'recommendation', fieldId: 'allocation_equities', value: 150, shouldFail: true, expectedError: '100' },
  { name: 'Negative allocation', section: 'recommendation', fieldId: 'allocation_bonds', value: -10, shouldFail: true, expectedError: 'positive' },
  { name: 'Valid allocation', section: 'recommendation', fieldId: 'allocation_equities', value: 60, shouldFail: false },

  // Date validation
  { name: 'Future DOB', section: 'personal_information', fieldId: 'date_of_birth', value: '2030-01-01', shouldFail: true, expectedError: 'future' },
  { name: 'Very old DOB', section: 'personal_information', fieldId: 'date_of_birth', value: '1900-01-01', shouldFail: true, expectedError: 'valid' },
  { name: 'Valid DOB', section: 'personal_information', fieldId: 'date_of_birth', value: '1980-05-15', shouldFail: false },
]

// ============================================
// API STRESS TEST SCENARIOS
// ============================================

export const StressTestScenarios = {
  rapidSave: {
    name: 'Rapid Save Test',
    description: 'Multiple saves in quick succession',
    saveCount: 10,
    intervalMs: 100,
  },
  concurrentSave: {
    name: 'Concurrent Save Test',
    description: 'Parallel save requests',
    parallelRequests: 5,
  },
  largePayload: {
    name: 'Large Payload Test',
    description: 'Save with large data payload',
    dataSize: 100000, // characters
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getClientByType(type: 'young' | 'preretiree' | 'firsttime' | 'hnw'): TestClientProfile {
  const mapping = {
    young: 0,
    preretiree: 1,
    firsttime: 2,
    hnw: 3,
  }
  return ValidClients[mapping[type]]
}

export function flattenClientData(client: TestClientProfile): Record<string, string | number | boolean | string[]> {
  return {
    ...client.personalInformation,
    ...client.contactDetails,
    ...client.financialSituation,
    ...client.riskAssessment,
    ...client.objectives,
    ...client.recommendation,
  }
}

export function getDataBySection(client: TestClientProfile, sectionId: string): Record<string, any> {
  const sectionMap: Record<string, Record<string, any>> = {
    personal_information: client.personalInformation,
    contact_details: client.contactDetails,
    financial_situation: client.financialSituation,
    risk_assessment: client.riskAssessment,
    objectives: client.objectives,
    recommendation: client.recommendation,
  }
  return sectionMap[sectionId] || {}
}

export function generateRandomValidClient(): TestClientProfile {
  return ValidClients[Math.floor(Math.random() * ValidClients.length)]
}

// Get key fields for quick testing (most important fields per section)
export const KeyTestFields = {
  personal_information: ['client_name', 'date_of_birth', 'marital_status', 'employment_status'],
  contact_details: ['email', 'phone', 'address'],
  financial_situation: ['annual_income', 'monthly_expenses', 'savings', 'emergency_fund'],
  risk_assessment: ['attitude_to_risk', 'capacity_for_loss'],
  objectives: ['primary_objective', 'investment_timeline'],
  recommendation: ['recommended_portfolio', 'allocation_equities'],
}

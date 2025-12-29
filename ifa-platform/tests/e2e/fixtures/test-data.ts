/**
 * Test Data Fixtures for E2E Testing
 *
 * This file contains mock data for testing various features of the IFA Platform.
 * All data is designed to be realistic but clearly identifiable as test data.
 */

/**
 * Test User Credentials
 */
export const testUsers = {
  admin: {
    email: process.env.E2E_EMAIL || 'demo@plannetic.com',
    password: process.env.E2E_PASSWORD || 'demo123',
    role: 'admin',
    name: 'Test Admin User',
  },
  advisor: {
    email: 'advisor@test.plannetic.com',
    password: 'advisor123',
    role: 'advisor',
    name: 'Test Advisor User',
  },
  readOnly: {
    email: 'readonly@test.plannetic.com',
    password: 'readonly123',
    role: 'read-only',
    name: 'Test Read-Only User',
  },
} as const;

/**
 * Sample Client Data
 */
export const testClients = {
  individual: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1980-05-15',
    email: 'john.doe@example.com',
    phone: '+44 20 7123 4567',
    address: {
      line1: '123 Test Street',
      line2: 'Apartment 4B',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    maritalStatus: 'married',
    employmentStatus: 'employed',
    occupation: 'Software Engineer',
    annualIncome: 75000,
    netWorth: 250000,
  },
  couple: {
    primary: {
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1982-08-22',
      email: 'jane.smith@example.com',
      phone: '+44 20 7234 5678',
    },
    partner: {
      firstName: 'Robert',
      lastName: 'Smith',
      dateOfBirth: '1979-03-10',
      email: 'robert.smith@example.com',
      phone: '+44 20 7234 5679',
    },
    jointIncome: 120000,
    jointNetWorth: 500000,
  },
  retiree: {
    firstName: 'Margaret',
    lastName: 'Johnson',
    dateOfBirth: '1955-11-30',
    email: 'margaret.johnson@example.com',
    phone: '+44 20 7345 6789',
    employmentStatus: 'retired',
    pensionIncome: 35000,
    netWorth: 750000,
  },
  youngProfessional: {
    firstName: 'Alex',
    lastName: 'Chen',
    dateOfBirth: '1995-02-14',
    email: 'alex.chen@example.com',
    phone: '+44 20 7456 7890',
    employmentStatus: 'employed',
    occupation: 'Marketing Manager',
    annualIncome: 55000,
    netWorth: 45000,
  },
} as const;

/**
 * Sample Assessment Data
 */
export const testAssessments = {
  lowRisk: {
    riskTolerance: 'conservative',
    investmentExperience: 'beginner',
    investmentHorizon: 'short',
    capacityForLoss: 'low',
    attitudeToRisk: 2, // Scale 1-10
    expectedScore: 25, // Out of 100
    profile: 'Conservative Investor',
  },
  moderateRisk: {
    riskTolerance: 'moderate',
    investmentExperience: 'intermediate',
    investmentHorizon: 'medium',
    capacityForLoss: 'medium',
    attitudeToRisk: 5,
    expectedScore: 50,
    profile: 'Balanced Investor',
  },
  highRisk: {
    riskTolerance: 'aggressive',
    investmentExperience: 'experienced',
    investmentHorizon: 'long',
    capacityForLoss: 'high',
    attitudeToRisk: 8,
    expectedScore: 80,
    profile: 'Growth Investor',
  },
  veryHighRisk: {
    riskTolerance: 'very_aggressive',
    investmentExperience: 'expert',
    investmentHorizon: 'very_long',
    capacityForLoss: 'very_high',
    attitudeToRisk: 10,
    expectedScore: 95,
    profile: 'Aggressive Growth Investor',
  },
} as const;

/**
 * Sample Suitability Assessment Questions
 */
export const suitabilityQuestions = {
  riskAttitude: [
    {
      question: 'How would you describe your investment experience?',
      options: ['No experience', 'Some experience', 'Experienced', 'Very experienced'],
      correctAnswer: 1, // Index
    },
    {
      question: 'What is your primary investment objective?',
      options: ['Capital preservation', 'Income generation', 'Growth', 'Aggressive growth'],
      correctAnswer: 2,
    },
  ],
  capacityForLoss: [
    {
      question: 'What percentage of your portfolio could you afford to lose?',
      options: ['0-5%', '5-10%', '10-20%', 'More than 20%'],
      correctAnswer: 1,
    },
    {
      question: 'How long is your investment time horizon?',
      options: ['Less than 1 year', '1-3 years', '3-5 years', 'More than 5 years'],
      correctAnswer: 3,
    },
  ],
} as const;

/**
 * Sample Cash Flow Data
 */
export const testCashFlows = {
  simple: {
    monthlyIncome: 5000,
    monthlyExpenses: 3500,
    monthlySavings: 1500,
    assets: [
      { name: 'Savings Account', value: 25000, type: 'liquid' },
      { name: 'Investment Account', value: 50000, type: 'investment' },
    ],
    liabilities: [
      { name: 'Credit Card', value: 2500, type: 'short-term' },
      { name: 'Car Loan', value: 15000, type: 'long-term' },
    ],
  },
  complex: {
    income: {
      salary: 6000,
      bonus: 1000,
      rental: 800,
      dividends: 200,
      total: 8000,
    },
    expenses: {
      housing: 2000,
      utilities: 300,
      transportation: 400,
      food: 600,
      healthcare: 200,
      insurance: 300,
      entertainment: 400,
      other: 300,
      total: 4500,
    },
    netCashFlow: 3500,
    projectionYears: 10,
  },
  retirement: {
    currentAge: 55,
    retirementAge: 65,
    lifeExpectancy: 85,
    currentSavings: 500000,
    monthlyContribution: 2000,
    expectedReturn: 0.06, // 6% annual
    inflationRate: 0.025, // 2.5% annual
    desiredRetirementIncome: 4000,
  },
} as const;

/**
 * Sample Stress Testing Scenarios
 */
export const stressTestScenarios = {
  marketCrash: {
    name: 'Market Crash Scenario',
    marketDropPercentage: -30,
    recoveryYears: 3,
    description: 'Simulates a severe market downturn similar to 2008',
  },
  interestRateRise: {
    name: 'Interest Rate Rise',
    rateIncrease: 2.5, // percentage points
    impactOnBonds: -10,
    impactOnEquities: -5,
    description: 'Rapid increase in interest rates',
  },
  inflation: {
    name: 'High Inflation',
    inflationRate: 5.0, // 5% annual
    duration: 5, // years
    description: 'Persistent high inflation environment',
  },
  jobLoss: {
    name: 'Loss of Income',
    incomeLossPercentage: 100,
    duration: 6, // months
    description: 'Temporary loss of primary income source',
  },
  healthEmergency: {
    name: 'Medical Emergency',
    unexpectedCost: 25000,
    ongoingMonthlyCost: 500,
    duration: 24, // months
    description: 'Major health emergency with ongoing costs',
  },
} as const;

/**
 * Sample Portfolio Data
 */
export const testPortfolios = {
  conservative: {
    name: 'Conservative Portfolio',
    totalValue: 100000,
    allocation: {
      cash: 20,
      bonds: 60,
      equities: 15,
      alternatives: 5,
    },
    expectedReturn: 0.04, // 4%
    volatility: 0.06, // 6%
  },
  balanced: {
    name: 'Balanced Portfolio',
    totalValue: 250000,
    allocation: {
      cash: 10,
      bonds: 40,
      equities: 45,
      alternatives: 5,
    },
    expectedReturn: 0.06, // 6%
    volatility: 0.10, // 10%
  },
  growth: {
    name: 'Growth Portfolio',
    totalValue: 500000,
    allocation: {
      cash: 5,
      bonds: 20,
      equities: 65,
      alternatives: 10,
    },
    expectedReturn: 0.08, // 8%
    volatility: 0.15, // 15%
  },
} as const;

/**
 * Sample Product/Service Data
 */
export const testProducts = {
  pension: {
    type: 'pension',
    provider: 'Test Pension Provider',
    productName: 'Personal Pension Plan',
    currentValue: 150000,
    monthlyContribution: 800,
    employerContribution: 400,
    expectedRetirement: 65,
  },
  isa: {
    type: 'isa',
    provider: 'Test ISA Provider',
    productName: 'Stocks & Shares ISA',
    currentValue: 20000,
    annualAllowance: 20000,
    currentYearContributions: 15000,
  },
  investment: {
    type: 'investment',
    provider: 'Test Investment Platform',
    productName: 'General Investment Account',
    currentValue: 75000,
    assetAllocation: {
      ukEquities: 30,
      usEquities: 25,
      emergingMarkets: 10,
      bonds: 25,
      cash: 10,
    },
  },
  protection: {
    type: 'life_insurance',
    provider: 'Test Insurance Company',
    productName: 'Term Life Insurance',
    coverAmount: 500000,
    monthlyPremium: 50,
    termYears: 25,
    criticalIllnessCover: true,
  },
} as const;

/**
 * Sample Compliance/PROD Data
 */
export const testCompliance = {
  serviceTypes: [
    'Initial Consultation',
    'Financial Planning',
    'Investment Advice',
    'Pension Review',
    'Retirement Planning',
    'Estate Planning',
  ],
  prodCategories: [
    'Pensions',
    'Investments',
    'Protection',
    'Mortgages',
    'General Insurance',
  ],
  clientAgreement: {
    agreementType: 'ongoing',
    services: ['Financial Planning', 'Investment Advice'],
    fee: 2500,
    feeStructure: 'fixed',
    reviewFrequency: 'annual',
  },
} as const;

/**
 * Sample Document/Report Data
 */
export const testDocuments = {
  suitabilityReport: {
    clientName: 'John Doe',
    reportDate: new Date().toISOString(),
    recommendations: [
      'Increase pension contributions',
      'Review asset allocation',
      'Consider tax-efficient investments',
    ],
    riskProfile: 'Moderate',
    nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  cashFlowReport: {
    clientName: 'Jane Smith',
    analysisDate: new Date().toISOString(),
    currentPosition: {
      monthlyIncome: 6000,
      monthlyExpenses: 4000,
      monthlySurplus: 2000,
    },
    projections: {
      retirementAge: 65,
      projectedIncome: 4500,
      projectedExpenses: 3500,
    },
  },
} as const;

/**
 * Helper function to generate unique test data
 */
export function generateUniqueClient(baseClient = testClients.individual) {
  const timestamp = Date.now();
  return {
    ...baseClient,
    firstName: `${baseClient.firstName}_${timestamp}`,
    lastName: `${baseClient.lastName}_${timestamp}`,
    email: `${baseClient.firstName.toLowerCase()}.${timestamp}@test.example.com`,
  };
}

/**
 * Helper function to generate test date ranges
 */
export function generateDateRange(startDate: Date, endDate: Date) {
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
}

/**
 * Helper function to generate random test data
 */
export function generateRandomTestData() {
  const timestamp = Date.now();
  return {
    clientId: `client_${timestamp}`,
    assessmentId: `assessment_${timestamp}`,
    portfolioId: `portfolio_${timestamp}`,
    documentId: `document_${timestamp}`,
  };
}

/**
 * Test data for API mocking
 */
export const mockAPIResponses = {
  clientList: {
    data: [
      {
        id: 'client_1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'client_2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        created_at: '2024-01-02T00:00:00Z',
      },
    ],
    count: 2,
  },
  assessmentResult: {
    id: 'assessment_123',
    client_id: 'client_1',
    risk_score: 50,
    risk_profile: 'Moderate',
    capacity_for_loss: 'Medium',
    created_at: '2024-01-15T00:00:00Z',
  },
  portfolioSummary: {
    total_value: 250000,
    allocation: {
      cash: 25000,
      bonds: 100000,
      equities: 112500,
      alternatives: 12500,
    },
    performance: {
      ytd: 0.08,
      oneYear: 0.12,
      threeYear: 0.35,
    },
  },
};

/**
 * Default export with all test data
 */
export default {
  users: testUsers,
  clients: testClients,
  assessments: testAssessments,
  cashFlows: testCashFlows,
  stressTests: stressTestScenarios,
  portfolios: testPortfolios,
  products: testProducts,
  compliance: testCompliance,
  documents: testDocuments,
  mockAPI: mockAPIResponses,
};

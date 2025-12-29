// ================================================================
// src/services/__tests__/ReportUtils.integration.test.ts
// INTEGRATION TESTING - Test ReportUtils with actual data structures
// ================================================================

import { ReportUtils, populateTemplate } from '../utils/ReportUtils';
import type { Client } from '@/types/client';
import type { CashFlowScenario, CashFlowProjection } from '@/types/cashflow';

// ================================================================
// MOCK DATA - Based on your actual type structures
// ================================================================

const mockClient: Client = {
  id: 'client-123',
  clientRef: 'CL001',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  personalDetails: {
    title: 'Mr',
    firstName: 'John',
    lastName: 'Smith',
    dateOfBirth: '1980-05-15',
    nationality: 'GB',
    maritalStatus: 'married',
    dependents: 2,
    employmentStatus: 'employed',
    occupation: 'Software Engineer'
  },
  contactInfo: {
    email: 'john.smith@example.com',
    phone: '01234567890',
    mobile: '07123456789',
    address: {
      line1: '123 Main Street',
      line2: 'Apartment 4B',
      city: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom'
    },
    preferredContact: 'email',
    communicationPreferences: {
      marketing: true,
      newsletters: true,
      smsUpdates: false
    }
  },
  financialProfile: {
    annualIncome: 75000,
    netWorth: 250000,
    liquidAssets: 50000,
    monthlyExpenses: 3500,
    investmentTimeframe: '10-15 years',
    investmentObjectives: ['retirement', 'capital growth'],
    existingInvestments: [
      {
        id: 'inv-1',
        type: 'isa',
        provider: 'Vanguard',
        currentValue: 25000,
        monthlyContribution: 500
      }
    ],
    pensionArrangements: [
      {
        id: 'pension-1',
        type: 'defined_contribution',
        provider: 'Aviva',
        currentValue: 100000,
        monthlyContribution: 800
      }
    ],
    insurancePolicies: [],
    totalAssets: 175000,
    mortgageOutstanding: 150000,
    propertyValue: 300000
  },
  vulnerabilityAssessment: {
    is_vulnerable: false,
    vulnerabilityFactors: [],
    supportNeeds: [],
    assessmentNotes: '',
    assessmentDate: '2024-01-01T00:00:00Z',
    reviewDate: '2024-12-31T00:00:00Z',
    assessorId: 'advisor-1'
  },
  riskProfile: {
    riskTolerance: 'Moderate',
    riskCapacity: 'Medium',
    attitudeToRisk: 6,
    capacityForLoss: 'Medium',
    knowledgeExperience: 'Good',
    lastAssessment: '2024-01-01T00:00:00Z'
  },
  status: 'active'
};

const mockScenario: CashFlowScenario = {
  id: 'scenario-123',
  clientId: 'client-123',
  scenarioName: 'Base Retirement Planning',
  scenarioType: 'base',
  createdBy: 'advisor-1',
  projectionYears: 20,
  inflationRate: 2.5,
  realEquityReturn: 7.0,
  realBondReturn: 3.5,
  realCashReturn: 1.0,
  clientAge: 44,
  retirementAge: 65,
  lifeExpectancy: 85,
  dependents: 2,
  currentSavings: 50000,
  pensionValue: 100000,
  pensionPotValue: 100000,
  investmentValue: 25000,
  propertyValue: 300000,
  currentIncome: 75000,
  pensionContributions: 9600,
  statePensionAge: 67,
  statePensionAmount: 10000,
  otherIncome: 0,
  currentExpenses: 42000,
  essentialExpenses: 30000,
  lifestyleExpenses: 8000,
  discretionaryExpenses: 4000,
  mortgageBalance: 150000,
  mortgagePayment: 1200,
  otherDebts: 5000,
  retirementIncomeTarget: 45000,
  retirementIncomeDesired: 50000,
  emergencyFundTarget: 20000,
  legacyTarget: 100000,
  equityAllocation: 60,
  bondAllocation: 30,
  cashAllocation: 10,
  alternativeAllocation: 0,
  assumptionBasis: 'Conservative estimates based on historical data',
  marketDataSource: 'FactSet',
  lastAssumptionsReview: '2024-01-01',
  vulnerabilityAdjustments: {},
  riskScore: 6,
  capacityForLossScore: 7,
  knowledgeExperienceScore: 8,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  isActive: true
};

const mockProjections: CashFlowProjection[] = [
  {
    id: 'proj-1',
    scenarioId: 'scenario-123',
    projectionYear: 1,
    clientAge: 45,
    employmentIncome: 75000,
    pensionIncome: 0,
    statePension: 0,
    investmentIncome: 2000,
    otherIncome: 0,
    totalIncome: 77000,
    essentialExpenses: 30000,
    lifestyleExpenses: 8000,
    discretionaryExpenses: 4000,
    totalExpenses: 42000,
    pensionPotValue: 110000,
    investmentPortfolio: 27000,
    cashSavings: 52000,
    totalAssets: 189000,
    annualSurplusDeficit: 35000,
    portfolioBalance: 189000,
    realTermsValue: 184634, // Adjusted for inflation
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'proj-2',
    scenarioId: 'scenario-123',
    projectionYear: 5,
    clientAge: 49,
    employmentIncome: 82000,
    pensionIncome: 0,
    statePension: 0,
    investmentIncome: 3500,
    otherIncome: 0,
    totalIncome: 85500,
    essentialExpenses: 33000,
    lifestyleExpenses: 9000,
    discretionaryExpenses: 4500,
    totalExpenses: 46500,
    pensionPotValue: 145000,
    investmentPortfolio: 35000,
    cashSavings: 65000,
    totalAssets: 245000,
    annualSurplusDeficit: 39000,
    portfolioBalance: 245000,
    realTermsValue: 220459,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'proj-3',
    scenarioId: 'scenario-123',
    projectionYear: 10,
    clientAge: 54,
    employmentIncome: 90000,
    pensionIncome: 0,
    statePension: 0,
    investmentIncome: 5000,
    otherIncome: 0,
    totalIncome: 95000,
    essentialExpenses: 37000,
    lifestyleExpenses: 10000,
    discretionaryExpenses: 5000,
    totalExpenses: 52000,
    pensionPotValue: 200000,
    investmentPortfolio: 48000,
    cashSavings: 80000,
    totalAssets: 328000,
    annualSurplusDeficit: 43000,
    portfolioBalance: 328000,
    realTermsValue: 254951,
    createdAt: '2024-01-01T00:00:00Z'
  }
];

// ================================================================
// TESTS
// ================================================================

describe('ReportUtils Integration Tests', () => {
  describe('Client Information Formatting', () => {
    it('should format client display name correctly', () => {
      const displayName = ReportUtils.getClientDisplayName(mockClient);
      expect(displayName).toBe('Mr John Smith');
    });

    it('should format client address correctly', () => {
      const address = ReportUtils.formatClientAddress(mockClient);
      expect(address).toBe('123 Main Street, Apartment 4B, London, Greater London, SW1A 1AA');
    });

    it('should calculate client age correctly', () => {
      const age = ReportUtils.calculateAge(mockClient.personalDetails.dateOfBirth);
      // Should calculate age based on current date
      expect(age).toBeGreaterThan(40);
      expect(age).toBeLessThan(50);
    });

    it('should handle missing client data gracefully', () => {
      const emptyClient = { ...mockClient };
      delete (emptyClient as any).personalDetails;

      const displayName = ReportUtils.getClientDisplayName(emptyClient);
      expect(displayName).toBe('');

      // Also test null/undefined
      expect(ReportUtils.getClientDisplayName(null as any)).toBe('');
      expect(ReportUtils.formatClientAddress(undefined as any)).toBe('');
    });
  });

  describe('Formatting Utilities', () => {
    it('should format currency correctly', () => {
      expect(ReportUtils.formatCurrency(75000)).toBe('£75,000');
      expect(ReportUtils.formatCurrency(1250.50)).toBe('£1,251');
      expect(ReportUtils.formatCurrency(0)).toBe('£0');
    });

    it('should format currency with different locales', () => {
      expect(ReportUtils.formatCurrency(75000, 'en-GB')).toBe('£75,000');
      // For non-GB locales, should default to EUR (as per your logic)
      // German format uses period as thousands separator: 75.000 €
      const deResult = ReportUtils.formatCurrency(75000, 'de-DE');
      expect(deResult).toContain('75');
      expect(deResult).toContain('€');
    });

    it('should format percentages correctly', () => {
      expect(ReportUtils.formatPercentage(7.5)).toBe('7.5%');
      expect(ReportUtils.formatPercentage(0.1)).toBe('0.1%');
      expect(ReportUtils.formatPercentage(0)).toBe('0.0%');
    });

    it('should format dates correctly', () => {
      const testDate = new Date('2024-01-15');
      expect(ReportUtils.formatDate(testDate)).toBe('15 January 2024');
      expect(ReportUtils.formatDate(testDate, 'en-US')).toBe('January 15, 2024');
    });

    it('should format key insights as HTML', () => {
      const insights = [
        'Portfolio is on track for retirement goals',
        'Consider increasing emergency fund',
        'Review investment allocation annually'
      ];

      const html = ReportUtils.formatKeyInsights(insights);
      expect(html).toContain('<li style="margin-bottom: 8px;">Portfolio is on track for retirement goals</li>');
      expect(html).toContain('<li style="margin-bottom: 8px;">Consider increasing emergency fund</li>');
      expect(html).toContain('<li style="margin-bottom: 8px;">Review investment allocation annually</li>');
    });

    it('should handle empty or invalid insights', () => {
      expect(ReportUtils.formatKeyInsights([])).toBe('');
      expect(ReportUtils.formatKeyInsights(null as any)).toBe('');
      expect(ReportUtils.formatKeyInsights('not-an-array' as any)).toBe('');
    });
  });

  describe('Table Generation', () => {
    it('should build projection table with real data', () => {
      const table = ReportUtils.buildProjectionTable(mockProjections);

      // Check table structure
      expect(table).toContain('<table class="projection-table"');
      expect(table).toContain('<thead>');
      expect(table).toContain('<tbody>');
      expect(table).toContain('</table>');

      // Check headers
      expect(table).toContain('Year');
      expect(table).toContain('Age');
      expect(table).toContain('Total Income');
      expect(table).toContain('Total Expenses');
      expect(table).toContain('Portfolio Value');
      expect(table).toContain('Annual Surplus');

      // Check data values
      expect(table).toContain('£77,000'); // First year total income
      expect(table).toContain('£42,000'); // First year expenses
      expect(table).toContain('£189,000'); // First year assets
      expect(table).toContain('£35,000'); // First year surplus
    });

    it('should build assumptions table with real scenario data', () => {
      const table = ReportUtils.buildAssumptionsTable(mockScenario);

      expect(table).toContain('<table class="assumptions-table"');
      expect(table).toContain('Inflation Rate');
      expect(table).toContain('Real Equity Return');
      expect(table).toContain('Real Bond Return');
      expect(table).toContain('Real Cash Return');
      expect(table).toContain('Retirement Age');
      expect(table).toContain('Life Expectancy');

      // Check formatted values
      expect(table).toContain('2.5%'); // Inflation rate
      expect(table).toContain('7.0%'); // Equity return
      expect(table).toContain('3.5%'); // Bond return
      expect(table).toContain('1.0%'); // Cash return
      expect(table).toContain('65'); // Retirement age
      expect(table).toContain('85'); // Life expectancy
    });

    it('should handle empty projection data', () => {
      const table = ReportUtils.buildProjectionTable([]);
      expect(table).toBe('');
    });

    it('should build risk analysis section', () => {
      const riskMetrics = {
        shortfallRisk: 'Low',
        longevityRisk: 'Medium',
        inflationRisk: 'Low',
        sequenceRisk: 'High'
      };

      const section = ReportUtils.buildRiskAnalysisSection(riskMetrics);

      expect(section).toContain('Risk Analysis Summary');
      expect(section).toContain('Shortfall Risk');
      expect(section).toContain('Longevity Risk');
      expect(section).toContain('Inflation Risk');
      expect(section).toContain('Sequence Risk');

      // Check risk level styling
      expect(section).toContain('color: green; font-weight: bold;">Low'); // Low risk styling
      expect(section).toContain('color: orange; font-weight: bold;">Medium'); // Medium risk styling
      expect(section).toContain('color: red; font-weight: bold;">High'); // High risk styling
    });
  });

  describe('Template Variable Building', () => {
    it('should build client variables correctly', () => {
      const variables = ReportUtils.buildClientVariables(mockClient);

      expect(variables.CLIENT_NAME).toBe('Mr John Smith');
      expect(variables.CLIENT_EMAIL).toBe('john.smith@example.com');
      expect(variables.CLIENT_REF).toBe('CL001');
      expect(variables.CLIENT_PHONE).toBe('01234567890');
      expect(variables.CLIENT_ADDRESS).toBe('123 Main Street, Apartment 4B, London, Greater London, SW1A 1AA');
      expect(variables.CLIENT_AGE).toBeGreaterThan(40);
      expect(variables.CLIENT_OCCUPATION).toBe('Software Engineer');
      expect(variables.REPORT_DATE).toMatch(/\d{1,2} \w+ \d{4}/); // Date format
      expect(variables.ADVISOR_NAME).toBe('Professional Advisor');
      expect(variables.FIRM_NAME).toBe('Financial Advisory Services');
    });

    it('should build scenario variables correctly', () => {
      const variables = ReportUtils.buildScenarioVariables(mockScenario);

      expect(variables.SCENARIO_NAME).toBe('Base Retirement Planning');
      expect(variables.SCENARIO_TYPE).toBe('Base');
      expect(variables.PROJECTION_YEARS).toBe(20);
      expect(variables.RETIREMENT_AGE).toBe(65);
      expect(variables.LIFE_EXPECTANCY).toBe(85);
      expect(variables.CURRENT_INCOME).toBe('£75,000');
      expect(variables.CURRENT_EXPENSES).toBe('£42,000');
      expect(variables.CURRENT_SAVINGS).toBe('£50,000');
      expect(variables.PENSION_VALUE).toBe('£100,000');
      expect(variables.INVESTMENT_VALUE).toBe('£25,000');
      expect(variables.INFLATION_RATE).toBe('2.5%');
      expect(variables.EQUITY_RETURN).toBe('7.0%');
      expect(variables.BOND_RETURN).toBe('3.5%');
      expect(variables.CASH_RETURN).toBe('1.0%');
    });

    it('should handle missing client data in variable building', () => {
      const incompleteClient = {
        ...mockClient,
        personalDetails: {
          ...mockClient.personalDetails,
          title: '',
          occupation: ''
        },
        contactInfo: {
          ...mockClient.contactInfo,
          email: '',
          phone: ''
        }
      };

      const variables = ReportUtils.buildClientVariables(incompleteClient);

      expect(variables.CLIENT_NAME).toBe('John Smith'); // Should handle missing title
      expect(variables.CLIENT_EMAIL).toBe('');
      expect(variables.CLIENT_PHONE).toBe('');
      expect(variables.CLIENT_OCCUPATION).toBe('');
    });
  });

  describe('Localization', () => {
    it('should return localized text for known keys', () => {
      expect(ReportUtils.getLocalizedText('YES')).toBe('Yes');
      expect(ReportUtils.getLocalizedText('NO')).toBe('No');
      expect(ReportUtils.getLocalizedText('YEAR')).toBe('Year');
      expect(ReportUtils.getLocalizedText('TOTAL_INCOME')).toBe('Total Income');
    });

    it('should return key if translation not found', () => {
      expect(ReportUtils.getLocalizedText('UNKNOWN_KEY')).toBe('UNKNOWN_KEY');
    });

    it('should handle different locales', () => {
      // Currently only en-GB is implemented, so should default to key
      expect(ReportUtils.getLocalizedText('YES', 'fr-FR')).toBe('YES');
      expect(ReportUtils.getLocalizedText('YES', 'en-GB')).toBe('Yes');
    });
  });
});

describe('Template Population', () => {
  it('should populate simple variables', () => {
    const template = 'Hello {{CLIENT_NAME}}, your income is {{CURRENT_INCOME}}.';
    const variables = {
      CLIENT_NAME: 'John Smith',
      CURRENT_INCOME: '£75,000'
    };

    const result = populateTemplate(template, variables);
    expect(result).toBe('Hello John Smith, your income is £75,000.');
  });

  it('should handle conditional sections', () => {
    const template = '{{#if INCLUDE_CHARTS}}Charts are included.{{/if}}{{#if INCLUDE_TABLES}}Tables are included.{{/if}}';
    const variables = {
      INCLUDE_CHARTS: 'true',
      INCLUDE_TABLES: '' // Empty string is falsy
    };

    const result = populateTemplate(template, variables);
    expect(result).toBe('Charts are included.');
  });

  it('should handle boolean conditionals', () => {
    const template = '{{#if HAS_RISK}}Risk analysis available{{/if}}{{#if HAS_GOALS}}Goals are set{{/if}}';
    const variables = {
      HAS_RISK: true,
      HAS_GOALS: false
    };

    const result = populateTemplate(template, variables);
    expect(result).toBe('Risk analysis available');
  });

  it('should handle numeric conditionals', () => {
    const template = '{{#if CLIENT_AGE}}Age: {{CLIENT_AGE}}{{/if}}{{#if ZERO_VALUE}}Zero{{/if}}';
    const variables = {
      CLIENT_AGE: 45,
      ZERO_VALUE: 0
    };

    const result = populateTemplate(template, variables);
    expect(result).toBe('Age: 45');
  });

  it('should clean up unpopulated variables', () => {
    const template = 'Hello {{CLIENT_NAME}}, {{UNKNOWN_VARIABLE}} should be removed.';
    const variables = {
      CLIENT_NAME: 'John Smith'
    };

    const result = populateTemplate(template, variables);
    expect(result).toBe('Hello John Smith,  should be removed.');
  });

  it('should handle complex real-world template', () => {
    const template = `
      <h1>Report for {{CLIENT_NAME}}</h1>
      <p>Generated on {{REPORT_DATE}}</p>
      {{#if INCLUDE_ASSUMPTIONS}}
      <section>
        <h2>Assumptions</h2>
        {{ASSUMPTIONS_TABLE}}
      </section>
      {{/if}}
      {{#if INCLUDE_PROJECTIONS}}
      <section>
        <h2>Projections</h2>
        {{PROJECTION_TABLE}}
      </section>
      {{/if}}
    `;

    const variables = {
      CLIENT_NAME: 'John Smith',
      REPORT_DATE: '15 January 2024',
      INCLUDE_ASSUMPTIONS: 'true',
      INCLUDE_PROJECTIONS: '', // Empty string is falsy
      ASSUMPTIONS_TABLE: '<table>Assumptions table</table>',
      PROJECTION_TABLE: '<table>Projection table</table>'
    };

    const result = populateTemplate(template, variables);

    expect(result).toContain('Report for John Smith');
    expect(result).toContain('Generated on 15 January 2024');
    expect(result).toContain('<table>Assumptions table</table>');
    expect(result).not.toContain('<table>Projection table</table>');
    expect(result).not.toContain('{{');
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle null and undefined client data', () => {
    expect(ReportUtils.getClientDisplayName(null as any)).toBe('');
    expect(ReportUtils.formatClientAddress(undefined as any)).toBe('');
    expect(ReportUtils.calculateAge('')).toBe(0);
    expect(ReportUtils.calculateAge('invalid-date')).toBe(0);
  });

  it('should handle invalid numeric values', () => {
    expect(ReportUtils.formatCurrency(null as any)).toBe('£0');
    expect(ReportUtils.formatCurrency(undefined as any)).toBe('£0');
    expect(ReportUtils.formatCurrency(NaN)).toBe('£0');
    expect(ReportUtils.formatPercentage(null as any)).toBe('0.0%');
  });

  it('should handle empty arrays gracefully', () => {
    expect(ReportUtils.buildProjectionTable([])).toBe('');
    expect(ReportUtils.formatKeyInsights([])).toBe('');
  });

  it('should handle malformed scenario data', () => {
    const badScenario = { ...mockScenario };
    delete (badScenario as any).inflationRate;
    delete (badScenario as any).realEquityReturn;

    expect(() => ReportUtils.buildAssumptionsTable(badScenario)).not.toThrow();
    const table = ReportUtils.buildAssumptionsTable(badScenario);
    // formatPercentage handles undefined gracefully by defaulting to 0
    expect(table).toContain('0.0%');
  });
});
// =====================================================
// FILE: src/lib/validation/schemas.ts
// PURPOSE: Zod validation schemas for all assessment inputs
// Single source of truth for runtime validation
// =====================================================

import { z } from 'zod';

// =====================================================
// PRIMITIVE SCHEMAS
// =====================================================

/**
 * UUID schema for database IDs
 */
export const UUIDSchema = z.string().uuid('Invalid UUID format');

/**
 * Non-empty string schema
 */
export const NonEmptyStringSchema = z.string().min(1, 'Field cannot be empty');

/**
 * Email schema
 */
export const EmailSchema = z.string().email('Invalid email address');

/**
 * Positive number schema
 */
export const PositiveNumberSchema = z.number().min(0, 'Must be a positive number');

/**
 * Percentage schema (0-100)
 */
export const PercentageSchema = z.number().min(0).max(100, 'Must be between 0 and 100');

/**
 * Risk score schema (1-7 scale)
 */
export const RiskScoreSchema = z.number().min(1).max(7, 'Risk score must be between 1 and 7');

// =====================================================
// ASSESSMENT STATUS SCHEMAS
// =====================================================

/**
 * Assessment status enum
 */
export const AssessmentStatusSchema = z.enum([
  'draft',
  'in_progress',
  'completed',
  'submitted',
  'archived'
]);

/**
 * Assessment type enum
 */
export const AssessmentTypeSchema = z.enum([
  'atr',
  'cfl',
  'suitability',
  'investor_persona'
]);

/**
 * Save status enum
 */
export const SaveStatusSchema = z.enum([
  'idle',
  'pending',
  'saving',
  'saved',
  'error'
]);

// =====================================================
// FINANCIAL PROFILE SCHEMAS
// =====================================================

/**
 * Financial profile input schema
 */
export const FinancialProfileSchema = z.object({
  investmentAmount: PositiveNumberSchema.optional(),
  netWorth: z.number().optional(),
  monthlyIncome: PositiveNumberSchema.optional(),
  monthlyExpenditure: PositiveNumberSchema.optional(),
  emergencyFund: PositiveNumberSchema.optional(),
  liquidAssets: PositiveNumberSchema.optional(),
  annualIncome: PositiveNumberSchema.optional(),
  totalAssets: PositiveNumberSchema.optional(),
  totalLiabilities: PositiveNumberSchema.optional(),
  propertyValue: PositiveNumberSchema.optional(),
  outstandingMortgage: PositiveNumberSchema.optional(),
});

/**
 * Client financial profile from database
 */
export const ClientFinancialProfileSchema = z.object({
  annualIncome: PositiveNumberSchema.optional(),
  monthlyExpenses: PositiveNumberSchema.optional(),
  liquidAssets: PositiveNumberSchema.optional(),
  netWorth: z.number().optional(),
  existingInvestments: z.array(z.object({
    currentValue: PositiveNumberSchema.optional(),
    type: z.string().optional(),
  })).optional(),
  pensionArrangements: z.array(z.object({
    currentValue: PositiveNumberSchema.optional(),
    provider: z.string().optional(),
  })).optional(),
  properties: z.array(z.object({
    value: PositiveNumberSchema.optional(),
    mortgage: PositiveNumberSchema.optional(),
  })).optional(),
  liabilities: z.array(z.object({
    amount: PositiveNumberSchema.optional(),
    type: z.string().optional(),
  })).optional(),
});

// =====================================================
// RISK PROFILE SCHEMAS
// =====================================================

/**
 * Risk tolerance enum
 */
export const RiskToleranceSchema = z.enum(['low', 'medium', 'high']);

/**
 * Risk profile schema
 */
export const RiskProfileSchema = z.object({
  attitudeToRisk: RiskScoreSchema.optional(),
  capacityForLoss: RiskScoreSchema.optional(),
  riskTolerance: RiskToleranceSchema.optional(),
  maxAcceptableLoss: PercentageSchema.optional(),
  volatilityTolerance: z.string().optional(),
});

// =====================================================
// CLIENT SCHEMAS
// =====================================================

/**
 * Client address schema
 */
export const ClientAddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
});

/**
 * Client personal details schema
 */
export const ClientPersonalDetailsSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  date_of_birth: z.string().optional(),
  maritalStatus: z.string().optional(),
  dependents: z.number().min(0).optional(),
  employmentStatus: z.string().optional(),
  occupation: z.string().optional(),
  targetRetirementAge: z.number().min(50).max(100).optional(),
  target_retirement_age: z.number().min(50).max(100).optional(),
});

/**
 * Client contact info schema
 */
export const ClientContactInfoSchema = z.object({
  address: ClientAddressSchema.optional(),
  phone: z.string().optional(),
  email: EmailSchema.optional(),
  preferredContact: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  postcode: z.string().optional(),
});

/**
 * Client objectives schema
 */
export const ClientObjectivesSchema = z.object({
  primaryObjective: z.string().optional(),
  primary_objective: z.string().optional(),
  timeHorizon: z.number().min(1).optional(),
  time_horizon: z.number().min(1).optional(),
  investmentAmount: PositiveNumberSchema.optional(),
  investment_amount: PositiveNumberSchema.optional(),
  targetReturn: PercentageSchema.optional(),
  incomeRequirement: PositiveNumberSchema.optional(),
});

/**
 * Full client data schema
 */
export const ClientDataSchema = z.object({
  id: UUIDSchema.optional(),
  clientRef: z.string().optional(),
  personalDetails: ClientPersonalDetailsSchema.optional(),
  contactInfo: ClientContactInfoSchema.optional(),
  financialProfile: ClientFinancialProfileSchema.optional(),
  objectives: ClientObjectivesSchema.optional(),
  investmentObjectives: ClientObjectivesSchema.optional(),
  riskProfile: RiskProfileSchema.optional(),
  risk_profile: RiskProfileSchema.optional(),
  preferences: z.object({
    retirementAge: z.number().optional(),
    communicationPreferences: z.array(z.string()).optional(),
  }).optional(),
});

// =====================================================
// VULNERABILITY ASSESSMENT SCHEMAS
// =====================================================

/**
 * Vulnerability types enum
 */
export const VulnerabilityTypeSchema = z.enum([
  'none',
  'health',
  'life_events',
  'resilience',
  'capability'
]);

/**
 * Review frequency enum
 */
export const ReviewFrequencySchema = z.enum([
  'standard',
  'enhanced',
  'frequent'
]);

/**
 * Vulnerability assessment schema
 */
export const VulnerabilityAssessmentSchema = z.object({
  is_vulnerable: z.boolean().optional(),
  vulnerabilityTypes: z.array(VulnerabilityTypeSchema).optional(),
  healthVulnerabilities: z.string().optional(),
  lifeEventVulnerabilities: z.string().optional(),
  resilienceVulnerabilities: z.string().optional(),
  capabilityVulnerabilities: z.string().optional(),
  adaptationsMade: z.string().optional(),
  supportRequired: z.string().optional(),
  reviewFrequency: ReviewFrequencySchema.optional(),
});

// =====================================================
// KNOWLEDGE & EXPERIENCE SCHEMAS
// =====================================================

/**
 * Investment knowledge level enum
 */
export const InvestmentKnowledgeLevelSchema = z.enum([
  'basic',
  'good',
  'advanced',
  'expert'
]);

/**
 * Knowledge experience schema
 */
export const KnowledgeExperienceSchema = z.object({
  investmentKnowledge: InvestmentKnowledgeLevelSchema.optional(),
  investmentTypesKnown: z.array(z.string()).optional(),
  currentInvestments: z.string().optional(),
  professionalQualifications: z.string().optional(),
  informationSources: z.array(z.string()).optional(),
  portfolioValue: PositiveNumberSchema.optional(),
});

// =====================================================
// API INPUT SCHEMAS
// =====================================================

/**
 * Create assessment input schema
 */
export const CreateAssessmentInputSchema = z.object({
  clientId: UUIDSchema,
  assessmentType: AssessmentTypeSchema,
  advisorId: UUIDSchema.optional(),
});

/**
 * Update assessment input schema
 */
export const UpdateAssessmentInputSchema = z.object({
  assessmentId: UUIDSchema,
  status: AssessmentStatusSchema.optional(),
  data: z.record(z.unknown()).optional(),
  completionPercentage: PercentageSchema.optional(),
});

/**
 * Share assessment input schema
 */
export const ShareAssessmentInputSchema = z.object({
  clientId: UUIDSchema,
  assessmentType: AssessmentTypeSchema,
  clientEmail: EmailSchema,
  clientName: NonEmptyStringSchema,
  expiryDays: z.number().min(1).max(90).default(7),
  customMessage: z.string().optional(),
  sendEmail: z.boolean().default(true),
});

/**
 * Complete shared assessment input schema
 */
export const CompleteSharedAssessmentInputSchema = z.object({
  token: UUIDSchema,
  responses: z.record(z.unknown()),
});

/**
 * ATR assessment input schema
 */
export const ATRAssessmentInputSchema = z.object({
  clientId: UUIDSchema,
  responses: z.record(z.number().min(1).max(5)),
  attitudeToRisk: RiskScoreSchema.optional(),
});

/**
 * CFL assessment input schema
 */
export const CFLAssessmentInputSchema = z.object({
  clientId: UUIDSchema,
  responses: z.record(z.unknown()),
  capacityForLoss: RiskScoreSchema.optional(),
  financialProfile: FinancialProfileSchema.optional(),
});

/**
 * Suitability assessment save input schema
 */
export const SuitabilitySaveInputSchema = z.object({
  clientId: UUIDSchema,
  assessmentId: UUIDSchema.optional(),
  sectionId: z.string().optional(),
  data: z.record(z.unknown()),
  status: AssessmentStatusSchema.optional(),
  completionPercentage: PercentageSchema.optional(),
});

/**
 * Suitability assessment finalize input schema
 */
export const SuitabilityFinalizeInputSchema = z.object({
  clientId: UUIDSchema,
  assessmentId: UUIDSchema,
  data: z.record(z.unknown()),
  declarations: z.object({
    meetsObjectives: z.boolean(),
    suitableForRisk: z.boolean(),
    affordabilityConfirmed: z.boolean(),
    consumerDutyMet: z.boolean(),
  }),
});

// =====================================================
// MONTE CARLO SCHEMAS
// =====================================================

/**
 * Monte Carlo simulation input schema
 */
export const MonteCarloInputSchema = z.object({
  scenarioId: UUIDSchema.optional(),
  simulationCount: z.number().min(100).max(100000).default(5000),
  projectionYears: z.number().min(1).max(50).default(30),
  initialWealth: PositiveNumberSchema.optional(),
  withdrawalRate: PercentageSchema.optional(),
  riskScore: RiskScoreSchema.optional(),
});

// =====================================================
// CASHFLOW SCHEMAS
// =====================================================

/**
 * Scenario type enum
 */
export const ScenarioTypeSchema = z.enum([
  'base',
  'optimistic',
  'pessimistic',
  'stress',
  'early_retirement',
  'high_inflation',
  'capacity_for_loss'
]);

/**
 * Cashflow scenario input schema
 */
export const CashflowScenarioInputSchema = z.object({
  clientId: UUIDSchema,
  scenarioName: NonEmptyStringSchema,
  scenarioType: ScenarioTypeSchema.default('base'),
  clientAge: z.number().min(18).max(120),
  retirementAge: z.number().min(50).max(100),
  projectionYears: z.number().min(1).max(60).default(30),
  currentIncome: PositiveNumberSchema,
  currentExpenses: PositiveNumberSchema,
  inflationRate: z.number().min(0).max(20).default(2.5),
  realEquityReturn: z.number().min(-10).max(20).default(5),
  realBondReturn: z.number().min(-5).max(15).default(2),
  realCashReturn: z.number().min(-5).max(10).default(0.5),
  equityAllocation: PercentageSchema,
  bondAllocation: PercentageSchema,
  cashAllocation: PercentageSchema,
});

// =====================================================
// TYPE EXPORTS (inferred from schemas)
// =====================================================

export type FinancialProfileInput = z.infer<typeof FinancialProfileSchema>;
export type RiskProfileInput = z.infer<typeof RiskProfileSchema>;
export type ClientDataInput = z.infer<typeof ClientDataSchema>;
export type VulnerabilityAssessmentInput = z.infer<typeof VulnerabilityAssessmentSchema>;
export type KnowledgeExperienceInput = z.infer<typeof KnowledgeExperienceSchema>;
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentInputSchema>;
export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentInputSchema>;
export type ShareAssessmentInput = z.infer<typeof ShareAssessmentInputSchema>;
export type ATRAssessmentInput = z.infer<typeof ATRAssessmentInputSchema>;
export type CFLAssessmentInput = z.infer<typeof CFLAssessmentInputSchema>;
export type SuitabilitySaveInput = z.infer<typeof SuitabilitySaveInputSchema>;
export type SuitabilityFinalizeInput = z.infer<typeof SuitabilityFinalizeInputSchema>;
export type MonteCarloInput = z.infer<typeof MonteCarloInputSchema>;
export type CashflowScenarioInput = z.infer<typeof CashflowScenarioInputSchema>;

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Validate and parse input with detailed error messages
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod errors for API response
 */
export function formatValidationErrors(error: z.ZodError): {
  code: string;
  message: string;
  details: Array<{ path: string; message: string }>;
} {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Input validation failed',
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

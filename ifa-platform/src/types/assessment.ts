// src/types/assessment.ts - COMPLETE VERSION WITH ALL TYPES
// ================================================================
// INCLUDES ALL MISSING TYPES FOR ASSESSMENT SERVICE
// ================================================================

import React from 'react';

// ================================================================
// CORE ASSESSMENT TYPES (FIXING IMPORT ERRORS)
// ================================================================

// ATR (Attitude to Risk) Types
export interface ATRQuestion {
  id: string;
  text: string;
  question?: string; // Some questions use 'question' instead of 'text'
  options: {
    value: number;
    text: string;
    bias?: string;
  }[];
}

export interface ATRAnswers {
  [questionId: string]: number;
}

// CFL (Capacity for Loss) Types
export interface CFLQuestion {
  id: string;
  question: string;
  options: {
    value: number;
    text: string;
  }[];
}

export interface CFLAnswers {
  [questionId: string]: number;
}

// Risk Metrics
export interface RiskMetrics {
  atrScore: number;
  cflScore: number;
  finalRiskProfile: number;
  riskReconciliation?: string;
  netInvestment?: number;
  annualSavings?: number;
  yearsToRetirement?: number;
}

// Assessment Result
export interface AssessmentResult {
  id: string;
  clientId: string;
  assessmentType: 'atr' | 'cfl' | 'persona' | 'suitability';
  status: 'draft' | 'completed' | 'archived';
  score?: number;
  category?: string;
  answers: Record<string, any>;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// ================================================================
// ASSESSMENT PROGRESS TYPES
// ================================================================

export interface AssessmentProgress {
  id: string;
  client_id: string;
  assessment_type: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  last_updated: string;
  started_at?: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

export interface AssessmentHistory {
  id: string;
  client_id: string;
  assessment_id?: string;
  assessment_type: string;
  action: string;
  performed_at: string;
  performed_by?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

// ================================================================
// CLIENT ASSESSMENT TYPES
// ================================================================

export interface ClientAssessmentStatus {
  atr: {
    completed: boolean;
    score?: number;
    category?: string;
    date?: string;
  };
  cfl: {
    completed: boolean;
    score?: number;
    category?: string;
    date?: string;
  };
  persona: {
    completed: boolean;
    type?: string;
    score?: number;
    date?: string;
  };
  suitability: {
    completed: boolean;
    status?: string;
    date?: string;
  };
  monteCarlo?: {
    completed: boolean;
    scenarioCount?: number;
    lastRun?: string;
  };
  cashFlow?: {
    completed: boolean;
    scenarioCount?: number;
    lastUpdate?: string;
  };
}

// ================================================================
// SUITABILITY ASSESSMENT TYPES
// ================================================================

export interface SuitabilitySection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'complete' | 'partial' | 'incomplete';
  fields: SuitabilityField[];
  conditionalFields?: ConditionalFieldGroup[];
}

export interface SuitabilityField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'email' | 'tel';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  validation?: string;
  autoGenerate?: boolean;
  calculate?: string;
  dependsOn?: FieldDependency;
  smartDefault?: (formData: SuitabilityData) => any;
  helpText?: string;
}

export interface ConditionalFieldGroup {
  condition: (formData: SuitabilityData) => boolean;
  fields: SuitabilityField[];
}

export interface FieldDependency {
  field: string;
  value: any;
  operator?: 'equals' | 'includes' | 'greaterThan' | 'lessThan';
}

export interface SuitabilityData {
  [sectionId: string]: {
    [fieldId: string]: any;
  };
}

// ================================================================
// AI-ENHANCED TYPES
// ================================================================

export interface AISuggestion {
  sectionId: string;
  fieldSuggestions: Record<string, any>;
  insights: string[];
  warnings?: string[];
  confidence: number;
  sources: string[];
  generatedAt: string;
}

export interface PulledPlatformData {
  cflScore?: number;
  cflCategory?: string;
  cflDate?: string;
  atrScore?: number;
  atrCategory?: string;
  atrDate?: string;
  vulnerabilityFactors?: string[];
  vulnerabilityScore?: string;
  clientMetrics?: {
    totalAssets?: number;
    totalLiabilities?: number;
    monthlyIncome?: number;
    monthlyExpenses?: number;
    investmentExperience?: string;
  };
  documentHistory?: {
    type: string;
    date: string;
    status: string;
  }[];
  previousAssessments?: {
    id: string;
    type: string;
    date: string;
    score?: number;
  }[];
}

export interface SuitabilityFieldEnhanced extends SuitabilityField {
  aiSuggested?: any;
  aiConfidence?: number;
  dataSource?: string[];
  lastModified?: string;
  aiExplanation?: string;
}

export interface SuitabilitySectionEnhanced extends SuitabilitySection {
  fields: SuitabilityFieldEnhanced[];
  aiSuggestion?: AISuggestion;
  chartData?: ChartData;
  sectionScore?: number;
  lastAIUpdate?: string;
  validationStatus?: 'valid' | 'warning' | 'error';
  validationMessages?: string[];
}

export interface ChartData {
  type: 'pie' | 'line' | 'bar' | 'radar' | 'gauge' | 'doughnut';
  data: any;
  options?: any;
  title: string;
  description?: string;
}

export interface SuitabilityDataEnhanced extends SuitabilityData {
  _metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    completionPercentage: number;
    aiEnabled: boolean;
    pulledData: PulledPlatformData;
    parentAssessmentId?: string;
    copiedFields?: string[];
  };
  _aiSuggestions: Record<string, AISuggestion>;
  _chartData: Record<string, ChartData>;
}

export interface SuitabilityAssessmentVersion {
  id: string;
  clientId: string;
  version: number;
  versionLabel?: string;
  parentId?: string;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'active' | 'superseded' | 'archived';
  changesSummary?: string[];
  formData: SuitabilityDataEnhanced;
  completionPercentage: number;
  aiSuggestionsUsed: boolean;
  documentIds?: string[];
}

export interface ClientSuitabilityHistory {
  clientId: string;
  assessments: SuitabilityAssessmentVersion[];
  currentAssessmentId: string;
  lastReviewDate?: string;
  nextReviewDate?: string;
  totalAssessments: number;
}

export interface AIAnalysisRequest {
  sectionId: string;
  formData: SuitabilityData;
  pulledData: PulledPlatformData;
  analysisType: 'suggestion' | 'validation' | 'projection' | 'recommendation';
  includeCharts?: boolean;
  context?: Record<string, any>;
}

export interface AIAnalysisResponse {
  success: boolean;
  suggestion?: AISuggestion;
  chartData?: ChartData;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  projection?: {
    timeline: number[];
    values: number[];
    confidence: number;
  };
  recommendation?: {
    text: string;
    keyPoints: string[];
    risks: string[];
    opportunities: string[];
  };
  error?: string;
}

export interface DeepSeekPromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  outputFormat: 'json' | 'text' | 'structured';
  constraints: string[];
  examples?: { input: any; output: any }[];
}

export interface CrossSectionValidation {
  rule: string;
  sections: string[];
  validate: (formData: SuitabilityData, pulledData: PulledPlatformData) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: string[];
}

export interface ValidationError {
  sectionId: string;
  fieldId?: string;
  message: string;
  severity: 'error' | 'critical';
  code: string;
}

export interface ValidationWarning {
  sectionId: string;
  fieldId?: string;
  message: string;
  type: 'compliance' | 'bestPractice' | 'dataQuality';
}

export interface SuitabilityReportPayload {
  assessmentId: string;
  clientId: string;
  assessmentData: SuitabilityDataEnhanced;
  includeAISuggestions: boolean;
  includeCharts: boolean;
  chartData?: Record<string, ChartData>;
  reportType: 'full' | 'summary' | 'client_friendly';
  complianceFlags?: string[];
  customSections?: {
    title: string;
    content: string;
  }[];
}

export interface PlatformSyncStatus {
  lastSync: string;
  syncedSections: {
    sectionId: string;
    status: 'synced' | 'pending' | 'error';
    lastUpdate: string;
  }[];
  pendingUpdates: any[];
  errors: string[];
}

// ================================================================
// PERSONA ASSESSMENT TYPES
// ================================================================

export interface PersonaQuestion {
  id: string;
  question: string;
  options: {
    value: number;
    text: string;
  }[];
}

export interface PersonaAnswers {
  [questionId: string]: number;
}

export interface InvestorPersona {
  id: number;
  type: string;
  avatar: string;
  description: string;
  characteristics: string[];
  motivations: string[];
  behavioralTraits: string[];
  communicationStyle: string;
  riskApproach: string;
}

// ================================================================
// COMPLIANCE TYPES
// ================================================================

export interface ComplianceAlert {
  id: string;
  clientId: string;
  type: 'overdue' | 'incomplete' | 'mismatch' | 'review_required';
  assessmentType: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

// ================================================================
// REPORT TYPES
// ================================================================

export interface AssessmentReport {
  id: string;
  clientId: string;
  type: 'summary' | 'detailed' | 'compliance';
  format: 'pdf' | 'excel';
  generatedAt: string;
  generatedBy: string;
  sections: string[];
  data: any;
}

// ================================================================
// TYPE GUARDS AND UTILITIES
// ================================================================

export const isEnhancedSuitabilityData = (data: any): data is SuitabilityDataEnhanced => {
  return data && '_metadata' in data && '_aiSuggestions' in data;
};

export const createEmptyEnhancedData = (): SuitabilityDataEnhanced => ({
  _metadata: {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completionPercentage: 0,
    aiEnabled: true,
    pulledData: {}
  },
  _aiSuggestions: {},
  _chartData: {}
});

export const mergePulledData = (
  existing: PulledPlatformData,
  update: Partial<PulledPlatformData>
): PulledPlatformData => ({
  ...existing,
  ...update,
  clientMetrics: {
    ...existing.clientMetrics,
    ...update.clientMetrics
  }
});

// Utility function to calculate risk scores
export const calculateRiskScore = (answers: Record<string, number>): number => {
  const values = Object.values(answers);
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

// Utility to determine risk category
export const getRiskCategory = (score: number): string => {
  if (score <= 1.5) return 'Very Low Risk';
  if (score <= 2.5) return 'Low Risk';
  if (score <= 3.5) return 'Moderate Risk';
  if (score <= 4.5) return 'High Risk';
  return 'Very High Risk';
};

// Export assessment type enum for consistency
export enum AssessmentType {
  ATR = 'atr',
  CFL = 'cfl',
  PERSONA = 'persona',
  SUITABILITY = 'suitability',
  MONTE_CARLO = 'monte_carlo',
  CASH_FLOW = 'cash_flow'
}

// Re-export status types from centralized location
// This maintains backward compatibility while consolidating status definitions
export type {
  AssessmentStatus,
  SaveStatus,
  ProgressStatus
} from './assessment-status'

export {
  VALID_TRANSITIONS,
  isValidTransition,
  getNextValidStatuses,
  isEditable,
  isTerminal,
  isSubmitted,
  getStatusLabel,
  getStatusColor,
  normalizeLegacyStatus,
  isAssessmentStatus,
  isSaveStatus,
  isProgressStatus
} from './assessment-status'
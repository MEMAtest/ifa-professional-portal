// ================================================================
// src/types/reporting.types.ts
// UNIFIED REPORTING TYPES - Safe additions, no breaking changes
// ================================================================

// ================================================================
// CORE REPORT TYPES
// ================================================================

export type ReportType =
  | 'cashflow'
  | 'enhanced-cashflow'
  | 'stress-test'
  | 'monte-carlo'
  | 'atr'
  | 'assessment'
  | 'atr-assessment'
  | 'cfl-assessment'
  | 'vulnerability-assessment'
  | 'suitability'
  | 'annual-review'
  | 'compliance'
  | 'portfolio-analysis';

export type ReportFormat = 'html' | 'pdf' | 'excel' | 'powerpoint';

export type ReportTemplateType = 'cashflow' | 'suitability' | 'review' | 'assessment' | 'compliance' | 'atr';

// ================================================================
// UNIFIED REPORT REQUEST/RESPONSE
// ================================================================

export interface UnifiedReportRequest {
  /** The type of report to generate */
  type: ReportType;

  /** Primary data identifier (scenarioId, assessmentId, etc.) */
  dataId: string;

  /** Optional client ID if not derivable from dataId */
  clientId?: string;

  /** Template type for the report */
  templateType?: ReportTemplateType;

  /** Output format */
  format?: ReportFormat;

  /** Report generation options */
  options?: ReportOptions;

  /** Metadata for the request */
  metadata?: ReportRequestMetadata;
}

export interface UnifiedReportResult {
  /** Whether the report generation was successful */
  success: boolean;

  /** Generated document information */
  document?: GeneratedDocument;

  /** Raw report content (HTML) */
  reportContent?: string;

  /** Download URL for the generated report */
  downloadUrl?: string;

  /** Preview URL (for HTML reports) */
  previewUrl?: string;

  /** URLs for generated charts */
  chartUrls?: string[];

  /** Error message if generation failed */
  error?: string;

  /** Report generation metadata */
  metadata?: any; // Made more flexible to support different service metadata
}

// ================================================================
// REPORT OPTIONS (Flexible and extensible)
// ================================================================

export interface ReportOptions {
  // Content options
  includeCharts?: boolean;
  includeAssumptions?: boolean;
  includeRiskAnalysis?: boolean;
  includeProjectionTable?: boolean;
  includeExecutiveSummary?: boolean;
  includeCrossAssessmentAnalysis?: boolean;

  // Chart options
  chartTypes?: ChartType[];
  chartTheme?: 'light' | 'dark' | 'auto';
  interactiveCharts?: boolean;

  // Data options
  reportPeriodYears?: number;
  comparisonScenarios?: string[];
  customSections?: string[];
  filters?: ReportFilters;

  // Formatting options
  outputFormat?: ReportFormat;
  locale?: string;
  theme?: 'light' | 'dark' | 'auto';

  // Accessibility options
  accessibility?: AccessibilityOptions;

  // Customization options
  customizations?: ReportCustomizations;

  // Progress tracking
  onProgress?: (progress: ReportProgress) => void;

  // Cache options
  useCache?: boolean;
  cacheKey?: string;
}

export interface AccessibilityOptions {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  screenReader: boolean;
  altTextForCharts?: boolean;
  keyboardNavigation?: boolean;
}

export interface ReportCustomizations {
  logo?: string;
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  headerContent?: string;
  footerContent?: string;
  watermark?: string;
}

export interface ReportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  riskLevels?: ('Low' | 'Medium' | 'High')[];
  includeArchived?: boolean;
  customFilters?: Record<string, any>;
}

// ================================================================
// CHART TYPES
// ================================================================

export type ChartType =
  | 'portfolio'
  | 'income_expense'
  | 'asset_allocation'
  | 'risk_analysis'
  | 'projection_timeline'
  | 'performance_comparison'
  | 'stress_test_results'
  | 'monte_carlo_distribution'
  | 'cashflow_waterfall'
  | 'risk_return_scatter';

export interface ChartConfiguration {
  type: ChartType;
  title?: string;
  dataSource: string[];
  styling?: ChartStyling;
  interactivity?: ChartInteractivity;
}

export interface ChartStyling {
  theme: 'light' | 'dark' | 'auto';
  colors?: string[];
  fontSize?: number;
  width?: number;
  height?: number;
}

export interface ChartInteractivity {
  drillDown: boolean;
  filtering: boolean;
  crossHighlighting: boolean;
  tooltip: boolean;
  zoom: boolean;
}

// ================================================================
// DOCUMENT AND METADATA
// ================================================================

export interface GeneratedDocument {
  id: string;
  clientId: string;
  templateId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize?: number;
  pageCount?: number;
  createdAt: string;
  expiresAt?: string;
}

export interface ReportRequestMetadata {
  requestId?: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestedAt: Date;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
}

export interface ReportResultMetadata {
  reportId: string;
  reportType: ReportType;
  service: string; // Which service generated the report
  version: string;
  generatedAt: Date;
  processingTimeMs: number;
  cacheHit?: boolean;

  // Generation details
  dataSourcesUsed: string[];
  chartsGenerated: number;
  pagesGenerated?: number;

  // Quality metrics
  dataCompleteness: number; // 0-1
  hasWarnings: boolean;
  warnings?: string[];
}

// ================================================================
// PROGRESS TRACKING
// ================================================================

export interface ReportProgress {
  stage: ReportProgressStage;
  progress: number; // 0-100
  message: string;
  currentStep?: string;
  totalSteps?: number;
  estimatedTimeRemaining?: number; // milliseconds
  warnings?: string[];
}

export type ReportProgressStage =
  | 'initializing'
  | 'validating_data'
  | 'gathering_data'
  | 'generating_charts'
  | 'building_content'
  | 'creating_document'
  | 'finalizing'
  | 'complete'
  | 'error';

// ================================================================
// ERROR HANDLING
// ================================================================

export interface ReportGenerationError extends Error {
  code: string;
  stage: ReportProgressStage;
  recoverable: boolean;
  retryAfter?: number;
  context?: Record<string, any>;
}

export interface ReportValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// ================================================================
// DATA MODELS (Re-export and extend existing types)
// ================================================================

// Re-export existing types for convenience (commented out to avoid circular imports)
// export type { Client } from '@/types/client';
// export type { CashFlowScenario, CashFlowProjection, ProjectionResult } from '@/types/cashflow';

// Extended data models for cross-assessment reporting
export interface CrossAssessmentData {
  client: any; // Using any to avoid circular import issues
  assessments: {
    atr?: ATRAssessment;
    cfl?: CFLAssessment;
    suitability?: SuitabilityAssessment;
    vulnerability?: VulnerabilityAssessment;
  };
  scenarios: {
    cashflow?: any[]; // Using any to avoid circular import issues
    stressTest?: StressTestScenario[];
    monteCarlo?: MonteCarloScenario[];
  };
  analytics?: CrossAssessmentAnalytics;
}

export interface CrossAssessmentAnalytics {
  consistencyScore: number; // 0-1
  riskProfileAlignment: 'aligned' | 'partial' | 'misaligned';
  recommendations: RecommendationItem[];
  redFlags: AlertItem[];
  opportunities: OpportunityItem[];
}

export interface RecommendationItem {
  id: string;
  category: 'investment' | 'planning' | 'risk' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string;
  actionRequired: boolean;
  dueDate?: Date;
  relatedAssessments: string[];
}

export interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  category: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string; // Which assessment/service flagged this
  actionRequired: boolean;
  resolvedAt?: Date;
}

export interface OpportunityItem {
  id: string;
  category: string;
  title: string;
  description: string;
  potentialValue: number;
  probability: number; // 0-1
  timeframe: string;
  requirements: string[];
}

// ================================================================
// ASSESSMENT TYPES (Placeholders for existing assessment types)
// ================================================================

export interface ATRAssessment {
  id: string;
  clientId: string;
  riskScore: number;
  riskCategory: 'Conservative' | 'Moderate' | 'Adventurous';
  responses: Record<string, any>;
  completedAt: Date;
  // Add other ATR-specific fields as needed
}

export interface CFLAssessment {
  id: string;
  clientId: string;
  capacityScore: number;
  capacityLevel: 'Low' | 'Medium' | 'High';
  responses: Record<string, any>;
  completedAt: Date;
  // Add other CFL-specific fields as needed
}

export interface SuitabilityAssessment {
  id: string;
  clientId: string;
  suitabilityScore: number;
  recommendations: string[];
  responses: Record<string, any>;
  completedAt: Date;
  // Add other suitability-specific fields as needed
}

export interface VulnerabilityAssessment {
  id: string;
  clientId: string;
  vulnerabilityFlags: string[];
  protectionMeasures: string[];
  completedAt: Date;
  // Add other vulnerability-specific fields as needed
}

export interface StressTestScenario {
  id: string;
  name: string;
  parameters: Record<string, number>;
  results: StressTestResults;
}

export interface StressTestResults {
  worstCaseValue: number;
  probabilityOfLoss: number;
  maxDrawdown: number;
  recoveryTime: number;
  scenarios: Array<{
    name: string;
    probability: number;
    impact: number;
    portfolioValue: number;
  }>;
}

export interface MonteCarloScenario {
  id: string;
  name: string;
  iterations: number;
  results: MonteCarloResults;
}

export interface MonteCarloResults {
  successProbability: number;
  medianValue: number;
  percentiles: Record<number, number>; // 5th, 25th, 75th, 95th, etc.
  distribution: Array<{
    value: number;
    probability: number;
  }>;
}

// ================================================================
// SERVICE INTERFACES
// ================================================================

export interface IReportService {
  generateReport(request: UnifiedReportRequest): Promise<UnifiedReportResult>;
  getReportStatus(reportId: string): Promise<ReportStatus>;
  cancelReport(reportId: string): Promise<boolean>;
}

export interface ReportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: ReportProgress;
  createdAt: Date;
  completedAt?: Date;
  result?: UnifiedReportResult;
}

// ================================================================
// TEMPLATE SYSTEM
// ================================================================

export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  content: string;
  variables: TemplateVariable[];
  settings: TemplateSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'html' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: VariableValidation;
}

export interface VariableValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  custom?: string; // Custom validation function name
}

export interface TemplateSettings {
  allowHtml: boolean;
  escapeVariables: boolean;
  requiresSignature: boolean;
  hasCharts: boolean;
  isRegulated: boolean;
  outputFormats: ReportFormat[];
  cacheEnabled: boolean;
  cacheTtl?: number;
}

// ================================================================
// UTILITY TYPES
// ================================================================

export interface ReportConfiguration {
  [key: string]: any; // Simplified to avoid generic type issues
}

// Helper type for extracting report options for specific report types
export type ReportOptionsFor<T extends ReportType> = T extends 'cashflow'
  ? ReportOptions & { cashflowSpecific?: any }
  : T extends 'stress-test'
  ? ReportOptions & { stressTestSpecific?: any }
  : ReportOptions;
export type ReportTemplateType = 'cashflow' | 'suitability' | 'review';

export type AccessibilityFontSize = 'small' | 'medium' | 'large';

export interface EnhancedReportOptions {
  includeCharts: boolean;
  includeAssumptions: boolean;
  includeRiskAnalysis: boolean;
  includeProjectionTable: boolean;
  reportPeriodYears?: number;
  comparisonScenarios?: string[];
  outputFormat: 'html' | 'pdf' | 'excel' | 'powerpoint';
  chartTypes?: ('portfolio' | 'income_expense' | 'asset_allocation' | 'risk_analysis')[];
  locale?: string;
  theme?: 'light' | 'dark' | 'auto';
  accessibility?: {
    highContrast: boolean;
    fontSize: AccessibilityFontSize;
    screenReader: boolean;
  };
  customizations?: {
    logo?: string;
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
  };
}

export interface EnhancedReportResult {
  success: boolean;
  document?: any;
  error?: string;
  downloadUrl?: string;
  previewUrl?: string;
  chartUrls?: string[];
  metadata?: ReportMetadata;
  version?: string;
  generatedAt?: Date;
  expiresAt?: Date;
}

export interface ReportMetadata {
  id: string;
  scenarioId: string;
  clientId: string;
  templateType: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  fileSize: number;
  pageCount?: number;
  language: string;
  accessibility: boolean;
}

export interface ReportProgress {
  stage:
    | 'initializing'
    | 'gathering_data'
    | 'generating_charts'
    | 'creating_document'
    | 'finalizing'
    | 'complete'
    | 'error';
  progress: number;
  message: string;
  currentStep?: string;
  totalSteps?: number;
  estimatedTimeRemaining?: number;
}

export interface ReportGenerationError extends Error {
  code: string;
  stage: string;
  recoverable: boolean;
  retryAfter?: number;
}

// ===================================================================
// src/types/document.ts - COMPLETE UPDATED FILE
// Updated with all missing types to resolve TypeScript errors
// ===================================================================

// Base Document Types
export interface Document {
  id: string;
  name: string;
  description?: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category_id?: string;
  client_id?: string;
  advisor_id: string;
  firm_id: string;
  status: DocumentStatus;
  compliance_status: ComplianceStatus;
  compliance_level: ComplianceLevel;
  signature_status?: SignatureStatus;
  signature_request_id?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  tags?: string[];
  version?: number;
  parent_document_id?: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_system: boolean;
  requires_signature: boolean;
  compliance_level: ComplianceLevel;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  content: string;
  merge_fields: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===================================================================
// EXTENDED DOCUMENT TYPE ENUM - FIXES WORKFLOW ENGINE ERRORS
// ===================================================================
export type DocumentType = 
  | 'suitability_report' 
  | 'annual_review' 
  | 'client_agreement' 
  | 'letter'
  | 'compliance_document'
  | 'risk_assessment'
  | 'meeting_notes'
  | 'product_information'
  | 'fact_find'
  | 'investment_proposal'
  | 'portfolio_review'
  // ↓ ADDED MISSING TYPES TO FIX TYPESCRIPT ERRORS ↓
  | 'transfer_value_analysis'
  | 'enhanced_suitability_process'
  | 'ongoing_monitoring'
  | 'pension_options_review'
  | 'drawdown_recommendation'
  | 'tax_planning'

// Status Types
export type DocumentStatus = 'active' | 'pending' | 'reviewed' | 'archived' | 'deleted';
export type ComplianceStatus = 'pending' | 'compliant' | 'non_compliant' | 'under_review' | 'exempt';
export type ComplianceLevel = 'standard' | 'high' | 'critical';
export type SignatureStatus = 'pending' | 'sent' | 'viewed' | 'completed' | 'expired' | 'cancelled';

// ===================================================================
// AUTH TYPES - FIXES AUTH DEBUG PANEL ERRORS
// ===================================================================
export interface UserSession {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      firm_id?: string;
      full_name?: string;
      firm_name?: string;
    };
  };
  access_token?: string;
  refresh_token?: string;
}

export interface AuthEvent {
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY';
  session: UserSession | null;
}

// ===================================================================
// WORKFLOW TYPES - FOR DOCUMENT TEMPLATE SERVICE
// ===================================================================
export interface WorkflowSuggestion {
  id: string;
  type: DocumentType;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  auto_populate?: boolean;
  estimated_time?: number;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'select' | 'textarea';
  label: string;
  required: boolean;
  auto_populate_from?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface GeneratedDocument extends Document {
  template_id?: string;
  variable_values?: Record<string, any>;
  generated_at?: string;
  sent_for_signature_at?: string;
  signed_at?: string;
  completed_at?: string;
}

// ===================================================================
// EXISTING ANALYTICS AND METRICS
// ===================================================================
export interface DocumentMetrics {
  total_documents: number;
  by_category: Array<{ category: string; count: number }>;
  by_status: Array<{ status: DocumentStatus; count: number }>;
  by_compliance: Array<{ status: ComplianceStatus; count: number }>;
  recent_uploads: number;
  pending_signatures: number;
  expiring_soon: number;
  storage_used: number;
  storage_limit: number;
}

// ===================================================================
// API REQUEST/RESPONSE TYPES
// ===================================================================
export interface DocumentListParams {
  page?: number;
  limit?: number;
  category_id?: string;
  client_id?: string;
  status?: DocumentStatus;
  compliance_status?: ComplianceStatus;
  search?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'file_size';
  sort_order?: 'asc' | 'desc';
}

export interface DocumentUploadRequest {
  name: string;
  description?: string;
  category_id?: string;
  client_id?: string;
  file: File;
  compliance_level?: ComplianceLevel;
  expiry_date?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentUploadResponse {
  success: boolean;
  document?: Document;
  error?: string;
  upload_url?: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DocumentSearchResult {
  documents: Document[];
  total_matches: number;
  search_time_ms: number;
  suggestions?: string[];
}

// ===================================================================
// FILTER TYPES
// ===================================================================
export interface DocumentFilters {
  categories?: string[];
  statuses?: DocumentStatus[];
  compliance_statuses?: ComplianceStatus[];
  date_range?: {
    start: string;
    end: string;
  };
  file_types?: string[];
  clients?: string[];
  search?: string;
}

// ===================================================================
// SIGNATURE TYPES
// ===================================================================
export interface SignatureRequest {
  id: string;
  document_id: string;
  status: SignatureStatus;
  subject: string;
  message?: string;
  signers: SignatureSigner[];
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  completed_at?: string;
}

export interface SignatureRequestCreate {
  document_id: string;
  signers: Array<{
    email: string;
    name: string;
    role?: string;
  }>;
  subject?: string;
  message?: string;
  expires_at?: string;
  requires_all_signers?: boolean;
}

export interface SignatureSigner {
  id: string;
  email: string;
  name: string;
  role?: string;
  status: SignatureStatus;
  signed_at?: string;
  signed_ip?: string;
}

// ===================================================================
// UTILITY TYPES
// ===================================================================
// Alias for backward compatibility
export type DocumentUploadInput = DocumentUploadRequest;

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===================================================================
// ERROR TYPES
// ===================================================================
export class DocumentError extends Error {
  code: string;
  statusCode?: number;
  details?: any;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'DocumentError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ===================================================================
// CONSTANTS
// ===================================================================
export const DOCUMENT_STATUSES: DocumentStatus[] = ['active', 'pending', 'reviewed', 'archived', 'deleted'];
export const COMPLIANCE_STATUSES: ComplianceStatus[] = ['pending', 'compliant', 'non_compliant', 'under_review', 'exempt'];
export const COMPLIANCE_LEVELS: ComplianceLevel[] = ['standard', 'high', 'critical'];
export const SIGNATURE_STATUSES: SignatureStatus[] = ['pending', 'sent', 'viewed', 'completed', 'expired', 'cancelled'];

export const DOCUMENT_TYPES: DocumentType[] = [
  'suitability_report',
  'annual_review',
  'client_agreement',
  'letter',
  'compliance_document',
  'risk_assessment',
  'meeting_notes',
  'product_information',
  'fact_find',
  'investment_proposal',
  'portfolio_review',
  'transfer_value_analysis',
  'enhanced_suitability_process',
  'ongoing_monitoring',
  'pension_options_review',
  'drawdown_recommendation',
  'tax_planning'
];

export const MAX_FILE_SIZE = 52428800; // 50MB in bytes
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif'
];

export const FILE_TYPE_EXTENSIONS = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif'
};

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================
export function isValidDocumentType(type: any): type is DocumentType {
  return typeof type === 'string' && DOCUMENT_TYPES.includes(type as DocumentType);
}

export function isValidDocumentStatus(status: any): status is DocumentStatus {
  return typeof status === 'string' && DOCUMENT_STATUSES.includes(status as DocumentStatus);
}

export function isValidComplianceStatus(status: any): status is ComplianceStatus {
  return typeof status === 'string' && COMPLIANCE_STATUSES.includes(status as ComplianceStatus);
}

export function isValidSignatureStatus(status: any): status is SignatureStatus {
  return typeof status === 'string' && SIGNATURE_STATUSES.includes(status as SignatureStatus);
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

export function isAllowedFileType(fileType: string): boolean {
  return ALLOWED_FILE_TYPES.includes(fileType);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
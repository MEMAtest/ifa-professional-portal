// ===================================================================
// src/types/document.ts - PRODUCTION READY - Complete File
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

// Status Types
export type DocumentStatus = 'active' | 'pending' | 'reviewed' | 'archived' | 'deleted';
export type ComplianceStatus = 'pending' | 'compliant' | 'non_compliant' | 'under_review' | 'exempt';
export type ComplianceLevel = 'standard' | 'high' | 'critical';
export type SignatureStatus = 'pending' | 'sent' | 'viewed' | 'completed' | 'expired' | 'cancelled';

// Analytics and Metrics
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

// API Request/Response Types
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

// Filter Types
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

// Signature Types
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

// Alias for backward compatibility
export type DocumentUploadInput = DocumentUploadRequest;

// Error Types
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

// Constants
export const DOCUMENT_STATUSES: DocumentStatus[] = ['active', 'pending', 'reviewed', 'archived', 'deleted'];
export const COMPLIANCE_STATUSES: ComplianceStatus[] = ['pending', 'compliant', 'non_compliant', 'under_review', 'exempt'];
export const COMPLIANCE_LEVELS: ComplianceLevel[] = ['standard', 'high', 'critical'];
export const SIGNATURE_STATUSES: SignatureStatus[] = ['pending', 'sent', 'viewed', 'completed', 'expired', 'cancelled'];

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
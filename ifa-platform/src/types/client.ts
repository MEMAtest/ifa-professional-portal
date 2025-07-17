// ===================================================================
// src/types/client.ts - PRODUCTION READY - Complete File
// ===================================================================

// Foundation AI Integration Types
export interface FoundationUser {
  id: string;
  email: string;
  firm_id: string;
  role: 'admin' | 'senior_advisor' | 'junior_advisor' | 'read_only';
}

// Core Client Types
export interface PersonalDetails {
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'civil_partnership' | 'other';
  dependents: number;
  employmentStatus: 'employed' | 'self_employed' | 'retired' | 'unemployed' | 'student' | 'other';
  occupation: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export interface CommunicationPreferences {
  marketing: boolean;
  newsletters: boolean;
  smsUpdates: boolean;
}

export interface ContactInfo {
  email: string;
  phone?: string;
  mobile?: string;
  address: Address;
  preferredContact: 'email' | 'phone' | 'mobile' | 'post';
  communicationPreferences: CommunicationPreferences;
}

export interface FinancialProfile {
  annualIncome: number;
  netWorth: number;
  liquidAssets: number;
  monthlyExpenses: number;
  investmentTimeframe: string;
  investmentObjectives: string[];
  existingInvestments: Investment[];
  pensionArrangements: PensionArrangement[];
  insurancePolicies: InsurancePolicy[];
}

export interface Investment {
  id: string;
  type: 'isa' | 'pension' | 'general_investment' | 'property' | 'savings' | 'other';
  provider: string;
  currentValue: number;
  monthlyContribution?: number;
  description?: string;
}

export interface PensionArrangement {
  id: string;
  type: 'defined_benefit' | 'defined_contribution' | 'sipp' | 'ssas' | 'state_pension';
  provider: string;
  currentValue?: number;
  monthlyContribution?: number;
  expectedRetirementAge?: number;
  description?: string;
}

export interface InsurancePolicy {
  id: string;
  type: 'life' | 'critical_illness' | 'income_protection' | 'private_medical' | 'other';
  provider: string;
  coverAmount: number;
  monthlyPremium: number;
  expiryDate?: string;
  description?: string;
}

export interface VulnerabilityAssessment {
  is_vulnerable: boolean;
  vulnerabilityFactors: string[];
  supportNeeds: string[];
  assessmentNotes: string;
  assessmentDate: string;
  reviewDate: string;
  assessorId: string;
  communicationAdjustments?: string[]; // ✅ ADDED: Missing property
  lastAssessed?: string | null; // ✅ ADDED: Missing property
}

export interface RiskProfile {
  riskTolerance: string;
  riskCapacity: string;
  attitudeToRisk: number;
  capacityForLoss: string;
  knowledgeExperience: string;
  lastAssessment: string;
  assessmentScore?: number;
  questionnaire?: Record<string, any>;
  assessmentHistory?: any[]; // ✅ ADDED: Missing property
}

// Client Status Types
export type ClientStatus = 'prospect' | 'active' | 'review_due' | 'inactive' | 'archived';

// Main Client Interface
export interface Client {
  id: string;
  createdAt: string;
  updatedAt: string;
  advisorId?: string | null;
  firmId?: string | null;
  clientRef?: string;
  personalDetails: PersonalDetails;
  contactInfo: ContactInfo;
  financialProfile: FinancialProfile;
  vulnerabilityAssessment: VulnerabilityAssessment;
  riskProfile: RiskProfile;
  status: ClientStatus;
}

// Form Data Types
export interface ClientFormData {
  personalDetails: PersonalDetails;
  contactInfo: ContactInfo;
  financialProfile: Partial<FinancialProfile>;
  vulnerabilityAssessment?: Partial<VulnerabilityAssessment>;
  riskProfile?: Partial<RiskProfile>;
  status?: ClientStatus;
  clientRef?: string; // ✅ ADDED: Missing clientRef property
}

// Search and Filter Types
export interface ClientFilters {
  status?: ClientStatus[];
  advisorId?: string;
  firmId?: string; // ✅ ADD THIS LINE
  riskLevel?: string[];
  vulnerabilityStatus?: boolean | 'all' | 'vulnerable' | 'not_vulnerable'; // ✅ FIXED: Allow string values
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClientListResponse {
  clients: Client[];
  total: number; // ✅ Ensure this is 'total' not 'totalCount'
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchResult {
  clients: Client[];
  total: number; // ✅ FIXED: Changed from totalCount
  searchTime: number;
  suggestions: string[]; // ✅ FIXED: Remove optional to prevent undefined issues
}

// Statistics and Analytics
export interface ClientStatistics {
  totalClients: number;
  activeClients: number;
  prospectsCount: number;
  reviewsDue: number;
  vulnerableClients: number;
  highRiskClients: number;
  recentlyAdded: number;
  byStatus: Record<ClientStatus, number>;
  byRiskLevel: Record<string, number>;
  averagePortfolioValue: number;
  totalAssetsUnderManagement: number;
  newThisMonth: number; // ✅ ADDED: Missing property
  clientsByStatus: Record<ClientStatus, number>; // ✅ ADDED: Missing property
  clientsByRiskLevel: Record<string, number>; // ✅ ADDED: Missing property
}

// ✅ ADDED: Missing AuditLog interface
export interface AuditLog {
  id: string;
  clientId: string;
  action: string;
  details: Record<string, any>;
  performedBy: string;
  timestamp: string;
  resource?: string; // ✅ ADDED: Missing property
  createdAt?: string; // ✅ ADDED: Missing property
}

// ✅ ADDED: Missing RecentActivity interface
export interface RecentActivity {
  id: string;
  type: 'client_created' | 'client_updated' | 'review_completed' | 'document_uploaded' | 'assessment_completed';
  clientId: string;
  clientName: string;
  description: string;
  timestamp: string;
  performedBy: string;
}

// ✅ ADDED: Missing LegacyClientData interface
export interface LegacyClientData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth: string;
  annual_income?: number;
  net_worth?: number;
  risk_tolerance?: string;
  [key: string]: any;
}

// Communication and Review Types
export interface ClientCommunication {
  id: string;
  clientId: string;
  advisorId: string;
  communicationType: 'email' | 'phone' | 'meeting' | 'letter' | 'sms';
  subject: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'replied';
  createdAt: string;
  scheduledAt?: string;
  metadata?: Record<string, any>;
  communicationDate?: string; // ✅ ADDED: Missing property
  method?: string; // ✅ ADDED: Missing property
}

export interface ClientReview {
  id: string;
  clientId: string;
  advisorId: string;
  reviewType: 'annual' | 'semi_annual' | 'quarterly' | 'ad_hoc';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedDate?: string;
  notes?: string;
  outcomes?: string[];
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  documentId: string;
  documentType: 'suitability_report' | 'fact_find' | 'risk_assessment' | 'application_form' | 'other';
  isRequired: boolean;
  status: 'pending' | 'received' | 'approved' | 'rejected';
  uploadedAt?: string;
  expiryDate?: string;
}

export interface ClientAssessment {
  id: string;
  clientId: string;
  assessmentId: string;
  assessmentType: 'suitability' | 'risk_profile' | 'fact_find' | 'review';
  status: 'draft' | 'completed' | 'approved';
  completedAt?: string;
  score?: number;
  results?: Record<string, any>;
}

// Migration Types
export interface MigrationResult {
  success: boolean;
  clientsProcessed: number;
  clientsMigrated: number;
  errors: MigrationError[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  migratedCount?: number; // ✅ ADDED: Missing property
  skippedCount?: number; // ✅ ADDED: Missing property
  details?: any[]; // ✅ ADDED: Missing property
}

export interface MigrationError {
  clientId: string;
  status: 'error' | 'migrated' | 'skipped';
  reason?: string;
  message?: string; // ✅ ADDED: For backward compatibility and ReactNode rendering
}

// Error Types
export interface ClientError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationError extends ClientError {
  field: string;
  validationType: 'required' | 'format' | 'range' | 'custom';
}

// Component Props Types
export interface ClientListProps {
  clients: Client[];
  onClientSelect: (client: Client) => void;
  onClientEdit: (clientId: string) => void;
  onClientDelete: (clientId: string) => void;
  loading?: boolean;
  error?: string;
}

export interface ClientFormProps {
  client?: Client;
  onSave?: (client: ClientFormData) => Promise<void>;
  onSubmit?: (client: Client) => void;
  onCancel: () => void;
  loading?: boolean;
  isSubmitting?: boolean;
  errors?: Record<string, string>;
}

export interface ClientDetailsProps {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  onAddCommunication: () => void;
  onScheduleReview: () => void;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  suggestions?: string[];
  loading?: boolean;
}

export interface FilterPanelProps {
  filters: ClientFilters;
  onChange: (filters: ClientFilters) => void;
  onClear?: () => void;
  advisors?: { id: string; name: string }[];
}

export interface ClientCardProps {
  client: Client;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// Service Interface
export interface ClientService {
  getAllClients(filters?: ClientFilters, page?: number, limit?: number): Promise<ClientListResponse>;
  getClientById(id: string): Promise<Client>;
  createClient(client: ClientFormData): Promise<Client>;
  updateClient(id: string, updates: Partial<ClientFormData>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  searchClients(query: string, filters?: ClientFilters): Promise<SearchResult>;
  getClientStatistics(advisorId?: string): Promise<ClientStatistics>;
  getClientReviews(clientId: string): Promise<ClientReview[]>;
  createClientReview(review: Omit<ClientReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientReview>;
  getClientCommunications(clientId: string): Promise<ClientCommunication[]>;
  createClientCommunication(communication: Omit<ClientCommunication, 'id' | 'createdAt'>): Promise<ClientCommunication>;
  linkClientDocument(clientId: string, documentId: string, documentType: string): Promise<ClientDocument>;
  linkClientAssessment(clientId: string, assessmentId: string, assessmentType: string): Promise<ClientAssessment>;
  migrateClient(clientData: any, progressCallback: (progress: number, message: string) => void): Promise<MigrationResult>;
  getAuditLog(clientId: string): Promise<AuditLog[]>; // ✅ ADDED: Missing method
  migrateLegacyClients(clients: LegacyClientData[], progressCallback?: (progress: number, message: string) => void): Promise<MigrationResult>; // ✅ ADDED: Missing method
}

// Utility Types
export type CommunicationType = ClientCommunication['communicationType'];
export type ReviewType = ClientReview['reviewType'];
export type DocumentType = ClientDocument['documentType'];
export type AssessmentType = ClientAssessment['assessmentType'];

// Helper Functions
// Replace the getVulnerabilityStatus function in /src/types/client.ts with this version:

export function getVulnerabilityStatus(
  vulnerabilityAssessment?: VulnerabilityAssessment | null | any
): boolean {
  if (!vulnerabilityAssessment) {
    return false;
  }

  // Handle different data formats from the database
  // Check direct boolean
  if (typeof vulnerabilityAssessment.is_vulnerable === 'boolean') {
    return vulnerabilityAssessment.is_vulnerable;
  }
  
  // Check string boolean
  if (typeof vulnerabilityAssessment.is_vulnerable === 'string') {
    return vulnerabilityAssessment.is_vulnerable === 'true';
  }

  // Check variations in property names
  if (typeof vulnerabilityAssessment.isVulnerable === 'boolean') {
    return vulnerabilityAssessment.isVulnerable;
  }
  
  if (typeof vulnerabilityAssessment.isvulnerable === 'boolean') {
    return vulnerabilityAssessment.isvulnerable;
  }

  // Check if there are vulnerability factors (alternative way to determine vulnerability)
  if (Array.isArray(vulnerabilityAssessment.vulnerabilityFactors) && 
      vulnerabilityAssessment.vulnerabilityFactors.length > 0) {
    return true;
  }

  if (Array.isArray(vulnerabilityAssessment.vulnerability_factors) && 
      vulnerabilityAssessment.vulnerability_factors.length > 0) {
    return true;
  }

  // Default to false if we can't determine vulnerability status
  return false;
}

export function isValidClientStatus(status: any): status is ClientStatus {
  const validStatuses: ClientStatus[] = ['prospect', 'active', 'review_due', 'inactive', 'archived'];
  return typeof status === 'string' && validStatuses.includes(status as ClientStatus);
}

export function createVulnerabilityAssessment(
  isVulnerable: boolean, 
  options?: Partial<VulnerabilityAssessment>
): VulnerabilityAssessment {
  return {
    is_vulnerable: isVulnerable,
    vulnerabilityFactors: options?.vulnerabilityFactors || [],
    supportNeeds: options?.supportNeeds || [],
    assessmentNotes: options?.assessmentNotes || '',
    assessmentDate: options?.assessmentDate || new Date().toISOString(),
    reviewDate: options?.reviewDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    assessorId: options?.assessorId || '',
    ...options
  };
}

export function validateClientData(data: Partial<ClientFormData>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!data.personalDetails?.firstName) {
    errors.push({
      code: 'REQUIRED_FIELD',
      message: 'First name is required',
      field: 'personalDetails.firstName',
      validationType: 'required'
    });
  }
  
  if (!data.personalDetails?.lastName) {
    errors.push({
      code: 'REQUIRED_FIELD',
      message: 'Last name is required',
      field: 'personalDetails.lastName',
      validationType: 'required'
    });
  }
  
  if (data.contactInfo?.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactInfo.email)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Please enter a valid email address',
        field: 'contactInfo.email',
        validationType: 'format'
      });
    }
  }
  
  if (data.status && !isValidClientStatus(data.status)) {
    errors.push({
      code: 'INVALID_VALUE',
      message: 'Please select a valid status',
      field: 'status',
      validationType: 'custom'
    });
  }
  
  return errors;
}

// ✅ ADDED: Missing helper functions
export function getDefaultClientFormData(): ClientFormData {
  return {
    personalDetails: {
      title: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      nationality: '',
      maritalStatus: 'single',
      dependents: 0,
      employmentStatus: 'employed',
      occupation: ''
    },
    contactInfo: {
      email: '',
      phone: '',
      mobile: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        county: '',
        postcode: '',
        country: 'United Kingdom'
      },
      preferredContact: 'email',
      communicationPreferences: {
        marketing: false,
        newsletters: false,
        smsUpdates: false
      }
    },
    financialProfile: {
      annualIncome: 0,
      netWorth: 0,
      liquidAssets: 0,
      monthlyExpenses: 0,
      investmentTimeframe: '',
      investmentObjectives: [],
      existingInvestments: [],
      pensionArrangements: [],
      insurancePolicies: []
    },
    vulnerabilityAssessment: {
      is_vulnerable: false,
      vulnerabilityFactors: [],
      supportNeeds: [],
      assessmentNotes: '',
      assessmentDate: new Date().toISOString(),
      reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      assessorId: ''
    },
    riskProfile: {
      riskTolerance: '',
      riskCapacity: '',
      attitudeToRisk: 5,
      capacityForLoss: '',
      knowledgeExperience: '',
      lastAssessment: new Date().toISOString()
    },
    status: 'prospect'
  };
}

// ✅ ADDED: Alias for backward compatibility
export const validateClientFormData = validateClientData;
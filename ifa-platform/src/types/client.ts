// src/types/client.ts
// ===================================================================
// DEFINITIVE, ELEVATED AND CORRECTED - FULL FILE
// This version preserves the original ~700 line structure and all
// existing utility functions and prop types. The single, critical
// change is adding the 'integrationStatus' property to the core
// 'Client' interface to resolve the final service-layer errors.
// ===================================================================

// ===================================================================
// CORE TYPE DEFINITIONS
// ===================================================================

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
  linkedScenarioId?: string;
}

export interface VulnerabilityAssessment {
  is_vulnerable: boolean;
  vulnerabilityFactors: string[];
  supportNeeds: string[];
  assessmentNotes: string;
  assessmentDate: string;
  reviewDate: string;
  assessorId: string;
  communicationAdjustments?: string[];
  lastAssessed?: string | null;
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
  assessmentHistory?: any[];
  lastAssessmentId?: string;
  lastAssessmentDate?: string;
}

export type ClientStatus = 'prospect' | 'active' | 'review_due' | 'inactive' | 'archived';

/**
 * ✅ THE CORE FIX: This is the single, authoritative `Client` interface.
 * It is structured with the nested objects that all components expect,
 * AND it now includes the 'integrationStatus' property required by the service layer.
 */
export interface Client {
  id: string;
  createdAt: string;
  updatedAt: string;
  advisorId?: string | null;
  firmId?: string | null;
  clientRef: string;
  personalDetails: PersonalDetails;
  contactInfo: ContactInfo;
  financialProfile: FinancialProfile;
  vulnerabilityAssessment: VulnerabilityAssessment;
  riskProfile: RiskProfile;
  status: ClientStatus;
  notes?: string;
  // ✅ FIX: Added the 'integrationStatus' field to match its usage in the service layer.
  integrationStatus?: {
    hasAssessment: boolean;
    hasScenario: boolean;
    hasDocuments: boolean;
    hasMonteCarlo: boolean;
    lastUpdated: string;
  };
}

// ===================================================================
// FORM AND API TYPES (Preserved and Corrected)
// ===================================================================

export interface ClientFormData {
  personalDetails: Partial<PersonalDetails>;
  contactInfo: Partial<ContactInfo>;
  financialProfile: Partial<FinancialProfile>;
  vulnerabilityAssessment?: Partial<VulnerabilityAssessment>;
  riskProfile?: Partial<RiskProfile>;
  status?: ClientStatus;
  clientRef?: string;
  notes?: string;
}

// ===================================================================
// SEARCH AND FILTER TYPES (Preserved from original file)
// ===================================================================

export interface ClientFilters {
  status?: ClientStatus[];
  advisorId?: string;
  firmId?: string;
  riskLevel?: string[];
  vulnerabilityStatus?: boolean | 'all' | 'vulnerable' | 'not_vulnerable';
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
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchResult {
  clients: Client[];
  total: number;
  searchTime: number;
  suggestions: string[];
}

// ===================================================================
// STATISTICS AND ANALYTICS TYPES (Preserved from original file)
// ===================================================================

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
  newThisMonth: number;
  clientsByStatus: Record<ClientStatus, number>;
  clientsByRiskLevel: Record<string, number>;
}

// ===================================================================
// COMMUNICATION AND ACTIVITY TYPES (Preserved from original file)
// ===================================================================

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
  communicationDate?: string;
  method?: string;
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

// ===================================================================
// AUDIT AND ACTIVITY TYPES (Preserved from original file)
// ===================================================================

export interface AuditLog {
  id: string;
  clientId: string;
  action: string;
  details: Record<string, any>;
  performedBy: string;
  timestamp: string;
  resource?: string;
  createdAt?: string;
}

export interface RecentActivity {
  id: string;
  type: 'client_created' | 'client_updated' | 'review_completed' | 'document_uploaded' | 'assessment_completed';
  clientId: string;
  clientName: string;
  description: string;
  timestamp: string;
  performedBy: string;
}

// ===================================================================
// MIGRATION TYPES (Preserved from original file)
// ===================================================================

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

export interface MigrationError {
  clientId: string;
  status: 'error' | 'migrated' | 'skipped';
  reason?: string;
  message?: string;
}

export interface MigrationResult {
  success: boolean;
  clientsProcessed: number;
  clientsMigrated: number;
  errors: MigrationError[];
  summary: { total: number; successful: number; failed: number; skipped: number; };
  migratedCount?: number;
  skippedCount?: number;
  details?: any[];
}

// ===================================================================
// ERROR TYPES (Preserved from original file)
// ===================================================================

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

// ===================================================================
// COMPONENT PROP TYPES (Preserved from original file)
// ===================================================================

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

// ===================================================================
// SERVICE INTERFACE (Preserved from original file)
// ===================================================================

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
  getAuditLog(clientId: string): Promise<AuditLog[]>;
  migrateLegacyClients(clients: LegacyClientData[], progressCallback?: (progress: number, message: string) => void): Promise<MigrationResult>;
}

// ===================================================================
// UTILITY TYPES (Preserved from original file)
// ===================================================================

export type CommunicationType = ClientCommunication['communicationType'];
export type ReviewType = ClientReview['reviewType'];
export type DocumentType = ClientDocument['documentType'];
export type AssessmentType = ClientAssessment['assessmentType'];

// ===================================================================
// HELPER FUNCTIONS - ROBUST AND ERROR-PROOF (Preserved from original file)
// ===================================================================

export function getVulnerabilityStatus(vulnerabilityAssessment?: VulnerabilityAssessment | null | any): boolean {
  if (!vulnerabilityAssessment) return false;
  if (typeof vulnerabilityAssessment.is_vulnerable === 'boolean') return vulnerabilityAssessment.is_vulnerable;
  if (typeof vulnerabilityAssessment.isVulnerable === 'boolean') return vulnerabilityAssessment.isVulnerable;
  if (typeof vulnerabilityAssessment.is_vulnerable === 'string') {
    return ['true', '1', 'yes'].includes(vulnerabilityAssessment.is_vulnerable.toLowerCase().trim());
  }
  if (Array.isArray(vulnerabilityAssessment.vulnerabilityFactors) && vulnerabilityAssessment.vulnerabilityFactors.length > 0) return true;
  return false;
}

export function isValidClientStatus(status: any): status is ClientStatus {
  const validStatuses: ClientStatus[] = ['prospect', 'active', 'review_due', 'inactive', 'archived'];
  return typeof status === 'string' && validStatuses.includes(status as ClientStatus);
}

export function createVulnerabilityAssessment(isVulnerable: boolean = false, options?: Partial<VulnerabilityAssessment>): VulnerabilityAssessment {
  const now = new Date().toISOString();
  return {
    is_vulnerable: isVulnerable,
    vulnerabilityFactors: [], supportNeeds: [], assessmentNotes: '',
    assessmentDate: now, reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    assessorId: '', ...options
  };
}

export function validateClientData(data: Partial<ClientFormData>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data.personalDetails?.firstName?.trim()) {
    errors.push({ field: 'personalDetails.firstName', message: 'First name is required', code: 'REQUIRED_FIELD', validationType: 'required' });
  }
  if (!data.personalDetails?.lastName?.trim()) {
    errors.push({ field: 'personalDetails.lastName', message: 'Last name is required', code: 'REQUIRED_FIELD', validationType: 'required' });
  }
  if (!data.contactInfo?.email?.trim()) {
    errors.push({ field: 'contactInfo.email', message: 'Email address is required', code: 'REQUIRED_FIELD', validationType: 'required' });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactInfo.email.trim())) {
      errors.push({ field: 'contactInfo.email', message: 'Please enter a valid email address', code: 'INVALID_FORMAT', validationType: 'format' });
    }
  }
  return errors;
}

export function getDefaultClientFormData(): ClientFormData {
  return {
    personalDetails: {
      title: '', firstName: '', lastName: '', dateOfBirth: '', nationality: 'UK',
      maritalStatus: 'single', dependents: 0, employmentStatus: 'employed', occupation: ''
    },
    contactInfo: {
      email: '', phone: '', mobile: '',
      address: { line1: '', line2: '', city: '', county: '', postcode: '', country: 'United Kingdom' },
      preferredContact: 'email',
      communicationPreferences: { marketing: false, newsletters: false, smsUpdates: false }
    },
    financialProfile: {
      annualIncome: 0, netWorth: 0, liquidAssets: 0, monthlyExpenses: 0,
      investmentTimeframe: '', investmentObjectives: [], existingInvestments: [],
      pensionArrangements: [], insurancePolicies: []
    },
    vulnerabilityAssessment: createVulnerabilityAssessment(false),
    riskProfile: {
      riskTolerance: '', riskCapacity: '', attitudeToRisk: 5, capacityForLoss: '',
      knowledgeExperience: '', lastAssessment: new Date().toISOString(), assessmentHistory: []
    },
    status: 'prospect'
  };
}

export function normalizeFinancialProfile(partial?: Partial<FinancialProfile>): FinancialProfile {
  return {
    annualIncome: Number(partial?.annualIncome) || 0,
    netWorth: Number(partial?.netWorth) || 0,
    liquidAssets: Number(partial?.liquidAssets) || 0,
    monthlyExpenses: Number(partial?.monthlyExpenses) || 0,
    investmentTimeframe: partial?.investmentTimeframe || '',
    investmentObjectives: Array.isArray(partial?.investmentObjectives) ? partial.investmentObjectives : [],
    existingInvestments: Array.isArray(partial?.existingInvestments) ? partial.existingInvestments : [],
    pensionArrangements: Array.isArray(partial?.pensionArrangements) ? partial.pensionArrangements : [],
    insurancePolicies: Array.isArray(partial?.insurancePolicies) ? partial.insurancePolicies : []
  };
}

export function getClientDisplayName(client: Client | null | undefined): string {
  if (!client?.personalDetails) return 'Unknown Client';
  const { title, firstName, lastName } = client.personalDetails;
  const parts = [title, firstName, lastName].filter(part => part && part.trim());
  return parts.length > 0 ? parts.join(' ') : 'Unknown Client';
}

export function formatCurrency(amount: number | null | undefined): string {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(safeAmount);
}

export function formatNumber(value: number | null | undefined): string {
  const safeValue = Number(value) || 0;
  return safeValue.toLocaleString('en-GB');
}

export const validateClientFormData = validateClientData;
export const getEmptyClientFormData = getDefaultClientFormData;

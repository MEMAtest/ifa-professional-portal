// src/services/ClientService.ts
// ✅ DEFINITIVE VERSION - Complete functionality + robust data transformation

import type {
  Client,
  ClientFormData,
  ClientFilters,
  ClientListResponse,
  SearchResult,
  ClientStatistics,
  ClientReview,
  ClientCommunication,
  ClientDocument,
  ClientAssessment,
  AuditLog,
  ClientStatus,
  MigrationResult,
  MigrationError,
  RecentActivity,
  LegacyClientData,
  ValidationError
} from '@/types/client';

import {
  getVulnerabilityStatus,
  isValidClientStatus,
  createVulnerabilityAssessment,
  validateClientData
} from '@/types/client';
import { supabase } from '@/lib/supabase';

// Extended interface for internal use with clientRef
interface ClientFormDataWithRef extends ClientFormData {
  clientRef?: string;
}

export class ClientService {
  private static instance: ClientService;
  private baseUrl = '/api/clients';

  public static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService();
    }
    return ClientService.instance;
  }

  /**
   * Generate client reference
   */
  private generateClientReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `CLI${timestamp}${random}`;
  }

  /**
   * ✅ DEFINITIVE ROBUST Transform - Handles ALL data formats
   * This method handles snake_case, camelCase, and mixed JSONB field variations
   */
  private transformClientData(data: any): Client {
    console.log('🔄 Transforming client data:', {
      id: data.id,
      hasPersonalDetails: !!data.personal_details,
      hasVulnerability: !!data.vulnerability_assessment,
      vulnerabilityValue: data.vulnerability_assessment?.is_vulnerable
    });

    // ✅ CRITICAL FIX: Handle personal details JSONB structure properly
    const personalDetails = {
      title: data.personal_details?.title || data.personalDetails?.title || '',
      firstName: data.personal_details?.firstName || 
                data.personal_details?.firstname || 
                data.personalDetails?.firstName || 
                data.personalDetails?.firstname || '',
      lastName: data.personal_details?.lastName || 
               data.personal_details?.lastname || 
               data.personalDetails?.lastName || 
               data.personalDetails?.lastname || '',
      dateOfBirth: data.personal_details?.dateOfBirth || 
                   data.personal_details?.date_of_birth || 
                   data.personalDetails?.dateOfBirth || 
                   data.personalDetails?.date_of_birth || '',
      nationality: data.personal_details?.nationality || 
                  data.personalDetails?.nationality || 'UK',
      maritalStatus: data.personal_details?.maritalStatus || 
                     data.personal_details?.marital_status || 
                     data.personalDetails?.maritalStatus || 
                     data.personalDetails?.marital_status || 'single',
      dependents: parseInt(data.personal_details?.dependents) || 
                 parseInt(data.personalDetails?.dependents) || 0,
      employmentStatus: data.personal_details?.employmentStatus || 
                        data.personal_details?.employment_status || 
                        data.personalDetails?.employmentStatus || 
                        data.personalDetails?.employment_status || 'employed',
      occupation: data.personal_details?.occupation || 
                 data.personalDetails?.occupation || ''
    };

    // ✅ CRITICAL FIX: Handle contact info JSONB structure properly  
    const contactInfo = {
      email: data.contact_info?.email || data.contactInfo?.email || '',
      phone: data.contact_info?.phone || data.contactInfo?.phone || '',
      mobile: data.contact_info?.mobile || data.contactInfo?.mobile || '',
      address: {
        line1: data.contact_info?.address?.line1 || 
               data.contactInfo?.address?.line1 || '',
        line2: data.contact_info?.address?.line2 || 
               data.contactInfo?.address?.line2 || '',
        city: data.contact_info?.address?.city || 
              data.contactInfo?.address?.city || '',
        county: data.contact_info?.address?.county || 
                data.contactInfo?.address?.county || '',
        postcode: data.contact_info?.address?.postcode || 
                  data.contactInfo?.address?.postcode || '',
        country: data.contact_info?.address?.country || 
                 data.contactInfo?.address?.country || 'UK'
      },
      preferredContact: data.contact_info?.preferredContact || 
                        data.contact_info?.preferred_contact || 
                        data.contactInfo?.preferredContact || 
                        data.contactInfo?.preferred_contact || 'email',
      communicationPreferences: {
        marketing: data.contact_info?.communicationPreferences?.marketing || 
                  data.contact_info?.communication_preferences?.marketing || 
                  data.contactInfo?.communicationPreferences?.marketing || 
                  data.contactInfo?.communication_preferences?.marketing || false,
        newsletters: data.contact_info?.communicationPreferences?.newsletters || 
                    data.contact_info?.communication_preferences?.newsletters || 
                    data.contactInfo?.communicationPreferences?.newsletters || 
                    data.contactInfo?.communication_preferences?.newsletters || false,
        smsUpdates: data.contact_info?.communicationPreferences?.smsUpdates || 
                   data.contact_info?.communication_preferences?.sms_updates || 
                   data.contactInfo?.communicationPreferences?.smsUpdates || 
                   data.contactInfo?.communication_preferences?.sms_updates || false
      }
    };

    // ✅ CRITICAL FIX: Handle financial profile JSONB with number parsing
    const parseFinancialValue = (value: any): number => {
      if (typeof value === 'string') return parseFloat(value) || 0;
      return value || 0;
    };

    const financialProfile = {
      annualIncome: parseFinancialValue(
        data.financial_profile?.annualIncome || 
        data.financial_profile?.annual_income || 
        data.financialProfile?.annualIncome || 
        data.financialProfile?.annual_income
      ),
      netWorth: parseFinancialValue(
        data.financial_profile?.netWorth || 
        data.financial_profile?.net_worth || 
        data.financialProfile?.netWorth || 
        data.financialProfile?.net_worth
      ),
      liquidAssets: parseFinancialValue(
        data.financial_profile?.liquidAssets || 
        data.financial_profile?.liquid_assets || 
        data.financialProfile?.liquidAssets || 
        data.financialProfile?.liquid_assets
      ),
      monthlyExpenses: parseFinancialValue(
        data.financial_profile?.monthlyExpenses || 
        data.financial_profile?.monthly_expenses || 
        data.financialProfile?.monthlyExpenses || 
        data.financialProfile?.monthly_expenses
      ),
      investmentTimeframe: data.financial_profile?.investmentTimeframe || 
                           data.financial_profile?.investment_timeframe || 
                           data.financialProfile?.investmentTimeframe || 
                           data.financialProfile?.investment_timeframe || '',
      investmentObjectives: data.financial_profile?.investmentObjectives || 
                            data.financial_profile?.investment_objectives || 
                            data.financialProfile?.investmentObjectives || 
                            data.financialProfile?.investment_objectives || [],
      existingInvestments: data.financial_profile?.existingInvestments || 
                           data.financial_profile?.existing_investments || 
                           data.financialProfile?.existingInvestments || 
                           data.financialProfile?.existing_investments || [],
      pensionArrangements: data.financial_profile?.pensionArrangements || 
                           data.financial_profile?.pension_arrangements || 
                           data.financialProfile?.pensionArrangements || 
                           data.financialProfile?.pension_arrangements || [],
      insurancePolicies: data.financial_profile?.insurancePolicies || 
                         data.financial_profile?.insurance_policies || 
                         data.financialProfile?.insurancePolicies || 
                         data.financialProfile?.insurance_policies || []
    };

    // In ClientService.ts, replace the vulnerability assessment transformation section with this:

    // Handle vulnerability assessment - FIXED to properly parse boolean
    const vulnerabilityAssessment = {
      // Parse is_vulnerable as boolean - handle string "true"/"false" from DB
      is_vulnerable: data.vulnerability_assessment?.is_vulnerable === true || 
                     data.vulnerability_assessment?.is_vulnerable === 'true' ||
                     data.vulnerability_assessment?.isvulnerable === true ||
                     data.vulnerability_assessment?.isVulnerable === true,
      vulnerabilityFactors: data.vulnerability_assessment?.vulnerabilityfactors || 
                            data.vulnerability_assessment?.vulnerabilityFactors || 
                            data.vulnerability_assessment?.vulnerability_factors || 
                            [],
      supportNeeds: data.vulnerability_assessment?.supportneeds || 
                    data.vulnerability_assessment?.supportNeeds || 
                    data.vulnerability_assessment?.support_needs || 
                    [],
      assessmentNotes: data.vulnerability_assessment?.assessmentnotes || 
                       data.vulnerability_assessment?.assessmentNotes || 
                       data.vulnerability_assessment?.assessment_notes || 
                       '',
      assessmentDate: data.vulnerability_assessment?.assessmentdate || 
                      data.vulnerability_assessment?.assessmentDate || 
                      data.vulnerability_assessment?.assessment_date || 
                      new Date().toISOString(),
      reviewDate: data.vulnerability_assessment?.reviewdate || 
                  data.vulnerability_assessment?.reviewDate || 
                  data.vulnerability_assessment?.review_date || 
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      assessorId: data.vulnerability_assessment?.assessorid || 
                  data.vulnerability_assessment?.assessorId || 
                  data.vulnerability_assessment?.assessor_id || 
                  '',
      communicationAdjustments: data.vulnerability_assessment?.communicationadjustments || 
                                data.vulnerability_assessment?.communicationAdjustments || 
                                data.vulnerability_assessment?.communication_adjustments || 
                                [],
      lastAssessed: data.vulnerability_assessment?.lastassessed || 
                    data.vulnerability_assessment?.lastAssessed || 
                    data.vulnerability_assessment?.last_assessed || 
                    null
    };

    // ✅ CRITICAL FIX: Handle risk profile JSONB structure properly
    const riskProfile = {
      riskTolerance: data.risk_profile?.riskTolerance || 
                     data.risk_profile?.risk_tolerance || 
                     data.riskProfile?.riskTolerance || 
                     data.riskProfile?.risk_tolerance || '',
      riskCapacity: data.risk_profile?.riskCapacity || 
                    data.risk_profile?.risk_capacity || 
                    data.riskProfile?.riskCapacity || 
                    data.riskProfile?.risk_capacity || '',
      attitudeToRisk: parseInt(
        data.risk_profile?.attitudeToRisk || 
        data.risk_profile?.attitude_to_risk || 
        data.riskProfile?.attitudeToRisk || 
        data.riskProfile?.attitude_to_risk || '5'
      ) || 5,
      capacityForLoss: data.risk_profile?.capacityForLoss || 
                       data.risk_profile?.capacity_for_loss || 
                       data.riskProfile?.capacityForLoss || 
                       data.riskProfile?.capacity_for_loss || '',
      knowledgeExperience: data.risk_profile?.knowledgeExperience || 
                           data.risk_profile?.knowledge_experience || 
                           data.riskProfile?.knowledgeExperience || 
                           data.riskProfile?.knowledge_experience || '',
      lastAssessment: data.risk_profile?.lastAssessment || 
                      data.risk_profile?.last_assessment || 
                      data.riskProfile?.lastAssessment || 
                      data.riskProfile?.last_assessment || 
                      new Date().toISOString(),
      assessmentScore: data.risk_profile?.assessmentScore || 
                       data.risk_profile?.assessment_score || 
                       data.riskProfile?.assessmentScore || 
                       data.riskProfile?.assessment_score,
      questionnaire: data.risk_profile?.questionnaire || 
                     data.riskProfile?.questionnaire,
      assessmentHistory: data.risk_profile?.assessmentHistory || 
                         data.risk_profile?.assessment_history || 
                         data.riskProfile?.assessmentHistory || 
                         data.riskProfile?.assessment_history || []
    };

    // Final transformed client
    const transformedClient: Client = {
      id: data.id,
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
      advisorId: data.advisor_id || data.advisorId || null,
      firmId: data.firm_id || data.firmId || null,
      clientRef: data.client_ref || data.clientRef || '',
      personalDetails,
      contactInfo,
      financialProfile,
      vulnerabilityAssessment,
      riskProfile,
      status: data.status || 'prospect'
    };

    // Debug log the result
    console.log('✅ Transformed client result:', {
      id: transformedClient.id,
      name: `${personalDetails.firstName} ${personalDetails.lastName}`,
      vulnerable: vulnerabilityAssessment.is_vulnerable,
      clientRef: transformedClient.clientRef,
      hasVulnerabilityData: !!data.vulnerability_assessment
    });

    return transformedClient;
  }

  /**
   * Get all clients with optional filtering and pagination
   */
  async getAllClients(
    filters?: ClientFilters, 
    page: number = 1, 
    limit: number = 50
  ): Promise<ClientListResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      // Handle array filters properly
      if (filters?.status && filters.status.length > 0) {
        filters.status.forEach(status => params.append('status', status));
      }

      if (filters?.vulnerabilityStatus) {
        if (typeof filters.vulnerabilityStatus === 'boolean') {
          params.append('vulnerabilityStatus', filters.vulnerabilityStatus.toString());
        } else if (filters.vulnerabilityStatus !== 'all') {
          params.append('vulnerabilityStatus', filters.vulnerabilityStatus);
        }
      }

      if (filters?.searchQuery || filters?.search) {
        params.append('search', filters.searchQuery || filters.search || '');
      }

      if (filters?.sortBy) {
        params.append('sortBy', filters.sortBy);
      }

      if (filters?.sortOrder) {
        params.append('sortOrder', filters.sortOrder);
      }

      if (filters?.advisorId && filters.advisorId !== '') {
        params.append('advisorId', filters.advisorId);
      }

      if (filters?.firmId && filters.firmId !== 'default-firm') {
        params.append('firmId', filters.firmId);
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to fetch clients: ${response.statusText}`);
      }

      const result = await response.json();
      
      // ✅ CRITICAL: Transform all clients with robust data handling
      const transformedClients = (result.clients || []).map((client: any) => 
        this.transformClientData(client)
      );

      return {
        clients: transformedClients,
        total: result.total || 0,
        page: result.page || page,
        limit: result.limit || limit,
        totalPages: result.totalPages || 1
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch clients');
    }
  }

  /**
   * Get client by ID
   */
  async getClientById(id: string): Promise<Client> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to fetch client: ${response.statusText}`);
      }

      const result = await response.json();
      // ✅ CRITICAL: Use robust transformation for single client
      return this.transformClientData(result.client || result);
    } catch (error) {
      console.error('Error fetching client by ID:', error);
      throw error;
    }
  }

  /**
   * Create new client
   */
  async createClient(clientData: ClientFormData): Promise<Client> {
    try {
      const validationErrors = validateClientData(clientData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map((e: ValidationError) => e.message).join(', ')}`);
      }

      const clientRef = this.generateClientReference();

      const requestData: ClientFormDataWithRef = {
        ...clientData,
        clientRef,
        status: clientData.status || 'prospect'
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to create client: ${response.statusText}`);
      }

      const result = await response.json();
      return this.transformClientData(result.client || result);
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  /**
   * Update existing client
   */
  async updateClient(id: string, updates: Partial<ClientFormData>): Promise<Client> {
    try {
      if (Object.keys(updates).length > 0) {
        const validationErrors = validateClientData(updates);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.map((e: ValidationError) => e.message).join(', ')}`);
        }
      }

      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to update client: ${response.statusText}`);
      }

      const result = await response.json();
      return this.transformClientData(result.client || result);
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  /**
   * Delete client
   */
  async deleteClient(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to delete client: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  /**
   * Search clients using RPC function
   */
  async searchClients(query: string): Promise<SearchResult> {
    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.rpc('search_clients', {
        search_term: query
      });

      if (error) {
        console.error('Error calling search_clients RPC:', error);
        throw new Error('Failed to search clients.');
      }

      const transformedClients = (data || []).map((client: any) => 
        this.transformClientData(client)
      );
      const searchTime = Date.now() - startTime;
      
      return {
        clients: transformedClients,
        total: transformedClients.length,
        searchTime: searchTime,
        suggestions: this.generateSearchSuggestions(query)
      };
    } catch (error) {
      console.error('Error in searchClients service:', error);
      throw error;
    }
  }

  /**
   * Get client statistics
   */
  async getClientStatistics(advisorId?: string): Promise<ClientStatistics> {
    try {
      const params = advisorId ? `?advisorId=${advisorId}` : '';
      const response = await fetch(`${this.baseUrl}/statistics${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return this.getDefaultStatistics();
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return this.getDefaultStatistics();
    }
  }

  /**
   * Get recent client activity
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const response = await fetch(`${this.baseUrl}/activity?limit=${limit}`);
      
      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.activities || [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Update client status
   */
  async updateClientStatus(id: string, status: ClientStatus): Promise<Client> {
    if (!isValidClientStatus(status)) {
      throw new Error(`Invalid client status: ${status}`);
    }

    return this.updateClient(id, { status });
  }

  /**
   * Get clients by advisor
   */
  async getClientsByAdvisor(advisorId: string): Promise<Client[]> {
    const response = await this.getAllClients({ advisorId }, 1, 100);
    return response.clients;
  }

  // Review Management
  async getClientReviews(clientId: string): Promise<ClientReview[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${clientId}/reviews`);
      
      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.reviews || [];
    } catch (error) {
      console.error('Error fetching client reviews:', error);
      return [];
    }
  }

  async createClientReview(clientId: string, review: Partial<ClientReview>): Promise<ClientReview> {
    const response = await fetch(`${this.baseUrl}/${clientId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(review)
    });

    if (!response.ok) {
      throw new Error(`Failed to create review: ${response.statusText}`);
    }

    const result = await response.json();
    return result.review;
  }

  async updateClientReview(clientId: string, reviewId: string, updates: Partial<ClientReview>): Promise<ClientReview> {
    const response = await fetch(`${this.baseUrl}/${clientId}/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update review: ${response.statusText}`);
    }

    const result = await response.json();
    return result.review;
  }

  // Communication Management
  async getClientCommunications(clientId: string): Promise<ClientCommunication[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${clientId}/communications`);
      
      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.communications || [];
    } catch (error) {
      console.error('Error fetching communications:', error);
      return [];
    }
  }

  async createClientCommunication(clientId: string, communication: Partial<ClientCommunication>): Promise<ClientCommunication> {
    const response = await fetch(`${this.baseUrl}/${clientId}/communications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(communication)
    });

    if (!response.ok) {
      throw new Error(`Failed to create communication: ${response.statusText}`);
    }

    const result = await response.json();
    return result.communication;
  }

  // Document Management
  async getClientDocuments(clientId: string): Promise<ClientDocument[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${clientId}/documents`);
      
      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.documents || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  async uploadClientDocument(clientId: string, file: File, metadata: Partial<ClientDocument>): Promise<ClientDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${this.baseUrl}/${clientId}/documents`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload document: ${response.statusText}`);
    }

    const result = await response.json();
    return result.document;
  }

  async deleteClientDocument(clientId: string, documentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${clientId}/documents/${documentId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  }

  // Assessment Management
  async getClientAssessments(clientId: string): Promise<ClientAssessment[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${clientId}/assessments`);
      
      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.assessments || [];
    } catch (error) {
      console.error('Error fetching assessments:', error);
      return [];
    }
  }

  async createClientAssessment(clientId: string, assessment: Partial<ClientAssessment>): Promise<ClientAssessment> {
    const response = await fetch(`${this.baseUrl}/${clientId}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assessment)
    });

    if (!response.ok) {
      throw new Error(`Failed to create assessment: ${response.statusText}`);
    }

    const result = await response.json();
    return result.assessment;
  }

  // Audit Trail
  async getClientAuditTrail(clientId: string): Promise<AuditLog[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${clientId}/audit-trail`);
      
      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.auditLogs || [];
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      return [];
    }
  }

  // Data Migration
  async migrateLegacyClients(
    legacyData: LegacyClientData[],
    progressCallback?: (progress: number, message: string) => void
  ): Promise<MigrationResult> {
    const total = legacyData.length;
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const results: MigrationError[] = [];

    try {
      for (let i = 0; i < total; i++) {
        const legacy = legacyData[i];
        progressCallback?.((i / total) * 100, `Processing client ${i + 1} of ${total}`);

        try {
          const existing = await this.searchClients(legacy.email || '');
          if (existing.clients.length > 0) {
            skipped++;
            results.push({
              clientId: legacy.id || '',
              status: 'skipped',
              reason: 'Client already exists'
            });
            continue;
          }

          const clientData = this.transformLegacyData(legacy);
          await this.createClient(clientData);
          successful++;
        } catch (error) {
          failed++;
          results.push({
            clientId: legacy.id || '',
            status: 'error',
            reason: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      progressCallback?.(100, 'Migration completed');

      return {
        success: failed === 0,
        clientsProcessed: total,
        clientsMigrated: successful,
        errors: results.filter(r => r.status === 'error'),
        summary: {
          total,
          successful,
          failed,
          skipped
        },
        migratedCount: successful,
        skippedCount: skipped,
        details: []
      };

    } catch (error) {
      console.error('Error during batch migration:', error);
      throw error;
    }
  }

  // Private helper methods
  private transformLegacyData(legacy: LegacyClientData): ClientFormData {
    return {
      personalDetails: {
        title: legacy.title || '',
        firstName: legacy.firstName || '',
        lastName: legacy.lastName || '',
        dateOfBirth: legacy.dateOfBirth || '',
        nationality: legacy.nationality || 'UK',
        maritalStatus: legacy.maritalStatus || 'single',
        dependents: legacy.dependents || 0,
        employmentStatus: legacy.employmentStatus || 'employed',
        occupation: legacy.occupation || ''
      },
      contactInfo: {
        email: legacy.email || '',
        phone: legacy.phone || '',
        mobile: legacy.mobile || '',
        address: {
          line1: legacy.addressLine1 || '',
          line2: legacy.addressLine2 || '',
          city: legacy.city || '',
          county: legacy.county || '',
          postcode: legacy.postcode || '',
          country: legacy.country || 'UK'
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
        assessorId: '',
        communicationAdjustments: []
      },
      riskProfile: {
        riskTolerance: '',
        riskCapacity: '',
        attitudeToRisk: 5,
        capacityForLoss: '',
        knowledgeExperience: '',
        lastAssessment: new Date().toISOString(),
        assessmentHistory: []
      },
      status: 'prospect'
    };
  }

  private generateSearchSuggestions(query: string): string[] {
    return [
      `${query} active`,
      `${query} prospect`,
      `${query} review due`
    ];
  }

  private getDefaultStatistics(): ClientStatistics {
    return {
      totalClients: 0,
      activeClients: 0,
      prospectsCount: 0,
      reviewsDue: 0,
      vulnerableClients: 0,
      highRiskClients: 0,
      recentlyAdded: 0,
      byStatus: {
        prospect: 0,
        active: 0,
        review_due: 0,
        inactive: 0,
        archived: 0
      },
      byRiskLevel: {
        low: 0,
        medium: 0,
        high: 0
      },
      averagePortfolioValue: 0,
      totalAssetsUnderManagement: 0,
      newThisMonth: 0,
      clientsByStatus: {
        prospect: 0,
        active: 0,
        review_due: 0,
        inactive: 0,
        archived: 0
      },
      clientsByRiskLevel: {
        low: 0,
        medium: 0,
        high: 0
      }
    };
  }
}

// Export singleton instance
export const clientService = ClientService.getInstance();
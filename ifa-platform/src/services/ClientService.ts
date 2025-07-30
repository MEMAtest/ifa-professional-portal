// ===================================================================
// CLIENT SERVICE - FIXED VERSION WITH MISSING METHODS
// File: src/services/ClientService.ts
// ===================================================================

import { createBrowserClient } from '@supabase/ssr'
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
  AuditLog,
  LegacyClientData,
  MigrationResult,
  MigrationError,
  PersonalDetails,
  ClientStatus
} from '@/types/client'

export class ClientService {
  private supabase
  private baseUrl = '/api/clients'

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Core CRUD operations
  async getAllClients(filters?: ClientFilters, page: number = 1, limit: number = 50): Promise<ClientListResponse> {
    try {
      let query = this.supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters?.searchQuery) {
        query = query.or(`personal_details->>firstName.ilike.%${filters.searchQuery}%,personal_details->>lastName.ilike.%${filters.searchQuery}%,contact_info->>email.ilike.%${filters.searchQuery}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      const clients = (data || []).map(this.transformDbClient)

      return {
        clients,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      return {
        clients: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    }
  }

  async getClientById(id: string): Promise<Client> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return this.transformDbClient(data)
    } catch (error) {
      console.error('Error fetching client by ID:', error)
      throw new Error(`Client with ID ${id} not found`)
    }
  }

  async createClient(clientData: ClientFormData): Promise<Client> {
    try {
      const dbData = this.transformToDbFormat(clientData)
      
      const { data, error } = await this.supabase
        .from('clients')
        .insert(dbData)
        .select()
        .single()

      if (error) throw error

      return this.transformDbClient(data)
    } catch (error) {
      console.error('Error creating client:', error)
      throw error
    }
  }

  async updateClient(id: string, updates: Partial<ClientFormData>): Promise<Client> {
    try {
      const dbUpdates = this.transformToDbFormat(updates, true)
      
      const { data, error } = await this.supabase
        .from('clients')
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return this.transformDbClient(data)
    } catch (error) {
      console.error('Error updating client:', error)
      throw error
    }
  }

  async deleteClient(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('clients')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting client:', error)
      throw error
    }
  }

  async searchClients(query: string, filters?: ClientFilters): Promise<SearchResult> {
    try {
      let supabaseQuery = this.supabase
        .from('clients')
        .select('*')
        .or(`personal_details->>firstName.ilike.%${query}%,personal_details->>lastName.ilike.%${query}%,contact_info->>email.ilike.%${query}%,client_ref.ilike.%${query}%`)

      if (filters?.status && filters.status.length > 0) {
        supabaseQuery = supabaseQuery.in('status', filters.status)
      }

      const { data, error } = await supabaseQuery

      if (error) throw error

      const clients = (data || []).map(this.transformDbClient)

      return {
        clients,
        total: clients.length,
        searchTime: 0,
        suggestions: []
      }
    } catch (error) {
      console.error('Error searching clients:', error)
      return {
        clients: [],
        total: 0,
        searchTime: 0,
        suggestions: []
      }
    }
  }

  async getClientStatistics(advisorId?: string): Promise<ClientStatistics> {
    try {
      let query = this.supabase
        .from('clients')
        .select('status')

      if (advisorId) {
        query = query.eq('advisor_id', advisorId)
      }

      const { data, error } = await query

      if (error) throw error

      const stats: ClientStatistics = {
        totalClients: data?.length || 0,
        activeClients: data?.filter(c => c.status === 'active').length || 0,
        prospectsCount: data?.filter(c => c.status === 'prospect').length || 0,
        reviewsDue: data?.filter(c => c.status === 'review_due').length || 0,
        vulnerableClients: 0,
        highRiskClients: 0,
        recentlyAdded: 0,
        byStatus: {
          prospect: data?.filter(c => c.status === 'prospect').length || 0,
          active: data?.filter(c => c.status === 'active').length || 0,
          review_due: data?.filter(c => c.status === 'review_due').length || 0,
          inactive: data?.filter(c => c.status === 'inactive').length || 0,
          archived: data?.filter(c => c.status === 'archived').length || 0
        },
        byRiskLevel: {},
        averagePortfolioValue: 0,
        totalAssetsUnderManagement: 0,
        newThisMonth: 0,
        clientsByStatus: {
          prospect: data?.filter(c => c.status === 'prospect').length || 0,
          active: data?.filter(c => c.status === 'active').length || 0,
          review_due: data?.filter(c => c.status === 'review_due').length || 0,
          inactive: data?.filter(c => c.status === 'inactive').length || 0,
          archived: data?.filter(c => c.status === 'archived').length || 0
        },
        clientsByRiskLevel: {}
      }

      return stats
    } catch (error) {
      console.error('Error fetching client statistics:', error)
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
        byRiskLevel: {},
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
        clientsByRiskLevel: {}
      }
    }
  }

  // Review management
  async getClientReviews(clientId: string): Promise<ClientReview[]> {
    try {
      const { data, error } = await this.supabase
        .from('client_reviews')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching client reviews:', error)
      return []
    }
  }

  async createClientReview(review: Omit<ClientReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientReview> {
    try {
      const { data, error } = await this.supabase
        .from('client_reviews')
        .insert({
          ...review,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating client review:', error)
      throw error
    }
  }

  // ===================================================================
  // FIX 1: Add missing getClientCommunications method
  // ===================================================================
  async getClientCommunications(clientId: string): Promise<ClientCommunication[]> {
    try {
      const { data, error } = await this.supabase
        .from('client_communications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching client communications:', error)
        return []
      }

      return (data || []).map(comm => ({
        id: comm.id || `comm_${Date.now()}`,
        clientId: comm.client_id || clientId,
        communicationType: comm.communication_type || 'email',
        subject: comm.subject || '',
        content: comm.content || '',
        direction: comm.direction || 'outbound',
        status: comm.status || 'sent',
        scheduledAt: comm.scheduled_for,
        advisorId: comm.advisor_id || '',
        createdAt: comm.created_at || new Date().toISOString(),
        metadata: comm.metadata || {},
        communicationDate: comm.communication_date,
        method: comm.method
      }))
    } catch (error) {
      console.error('Error in getClientCommunications:', error)
      return []
    }
  }

  async createClientCommunication(communication: Omit<ClientCommunication, 'id' | 'createdAt'>): Promise<ClientCommunication> {
    try {
      const { data, error } = await this.supabase
        .from('client_communications')
        .insert({
          client_id: communication.clientId,
          communication_type: communication.communicationType,
          subject: communication.subject,
          content: communication.content,
          direction: communication.direction,
          status: communication.status || 'sent',
          scheduled_at: communication.scheduledAt,
          advisor_id: communication.advisorId,
          metadata: communication.metadata,
          communication_date: communication.communicationDate,
          method: communication.method,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: data.id,
        clientId: data.client_id,
        communicationType: data.communication_type,
        subject: data.subject,
        content: data.content,
        direction: data.direction,
        status: data.status,
        scheduledAt: data.scheduled_at,
        advisorId: data.advisor_id,
        createdAt: data.created_at,
        metadata: data.metadata,
        communicationDate: data.communication_date,
        method: data.method
      }
    } catch (error) {
      console.error('Error creating client communication:', error)
      throw error
    }
  }

  // Document management
  async linkClientDocument(clientId: string, documentId: string, documentType: string): Promise<ClientDocument> {
    try {
      const { data, error } = await this.supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          document_id: documentId,
          document_type: documentType,
          is_required: false,
          status: 'received',
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return {
        id: data.id,
        clientId: data.client_id,
        documentId: data.document_id,
        documentType: data.document_type,
        isRequired: data.is_required,
        status: data.status,
        uploadedAt: data.uploaded_at,
        expiryDate: data.expiry_date
      }
    } catch (error) {
      console.error('Error linking client document:', error)
      throw error
    }
  }

  async getAuditLog(clientId: string): Promise<AuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(log => ({
        id: log.id,
        clientId: log.client_id,
        action: log.action,
        details: log.details || {},
        performedBy: log.performed_by || log.user_id,
        timestamp: log.created_at,
        resource: log.resource,
        createdAt: log.created_at
      }))
    } catch (error) {
      console.error('Error fetching audit log:', error)
      return []
    }
  }

  // ===================================================================
  // FIX 2: Add missing migrateLegacyClients method
  // ===================================================================
  async migrateLegacyClients(
    clients: LegacyClientData[], 
    progressCallback?: (progress: number, message: string) => void
  ): Promise<MigrationResult> {
    try {
      const results: MigrationError[] = []
      const total = clients.length

      progressCallback?.(0, `Starting migration of ${total} clients`)

      for (let i = 0; i < clients.length; i++) {
        const client = clients[i]
        const clientProgress = ((i / total) * 100)
        
        progressCallback?.(
          clientProgress, 
          `Migrating client ${i + 1} of ${total}: ${client.firstName || client.first_name || 'Unknown'} ${client.lastName || client.last_name || 'Client'}`
        )

        try {
          // Check if client already exists
          const searchEmail = client.email || client.contactInfo?.email || ''
          const existingClients = await this.searchClients(searchEmail)
          
          if (existingClients.clients.length > 0) {
            results.push({
              clientId: client.id,
              status: 'skipped',
              reason: 'Client already exists'
            })
            continue
          }

          // Transform legacy data to new format
          const clientData = this.transformLegacyData(client)
          
          // Validate the transformed data
          if (!this.validateMigrationData(clientData)) {
            results.push({
              clientId: client.id,
              status: 'error',
              reason: 'Data validation failed'
            })
            continue
          }
          
          // Create the new client
          const newClient = await this.createClient(clientData)
          
          results.push({
            clientId: client.id,
            status: 'migrated',
            reason: `Successfully migrated to ID: ${newClient.id}`
          })

        } catch (error) {
          results.push({
            clientId: client.id,
            status: 'error',
            reason: error instanceof Error ? error.message : 'Migration failed'
          })
        }

        // Small delay to prevent overwhelming the system
        if (i < clients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      progressCallback?.(100, 'Migration completed')

      // Calculate summary
      const successful = results.filter(r => r.status === 'migrated').length
      const failed = results.filter(r => r.status === 'error').length
      const skipped = results.filter(r => r.status === 'skipped').length

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
        }
      }

    } catch (error) {
      console.error('Error during batch migration:', error)
      throw error
    }
  }

  // ===================================================================
  // HELPER METHODS FOR MIGRATION
  // ===================================================================
  private transformLegacyData(legacy: any): ClientFormData {
    return {
      personalDetails: {
        title: legacy.title || '',
        firstName: legacy.firstName || legacy.first_name || '',
        lastName: legacy.lastName || legacy.last_name || '',
        dateOfBirth: legacy.dateOfBirth || legacy.date_of_birth || '',
        nationality: legacy.nationality || 'UK',
        maritalStatus: this.mapMaritalStatus(legacy.maritalStatus || legacy.marital_status),
        dependents: Number(legacy.dependents) || 0,
        employmentStatus: this.mapEmploymentStatus(legacy.employmentStatus || legacy.employment_status),
        occupation: legacy.occupation || ''
      },
      contactInfo: {
        email: legacy.email || legacy.contactInfo?.email || '',
        phone: legacy.phone || legacy.contactInfo?.phone || '',
        mobile: legacy.mobile || legacy.contactInfo?.mobile || '',
        address: {
          line1: legacy.addressLine1 || legacy.address_line_1 || legacy.address?.line1 || '',
          line2: legacy.addressLine2 || legacy.address_line_2 || legacy.address?.line2 || '',
          city: legacy.city || legacy.address?.city || '',
          county: legacy.county || legacy.state || legacy.address?.county || '',
          postcode: legacy.postcode || legacy.postal_code || legacy.zip || legacy.address?.postcode || '',
          country: legacy.country || legacy.address?.country || 'UK'
        },
        preferredContact: legacy.preferredContact || 'email',
        communicationPreferences: {
          marketing: Boolean(legacy.marketingConsent || legacy.marketing_consent),
          newsletters: Boolean(legacy.newsletterConsent || legacy.newsletter_consent),
          smsUpdates: Boolean(legacy.smsConsent || legacy.sms_consent)
        }
      },
      financialProfile: {
        annualIncome: Number(legacy.annualIncome || legacy.annual_income) || 0,
        netWorth: Number(legacy.netWorth || legacy.net_worth) || 0,
        liquidAssets: Number(legacy.liquidAssets || legacy.liquid_assets) || 0,
        monthlyExpenses: Number(legacy.monthlyExpenses || legacy.monthly_expenses) || 0,
        investmentTimeframe: legacy.investmentTimeframe || legacy.investment_timeframe || '',
        investmentObjectives: Array.isArray(legacy.investmentObjectives) ? legacy.investmentObjectives : [],
        existingInvestments: Array.isArray(legacy.existingInvestments) ? legacy.existingInvestments : [],
        pensionArrangements: Array.isArray(legacy.pensionArrangements) ? legacy.pensionArrangements : [],
        insurancePolicies: Array.isArray(legacy.insurancePolicies) ? legacy.insurancePolicies : []
      },
      vulnerabilityAssessment: {
        is_vulnerable: Boolean(legacy.isVulnerable || legacy.is_vulnerable),
        vulnerabilityFactors: Array.isArray(legacy.vulnerabilityFactors) ? legacy.vulnerabilityFactors : [],
        supportNeeds: Array.isArray(legacy.supportNeeds) ? legacy.supportNeeds : [],
        assessmentNotes: legacy.assessmentNotes || '',
        assessmentDate: new Date().toISOString(),
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        assessorId: legacy.assessorId || ''
      },
      riskProfile: {
        riskTolerance: legacy.riskTolerance || legacy.risk_tolerance || '',
        riskCapacity: legacy.riskCapacity || legacy.risk_capacity || '',
        attitudeToRisk: Number(legacy.attitudeToRisk || legacy.attitude_to_risk) || 5,
        capacityForLoss: legacy.capacityForLoss || legacy.capacity_for_loss || '',
        knowledgeExperience: legacy.knowledgeExperience || legacy.knowledge_experience || '',
        lastAssessment: new Date().toISOString(),
        assessmentHistory: []
      },
      status: this.mapClientStatus(legacy.status) || 'prospect'
    }
  }

  private mapMaritalStatus(status: any): PersonalDetails['maritalStatus'] {
    const statusMap: Record<string, PersonalDetails['maritalStatus']> = {
      'single': 'single',
      'married': 'married',
      'divorced': 'divorced',
      'widowed': 'widowed',
      'civil_partnership': 'civil_partnership',
      'separated': 'divorced'
    }
    return statusMap[String(status).toLowerCase()] || 'single'
  }

  private mapEmploymentStatus(status: any): PersonalDetails['employmentStatus'] {
    const statusMap: Record<string, PersonalDetails['employmentStatus']> = {
      'employed': 'employed',
      'self_employed': 'self_employed',
      'retired': 'retired',
      'unemployed': 'unemployed',
      'student': 'student'
    }
    return statusMap[String(status).toLowerCase()] || 'employed'
  }

  private mapClientStatus(status: any): ClientStatus {
    const statusMap: Record<string, ClientStatus> = {
      'prospect': 'prospect',
      'active': 'active',
      'review_due': 'review_due',
      'inactive': 'inactive',
      'archived': 'archived'
    }
    return statusMap[String(status).toLowerCase()] || 'prospect'
  }

  private validateMigrationData(data: ClientFormData): boolean {
    // Check required fields
    if (!data.personalDetails?.firstName?.trim()) return false
    if (!data.personalDetails?.lastName?.trim()) return false
    if (!data.contactInfo?.email?.trim()) return false
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.contactInfo.email.trim())) return false
    
    return true
  }

  // Database transformation helpers
  private transformDbClient(dbClient: any): Client {
    return {
      id: dbClient.id,
      clientRef: dbClient.client_ref || `CLI${dbClient.id.slice(-4)}`,
      personalDetails: {
        title: dbClient.personal_details?.title || '',
        firstName: dbClient.personal_details?.firstName || dbClient.personal_details?.first_name || '',
        lastName: dbClient.personal_details?.lastName || dbClient.personal_details?.last_name || '',
        dateOfBirth: dbClient.personal_details?.dateOfBirth || dbClient.personal_details?.date_of_birth || '',
        nationality: dbClient.personal_details?.nationality || 'UK',
        maritalStatus: dbClient.personal_details?.maritalStatus || 'single',
        dependents: dbClient.personal_details?.dependents || 0,
        employmentStatus: dbClient.personal_details?.employmentStatus || 'employed',
        occupation: dbClient.personal_details?.occupation || ''
      },
      contactInfo: {
        email: dbClient.contact_info?.email || '',
        phone: dbClient.contact_info?.phone || '',
        mobile: dbClient.contact_info?.mobile || '',
        address: {
          line1: dbClient.contact_info?.address?.line1 || '',
          line2: dbClient.contact_info?.address?.line2 || '',
          city: dbClient.contact_info?.address?.city || '',
          county: dbClient.contact_info?.address?.county || '',
          postcode: dbClient.contact_info?.address?.postcode || '',
          country: dbClient.contact_info?.address?.country || 'UK'
        },
        preferredContact: dbClient.contact_info?.preferredContact || 'email',
        communicationPreferences: {
          marketing: dbClient.contact_info?.communicationPreferences?.marketing || false,
          newsletters: dbClient.contact_info?.communicationPreferences?.newsletters || false,
          smsUpdates: dbClient.contact_info?.communicationPreferences?.smsUpdates || false
        }
      },
      financialProfile: dbClient.financial_profile || {
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
      vulnerabilityAssessment: dbClient.vulnerability_assessment || {
        is_vulnerable: false,
        vulnerabilityFactors: [],
        supportNeeds: [],
        assessmentNotes: '',
        assessmentDate: new Date().toISOString(),
        reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        assessorId: ''
      },
      riskProfile: dbClient.risk_profile || {
        riskTolerance: '',
        riskCapacity: '',
        attitudeToRisk: 5,
        capacityForLoss: '',
        knowledgeExperience: '',
        lastAssessment: new Date().toISOString(),
        assessmentHistory: []
      },
      status: dbClient.status || 'prospect',
      createdAt: dbClient.created_at,
      updatedAt: dbClient.updated_at,
      advisorId: dbClient.advisor_id,
      firmId: dbClient.firm_id,
      notes: dbClient.notes
    }
  }

  private transformToDbFormat(clientData: any, isUpdate: boolean = false): any {
    const dbData: any = {}

    if (!isUpdate || clientData.clientRef) {
      dbData.client_ref = clientData.clientRef
    }

    if (clientData.personalDetails) {
      dbData.personal_details = clientData.personalDetails
    }

    if (clientData.contactInfo) {
      dbData.contact_info = clientData.contactInfo
    }

    if (clientData.financialProfile) {
      dbData.financial_profile = clientData.financialProfile
    }

    if (clientData.vulnerabilityAssessment) {
      dbData.vulnerability_assessment = clientData.vulnerabilityAssessment
    }

    if (clientData.riskProfile) {
      dbData.risk_profile = clientData.riskProfile
    }

    if (clientData.status) {
      dbData.status = clientData.status
    }

    if (clientData.notes) {
      dbData.notes = clientData.notes
    }

    if (clientData.advisorId) {
      dbData.advisor_id = clientData.advisorId
    }

    if (clientData.firmId) {
      dbData.firm_id = clientData.firmId
    }

    if (!isUpdate) {
      dbData.created_at = new Date().toISOString()
    }

    return dbData
  }
}

// Export singleton instance
export const clientService = new ClientService()
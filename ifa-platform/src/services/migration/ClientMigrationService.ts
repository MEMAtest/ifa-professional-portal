import { createClient } from "@/lib/supabase/client"
// ===================================================================
// src/services/migration/ClientMigrationService.ts - PRODUCTION READY - Complete File
// ===================================================================

import { clientService } from '@/services/ClientService';
import type { Client, ClientFormData, MigrationResult, MigrationError } from '@/types/client';

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
  // Add other legacy fields as needed
  [key: string]: any;
}

export class ClientMigrationService {
  private static instance: ClientMigrationService;

  public static getInstance(): ClientMigrationService {
    if (!ClientMigrationService.instance) {
      ClientMigrationService.instance = new ClientMigrationService();
    }
    return ClientMigrationService.instance;
  }

  /**
   * Migrate a single client from legacy format
   */
  async migrateClient(
    legacyData: LegacyClientData,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<MigrationError> {
    try {
      progressCallback?.(0, `Starting migration for client ${legacyData.id}`);

      // Check if client already exists
      const existingClients = await clientService.searchClients(legacyData.email);
      if (existingClients.clients.length > 0) {
        progressCallback?.(100, `Client ${legacyData.id} already exists`);
        return {
          clientId: legacyData.id,
          status: 'skipped',
          reason: 'Client already exists' // ✅ FIXED: Use 'reason' not 'message'
        };
      }

      progressCallback?.(25, `Transforming data for client ${legacyData.id}`);

      // Transform legacy data to new format
      const clientData = this.transformLegacyData(legacyData);

      progressCallback?.(50, `Validating data for client ${legacyData.id}`);

      // Validate the transformed data
      if (!this.validateClientData(clientData)) {
        return {
          clientId: legacyData.id,
          status: 'error',
          reason: 'Data validation failed' // ✅ FIXED: Use 'reason' not 'message'
        };
      }

      progressCallback?.(75, `Creating client ${legacyData.id}`);

      // Create the new client
      const newClient = await clientService.createClient(clientData);

      progressCallback?.(100, `Successfully migrated client ${legacyData.id}`);

      return {
        clientId: legacyData.id,
        status: 'migrated',
        reason: `Successfully migrated to ID: ${newClient.id}`, // ✅ FIXED: Use 'reason' not 'message'
      };

    } catch (migrationError) {
      console.error(`Migration failed for client ${legacyData.id}:`, migrationError);
      
      return {
        clientId: legacyData.id,
        status: 'error',
        reason: migrationError instanceof Error ? migrationError.message : 'Unknown migration error' // ✅ FIXED: Use 'reason' not 'message'
      };
    }
  }

  /**
   * Migrate multiple clients in batch
   */
  async migrateBatch(
    legacyClients: LegacyClientData[],
    progressCallback?: (progress: number, message: string) => void
  ): Promise<MigrationResult> {
    const results: MigrationError[] = [];
    const total = legacyClients.length;

    progressCallback?.(0, `Starting batch migration of ${total} clients`);

    for (let i = 0; i < legacyClients.length; i++) {
      const client = legacyClients[i];
      const clientProgress = ((i / total) * 100);
      
      progressCallback?.(
        clientProgress, 
        `Migrating client ${i + 1} of ${total}: ${client.first_name} ${client.last_name}`
      );

      const result = await this.migrateClient(client, (subProgress, subMessage) => {
        const totalProgress = clientProgress + ((subProgress / 100) * (100 / total));
        progressCallback?.(totalProgress, subMessage);
      });

      results.push(result);

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    progressCallback?.(100, 'Batch migration completed');

    // Calculate summary
    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'migrated').length,
      failed: results.filter(r => r.status === 'error').length,
      skipped: results.filter(r => r.status === 'skipped').length
    };

    return {
      success: summary.failed === 0,
      clientsProcessed: total,
      clientsMigrated: summary.successful,
      errors: results.filter(r => r.status === 'error'),
      summary
    };
  }

  /**
   * Transform legacy client data to new format
   */
  private transformLegacyData(legacyData: LegacyClientData): ClientFormData {
    return {
      personalDetails: {
        title: legacyData.title || '',
        firstName: legacyData.first_name || '',
        lastName: legacyData.last_name || '',
        dateOfBirth: legacyData.date_of_birth || '',
        nationality: legacyData.nationality || 'British',
        maritalStatus: this.mapMaritalStatus(legacyData.marital_status),
        dependents: legacyData.dependents || 0,
        employmentStatus: this.mapEmploymentStatus(legacyData.employment_status),
        occupation: legacyData.occupation || ''
      },
      contactInfo: {
        email: legacyData.email || '',
        phone: legacyData.phone,
        mobile: legacyData.mobile,
        address: {
          line1: legacyData.address_line1 || '',
          line2: legacyData.address_line2,
          city: legacyData.city || '',
          county: legacyData.county || '',
          postcode: legacyData.postcode || '',
          country: legacyData.country || 'United Kingdom'
        },
        preferredContact: this.mapPreferredContact(legacyData.preferred_contact),
        communicationPreferences: {
          marketing: legacyData.marketing_consent || false,
          newsletters: legacyData.newsletter_consent || false,
          smsUpdates: legacyData.sms_consent || false
        }
      },
      financialProfile: {
        annualIncome: legacyData.annual_income || 0,
        netWorth: legacyData.net_worth || 0,
        liquidAssets: legacyData.liquid_assets || 0,
        monthlyExpenses: legacyData.monthly_expenses || 0,
        investmentTimeframe: legacyData.investment_timeframe || 'medium_term',
        investmentObjectives: this.parseInvestmentObjectives(legacyData.investment_objectives),
        existingInvestments: [],
        pensionArrangements: [],
        insurancePolicies: []
      },
      vulnerabilityAssessment: {
        is_vulnerable: legacyData.is_vulnerable || false,
        vulnerabilityFactors: this.parseArray(legacyData.vulnerability_factors),
        supportNeeds: this.parseArray(legacyData.support_needs),
        assessmentNotes: legacyData.vulnerability_notes || '',
        assessmentDate: legacyData.vulnerability_assessment_date || new Date().toISOString(),
        reviewDate: legacyData.vulnerability_review_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        assessorId: legacyData.assessor_id || ''
      },
      riskProfile: {
        riskTolerance: legacyData.risk_tolerance || 'moderate',
        riskCapacity: legacyData.risk_capacity || 'moderate',
        attitudeToRisk: legacyData.attitude_to_risk || 5,
        capacityForLoss: legacyData.capacity_for_loss || 'moderate',
        knowledgeExperience: legacyData.knowledge_experience || 'basic',
        lastAssessment: legacyData.last_risk_assessment || new Date().toISOString()
      },
      status: this.mapClientStatus(legacyData.status)
    };
  }

  /**
   * Validate client data before migration
   */
  private validateClientData(data: ClientFormData): boolean {
    // Basic validation
    if (!data.personalDetails.firstName || !data.personalDetails.lastName) {
      return false;
    }

    if (!data.contactInfo.email) {
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.contactInfo.email)) {
      return false;
    }

    return true;
  }

  /**
   * Mapping helper functions
   */
  private mapMaritalStatus(status?: string): 'single' | 'married' | 'divorced' | 'widowed' | 'civil_partnership' | 'other' {
    const statusMap: Record<string, 'single' | 'married' | 'divorced' | 'widowed' | 'civil_partnership' | 'other'> = {
      'single': 'single',
      'married': 'married',
      'divorced': 'divorced',
      'widowed': 'widowed',
      'civil_partnership': 'civil_partnership',
      'civil partnership': 'civil_partnership'
    };
    
    return statusMap[status?.toLowerCase() || ''] || 'single';
  }

  private mapEmploymentStatus(status?: string): 'employed' | 'self_employed' | 'retired' | 'unemployed' | 'student' | 'other' {
    const statusMap: Record<string, 'employed' | 'self_employed' | 'retired' | 'unemployed' | 'student' | 'other'> = {
      'employed': 'employed',
      'self_employed': 'self_employed',
      'self employed': 'self_employed',
      'retired': 'retired',
      'unemployed': 'unemployed',
      'student': 'student'
    };
    
    return statusMap[status?.toLowerCase() || ''] || 'employed';
  }

  private mapPreferredContact(contact?: string): 'email' | 'phone' | 'mobile' | 'post' {
    const contactMap: Record<string, 'email' | 'phone' | 'mobile' | 'post'> = {
      'email': 'email',
      'phone': 'phone',
      'mobile': 'mobile',
      'post': 'post',
      'mail': 'post'
    };
    
    return contactMap[contact?.toLowerCase() || ''] || 'email';
  }

  private mapClientStatus(status?: string): 'prospect' | 'active' | 'review_due' | 'inactive' | 'archived' {
    const statusMap: Record<string, 'prospect' | 'active' | 'review_due' | 'inactive' | 'archived'> = {
      'prospect': 'prospect',
      'active': 'active',
      'review_due': 'review_due',
      'review due': 'review_due',
      'inactive': 'inactive',
      'archived': 'archived'
    };
    
    return statusMap[status?.toLowerCase() || ''] || 'prospect';
  }

  private parseInvestmentObjectives(objectives?: string | string[]): string[] {
    if (Array.isArray(objectives)) {
      return objectives;
    }
    
    if (typeof objectives === 'string') {
      return objectives.split(',').map(obj => obj.trim()).filter(obj => obj.length > 0);
    }
    
    return [];
  }

  private parseArray(value?: string | string[]): string[] {
    if (Array.isArray(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    
    return [];
  }
}

// Export singleton instance
export const clientMigrationService = ClientMigrationService.getInstance();
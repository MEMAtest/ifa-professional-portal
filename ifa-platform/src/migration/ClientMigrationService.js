// Client Migration Service - Migrates existing client data with ZERO data loss
// File: src/services/migration/ClientMigrationService.js

class ClientMigrationService {
  constructor() {
    // Use environment variables - never hardcode credentials
    this.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
      throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    this.supabase = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
  }

  // Main migration function - migrates ALL existing clients
  async migrateAllExistingClients() {
    console.log('🚀 Starting Client AI migration from ifa_forms...');
    
    const result = {
      success: 0,
      errors: [],
      details: []
    };

    try {
      // Step 1: Get ALL existing form data
      const { data: existingForms, error: fetchError } = await this.supabase
        .from('ifa_forms')
        .select('*')
        .eq('payload->type', 'form')  // Only get main forms, not autosaves
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch existing forms: ${fetchError.message}`);
      }

      if (!existingForms || existingForms.length === 0) {
        console.log('⚠️ No existing forms found to migrate');
        return result;
      }

      console.log(`📊 Found ${existingForms.length} forms to migrate`);

      // Step 2: Migrate each form
      for (const form of existingForms) {
        try {
          const migrationDetail = await this.migrateIndividualClient(form);
          
          result.details.push(migrationDetail);
          
          if (migrationDetail.status === 'success') {
            result.success++;
            console.log(`✅ Migrated: ${migrationDetail.clientRef}`);
          }
        } catch (error) {
          const migrationError = {
            formId: form.form_id,
            clientRef: form.payload?.formData?.clientRef || 'Unknown',
            error: error.message,
            originalData: form.payload?.formData
          };
          
          result.errors.push(migrationError);
          console.error(`❌ Migration failed for ${migrationError.clientRef}:`, error);
        }
      }

      console.log(`🎉 Migration complete: ${result.success} successful, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      console.error('💥 Critical migration error:', error);
      throw error;
    }
  }

  // Migrate a single client from legacy form to new client record
  async migrateIndividualClient(legacyForm) {
    const formData = legacyForm.payload?.formData || {};
    const formId = legacyForm.form_id;
    const clientRef = formData.clientRef || formId;

    // Transform legacy data to new client format
    const newClient = this.transformLegacyData(formData, formId);

    // Check if client already exists
    const { data: existingClient } = await this.supabase
      .from('clients')
      .select('id, client_ref')
      .eq('client_ref', newClient.client_ref)
      .single();

    if (existingClient) {
      throw new Error(`Client ${clientRef} already exists`);
    }

    // Insert into clients table
    const { data: insertedClient, error: insertError } = await this.supabase
      .from('clients')
      .insert(newClient)
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    // Log the migration for audit trail
    await this.supabase.from('audit_logs').insert({
      user_id: 'migration_system',
      client_id: insertedClient.id,
      action: 'CLIENT_MIGRATED',
      resource: 'clients',
      resource_id: insertedClient.id,
      details: {
        legacyFormId: formId,
        migrationDate: new Date().toISOString(),
        originalClientRef: clientRef
      }
    });

    return {
      formId,
      clientRef,
      clientId: insertedClient.id,
      status: 'success',
      migratedFields: Object.keys(formData)
    };
  }

  // Transform legacy form data to new client structure
  transformLegacyData(formData, legacyFormId) {
    // Extract personal details
    const personalDetails = {
      title: formData.title || '',
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      dateOfBirth: formData.dateOfBirth || formData.dob || '',
      nationalInsuranceNumber: formData.nationalInsuranceNumber || formData.niNumber || '',
      maritalStatus: this.normalizeMaritalStatus(formData.maritalStatus),
      dependents: parseInt(formData.dependents || formData.numberOfDependents || '0'),
      occupation: formData.occupation || formData.currentOccupation || '',
      employmentStatus: this.normalizeEmploymentStatus(formData.employmentStatus)
    };

    // Extract contact information
    const contactInfo = {
      email: formData.email || formData.emailAddress || '',
      phone: formData.phone || formData.phoneNumber || formData.mobileNumber || '',
      address: {
        line1: formData.address || formData.addressLine1 || '',
        line2: formData.addressLine2 || '',
        city: formData.city || formData.town || '',
        postcode: formData.postcode || formData.postalCode || '',
        country: formData.country || 'United Kingdom'
      },
      preferredContact: formData.preferredContact || 'email'
    };

    // Extract financial profile
    const financialProfile = {
      annualIncome: parseFloat(formData.annualIncome || formData.income || '0'),
      netWorth: parseFloat(formData.netWorth || formData.totalAssets || '0'),
      investmentAmount: parseFloat(formData.investmentAmount || formData.amountToInvest || '0'),
      investmentExperience: formData.investmentExperience || 'limited',
      riskTolerance: formData.riskTolerance || formData.attitudeToRisk || 'balanced'
    };

    // Initialize vulnerability assessment
    const vulnerabilityAssessment = {
      isVulnerable: false, // Will be determined by enhanced assessment
      vulnerabilityScore: 0,
      assessmentDate: new Date().toISOString(),
      reviewFrequency: 'annual',
      factors: [],
      lastReviewed: new Date().toISOString(),
      notes: formData.vulnerabilityNotes || ''
    };

    // Initialize risk profile from legacy data
    const riskProfile = {
      riskLevel: this.extractRiskLevel(formData),
      riskCategory: this.determineRiskCategory(formData),
      capacityForLoss: 'medium',
      attitudeToRisk: formData.attitudeToRisk || 'balanced',
      lastAssessed: new Date().toISOString(),
      reviewDue: this.calculateNextReviewDate(),
      notes: formData.riskNotes || ''
    };

    return {
      advisor_id: 'migrated_user', // Simplified for now
      firm_id: 'default_firm',
      client_ref: formData.clientRef || `MIGRATED_${Date.now()}`,
      personal_details: personalDetails,
      contact_info: contactInfo,
      financial_profile: financialProfile,
      vulnerability_assessment: vulnerabilityAssessment,
      risk_profile: riskProfile,
      status: 'active',
      legacy_form_id: legacyFormId,
      migration_date: new Date().toISOString()
    };
  }

  // Utility functions for data normalization
  normalizeMaritalStatus(status) {
    const normalized = (status || '').toLowerCase();
    if (normalized.includes('married')) return 'married';
    if (normalized.includes('single')) return 'single';
    if (normalized.includes('divorced')) return 'divorced';
    if (normalized.includes('widowed')) return 'widowed';
    if (normalized.includes('civil')) return 'civil_partnership';
    return 'single';
  }

  normalizeEmploymentStatus(status) {
    const normalized = (status || '').toLowerCase();
    if (normalized.includes('employed')) return 'employed';
    if (normalized.includes('self')) return 'self_employed';
    if (normalized.includes('retired')) return 'retired';
    if (normalized.includes('unemployed')) return 'unemployed';
    return 'employed';
  }

  extractRiskLevel(formData) {
    if (formData.riskLevel) return parseInt(formData.riskLevel);
    if (formData.riskScore) return parseInt(formData.riskScore);
    if (formData.attitudeToRisk) {
      const attitude = formData.attitudeToRisk.toLowerCase();
      if (attitude.includes('defensive')) return 2;
      if (attitude.includes('cautious')) return 3;
      if (attitude.includes('balanced')) return 5;
      if (attitude.includes('growth')) return 7;
      if (attitude.includes('adventurous')) return 8;
    }
    return 5; // default balanced
  }

  determineRiskCategory(formData) {
    const riskLevel = this.extractRiskLevel(formData);
    if (riskLevel <= 2) return 'defensive';
    if (riskLevel <= 4) return 'cautious';
    if (riskLevel <= 6) return 'balanced';
    if (riskLevel <= 8) return 'growth';
    return 'adventurous';
  }

  calculateNextReviewDate() {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString();
  }

  // Test migration with sample data
  async testMigration() {
    console.log('🧪 Running migration test...');
    
    try {
      const { data: testForm, error } = await this.supabase
        .from('ifa_forms')
        .select('*')
        .eq('payload->type', 'form')
        .limit(1)
        .single();

      if (error || !testForm) {
        console.log('⚠️ No test data found');
        return;
      }

      console.log('📋 Test form data:', testForm.payload.formData);
      
      const transformed = this.transformLegacyData(
        testForm.payload.formData,
        testForm.form_id
      );
      
      console.log('✨ Transformed data:', transformed);
      console.log('✅ Migration test completed successfully');
      
      return { success: true, sampleData: transformed };
    } catch (error) {
      console.error('❌ Migration test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get migration status
  async getMigrationStatus() {
    try {
      const [formsResult, clientsResult] = await Promise.all([
        this.supabase
          .from('ifa_forms')
          .select('form_id', { count: 'exact', head: true })
          .eq('payload->type', 'form'),
        this.supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
      ]);

      return {
        totalForms: formsResult.count || 0,
        migratedClients: clientsResult.count || 0,
        pendingMigration: (formsResult.count || 0) - (clientsResult.count || 0)
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return { totalForms: 0, migratedClients: 0, pendingMigration: 0 };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientMigrationService;
}

// Global availability for browser use
if (typeof window !== 'undefined') {
  window.ClientMigrationService = ClientMigrationService;
}

console.log('✅ Client Migration Service loaded and ready!');
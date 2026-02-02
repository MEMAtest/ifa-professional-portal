// src/services/ClientLifecycleService.ts

import { createClient } from '@/lib/supabase/client';
import { safeUUID } from '@/lib/utils';
import type { Client } from '@/types/client';

export class ClientLifecycleService {
  // Remove instance property since all methods are static

  /**
   * Handle all tasks after client creation
   */
  static async onClientCreated(clientId: string): Promise<void> {
    try {
      // Run all initialization tasks in parallel
      await Promise.all([
        this.createDefaultCashFlowScenario(clientId),
        this.scheduleInitialReview(clientId),
        this.createInitialDocumentWorkflow(clientId),
        this.initializeAssessmentTracking(clientId)
      ]);

      // Log the successful initialization
      await this.logActivity(clientId, 'client_created', 'Client profile initialized with default data');
    } catch (error) {
      console.error('Error in client lifecycle initialization:', error);
      // Don't throw - allow client creation to succeed even if some tasks fail
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logActivity(clientId, 'initialization_partial', `Some initialization tasks failed: ${errorMessage}`);
    }
  }

  /**
   * Create default cash flow scenario
   */
  private static async createDefaultCashFlowScenario(clientId: string): Promise<void> {
    const supabase = createClient(); // Create client for this method
    
    try {
      // Get client data for scenario defaults
      const { data: client } = await supabase
        .from('clients')
        .select('personal_details, financial_profile, risk_profile')
        .eq('id', clientId)
        .single();

      if (!client) return;

      const personalDetails = (client.personal_details as any) || {}
      const financialProfile = (client.financial_profile as any) || {}
      const riskProfile = (client.risk_profile as any) || {}

      const age = personalDetails.age || 45;
      const retirementAge = 67;
      const yearsToRetirement = Math.max(retirementAge - age, 1);

      // Create base scenario
      const scenario = {
        client_id: clientId,
        scenario_name: 'Base Case - Initial Projection',
        scenario_type: 'base',
        projection_years: Math.min(yearsToRetirement + 20, 50), // Project through retirement
        
        // Market assumptions (conservative defaults)
        inflation_rate: 2.5,
        real_equity_return: 5.0,
        real_bond_return: 2.0,
        real_cash_return: 0.5,
        
        // Client demographics
        client_age: age,
        retirement_age: retirementAge,
        life_expectancy: 85,
        
        // Financial position (from client profile or defaults)
        current_savings: financialProfile.liquidAssets || 0,
        pension_value: financialProfile.pensionValue || 0,
        investment_value: financialProfile.investmentValue || 0,
        current_income: financialProfile.annualIncome || 50000,
        current_expenses: financialProfile.monthlyExpenses 
          ? financialProfile.monthlyExpenses * 12 
          : 40000,
        
        // State pension
        state_pension_age: 67,
        state_pension_amount: 11502, // 2024/25 full state pension
        
        // Risk profile
        risk_score: riskProfile.attitudeToRisk || 5,
        vulnerability_adjustments: {},
        assumption_basis: 'Initial projection based on current market conditions and client profile',
        alternative_allocation: 0.0,
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('cash_flow_scenarios')
        .insert(scenario);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating default scenario:', error);
      throw error;
    }
  }

  /**
   * Schedule initial client review
   */
  private static async scheduleInitialReview(clientId: string): Promise<void> {
    const supabase = createClient(); // Create client for this method
    
    try {
      // Schedule review for 3 months after onboarding
      const reviewDate = new Date();
      reviewDate.setMonth(reviewDate.getMonth() + 3);

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user?.id) {
        console.warn('Skipping initial review schedule: no authenticated user')
        return
      }

      const review = {
        client_id: clientId,
        review_type: 'initial_review',
        due_date: reviewDate.toISOString().split('T')[0],
        status: 'scheduled',
        review_summary: 'Initial client review after onboarding',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('client_reviews')
        .insert(review);

      if (error) throw error;
    } catch (error) {
      console.error('Error scheduling review:', error);
      throw error;
    }
  }

  /**
   * Create initial document workflow
   */
  private static async createInitialDocumentWorkflow(clientId: string): Promise<void> {
    const supabase = createClient(); // Create client for this method
    
    try {
      // Check if client agreement template exists
      const { data: template } = await supabase
        .from('document_templates')
        .select('id')
        .eq('name', 'Client Service Agreement')
        .single();

      if (template) {
        // Create a task/reminder for document generation
        await supabase
          .from('tasks')
          .insert({
            client_id: clientId,
            task_type: 'generate_document',
            title: 'Generate Client Service Agreement',
            description: 'Generate and send initial client service agreement for signature',
            due_date: new Date().toISOString(),
            status: 'pending',
            source_type: 'document',
            source_id: template.id,
            metadata: { template_id: template.id }
          });
      }
    } catch (error) {
      console.error('Error creating document workflow:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Initialize assessment tracking
   */
  private static async initializeAssessmentTracking(clientId: string): Promise<void> {
    const supabase = createClient(); // Create client for this method
    
    try {
      // Create placeholder for suitability assessment
      const { error } = await supabase
        .from('suitability_assessments')
        .insert({
          client_id: clientId,
          status: 'not_started',
          completion_percentage: 0,
          last_updated: new Date().toISOString(),
          metadata: {
            sections_completed: [],
            auto_save_enabled: true
          }
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error;
      }
    } catch (error) {
      console.error('Error initializing assessment tracking:', error);
      // Non-critical - don't throw
    }
  }

  /**
   * Log activity for audit trail
   */
  private static async logActivity(
    clientId: string, 
    action: string, 
    details: string
  ): Promise<void> {
    const supabase = createClient(); // Create client for this method
    
    try {
      await supabase
        .from('activity_log')
        .insert({
          id: safeUUID(),
          client_id: clientId,
          action,
          type: action,
          date: new Date().toISOString(),
          metadata: { details }
        });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Logging errors are non-critical
    }
  }

  /**
   * Handle client status changes
   */
  static async onClientStatusChanged(
    clientId: string, 
    oldStatus: string, 
    newStatus: string
  ): Promise<void> {
    try {
      // Handle status-specific workflows
      if (newStatus === 'active' && oldStatus === 'prospect') {
        // Client converted from prospect to active
        await this.handleClientActivation(clientId);
      } else if (newStatus === 'review_due') {
        // Schedule review tasks
        await this.scheduleAnnualReview(clientId);
      }

      await this.logActivity(
        clientId, 
        'status_changed', 
        `Status changed from ${oldStatus} to ${newStatus}`
      );
    } catch (error) {
      console.error('Error handling status change:', error);
    }
  }

  private static async handleClientActivation(clientId: string): Promise<void> {
    // Generate onboarding documents
    // Send welcome communications
    // Schedule first annual review
    console.log('Handling client activation for:', clientId);
  }

  private static async scheduleAnnualReview(clientId: string): Promise<void> {
    const supabase = createClient(); // Create client for this method
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user?.id) {
      console.warn('Skipping annual review schedule: no authenticated user')
      return
    }

    await supabase
      .from('client_reviews')
      .insert({
        client_id: clientId,
        review_type: 'annual_review',
        due_date: nextYear.toISOString().split('T')[0],
        status: 'scheduled',
        created_by: user.id
      });
  }
}

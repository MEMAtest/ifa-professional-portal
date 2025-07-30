// ===================================================================
// src/services/AssessmentDocumentIntegration.ts
// Complete integration service for assessment completion workflows
// ===================================================================

import { createBrowserClient } from '@supabase/ssr';

// ===================================================================
// TYPES AND INTERFACES
// ===================================================================

interface AssessmentData {
  clientId: string;
  assessmentType: 'suitability' | 'atr' | 'cfl';
  assessmentId: string;
  data: any;
}

interface DocumentGenerationResult {
  success: boolean;
  document?: {
    id: string;
    name: string;
    url?: string;
  };
  error?: string;
}

// ===================================================================
// ASSESSMENT DOCUMENT INTEGRATION CLASS
// ===================================================================

export class AssessmentDocumentIntegration {
  private static supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Main entry point - Handle assessment completion and trigger document generation
   */
  static async onAssessmentCompleted(assessment: AssessmentData): Promise<void> {
    try {
      console.log(`Processing completed ${assessment.assessmentType} assessment for client ${assessment.clientId}`);

      // Get client data
      const { data: client, error: clientError } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', assessment.clientId)
        .single();

      if (clientError || !client) {
        throw new Error('Client not found');
      }

      // Generate appropriate documents based on assessment type
      switch (assessment.assessmentType) {
        case 'suitability':
          await this.generateSuitabilityDocuments(client, assessment);
          break;
        case 'atr':
          await this.updateRiskProfileDocuments(client, assessment);
          break;
        case 'cfl':
          await this.generateCapacityForLossReport(client, assessment);
          break;
        default:
          console.warn(`Unknown assessment type: ${assessment.assessmentType}`);
      }

      // Update client status if needed
      await this.updateClientStatus(client, assessment);
      
      // Schedule follow-up tasks
      await this.scheduleFollowUpTasks(client, assessment);

      console.log(`Assessment processing completed for client ${assessment.clientId}`);

    } catch (error) {
      console.error('Error in assessment document integration:', error);
      throw error;
    }
  }

  /**
   * Generate suitability report and related documents
   */
  private static async generateSuitabilityDocuments(client: any, assessment: AssessmentData): Promise<void> {
    try {
      console.log('Generating suitability documents...');

      // Find suitability report template
      const { data: template, error: templateError } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('template_name', 'Suitability Report')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.warn('Suitability report template not found, creating generic document record');
        await this.createGenericDocument(client, assessment, 'suitability_report');
        return;
      }

      // Prepare document variables
      const variables = this.prepareSuitabilityVariables(client, assessment);

      // Generate the document
      const documentResult = await this.generateDocumentFromTemplate(template, client, variables);

      if (documentResult.success && documentResult.document) {
        // Link document to client
        await this.supabase
          .from('client_documents')
          .insert({
            client_id: client.id,
            document_id: documentResult.document.id,
            document_type: 'suitability_report',
            created_at: new Date().toISOString()
          });

        // Create pending action to review document
        await this.createPendingAction(client.id, {
          type: 'document_review',
          title: 'Review Suitability Report',
          description: 'New suitability report generated and ready for review',
          priority: 'medium',
          metadata: {
            document_id: documentResult.document.id,
            assessment_id: assessment.assessmentId
          }
        });

        console.log(`Suitability report generated: ${documentResult.document.id}`);
      }

    } catch (error) {
      console.error('Error generating suitability documents:', error);
      // Create a fallback document record
      await this.createGenericDocument(client, assessment, 'suitability_report');
    }
  }

  /**
   * Update risk-related documents after ATR assessment
   */
  private static async updateRiskProfileDocuments(client: any, assessment: AssessmentData): Promise<void> {
    try {
      console.log('Updating risk profile documents...');

      // Update client's risk profile in database
      const riskData = this.extractRiskData(assessment.data);
      
      const { error } = await this.supabase
        .from('clients')
        .update({
          risk_profile: {
            ...client.risk_profile,
            ...riskData,
            lastAssessment: new Date().toISOString(),
            assessmentId: assessment.assessmentId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);

      if (error) throw error;

      // Check if risk profile has changed significantly
      const previousRisk = client.risk_profile?.attitudeToRisk || 5;
      const newRisk = riskData.attitudeToRisk || 5;
      
      if (Math.abs(previousRisk - newRisk) >= 2) {
        await this.flagForUrgentReview(client.id, 'Significant risk profile change detected');
      }

      console.log('Risk profile updated successfully');

    } catch (error) {
      console.error('Error updating risk profile documents:', error);
      throw error;
    }
  }

  /**
   * Generate capacity for loss report
   */
  private static async generateCapacityForLossReport(client: any, assessment: AssessmentData): Promise<void> {
    try {
      console.log('Generating capacity for loss report...');

      // Create CFL document record
      await this.createGenericDocument(client, assessment, 'capacity_for_loss_report');

      // Update client financial profile with CFL assessment
      const { error } = await this.supabase
        .from('clients')
        .update({
          financial_profile: {
            ...client.financial_profile,
            capacityForLoss: assessment.data.capacity_level || 'moderate',
            cflAssessmentDate: new Date().toISOString(),
            cflAssessmentId: assessment.assessmentId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);

      if (error) throw error;

      console.log('Capacity for loss report generated');

    } catch (error) {
      console.error('Error generating capacity for loss report:', error);
      throw error;
    }
  }

  /**
   * Update client status based on assessment completion
   */
  private static async updateClientStatus(client: any, assessment: AssessmentData): Promise<void> {
    try {
      // If client was a prospect and has completed suitability, upgrade to active
      if (client.status === 'prospect' && assessment.assessmentType === 'suitability') {
        await this.supabase
          .from('clients')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', client.id);

        console.log(`Client ${client.id} status updated to active`);
      }
    } catch (error) {
      console.error('Error updating client status:', error);
    }
  }

  /**
   * Schedule follow-up tasks after assessment completion
   */
  private static async scheduleFollowUpTasks(client: any, assessment: AssessmentData): Promise<void> {
    try {
      const nextReviewDate = this.calculateNextReviewDate(assessment.data);

      // Schedule next review
      await this.supabase
        .from('client_reviews')
        .upsert({
          client_id: client.id,
          review_type: `${assessment.assessmentType}_review`,
          due_date: nextReviewDate,
          status: 'scheduled',
          review_summary: `Follow-up review for ${assessment.assessmentType} assessment`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      console.log(`Follow-up review scheduled for ${nextReviewDate}`);

    } catch (error) {
      console.error('Error scheduling follow-up tasks:', error);
    }
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Prepare variables for suitability report template
   */
  private static prepareSuitabilityVariables(client: any, assessment: AssessmentData): Record<string, any> {
    const personalDetails = client.personal_details || {};
    const assessmentData = assessment.data || {};

    return {
      CLIENT_NAME: `${personalDetails.firstName || ''} ${personalDetails.lastName || ''}`.trim(),
      CLIENT_REF: client.client_ref || client.id.slice(-8).toUpperCase(),
      ASSESSMENT_DATE: new Date().toLocaleDateString('en-GB'),
      RISK_PROFILE: assessmentData.risk_assessment?.risk_category || 'Not Assessed',
      RISK_SCORE: assessmentData.risk_assessment?.attitude_to_risk || 'N/A',
      INVESTMENT_EXPERIENCE: assessmentData.knowledge_experience?.investment_experience || 'None specified',
      INVESTMENT_OBJECTIVES: assessmentData.objectives?.primary_objective || 'Not specified',
      TIME_HORIZON: assessmentData.objectives?.time_horizon || 'Not specified',
      CAPACITY_FOR_LOSS: assessmentData.risk_assessment?.capacity_for_loss || 'Not assessed',
      RECOMMENDATION_SUMMARY: this.generateRecommendationSummary(assessmentData),
      NEXT_REVIEW_DATE: this.calculateNextReviewDate(assessmentData),
      ADVISER_NAME: 'Your Financial Adviser', // TODO: Get from user context
      DATE_GENERATED: new Date().toLocaleDateString('en-GB')
    };
  }

  /**
   * Extract risk data from assessment
   */
  private static extractRiskData(assessmentData: any): any {
    return {
      attitudeToRisk: assessmentData.risk_assessment?.attitude_to_risk || 5,
      riskTolerance: assessmentData.risk_assessment?.risk_category || 'moderate',
      riskCapacity: assessmentData.risk_assessment?.capacity_for_loss || 'moderate',
      knowledgeExperience: assessmentData.knowledge_experience?.overall_level || 'limited'
    };
  }

  /**
   * Generate document from template (simplified version)
   */
  private static async generateDocumentFromTemplate(
    template: any, 
    client: any, 
    variables: Record<string, any>
  ): Promise<DocumentGenerationResult> {
    try {
      // Create document record
      const { data: document, error } = await this.supabase
        .from('documents')
        .insert({
          name: `${template.template_name} - ${variables.CLIENT_NAME}`,
          template_id: template.id,
          client_id: client.id,
          status: 'generated',
          document_type: 'suitability_report',
          variables: variables,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        document: {
          id: document.id,
          name: document.name,
          url: document.file_url
        }
      };

    } catch (error) {
      console.error('Error generating document from template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create generic document record when template generation fails
   */
  private static async createGenericDocument(
    client: any, 
    assessment: AssessmentData, 
    documentType: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('documents')
        .insert({
          name: `${documentType.replace('_', ' ').toUpperCase()} - ${client.personal_details?.firstName} ${client.personal_details?.lastName}`,
          client_id: client.id,
          document_type: documentType,
          status: 'pending_generation',
          metadata: {
            assessment_id: assessment.assessmentId,
            assessment_type: assessment.assessmentType,
            generated_at: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log(`Generic ${documentType} document record created`);
    } catch (error) {
      console.error('Error creating generic document:', error);
    }
  }

  /**
   * Create pending action for follow-up
   */
  private static async createPendingAction(clientId: string, action: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('pending_actions')
        .insert({
          client_id: clientId,
          action_type: action.type,
          title: action.title,
          description: action.description,
          priority: action.priority,
          status: 'pending',
          metadata: action.metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating pending action:', error);
    }
  }

  /**
   * Generate recommendation summary based on assessment data
   */
  private static generateRecommendationSummary(assessmentData: any): string {
    const risk = assessmentData.risk_assessment?.risk_category || 'Moderate';
    const objective = assessmentData.objectives?.primary_objective || 'Growth';
    const timeHorizon = assessmentData.objectives?.time_horizon || 'medium-term';
    
    return `Based on your ${risk.toLowerCase()} risk profile, ${objective.toLowerCase()} investment objective, and ${timeHorizon} time horizon, we recommend a diversified portfolio strategy aligned with your long-term financial goals and current circumstances.`;
  }

  /**
   * Calculate next review date based on assessment data
   */
  private static calculateNextReviewDate(assessmentData: any): string {
    const reviewFrequency = assessmentData.review_frequency || 'annual';
    const nextReview = new Date();
    
    switch (reviewFrequency) {
      case 'quarterly':
        nextReview.setMonth(nextReview.getMonth() + 3);
        break;
      case 'semi-annual':
        nextReview.setMonth(nextReview.getMonth() + 6);
        break;
      case 'annual':
      default:
        nextReview.setFullYear(nextReview.getFullYear() + 1);
        break;
    }
    
    return nextReview.toLocaleDateString('en-GB');
  }

  /**
   * Flag client for urgent review
   */
  private static async flagForUrgentReview(clientId: string, reason: string): Promise<void> {
    try {
      await this.supabase
        .from('client_reviews')
        .insert({
          client_id: clientId,
          review_type: 'urgent_review',
          due_date: new Date().toISOString(),
          status: 'pending',
          review_summary: reason,
          priority: 'high',
          created_at: new Date().toISOString()
        });

      // Also create a pending action
      await this.createPendingAction(clientId, {
        type: 'urgent_review',
        title: 'Urgent Client Review Required',
        description: reason,
        priority: 'high'
      });

      console.log(`Client ${clientId} flagged for urgent review: ${reason}`);
    } catch (error) {
      console.error('Error flagging for urgent review:', error);
    }
  }
}

// ===================================================================
// EXPORT DEFAULT - THIS FIXES THE IMPORT ERROR
// ===================================================================

export default AssessmentDocumentIntegration;
// ===================================================================
// src/services/AssessmentDocumentIntegration.ts
// Complete integration service for assessment completion workflows
// ===================================================================

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

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

// Define minimal types for the tables we're using
type AnySupabaseClient = SupabaseClient<any, any, any>

// ===================================================================
// ASSESSMENT DOCUMENT INTEGRATION CLASS
// ===================================================================

export class AssessmentDocumentIntegration {
  private supabase: AnySupabaseClient

  constructor() {
    this.supabase = createClient() as AnySupabaseClient
  }

  /**
   * Main entry point - Handle assessment completion and trigger document generation
   */
  async onAssessmentCompleted(assessment: AssessmentData): Promise<void> {
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
  private async generateSuitabilityDocuments(client: any, assessment: AssessmentData): Promise<void> {
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
          } as any);

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
  private async updateRiskProfileDocuments(client: any, assessment: AssessmentData): Promise<void> {
    try {
      console.log('Updating risk profile documents...');

      // Update client's risk profile in database
      const riskData = this.extractRiskData(assessment.data);
      
      const { error } = await this.supabase
        .from('clients')
        .update({
          risk_profile: riskData,
          last_atr_assessment: assessment.assessmentId,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', client.id);

      if (error) {
        console.error('Failed to update client risk profile:', error);
      }

      // Generate risk profile summary document
      await this.createGenericDocument(client, assessment, 'risk_profile_update');

      console.log('Risk profile documents updated');

    } catch (error) {
      console.error('Error updating risk profile documents:', error);
    }
  }

  /**
   * Generate capacity for loss report
   */
  private async generateCapacityForLossReport(client: any, assessment: AssessmentData): Promise<void> {
    try {
      console.log('Generating capacity for loss report...');

      // Extract key CFL metrics
      const cflMetrics = this.extractCFLMetrics(assessment.data);

      // Find CFL template
      const { data: template } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('template_name', 'Capacity for Loss Assessment')
        .eq('is_active', true)
        .single();

      if (template) {
        const variables = {
          ...this.getBaseClientVariables(client),
          ...cflMetrics
        };

        await this.generateDocumentFromTemplate(template, client, variables);
      } else {
        await this.createGenericDocument(client, assessment, 'cfl_report');
      }

      console.log('CFL report generated');

    } catch (error) {
      console.error('Error generating CFL report:', error);
    }
  }

  /**
   * Update client status based on assessment completion
   */
  private async updateClientStatus(client: any, assessment: AssessmentData): Promise<void> {
    try {
      // Check if all required assessments are complete
      const { data: assessments } = await this.supabase
        .from('assessments')
        .select('assessment_type, status')
        .eq('client_id', client.id);

      const assessmentTypes = ['suitability', 'atr', 'cfl'];
      const completedTypes = assessments
        ?.filter((a: any) => a.status === 'completed')
        .map((a: any) => a.assessment_type) || [];

      const allComplete = assessmentTypes.every(type => completedTypes.includes(type));

      if (allComplete) {
        await this.supabase
          .from('clients')
          .update({
            status: 'active',
            compliance_status: 'compliant',
            last_review_date: new Date().toISOString()
          } as any)
          .eq('id', client.id);

        console.log('Client status updated to active/compliant');
      }

    } catch (error) {
      console.error('Error updating client status:', error);
    }
  }

  /**
   * Schedule follow-up tasks after assessment completion
   */
  private async scheduleFollowUpTasks(client: any, assessment: AssessmentData): Promise<void> {
    try {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 7);

      // Create follow-up review task
      await this.supabase
        .from('tasks')
        .insert({
          client_id: client.id,
          task_type: 'document_review',
          title: `Review ${assessment.assessmentType} assessment documents`,
          description: `Review and approve documents generated from ${assessment.assessmentType} assessment`,
          due_date: followUpDate.toISOString(),
          priority: 'medium',
          status: 'pending',
          metadata: {
            assessment_id: assessment.assessmentId,
            assessment_type: assessment.assessmentType
          }
        } as any);

      // Schedule annual review if suitability is complete
      if (assessment.assessmentType === 'suitability') {
        const annualReviewDate = new Date();
        annualReviewDate.setFullYear(annualReviewDate.getFullYear() + 1);

        await this.supabase
          .from('scheduled_reviews')
          .insert({
            client_id: client.id,
            review_type: 'annual',
            scheduled_date: annualReviewDate.toISOString(),
            status: 'scheduled',
            metadata: {
              triggered_by: assessment.assessmentId
            }
          } as any);
      }

      console.log('Follow-up tasks scheduled');

    } catch (error) {
      console.error('Error scheduling follow-up tasks:', error);
    }
  }

  /**
   * Create a generic document record when template generation fails
   */
  private async createGenericDocument(client: any, assessment: AssessmentData, documentType: string): Promise<void> {
    try {
      const { data: document } = await this.supabase
        .from('documents')
        .insert({
          client_id: client.id,
          title: `${assessment.assessmentType.toUpperCase()} Assessment - ${client.personal_details?.firstName} ${client.personal_details?.lastName}`,
          document_type: documentType,
          status: 'draft',
          metadata: {
            assessment_id: assessment.assessmentId,
            assessment_type: assessment.assessmentType,
            generated_at: new Date().toISOString()
          }
        } as any)
        .select()
        .single();

      if (document) {
        await this.supabase
          .from('client_documents')
          .insert({
            client_id: client.id,
            document_id: (document as any).id,
            document_type: documentType
          } as any);
      }

    } catch (error) {
      console.error('Error creating generic document:', error);
    }
  }

  /**
   * Generate document from template
   */
  private async generateDocumentFromTemplate(template: any, client: any, variables: Record<string, any>): Promise<DocumentGenerationResult> {
    try {
      // Process template content with variables
      let content = template.template_content;
      
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, String(value || ''));
      });

      // Create document record
      const { data: document, error } = await this.supabase
        .from('documents')
        .insert({
          client_id: client.id,
          title: template.document_name || `${template.template_name} - ${client.personal_details?.firstName} ${client.personal_details?.lastName}`,
          content: content,
          document_type: template.document_type,
          template_id: template.id,
          status: 'draft',
          metadata: {
            variables_used: variables,
            generated_at: new Date().toISOString()
          }
        } as any)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const doc = document as any;
      
      return {
        success: true,
        document: {
          id: doc.id,
          name: doc.title,
          url: `/documents/${doc.id}`
        }
      };

    } catch (error) {
      console.error('Error generating document from template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document generation failed'
      };
    }
  }

  /**
   * Prepare suitability variables for template
   */
  private prepareSuitabilityVariables(client: any, assessment: AssessmentData): Record<string, any> {
    const data = assessment.data;
    
    return {
      // Client details
      CLIENT_NAME: `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim(),
      CLIENT_REF: client.client_ref,
      CLIENT_DOB: client.personal_details?.dateOfBirth,
      CLIENT_ADDRESS: this.formatAddress(client.contact_info?.address),
      
      // Assessment data
      RISK_SCORE: data.riskProfile?.score || 'N/A',
      RISK_LEVEL: data.riskProfile?.level || 'Medium',
      INVESTMENT_OBJECTIVE: data.investmentObjectives?.primary || 'Growth',
      TIME_HORIZON: data.timeHorizon || '5-10 years',
      
      // Financial details
      ANNUAL_INCOME: this.formatCurrency(data.financialSituation?.annualIncome),
      NET_WORTH: this.formatCurrency(data.financialSituation?.netWorth),
      INVESTMENT_AMOUNT: this.formatCurrency(data.proposedInvestment?.amount),
      
      // Recommendations
      RECOMMENDED_PORTFOLIO: data.recommendations?.portfolio || 'Balanced Portfolio',
      ASSET_ALLOCATION: this.formatAssetAllocation(data.recommendations?.assetAllocation),
      
      // Metadata
      ASSESSMENT_DATE: new Date(assessment.data.completedAt || new Date()).toLocaleDateString(),
      ADVISOR_NAME: data.advisorName || 'Financial Advisor',
      FIRM_NAME: 'Your Financial Advisory Firm'
    };
  }

  /**
   * Extract risk data from ATR assessment
   */
  private extractRiskData(assessmentData: any): any {
    return {
      risk_score: assessmentData.riskScore || 0,
      risk_level: assessmentData.riskLevel || 'medium',
      risk_capacity: assessmentData.riskCapacity || 'moderate',
      risk_tolerance: assessmentData.riskTolerance || 'moderate',
      last_assessed: new Date().toISOString()
    };
  }

  /**
   * Extract CFL metrics from assessment
   */
  private extractCFLMetrics(assessmentData: any): Record<string, any> {
    return {
      CFL_SCORE: assessmentData.cflScore || 0,
      CFL_PERCENTAGE: assessmentData.maxLossPercentage || '10%',
      CFL_AMOUNT: this.formatCurrency(assessmentData.maxLossAmount),
      EMERGENCY_FUND: this.formatCurrency(assessmentData.emergencyFund),
      RECOVERY_TIME: assessmentData.recoveryTime || 'N/A'
    };
  }

  /**
   * Get base client variables for templates
   */
  private getBaseClientVariables(client: any): Record<string, any> {
    return {
      CLIENT_NAME: `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim(),
      CLIENT_REF: client.client_ref,
      CLIENT_EMAIL: client.contact_info?.email,
      CLIENT_PHONE: client.contact_info?.phone,
      CLIENT_ADDRESS: this.formatAddress(client.contact_info?.address)
    };
  }

  /**
   * Create pending action for client
   */
  private async createPendingAction(clientId: string, action: any): Promise<void> {
    try {
      await this.supabase
        .from('pending_actions')
        .insert({
          client_id: clientId,
          ...action,
          created_at: new Date().toISOString()
        } as any);
    } catch (error) {
      console.error('Error creating pending action:', error);
    }
  }

  /**
   * Format address for display
   */
  private formatAddress(address: any): string {
    if (!address) return 'N/A';
    
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.county,
      address.postcode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Format currency values
   */
  private formatCurrency(value: any): string {
    if (!value) return '£0';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(num);
  }

  /**
   * Format asset allocation for display
   */
  private formatAssetAllocation(allocation: any): string {
    if (!allocation) return 'Balanced allocation';
    
    const parts = Object.entries(allocation)
      .map(([asset, percentage]) => `${asset}: ${percentage}%`)
      .join(', ');
    
    return parts || 'Balanced allocation';
  }
}

// Create singleton instance
export const assessmentDocumentIntegration = new AssessmentDocumentIntegration()
export default assessmentDocumentIntegration
// ================================================================
// ATR REPORT SERVICE - PHASE 2
// Generates comprehensive ATR (Attitude to Risk) assessment reports
// NOW WITH REAL PDF GENERATION using @react-pdf/renderer
// ================================================================

import { createClient } from '@/lib/supabase/client';
import { ReportUtils } from './utils/ReportUtils';
import { PDFGenerator, type PDFReportData } from '@/lib/pdf/PDFGenerator';
import { advisorContextService } from '@/services/AdvisorContextService';
import type {
  UnifiedReportRequest,
  UnifiedReportResult,
  ReportOptions
} from '@/types/reporting.types';

// ATR-specific types based on existing schema
interface ATRAssessment {
  id: string;
  client_id: string;
  risk_level: number;
  risk_category: string;
  total_score: number;
  assessment_date: string;
  category_scores: Record<string, number>;
  recommendations: string[];
  answers: Record<string, number>;
  version: number;
  is_current: boolean;
  notes?: string;
  completed_by?: string;
}

interface ClientBasicInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string;
}

interface ATRReportData {
  client: ClientBasicInfo;
  assessment: ATRAssessment;
  questions?: Array<{
    id: string;
    text: string;
    answer: number;
    selectedText: string;
  }>;
  riskProfileSummary: {
    level: number;
    category: string;
    description: string;
    recommendations: string[];
  };
}

export class ATRReportService {
  private supabase = createClient();

  async generateReport(request: UnifiedReportRequest): Promise<UnifiedReportResult> {
    try {
      console.log('🎯 ATRReportService: Starting ATR report generation');
      console.log('Request:', {
        type: request.type,
        dataId: request.dataId,
        options: request.options
      });

      // Validate request
      if (request.type !== 'atr') {
        throw new Error(`Invalid request type: ${request.type}. Expected 'atr'.`);
      }

      if (!request.dataId) {
        throw new Error('dataId (client_id) is required for ATR reports');
      }

      // Fetch ATR data
      const reportData = await this.fetchATRData(request.dataId);

      // Generate the report
      const reportContent = await this.buildATRReport(reportData, request.options || {});

      // Create PDF
      const pdfResult = await ReportUtils.generatePDF(reportContent, {
        filename: `ATR-Assessment-${reportData.client.firstName}-${reportData.client.lastName}-${new Date().toISOString().split('T')[0]}.pdf`,
        title: 'Attitude to Risk Assessment Report'
      });

      return {
        success: true,
        reportContent,
        downloadUrl: pdfResult.downloadUrl,
        metadata: {
          service: 'ATRReportService',
          clientId: request.dataId,
          assessmentId: reportData.assessment.id,
          riskLevel: reportData.assessment.risk_level,
          riskCategory: reportData.assessment.risk_category,
          version: reportData.assessment.version,
          reportType: 'atr',
          generatedAt: new Date().toISOString(),
          filename: pdfResult.filename
        }
      };

    } catch (error) {
      console.error('❌ ATRReportService error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating ATR report',
        metadata: {
          service: 'ATRReportService',
          error: true,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private async fetchATRData(clientId: string): Promise<ATRReportData> {
    console.log('📊 Fetching ATR data for client:', clientId);

    // Fetch client basic info from JSON columns
    const { data: clientRaw, error: clientError } = await this.supabase
      .from('clients')
      .select('id, personal_details, contact_info')
      .eq('id', clientId)
      .single();

    if (clientError) {
      throw new Error(`Failed to fetch client data: ${clientError.message}`);
    }

    if (!clientRaw) {
      throw new Error(`Client not found: ${clientId}`);
    }

    // Extract data from JSON columns
    const client = {
      id: clientRaw.id,
      firstName: clientRaw.personal_details?.firstName || 'Unknown',
      lastName: clientRaw.personal_details?.lastName || 'Client',
      email: clientRaw.contact_info?.email || '',
      dateOfBirth: clientRaw.personal_details?.dateOfBirth || ''
    };

    // Fetch latest ATR assessment
    const { data: assessment, error: assessmentError } = await this.supabase
      .from('atr_assessments')
      .select(`
        id,
        client_id,
        risk_level,
        risk_category,
        total_score,
        assessment_date,
        category_scores,
        recommendations,
        answers,
        version,
        is_current,
        notes,
        completed_by
      `)
      .eq('client_id', clientId)
      .eq('is_current', true)
      .single();

    if (assessmentError) {
      throw new Error(`Failed to fetch ATR assessment: ${assessmentError.message}`);
    }

    if (!assessment) {
      throw new Error(`No current ATR assessment found for client: ${clientId}`);
    }

    console.log('✅ ATR data fetched successfully');

    // Build risk profile summary
    const riskProfileSummary = this.buildRiskProfileSummary(assessment);

    return {
      client,
      assessment,
      riskProfileSummary
    };
  }

  private buildRiskProfileSummary(assessment: ATRAssessment) {
    const level = assessment.risk_level;
    const category = assessment.risk_category;

    // Risk descriptions based on level
    const descriptions = {
      1: 'Very Conservative - Prefers capital preservation with minimal risk',
      2: 'Conservative - Willing to accept minimal risk for slightly higher returns',
      3: 'Cautiously Moderate - Comfortable with low to moderate risk levels',
      4: 'Moderate - Balanced approach to risk and return',
      5: 'Moderately Adventurous - Willing to accept moderate risk for potential higher returns',
      6: 'Adventurous - Comfortable with higher risk for potential significant returns',
      7: 'Very Adventurous - Seeks high returns despite significant risk',
      8: 'Highly Adventurous - Embraces high risk for maximum potential returns',
      9: 'Extremely Adventurous - Thrives on very high risk investments',
      10: 'Speculative - Willing to accept maximum risk for highest potential returns'
    };

    const description = descriptions[level as keyof typeof descriptions] || 'Risk level not defined';

    return {
      level,
      category,
      description,
      recommendations: assessment.recommendations || []
    };
  }

  private async buildATRReport(data: ATRReportData, options: ReportOptions): Promise<string> {
    console.log('📝 Building ATR report content');

    const { client, assessment, riskProfileSummary } = data;

    // Report header
    let reportContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ATR Assessment Report - ${client.firstName} ${client.lastName}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            border-left: 4px solid #2563eb;
            background-color: #f8fafc;
        }
        .risk-level {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            text-align: center;
            padding: 15px;
            background-color: #dbeafe;
            border-radius: 8px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid #e5e7eb;
        }
        th {
            background-color: #f3f4f6;
            font-weight: 600;
        }
        .recommendations {
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .score-bar {
            height: 20px;
            background-color: #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .score-fill {
            height: 100%;
            background-color: #2563eb;
            transition: width 0.3s ease;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Attitude to Risk Assessment Report</h1>
        <h2>${client.firstName} ${client.lastName}</h2>
        <p>Assessment Date: ${ReportUtils.formatDate(new Date(assessment.assessment_date))}</p>
        <p>Report Generated: ${ReportUtils.formatDate(new Date())}</p>
    </div>
`;

    // Risk Level Summary
    reportContent += `
    <div class="section">
        <h3>Risk Profile Summary</h3>
        <div class="risk-level">
            Risk Level: ${riskProfileSummary.level}/10 - ${riskProfileSummary.category}
        </div>
        <p><strong>Profile Description:</strong></p>
        <p>${riskProfileSummary.description}</p>

        <div class="score-bar">
            <div class="score-fill" style="width: ${(riskProfileSummary.level / 10) * 100}%"></div>
        </div>
        <p style="text-align: center; font-size: 14px; color: #6b7280;">
            Score: ${assessment.total_score}/100 (Risk Level ${riskProfileSummary.level}/10)
        </p>
    </div>
`;

    // Assessment Details
    reportContent += `
    <div class="section">
        <h3>Assessment Details</h3>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Assessment ID</td>
                <td>${assessment.id}</td>
            </tr>
            <tr>
                <td>Version</td>
                <td>${assessment.version}</td>
            </tr>
            <tr>
                <td>Total Score</td>
                <td>${assessment.total_score}/100</td>
            </tr>
            <tr>
                <td>Risk Category</td>
                <td>${assessment.risk_category}</td>
            </tr>
            <tr>
                <td>Risk Level</td>
                <td>${assessment.risk_level}/10</td>
            </tr>
            <tr>
                <td>Assessment Status</td>
                <td>${assessment.is_current ? 'Current' : 'Historical'}</td>
            </tr>
        </table>
    </div>
`;

    // Category Scores (if available)
    if (assessment.category_scores && Object.keys(assessment.category_scores).length > 0) {
      reportContent += `
    <div class="section">
        <h3>Category Breakdown</h3>
        <table>
            <tr>
                <th>Category</th>
                <th>Score</th>
                <th>Visual</th>
            </tr>
`;

      for (const [category, score] of Object.entries(assessment.category_scores)) {
        const percentage = typeof score === 'number' ? (score / 5) * 100 : 0; // Assuming 5 is max per category
        reportContent += `
            <tr>
                <td>${category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                <td>${score}/5</td>
                <td>
                    <div class="score-bar" style="height: 15px;">
                        <div class="score-fill" style="width: ${percentage}%"></div>
                    </div>
                </td>
            </tr>
`;
      }

      reportContent += `
        </table>
    </div>
`;
    }

    // Recommendations
    if (riskProfileSummary.recommendations.length > 0) {
      reportContent += `
    <div class="section">
        <h3>Recommendations</h3>
        <div class="recommendations">
            <ul>
`;
      riskProfileSummary.recommendations.forEach(rec => {
        reportContent += `<li>${rec}</li>`;
      });
      reportContent += `
            </ul>
        </div>
    </div>
`;
    }

    // Notes (if any)
    if (assessment.notes) {
      reportContent += `
    <div class="section">
        <h3>Additional Notes</h3>
        <p>${assessment.notes}</p>
    </div>
`;
    }

    // Include charts if requested
    if (options.includeCharts) {
      reportContent += this.buildATRCharts(assessment);
    }

    // Footer
    reportContent += `
    <div class="footer">
        <p>This report was generated automatically by the IFA Professional Portal</p>
        <p>Report ID: ATR-${assessment.id} | Generated: ${new Date().toISOString()}</p>
        <p>© ${new Date().getFullYear()} IFA Professional Portal. All rights reserved.</p>
    </div>
`;

    reportContent += `
</body>
</html>
`;

    console.log('✅ ATR report content built successfully');
    return reportContent;
  }

  private buildATRCharts(assessment: ATRAssessment): string {
    // Simple chart section using CSS
    return `
    <div class="section">
        <h3>Risk Profile Visualization</h3>
        <div style="display: flex; justify-content: center; align-items: center; height: 200px; background-color: #f3f4f6; border-radius: 8px; margin: 20px 0;">
            <div style="text-align: center;">
                <div style="width: 150px; height: 150px; border-radius: 50%; background: linear-gradient(45deg, #ef4444, #f59e0b, #22c55e); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                    Risk Level<br>${assessment.risk_level}/10
                </div>
            </div>
        </div>
        <p style="text-align: center; color: #6b7280;">
            Visual representation of risk tolerance level
        </p>
    </div>
`;
  }

  // Utility methods
  isReportTypeSupported(type: string): boolean {
    return type === 'atr';
  }

  getAvailableOptions(): ReportOptions {
    return {
      includeCharts: true,
      includeAssumptions: false,
      outputFormat: 'pdf'
    };
  }

  // ================================================================
  // NEW: Real PDF Generation Methods using @react-pdf/renderer
  // ================================================================

  /**
   * Generate a real PDF ATR report (not HTML masquerading as PDF)
   */
  async generatePDFReport(clientId: string): Promise<UnifiedReportResult> {
    try {
      console.log('📄 Starting REAL ATR PDF generation for client:', clientId);

      // Fetch ATR data
      const reportData = await this.fetchATRData(clientId);

      // Get advisor context for dynamic names
      const advisorContext = await advisorContextService.getReportContext();

      // Build PDF report data
      const pdfData: PDFReportData = {
        clientName: `${reportData.client.firstName} ${reportData.client.lastName}`,
        clientEmail: reportData.client.email,
        reportDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        reportType: 'Attitude to Risk Assessment',
        advisorName: advisorContext.advisorName,
        firmName: advisorContext.firmName,

        // ATR Specific
        riskLevel: reportData.assessment.risk_level,
        riskCategory: reportData.assessment.risk_category,
        riskDescription: reportData.riskProfileSummary.description,
        totalScore: reportData.assessment.total_score,
        categoryScores: reportData.assessment.category_scores,
        recommendations: reportData.riskProfileSummary.recommendations
      };

      // Generate actual PDF
      console.log('🔧 Generating ATR PDF with @react-pdf/renderer...');
      const pdfBlob = await PDFGenerator.generateATRReport(pdfData);

      // Upload PDF to Supabase Storage
      const fileName = `ATR_Report_${reportData.client.firstName}_${reportData.client.lastName}_${Date.now()}.pdf`;
      const filePath = `generated_documents/${clientId}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, await pdfBlob.arrayBuffer(), {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      // Create database record
      const { data: docRecord, error: dbError } = await this.supabase
        .from('generated_documents')
        .insert({
          client_id: clientId,
          template_id: null,
          file_name: fileName,
          file_path: filePath,
          file_type: 'application/pdf',
          title: `ATR Assessment - ${reportData.client.firstName} ${reportData.client.lastName}`
        })
        .select()
        .single();

      if (dbError) {
        await this.supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Failed to save document record: ${dbError.message}`);
      }

      // Generate download URL
      const { data: urlData } = await this.supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      console.log('✅ ATR PDF generated and uploaded successfully:', fileName);

      return {
        success: true,
        downloadUrl: urlData?.signedUrl || '',
        metadata: {
          service: 'ATRReportService',
          clientId,
          assessmentId: reportData.assessment.id,
          riskLevel: reportData.assessment.risk_level,
          riskCategory: reportData.assessment.risk_category,
          version: reportData.assessment.version,
          reportType: 'atr-pdf',
          generatedAt: new Date().toISOString(),
          filename: fileName
        }
      };

    } catch (error) {
      console.error('❌ ATR PDF generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ATR PDF generation failed',
        metadata: {
          service: 'ATRReportService',
          error: true,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Generate ATR PDF and return as Base64 (for email attachments)
   */
  async generatePDFBase64(clientId: string): Promise<{ success: boolean; base64?: string; error?: string }> {
    try {
      const reportData = await this.fetchATRData(clientId);

      const pdfData: PDFReportData = {
        clientName: `${reportData.client.firstName} ${reportData.client.lastName}`,
        clientEmail: reportData.client.email,
        reportDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        reportType: 'Attitude to Risk Assessment',
        advisorName: 'Professional Advisor',
        firmName: 'Financial Advisory Services',
        riskLevel: reportData.assessment.risk_level,
        riskCategory: reportData.assessment.risk_category,
        riskDescription: reportData.riskProfileSummary.description,
        totalScore: reportData.assessment.total_score,
        categoryScores: reportData.assessment.category_scores,
        recommendations: reportData.riskProfileSummary.recommendations
      };

      const base64 = await PDFGenerator.generateATRReportBase64(pdfData);

      return { success: true, base64 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ATR PDF generation failed'
      };
    }
  }

  /**
   * Download ATR PDF directly (client-side only)
   */
  async downloadPDF(clientId: string, filename?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const reportData = await this.fetchATRData(clientId);

      const pdfData: PDFReportData = {
        clientName: `${reportData.client.firstName} ${reportData.client.lastName}`,
        clientEmail: reportData.client.email,
        reportDate: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        reportType: 'Attitude to Risk Assessment',
        advisorName: 'Professional Advisor',
        firmName: 'Financial Advisory Services',
        riskLevel: reportData.assessment.risk_level,
        riskCategory: reportData.assessment.risk_category,
        riskDescription: reportData.riskProfileSummary.description,
        totalScore: reportData.assessment.total_score,
        categoryScores: reportData.assessment.category_scores,
        recommendations: reportData.riskProfileSummary.recommendations
      };

      const defaultFilename = `ATR_Report_${reportData.client.firstName}_${reportData.client.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;

      await PDFGenerator.downloadATRReport(pdfData, filename || defaultFilename);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ATR PDF download failed'
      };
    }
  }
}
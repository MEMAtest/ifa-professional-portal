// ================================================================
// src/app/api/documents/generate-stress-test-report/route.ts
// Stress Test Report Generation API
// Generates professional PDF reports for stress testing results
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'
import { parseRequestBody } from '@/app/api/utils'

// ================================================================
// TYPES
// ================================================================

interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  survivalProbability: number;
  shortfallRisk: number;
  resilienceScore: number;
  worstCaseOutcome: number;
  recoveryTimeYears?: number;
  impactAnalysis: {
    portfolioDeclinePercent: number;
    incomeReductionPercent: number;
    expenseIncreasePercent: number;
  };
}

interface ClientProfile {
  clientId: string;
  clientName: string;
  clientRef: string;
  portfolioValue: number;
  annualIncome: number;
  annualExpenses: number;
  pensionValue: number;
  savings: number;
  age: number;
}

interface ReportOptions {
  includeExecutiveSummary: boolean;
  includeClientProfile: boolean;
  includeScenarioResults: boolean;
  includeRiskAnalysis: boolean;
  includeMitigationStrategies: boolean;
  includeNextSteps: boolean;
  includeResilienceChart: boolean;
  includeComparisonBar: boolean;
  includeSurvivalPie: boolean;
  includeRecoveryTimeline: boolean;
  includeScenarioDetailsTable: boolean;
  includeImpactAnalysisTable: boolean;
  advisorNotes: string;
  outputFormat: 'pdf' | 'html';
}

// ================================================================
// HELPERS
// ================================================================

const COLORS = {
  primary: '#ea580c',      // Orange-600
  primaryDark: '#c2410c',  // Orange-700
  success: '#22c55e',
  successDark: '#15803d',
  warning: '#f59e0b',
  warningDark: '#b45309',
  danger: '#ef4444',
  dangerDark: '#b91c1c',
  gray: '#6b7280',
  grayLight: '#f3f4f6',
  grayDark: '#374151',
  white: '#ffffff',
  black: '#000000'
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toLocaleString()}`;
};

const getResilienceStatus = (score: number): { label: string; color: string; bgColor: string } => {
  if (score >= 70) {
    return { label: 'ROBUST', color: COLORS.successDark, bgColor: '#dcfce7' };
  }
  if (score >= 50) {
    return { label: 'MODERATE', color: COLORS.warningDark, bgColor: '#fef3c7' };
  }
  if (score >= 30) {
    return { label: 'VULNERABLE', color: COLORS.primary, bgColor: '#ffedd5' };
  }
  return { label: 'CRITICAL', color: COLORS.dangerDark, bgColor: '#fee2e2' };
};

// ================================================================
// PDF GENERATION
// ================================================================

function generateStressTestPdf(
  results: StressTestResult[],
  clientProfile: ClientProfile,
  options: ReportOptions
): string {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Calculate summary metrics
  const avgResilience = results.reduce((sum, r) => sum + r.resilienceScore, 0) / results.length;
  const avgSurvival = results.reduce((sum, r) => sum + r.survivalProbability, 0) / results.length;
  const criticalCount = results.filter(r => r.resilienceScore < 50).length;
  const maxDecline = Math.max(...results.map(r => r.impactAnalysis.portfolioDeclinePercent));
  const status = getResilienceStatus(avgResilience);

  // Sort scenarios by resilience
  const sortedResults = [...results].sort((a, b) => a.resilienceScore - b.resilienceScore);
  const worstScenario = sortedResults[0];
  const bestScenario = sortedResults[sortedResults.length - 1];

  // Helper to add new page if needed
  const ensureSpace = (needed: number): void => {
    if (yPos + needed > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
      addFooter();
    }
  };

  // Footer function
  const addFooter = (): void => {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(COLORS.gray);
    doc.text(
      `Confidential - ${clientProfile.clientName} | Page ${pageNum}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    );
  };

  // =============================================
  // PAGE 1: COVER / EXECUTIVE SUMMARY
  // =============================================

  // Header bar
  doc.setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');

  doc.setTextColor(COLORS.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Stress Test Analysis Report', margin, 45);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${clientProfile.clientName} | ${clientProfile.clientRef}`, margin, 65);

  doc.text(new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }), pageWidth - margin, 65, { align: 'right' });

  yPos = 110;

  // Executive Summary Section
  if (options.includeExecutiveSummary) {
    // Status box
    doc.setFillColor(status.bgColor);
    doc.roundedRect(margin, yPos, contentWidth, 80, 8, 8, 'F');

    // Large score circle
    const circleX = margin + 50;
    const circleY = yPos + 40;
    doc.setFillColor(status.color);
    doc.circle(circleX, circleY, 30, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(avgResilience.toFixed(0), circleX, circleY + 7, { align: 'center' });

    // Status text
    doc.setTextColor(status.color);
    doc.setFontSize(18);
    doc.text(status.label, margin + 100, yPos + 30);
    doc.setFontSize(11);
    doc.setTextColor(COLORS.grayDark);
    doc.setFont('helvetica', 'normal');
    doc.text(`Average resilience score across ${results.length} stress scenarios`, margin + 100, yPos + 50);
    doc.text(`${criticalCount} critical vulnerability scenario${criticalCount !== 1 ? 's' : ''} identified`, margin + 100, yPos + 65);

    yPos += 100;

    // Key Metrics Grid
    ensureSpace(100);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.grayDark);
    doc.text('Key Metrics', margin, yPos);
    yPos += 20;

    const metricBoxWidth = (contentWidth - 30) / 4;
    const metrics = [
      { label: 'Scenarios Tested', value: results.length.toString() },
      { label: 'Avg Survival', value: `${avgSurvival.toFixed(0)}%` },
      { label: 'Critical Risks', value: criticalCount.toString(), danger: criticalCount > 0 },
      { label: 'Max Decline', value: `-${maxDecline.toFixed(0)}%` }
    ];

    metrics.forEach((metric, i) => {
      const boxX = margin + (i * (metricBoxWidth + 10));
      doc.setFillColor(COLORS.grayLight);
      doc.roundedRect(boxX, yPos, metricBoxWidth, 55, 4, 4, 'F');

      doc.setFontSize(9);
      doc.setTextColor(COLORS.gray);
      doc.setFont('helvetica', 'normal');
      doc.text(metric.label, boxX + metricBoxWidth / 2, yPos + 18, { align: 'center' });

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(metric.danger ? COLORS.danger : COLORS.grayDark);
      doc.text(metric.value, boxX + metricBoxWidth / 2, yPos + 42, { align: 'center' });
    });

    yPos += 75;
  }

  // Client Profile Section
  if (options.includeClientProfile) {
    ensureSpace(140);
    doc.setFillColor(COLORS.primary);
    doc.rect(margin, yPos, contentWidth, 25, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Client Financial Profile', margin + 10, yPos + 17);
    yPos += 35;

    const profileData = [
      ['Portfolio Value', formatCurrency(clientProfile.portfolioValue)],
      ['Pension Value', formatCurrency(clientProfile.pensionValue)],
      ['Savings', formatCurrency(clientProfile.savings)],
      ['Annual Income', formatCurrency(clientProfile.annualIncome)],
      ['Annual Expenses', formatCurrency(clientProfile.annualExpenses)],
      ['Client Age', `${clientProfile.age} years`]
    ];

    const colWidth = contentWidth / 3;
    profileData.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = margin + (col * colWidth);
      const y = yPos + (row * 25);

      doc.setFontSize(9);
      doc.setTextColor(COLORS.gray);
      doc.setFont('helvetica', 'normal');
      doc.text(item[0], x, y);
      doc.setFontSize(11);
      doc.setTextColor(COLORS.grayDark);
      doc.setFont('helvetica', 'bold');
      doc.text(item[1], x, y + 12);
    });

    yPos += 65;
  }

  // Scenario Results
  if (options.includeScenarioResults) {
    ensureSpace(50);
    doc.setFillColor(COLORS.primary);
    doc.rect(margin, yPos, contentWidth, 25, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Scenario Results', margin + 10, yPos + 17);
    yPos += 35;

    // Table header
    doc.setFillColor(COLORS.grayLight);
    doc.rect(margin, yPos, contentWidth, 20, 'F');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.grayDark);
    doc.setFont('helvetica', 'bold');

    const cols = [
      { label: 'Scenario', x: margin + 5, width: 150 },
      { label: 'Resilience', x: margin + 160, width: 60 },
      { label: 'Survival', x: margin + 225, width: 55 },
      { label: 'Impact', x: margin + 285, width: 55 },
      { label: 'Recovery', x: margin + 345, width: 55 }
    ];

    cols.forEach(col => {
      doc.text(col.label, col.x, yPos + 14);
    });
    yPos += 25;

    // Table rows
    results.forEach((result, i) => {
      ensureSpace(25);
      if (i % 2 === 0) {
        doc.setFillColor('#f9fafb');
        doc.rect(margin, yPos, contentWidth, 22, 'F');
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.grayDark);

      // Scenario name (truncate if too long)
      const name = result.scenarioName.length > 25
        ? result.scenarioName.substring(0, 22) + '...'
        : result.scenarioName;
      doc.text(name, cols[0].x, yPos + 15);

      // Resilience score with color
      const resStatus = getResilienceStatus(result.resilienceScore);
      doc.setTextColor(resStatus.color);
      doc.setFont('helvetica', 'bold');
      doc.text(`${result.resilienceScore.toFixed(0)}/100`, cols[1].x, yPos + 15);

      doc.setTextColor(COLORS.grayDark);
      doc.setFont('helvetica', 'normal');
      doc.text(`${result.survivalProbability.toFixed(0)}%`, cols[2].x, yPos + 15);
      doc.text(`-${result.impactAnalysis.portfolioDeclinePercent.toFixed(0)}%`, cols[3].x, yPos + 15);
      doc.text(result.recoveryTimeYears ? `${result.recoveryTimeYears} yrs` : 'N/A', cols[4].x, yPos + 15);

      yPos += 22;
    });

    yPos += 15;
  }

  // Risk Analysis
  if (options.includeRiskAnalysis) {
    ensureSpace(120);
    doc.setFillColor(COLORS.primary);
    doc.rect(margin, yPos, contentWidth, 25, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Analysis', margin + 10, yPos + 17);
    yPos += 35;

    // Worst and Best Scenario boxes
    const boxWidth = (contentWidth - 20) / 2;

    // Worst scenario
    doc.setFillColor('#fee2e2');
    doc.roundedRect(margin, yPos, boxWidth, 70, 4, 4, 'F');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.dangerDark);
    doc.setFont('helvetica', 'bold');
    doc.text('Most Vulnerable', margin + 10, yPos + 18);
    doc.setFontSize(11);
    doc.text(worstScenario.scenarioName, margin + 10, yPos + 35);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Resilience: ${worstScenario.resilienceScore.toFixed(0)}/100`, margin + 10, yPos + 52);
    doc.text(`Impact: -${worstScenario.impactAnalysis.portfolioDeclinePercent.toFixed(0)}%`, margin + 10, yPos + 65);

    // Best scenario
    doc.setFillColor('#dcfce7');
    doc.roundedRect(margin + boxWidth + 20, yPos, boxWidth, 70, 4, 4, 'F');
    doc.setTextColor(COLORS.successDark);
    doc.setFont('helvetica', 'bold');
    doc.text('Most Resilient', margin + boxWidth + 30, yPos + 18);
    doc.setFontSize(11);
    doc.text(bestScenario.scenarioName, margin + boxWidth + 30, yPos + 35);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Resilience: ${bestScenario.resilienceScore.toFixed(0)}/100`, margin + boxWidth + 30, yPos + 52);
    doc.text(`Survival: ${bestScenario.survivalProbability.toFixed(0)}%`, margin + boxWidth + 30, yPos + 65);

    yPos += 90;
  }

  // Mitigation Strategies
  if (options.includeMitigationStrategies) {
    ensureSpace(150);
    doc.setFillColor(COLORS.primary);
    doc.rect(margin, yPos, contentWidth, 25, 'F');
    doc.setTextColor(COLORS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Actions', margin + 10, yPos + 17);
    yPos += 35;

    const recommendations: string[] = [];

    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical vulnerability scenario${criticalCount !== 1 ? 's' : ''} with priority`);
    }
    if (maxDecline > 40) {
      recommendations.push('Consider reducing equity exposure to limit maximum drawdown potential');
    }
    if (avgResilience < 60) {
      recommendations.push('Build an emergency cash buffer of 12-24 months expenses');
    }
    if (avgResilience >= 70) {
      recommendations.push('Portfolio shows strong resilience - maintain current strategy with annual reviews');
    }
    recommendations.push('Review income protection and critical illness coverage');
    recommendations.push('Schedule annual stress test review to monitor changes');

    doc.setFillColor('#eff6ff');
    doc.roundedRect(margin, yPos, contentWidth, 20 + (recommendations.length * 18), 4, 4, 'F');

    doc.setFontSize(10);
    doc.setTextColor(COLORS.grayDark);
    doc.setFont('helvetica', 'normal');

    recommendations.slice(0, 5).forEach((rec, i) => {
      doc.text(`• ${rec}`, margin + 15, yPos + 18 + (i * 18));
    });

    yPos += 30 + (Math.min(recommendations.length, 5) * 18);
  }

  // Advisor Notes
  if (options.advisorNotes && options.advisorNotes.trim()) {
    ensureSpace(100);
    doc.setFillColor(COLORS.grayLight);
    doc.roundedRect(margin, yPos, contentWidth, 80, 4, 4, 'F');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.grayDark);
    doc.setFont('helvetica', 'bold');
    doc.text('Advisor Notes', margin + 10, yPos + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const lines = doc.splitTextToSize(options.advisorNotes, contentWidth - 20);
    doc.text(lines.slice(0, 4), margin + 10, yPos + 35);

    yPos += 90;
  }

  // Next Steps
  if (options.includeNextSteps) {
    ensureSpace(80);
    doc.setFillColor('#f0fdf4');
    doc.roundedRect(margin, yPos, contentWidth, 60, 4, 4, 'F');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.successDark);
    doc.setFont('helvetica', 'bold');
    doc.text('Next Steps', margin + 10, yPos + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.grayDark);

    const nextReviewDate = new Date();
    nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);

    doc.text(`• Next Review Date: ${nextReviewDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin + 10, yPos + 35);
    doc.text('• Discuss findings with client and implement recommended actions', margin + 10, yPos + 50);

    yPos += 70;
  }

  // Disclaimer footer
  ensureSpace(60);
  doc.setFontSize(7);
  doc.setTextColor(COLORS.gray);
  doc.text(
    'This stress test analysis is for illustrative purposes and should not be considered financial advice. ' +
    'Past performance and hypothetical scenarios do not guarantee future results. ' +
    'Please consult with a qualified financial advisor before making investment decisions.',
    margin,
    yPos,
    { maxWidth: contentWidth }
  );

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  return doc.output('datauristring').split(',')[1];
}

// ================================================================
// API HANDLER
// ================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const { results, clientProfile, selectedScenarios, options } = body;

    if (!results || results.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No stress test results provided' },
        { status: 400 }
      );
    }

    if (!clientProfile || !clientProfile.clientId) {
      return NextResponse.json(
        { success: false, error: 'Client profile required' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBase64 = generateStressTestPdf(results, clientProfile, options);

    // Calculate summary for metadata
    const avgResilience = results.reduce((sum: number, r: StressTestResult) => sum + r.resilienceScore, 0) / results.length;

    // Try to save to Supabase
    // Cast to any: documents insert schema mismatch with generated types
    const supabase: any = getSupabaseServiceClient();
    const fileName = `stress-test-${clientProfile.clientRef}-${Date.now()}.pdf`;

    try {
      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Upload to storage
      const storagePath = `stress-tests/${clientProfile.clientId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (!uploadError) {
        // Get signed URL
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 3600);

        // Save document record
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            client_id: clientProfile.clientId,
            name: `Stress Test Report - ${new Date().toLocaleDateString('en-GB')}`,
            file_name: fileName,
            document_type: 'stress_test',
            storage_path: storagePath,
            file_size: pdfBuffer.length,
            mime_type: 'application/pdf',
            metadata: {
              avgResilience,
              scenarioCount: results.length,
              selectedScenarios,
              generatedAt: new Date().toISOString(),
              reportVersion: '1.0'
            }
          })
          .select()
          .single();

        if (!docError && urlData?.signedUrl) {
          return NextResponse.json({
            success: true,
            documentId: docData.id,
            filePath: storagePath,
            downloadUrl: urlData.signedUrl
          });
        }
      }
    } catch (storageError) {
      log.error('Storage error:', storageError);
      // Fall through to inline PDF response
    }

    // Fallback: return inline PDF
    return NextResponse.json({
      success: true,
      inlinePdf: pdfBase64
    });

  } catch (error) {
    log.error('Stress test report generation error:', error);
    return NextResponse.json(
      { success: false, error: '' },
      { status: 500 }
    );
  }
}

// src/app/api/assessments/report/[clientId]/route.ts
// ================================================================
// ASSESSMENT REPORT GENERATION API - FIXED VERSION
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { clientService } from '@/services/ClientService';
import { log } from '@/lib/logging/structured';
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { parseRequestBody } from '@/app/api/utils'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Define types if not imported
interface AssessmentProgress {
  id: string;
  client_id: string;
  assessment_type: string;
  status: string;
  progress_percentage?: number;
  started_at?: string;
  completed_at?: string;
  last_updated?: string;
  metadata?: any;
}

interface AssessmentHistory {
  id: string;
  client_id: string;
  assessment_type: string;
  action: string;
  performed_at: string;
  performed_by?: string;
  changes?: any;
  metadata?: any;
}

// POST: Generate assessment report
export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;
    const body = await parseRequestBody(request);
    const { format = 'pdf', includeHistory = true, assessmentTypes = [] } = body;
    
    // Create Supabase client
    const supabase = getSupabaseServiceClient();

    // Fetch all required data
    const [clientData, progressData, historyData] = await Promise.all([
      fetchClientData(clientId),
      fetchProgressData(supabase, clientId, assessmentTypes),
      includeHistory ? fetchHistoryData(supabase, clientId) : Promise.resolve([])
    ]);

    if (!clientData) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Generate report based on format
    let reportBuffer: ArrayBuffer;
    let contentType: string;
    let filename: string;

    if (format === 'pdf') {
      reportBuffer = await generatePDFReport(clientData, progressData, historyData);
      contentType = 'application/pdf';
      filename = `assessment-report-${clientData.clientRef}.pdf`;
    } else if (format === 'excel') {
      reportBuffer = await generateExcelReport(clientData, progressData, historyData);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `assessment-report-${clientData.clientRef}.xlsx`;
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use "pdf" or "excel"' },
        { status: 400 }
      );
    }

    // Log report generation - properly typed
    const { error: insertError } = await supabase
      .from('assessment_history')
      .insert([{
        client_id: clientId,
        assessment_type: 'report',
        action: 'generated',
        performed_at: new Date().toISOString(),
        metadata: { 
          format, 
          includeHistory, 
          assessmentTypes 
        }
      }]);

    if (insertError) {
      log.warn('Error logging report generation', { error: insertError });
      // Don't fail the request if logging fails
    }

    // Return the file
    return new NextResponse(reportBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': reportBuffer.byteLength.toString()
      }
    });
  } catch (error) {
    log.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Fetch client data
async function fetchClientData(clientId: string) {
  try {
    return await clientService.getClientById(clientId);
  } catch (error) {
    log.error('Error fetching client:', error);
    return null;
  }
}

// Fetch progress data - pass supabase client
async function fetchProgressData(
  supabase: any, 
  clientId: string, 
  assessmentTypes: string[]
): Promise<AssessmentProgress[]> {
  let query = supabase
    .from('assessment_progress')
    .select('*')
    .eq('client_id', clientId);

  if (assessmentTypes.length > 0) {
    query = query.in('assessment_type', assessmentTypes);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching progress:', error);
    return [];
  }
  
  return (data as AssessmentProgress[]) || [];
}

// Fetch history data - pass supabase client
async function fetchHistoryData(
  supabase: any,
  clientId: string
): Promise<AssessmentHistory[]> {
  const { data, error } = await supabase
    .from('assessment_history')
    .select('*')
    .eq('client_id', clientId)
    .order('performed_at', { ascending: false })
    .limit(100);

  if (error) {
    log.error('Error fetching history:', error);
    return [];
  }
  
  return (data as AssessmentHistory[]) || [];
}

// Generate PDF Report
async function generatePDFReport(
  client: any,
  progress: AssessmentProgress[],
  history: AssessmentHistory[]
): Promise<ArrayBuffer> {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Assessment Report', 20, 20);
  
  // Client Info
  doc.setFontSize(12);
  doc.text(`Client: ${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`, 20, 35);
  doc.text(`Reference: ${client.clientRef}`, 20, 42);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 49);
  
  // Assessment Progress Table
  doc.setFontSize(16);
  doc.text('Assessment Progress', 20, 65);
  
  const progressTableData = progress.map(p => [
    p.assessment_type.toUpperCase(),
    p.status.charAt(0).toUpperCase() + p.status.slice(1),
    `${p.progress_percentage || 0}%`,
    p.completed_at ? new Date(p.completed_at).toLocaleDateString() : 'In Progress'
  ]);
  
  doc.autoTable({
    startY: 70,
    head: [['Assessment', 'Status', 'Progress', 'Completed Date']],
    body: progressTableData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }
  });
  
  // Calculate overall stats
  const requiredTypes = ['atr', 'cfl', 'persona', 'suitability'];
  const completedRequired = progress.filter(
    p => requiredTypes.includes(p.assessment_type) && p.status === 'completed'
  ).length;
  
  const yPos = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Overall Progress: ${completedRequired}/${requiredTypes.length} Required Assessments Complete`, 20, yPos);
  
  // Risk Scores Section (if available)
  const atrProgress = progress.find(p => p.assessment_type === 'atr');
  const cflProgress = progress.find(p => p.assessment_type === 'cfl');
  
  if (atrProgress?.metadata || cflProgress?.metadata) {
    doc.setFontSize(16);
    doc.text('Risk Profile', 20, yPos + 20);
    
    doc.setFontSize(12);
    let riskYPos = yPos + 30;
    
    if (atrProgress?.metadata) {
      const atrMeta = atrProgress.metadata as any;
      const atrScore = atrMeta.score || 0;
      doc.text(`ATR Score: ${Number(atrScore).toFixed(1)}/5`, 20, riskYPos);
      riskYPos += 7;
    }
    
    if (cflProgress?.metadata) {
      const cflMeta = cflProgress.metadata as any;
      const cflScore = cflMeta.score || 0;
      doc.text(`CFL Score: ${Number(cflScore).toFixed(1)}/5`, 20, riskYPos);
    }
  }
  
  // Add new page for history if included
  if (history.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Assessment History', 20, 20);
    
    const historyTableData = history.slice(0, 20).map(h => [
      new Date(h.performed_at).toLocaleDateString(),
      h.assessment_type.toUpperCase(),
      h.action,
      h.metadata ? JSON.stringify(h.metadata).substring(0, 30) + '...' : ''
    ]);
    
    doc.autoTable({
      startY: 30,
      head: [['Date', 'Assessment', 'Action', 'Details']],
      body: historyTableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 'auto' }
      }
    });
  }
  
  // Convert to ArrayBuffer
  const pdfOutput = doc.output('arraybuffer');
  return pdfOutput;
}

// Generate Excel Report
async function generateExcelReport(
  client: any,
  progress: AssessmentProgress[],
  history: AssessmentHistory[]
): Promise<ArrayBuffer> {
  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summaryData = [
    ['Assessment Report'],
    [],
    ['Client Information'],
    ['Name', `${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`],
    ['Reference', client.clientRef],
    ['Email', client.contactInfo?.email || ''],
    ['Generated', new Date().toLocaleDateString()],
    [],
    ['Assessment Summary'],
    ['Assessment', 'Status', 'Progress', 'Completed Date', 'Score']
  ];
  
  // Add progress data
  progress.forEach(p => {
    const metadata = p.metadata as any;
    const score = metadata?.score ? Number(metadata.score).toFixed(1) : 'N/A';
    
    summaryData.push([
      p.assessment_type.toUpperCase(),
      p.status,
      `${p.progress_percentage || 0}%`,
      p.completed_at ? new Date(p.completed_at).toLocaleDateString() : 'In Progress',
      score
    ] as any);
  });
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Progress Details Sheet
  const progressHeaders = ['Assessment Type', 'Status', 'Progress %', 'Started', 'Completed', 'Last Updated'];
  const progressData = progress.map(p => [
    p.assessment_type,
    p.status,
    p.progress_percentage || 0,
    p.started_at ? new Date(p.started_at).toLocaleDateString() : '',
    p.completed_at ? new Date(p.completed_at).toLocaleDateString() : '',
    p.last_updated ? new Date(p.last_updated).toLocaleDateString() : ''
  ]);
  
  const progressSheet = XLSX.utils.aoa_to_sheet([progressHeaders, ...progressData]);
  XLSX.utils.book_append_sheet(workbook, progressSheet, 'Progress');
  
  // History Sheet (if included)
  if (history.length > 0) {
    const historyHeaders = ['Date', 'Time', 'Assessment', 'Action', 'Metadata'];
    const historyData = history.map(h => {
      const date = new Date(h.performed_at);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        h.assessment_type,
        h.action,
        h.metadata ? JSON.stringify(h.metadata) : ''
      ];
    });
    
    const historySheet = XLSX.utils.aoa_to_sheet([historyHeaders, ...historyData]);
    XLSX.utils.book_append_sheet(workbook, historySheet, 'History');
  }
  
  // Risk Analysis Sheet
  const riskData: any[] = [
    ['Risk Analysis'],
    [],
    ['Metric', 'Value', 'Category']
  ];
  
  const atrProgress = progress.find(p => p.assessment_type === 'atr');
  const cflProgress = progress.find(p => p.assessment_type === 'cfl');
  
  if (atrProgress?.metadata) {
    const atrMeta = atrProgress.metadata as any;
    const atrScore = Number(atrMeta.score || 0);
    riskData.push([
      'ATR Score',
      atrScore.toFixed(1),
      getRiskCategory(atrScore)
    ]);
  }
  
  if (cflProgress?.metadata) {
    const cflMeta = cflProgress.metadata as any;
    const cflScore = Number(cflMeta.score || 0);
    riskData.push([
      'CFL Score', 
      cflScore.toFixed(1),
      getRiskCategory(cflScore)
    ]);
  }
  
  const riskSheet = XLSX.utils.aoa_to_sheet(riskData);
  XLSX.utils.book_append_sheet(workbook, riskSheet, 'Risk Analysis');
  
  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return excelBuffer;
}

// Helper function to get risk category
function getRiskCategory(score: number): string {
  if (score <= 1.5) return 'Very Low Risk';
  if (score <= 2.5) return 'Low Risk';
  if (score <= 3.5) return 'Moderate Risk';
  if (score <= 4.5) return 'High Risk';
  return 'Very High Risk';
}
import jsPDF from 'jspdf';

export const getDocumentType = (reportType?: string): string => {
  const typeMap: Record<string, string> = {
    clientLetter: 'Client Letter',
    advisorReport: 'Advisor Report',
    executiveSummary: 'Executive Summary',
    fullReport: 'Full Assessment Report',
    complianceReport: 'FCA Compliance Report'
  };
  return typeMap[reportType || ''] || 'Assessment Report';
};

export const getDocumentCategory = (assessmentType: string, reportType?: string): string => {
  if (reportType === 'complianceReport') return 'Compliance';
  if (reportType === 'clientLetter') return 'Client Communications';
  if (reportType === 'advisorReport') return 'Internal Documents';

  const categoryMap: Record<string, string> = {
    suitability: 'Suitability',
    atr: 'Risk Assessment',
    cfl: 'Capacity for Loss',
    vulnerability: 'Vulnerability'
  };

  return categoryMap[assessmentType] || 'Reports';
};

export const generateSimplePDF = (htmlContent: string, clientData: any, version: number): Blob => {
  const clientName = `${clientData.personal_details?.firstName || ''} ${clientData.personal_details?.lastName || ''}`.trim() || 'Client';
  const currentDate = new Date().toLocaleDateString('en-GB');

  const textContent = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Financial Assessment Report', 40, 60);
  doc.setFontSize(12);
  doc.text(`Client: ${clientName}`, 40, 80);
  doc.text(`Version: ${version || 1}`, 40, 100);
  doc.text(`Generated: ${currentDate}`, 40, 120);
  doc.text('Content Preview:', 40, 150);
  doc.setFontSize(11);
  doc.text(textContent || 'Content unavailable', 40, 170, { maxWidth: 520 });
  const arrayBuffer = doc.output('arraybuffer');
  return new Blob([arrayBuffer], { type: 'application/pdf' });
};

export const generateFileName = (
  type: string,
  firstName: string,
  lastName: string,
  version?: number,
  reportType?: string
): string => {
  const timestamp = Date.now();
  const date = new Date().toISOString().split('T')[0];
  const clientName = `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
  const versionString = version ? `_v${version}` : '';
  const reportTypeString = reportType ? `_${reportType}` : '';

  return `${type}${reportTypeString}_${clientName}${versionString}_${date}_${timestamp}.pdf`;
};

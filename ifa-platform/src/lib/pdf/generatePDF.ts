// ================================================================
// File: src/lib/pdf/generatePDF.ts
// LEGACY PDF Generation Engine - Now redirects to new PDFGenerator
//
// NOTE: This file is kept for backwards compatibility.
// For new code, use PDFGenerator from '@/lib/pdf/PDFGenerator' instead.
// ================================================================

import { createClient } from '@/lib/supabase/client'

// Re-export the new PDFGenerator for convenience
export { PDFGenerator, type PDFReportData } from './PDFGenerator';

export interface PDFGenerationOptions {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includeCharts?: boolean;
  includeHeaderFooter?: boolean;
}

export class PDFGenerationEngine {
  /**
   * Generate PDF from HTML content
   * In production, this would use a service like Puppeteer or a PDF API
   */
  static async generatePDFFromHTML(
    htmlContent: string,
    options: PDFGenerationOptions
  ): Promise<Buffer> {
    try {
      // For now, we'll create a simple implementation
      // In production, you'd use a proper PDF generation library
      
      // Option 1: Use browser's print functionality
      if (typeof window !== 'undefined') {
        // Client-side approach
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Report</title>
                <style>
                  @page {
                    size: ${options.format} ${options.orientation};
                    margin: 20mm;
                  }
                  body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                  }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                  }
                  th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                  }
                  th {
                    background-color: #f5f5f5;
                  }
                  .page-break {
                    page-break-after: always;
                  }
                  ${options.includeHeaderFooter ? `
                    @page {
                      @top-center {
                        content: "Financial Planning Report";
                      }
                      @bottom-center {
                        content: counter(page) " of " counter(pages);
                      }
                    }
                  ` : ''}
                </style>
              </head>
              <body>
                ${htmlContent}
              </body>
            </html>
          `);
          printWindow.document.close();
          
          // Trigger print dialog
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
        
        // Return empty buffer for now
        return Buffer.from('');
      }
      
      // Server-side approach would go here
      // For example, using puppeteer or a PDF API service
      
      // Fallback: return HTML as buffer
      return Buffer.from(htmlContent, 'utf-8');
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  /**
   * Generate PDF using template and data
   */
  static async generatePDFFromTemplate(
    templateId: string,
    data: Record<string, any>,
    options?: PDFGenerationOptions
  ): Promise<Buffer> {
    // This would fetch a template and populate it with data
    // For now, we'll create a simple HTML structure
    
    const html = `
      <div class="report">
        <h1>${data.title || 'Financial Report'}</h1>
        <div class="content">
          ${JSON.stringify(data, null, 2).replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
    
    return this.generatePDFFromHTML(html, options || {
      format: 'A4',
      orientation: 'portrait',
      includeHeaderFooter: true
    });
  }

  /**
   * Save PDF to storage (Supabase)
   */
  static async savePDFToStorage(
    pdfBuffer: Buffer,
    fileName: string,
    bucket: string = 'documents'
  ): Promise<string> {
    const supabase = createClient()

    const { data, error } = await (await supabase).storage
      .from(bucket)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to save PDF: ${error.message}`);
    }

    return data.path;
  }
}

// Export a simple helper function for basic PDF generation
export async function generatePDF(
  content: string,
  fileName: string = 'report.pdf'
): Promise<void> {
  if (typeof window !== 'undefined') {
    // Create a blob from the content
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
// src/services/documentGenerationService.ts
// ✅ ELEVATION: Added 'export' to the interface definition.
// This is the ONLY change. All original functionality is preserved.

import { createBrowserClient } from '@supabase/ssr'
import { DocumentTemplateService } from './documentTemplateService'

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

export interface DocumentGenerationParams {
  templateId: string;
  clientId: string;
  variables: Record<string, any>;
  outputFormat?: 'pdf' | 'html';
}

export interface GeneratedDocument {
  id: string;
  clientId: string;
  templateId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  createdAt: string;
}

// ===================================================================
// DOCUMENT GENERATION SERVICE (Preserving Original Structure)
// ===================================================================

export class DocumentGenerationService {
  private supabase;
  private templateService: DocumentTemplateService;

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.templateService = DocumentTemplateService.getInstance();
  }

  /**
   * Generates a document from a template and saves it.
   * @param params - The parameters for document generation.
   * @returns The newly created document record.
   */
  async generateDocument(params: DocumentGenerationParams): Promise<GeneratedDocument> {
    try {
      // 1. Fetch the template content
      const template = await this.templateService.getTemplateById(params.templateId);
      if (!template) {
        throw new Error(`Template with ID ${params.templateId} not found.`);
      }

      // 2. Populate the template with variables
      let populatedContent = this.populateTemplate(template.content, params.variables);

      // 3. (Future enhancement) Convert to PDF if requested
      if (params.outputFormat === 'pdf') {
        console.warn('PDF generation is not yet implemented. Saving as HTML.');
      }

      // 4. Save the generated file to Supabase Storage
      const fileName = `${template.name.replace(/ /g, '_')}_${params.clientId}_${Date.now()}.html`;
      const filePath = `generated_documents/${params.clientId}/${fileName}`;
      const fileType = 'text/html';

      const { error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, populatedContent, {
          contentType: fileType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload document to storage: ${uploadError.message}`);
      }

      // 5. Create a record in the 'generated_documents' table
      const { data, error: dbError } = await this.supabase
        .from('generated_documents')
        .insert({
          client_id: params.clientId,
          template_id: params.templateId,
          file_name: fileName,
          file_path: filePath,
          file_type: fileType,
        })
        .select()
        .single();

      if (dbError) {
        // Attempt to clean up the uploaded file if the DB insert fails
        await this.supabase.storage.from('documents').remove([filePath]);
        throw new Error(`Failed to save document record: ${dbError.message}`);
      }

      return data as GeneratedDocument;
    } catch (error) {
      console.error('Error in generateDocument:', error);
      throw error;
    }
  }

  /**
   * A simple string replacement function for populating templates.
   * @param content - The template content with placeholders like {{variable_name}}.
   * @param variables - An object with key-value pairs for replacement.
   * @returns The populated content.
   */
  private populateTemplate(content: string, variables: Record<string, any>): string {
    let populated = content;
    for (const key in variables) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      populated = populated.replace(regex, variables[key]);
    }
    return populated;
  }
}

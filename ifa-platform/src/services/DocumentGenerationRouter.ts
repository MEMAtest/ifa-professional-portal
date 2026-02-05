import { createClient } from "@/lib/supabase/client"
// ================================================================
// src/services/DocumentGenerationRouter.ts
// Intelligent routing for all document generation in the platform
// ================================================================

import type { CashFlowScenario } from '@/types/cashflow';
import type { Client } from '@/types/client';
import clientLogger from '@/lib/logging/clientLogger'

// Document type definitions
export type DocumentCategory = 'assessment' | 'report' | 'agreement' | 'letter' | 'analysis';
export type GenerationStrategy = 'database' | 'dynamic' | 'hybrid';

interface DocumentTypeConfig {
  category: DocumentCategory;
  strategy: GenerationStrategy;
  requiresSignature: boolean;
  hasCharts: boolean;
  isRegulated: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
  templateSource?: string;
}

interface DocumentRequest {
  documentType: string;
  clientId: string;
  data: any;
  options?: any;
}

export class DocumentGenerationRouter {
  // ================================================================
  // MASTER ROUTING CONFIGURATION
  // All known document types and their generation strategies
  // ================================================================
  
  private static readonly DOCUMENT_CONFIGS: Record<string, DocumentTypeConfig> = {
    // ======== ASSESSMENTS (from database) ========
    'atr_assessment': {
      category: 'assessment',
      strategy: 'hybrid',
      requiresSignature: false,
      hasCharts: true,
      isRegulated: true,
      complexity: 'moderate',
      templateSource: 'ATR Assessment Report'
    },
    
    'cfl_assessment': {
      category: 'assessment',
      strategy: 'hybrid',
      requiresSignature: false,
      hasCharts: true,
      isRegulated: true,
      complexity: 'moderate',
      templateSource: 'CFL Capacity Report'
    },
    
    'vulnerability_assessment': {
      category: 'assessment',
      strategy: 'database',
      requiresSignature: false,
      hasCharts: false,
      isRegulated: true,
      complexity: 'simple',
      templateSource: 'Vulnerability Assessment Report'
    },
    
    'suitability_report': {
      category: 'assessment',
      strategy: 'hybrid',
      requiresSignature: true,
      hasCharts: true,
      isRegulated: true,
      complexity: 'complex',
      templateSource: 'Suitability Report'
    },
    
    'annual_review': {
      category: 'assessment',
      strategy: 'hybrid',
      requiresSignature: false,
      hasCharts: true,
      isRegulated: true,
      complexity: 'moderate',
      templateSource: 'Annual Review Report'
    },
    
    // ======== FINANCIAL ANALYSIS (dynamic) ========
    'cashflow_analysis': {
      category: 'analysis',
      strategy: 'dynamic',
      requiresSignature: false,
      hasCharts: true,
      isRegulated: true,
      complexity: 'complex'
    },
    
    'stress_test_report': {
      category: 'analysis',
      strategy: 'dynamic',
      requiresSignature: false,
      hasCharts: true,
      isRegulated: true,
      complexity: 'complex'
    },
    
    'monte_carlo_report': {
      category: 'analysis',
      strategy: 'dynamic',
      requiresSignature: false,
      hasCharts: true,
      isRegulated: false,
      complexity: 'complex'
    },
    
    'portfolio_analysis': {
      category: 'analysis',
      strategy: 'dynamic',
      requiresSignature: false,
      hasCharts: true,
      isRegulated: false,
      complexity: 'complex'
    },
    
    // ======== AGREEMENTS (database) ========
    'client_agreement': {
      category: 'agreement',
      strategy: 'database',
      requiresSignature: true,
      hasCharts: false,
      isRegulated: true,
      complexity: 'simple',
      templateSource: 'Client Service Agreement'
    },
    
    'fee_agreement': {
      category: 'agreement',
      strategy: 'database',
      requiresSignature: true,
      hasCharts: false,
      isRegulated: true,
      complexity: 'simple'
    },
    
    // ======== LETTERS (database) ========
    'welcome_letter': {
      category: 'letter',
      strategy: 'database',
      requiresSignature: false,
      hasCharts: false,
      isRegulated: false,
      complexity: 'simple'
    },
    
    'recommendation_letter': {
      category: 'letter',
      strategy: 'database',
      requiresSignature: false,
      hasCharts: false,
      isRegulated: true,
      complexity: 'simple'
    },
    
    // ======== COMPLIANCE REPORTS (hybrid) ========
    'compliance_evidence': {
      category: 'report',
      strategy: 'hybrid',
      requiresSignature: false,
      hasCharts: false,
      isRegulated: true,
      complexity: 'moderate'
    },
    
    'fca_disclosure': {
      category: 'report',
      strategy: 'database',
      requiresSignature: true,
      hasCharts: false,
      isRegulated: true,
      complexity: 'simple'
    }
  };

  // ================================================================
  // ROUTING DECISION ENGINE
  // ================================================================
  
  /**
   * Main routing method - determines how to generate a document
   */
  static async routeDocument(request: DocumentRequest): Promise<{
    strategy: GenerationStrategy;
    generator: IDocumentGenerator;
    config: DocumentTypeConfig;
  }> {
    // Get configuration for document type
    const config = this.getDocumentConfig(request.documentType);
    
    // Select appropriate generator
    const generator = this.selectGenerator(config, request);
    
    return {
      strategy: config.strategy,
      generator,
      config
    };
  }

  /**
   * Get configuration for a document type
   */
  private static getDocumentConfig(documentType: string): DocumentTypeConfig {
    const config = this.DOCUMENT_CONFIGS[documentType];
    
    if (!config) {
      // Unknown document type - make intelligent guess
      return this.inferDocumentConfig(documentType);
    }
    
    return config;
  }

  /**
   * Infer configuration for unknown document types
   */
  private static inferDocumentConfig(documentType: string): DocumentTypeConfig {
    console.warn(`Unknown document type: ${documentType}. Using inference.`);
    
    // Inference rules based on naming patterns
    if (documentType.includes('assessment')) {
      return {
        category: 'assessment',
        strategy: 'hybrid',
        requiresSignature: false,
        hasCharts: true,
        isRegulated: true,
        complexity: 'moderate'
      };
    }
    
    if (documentType.includes('report') || documentType.includes('analysis')) {
      return {
        category: 'report',
        strategy: 'dynamic',
        requiresSignature: false,
        hasCharts: true,
        isRegulated: false,
        complexity: 'complex'
      };
    }
    
    if (documentType.includes('agreement') || documentType.includes('contract')) {
      return {
        category: 'agreement',
        strategy: 'database',
        requiresSignature: true,
        hasCharts: false,
        isRegulated: true,
        complexity: 'simple'
      };
    }
    
    // Default fallback
    return {
      category: 'letter',
      strategy: 'database',
      requiresSignature: false,
      hasCharts: false,
      isRegulated: false,
      complexity: 'simple'
    };
  }

  /**
   * Select the appropriate generator based on strategy
   */
  private static selectGenerator(
    config: DocumentTypeConfig,
    request: DocumentRequest
  ): IDocumentGenerator {
    switch (config.strategy) {
      case 'database':
        return new DatabaseTemplateGenerator(config.templateSource);
        
      case 'dynamic':
        return new DynamicDocumentGenerator();
        
      case 'hybrid':
        return new HybridDocumentGenerator(config.templateSource);
        
      default:
        throw new Error(`Unknown generation strategy: ${config.strategy}`);
    }
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================
  
  /**
   * Check if a document type requires signature
   */
  static requiresSignature(documentType: string): boolean {
    const config = this.getDocumentConfig(documentType);
    return config.requiresSignature;
  }

  /**
   * Get the document category for a document type
   */
  static getCategory(documentType: string): DocumentCategory {
    const config = this.getDocumentConfig(documentType);
    return config.category;
  }

  /**
   * Check if a document type includes charts
   */
  static hasCharts(documentType: string): boolean {
    const config = this.getDocumentConfig(documentType);
    return config.hasCharts;
  }

  /**
   * Get all document types by category
   */
  static getDocumentTypesByCategory(category: DocumentCategory): string[] {
    return Object.entries(this.DOCUMENT_CONFIGS)
      .filter(([_, config]) => config.category === category)
      .map(([type, _]) => type);
  }

  /**
   * Add new document type configuration
   */
  static registerDocumentType(
    documentType: string, 
    config: DocumentTypeConfig
  ): void {
    this.DOCUMENT_CONFIGS[documentType] = config;
  }
}

// ================================================================
// GENERATOR INTERFACES AND IMPLEMENTATIONS
// ================================================================

interface IDocumentGenerator {
  generate(data: any, options: any): Promise<GeneratedDocument>;
}

interface GeneratedDocument {
  content: string;
  metadata: Record<string, any>;
  requiresSignature: boolean;
}

/**
 * Database Template Generator
 */
class DatabaseTemplateGenerator implements IDocumentGenerator {
  constructor(private templateName?: string) {}

  async generate(data: any, options: any): Promise<GeneratedDocument> {
    // Fetch from database and populate
    const template = await this.fetchTemplate();
    const content = this.populateTemplate(template, data);
    
    return {
      content,
      metadata: { templateId: template.id },
      requiresSignature: template.requires_signature
    };
  }

  private async fetchTemplate() {
    // Implementation to fetch from document_templates table
    // Using the name field, not ID
    return {} as any; // Placeholder
  }

  private populateTemplate(template: any, data: any): string {
    // Mustache-style template population
    return ''; // Placeholder
  }
}

/**
 * Dynamic Document Generator
 */
class DynamicDocumentGenerator implements IDocumentGenerator {
  async generate(data: any, options: any): Promise<GeneratedDocument> {
    // Generate document programmatically
    const content = await this.buildDocument(data, options);
    
    return {
      content,
      metadata: { generatedAt: new Date().toISOString() },
      requiresSignature: false
    };
  }

  private async buildDocument(data: any, options: any): Promise<string> {
    // Dynamic HTML generation
    return ''; // Placeholder
  }
}

/**
 * Hybrid Document Generator
 */
class HybridDocumentGenerator implements IDocumentGenerator {
  constructor(private baseTemplateName?: string) {}

  async generate(data: any, options: any): Promise<GeneratedDocument> {
    // Get base template from database
    const baseTemplate = await this.fetchBaseTemplate();
    
    // Generate dynamic sections
    const dynamicSections = await this.generateDynamicSections(data);
    
    // Merge together
    const content = this.mergeContent(baseTemplate, dynamicSections);
    
    return {
      content,
      metadata: { 
        templateId: baseTemplate.id,
        dynamicSections: Object.keys(dynamicSections)
      },
      requiresSignature: baseTemplate.requires_signature
    };
  }

  private async fetchBaseTemplate() {
    // Fetch base template structure
    return {} as any; // Placeholder
  }

  private async generateDynamicSections(data: any) {
    // Generate dynamic content sections
    return {}; // Placeholder
  }

  private mergeContent(template: any, sections: any): string {
    // Merge template with dynamic sections
    return ''; // Placeholder
  }
}

// ================================================================
// USAGE EXAMPLE
// ================================================================

export class UnifiedDocumentService {
  static async generateDocument(request: DocumentRequest) {
    try {
      // Route the document
      const { strategy, generator, config } = await DocumentGenerationRouter.routeDocument(request);
      
      
      // Generate the document
      const document = await generator.generate(request.data, request.options);
      
      // Handle signature requirements
      if (config.requiresSignature) {
        // Route to DocuSeal
        return this.sendForSignature(document);
      }
      
      // Generate PDF if needed
      if (request.options?.outputFormat === 'pdf') {
        return this.convertToPDF(document);
      }
      
      return document;
      
    } catch (error) {
      clientLogger.error('Document generation failed:', error);
      throw error;
    }
  }

  private static async sendForSignature(document: GeneratedDocument) {
    // DocuSeal integration
    return document;
  }

  private static async convertToPDF(document: GeneratedDocument) {
    // PDF conversion
    return document;
  }
}

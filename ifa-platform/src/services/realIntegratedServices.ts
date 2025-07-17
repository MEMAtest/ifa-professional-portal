// File: src/services/realIntegratedServices.ts
import { createBrowserClient } from '@supabase/ssr'
import type { ClientProfile } from '@/types'

// This integrates with your actual client database
export class RealClientService {
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async getClients(): Promise<ClientProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map(this.transformClient)
    } catch (error) {
      console.error('Error fetching real clients:', error)
      return []
    }
  }

  private transformClient(dbClient: any): ClientProfile {
    // Transform your database client structure to match ClientProfile interface
    const personalDetails = dbClient.personal_details || {}
    const contactInfo = dbClient.contact_info || {}

    return {
      id: dbClient.id,
      clientRef: dbClient.client_ref,
      title: personalDetails.title || '',
      firstName: personalDetails.firstName || '',
      lastName: personalDetails.lastName || '',
      dateOfBirth: personalDetails.dateOfBirth || '',
      age: this.calculateAge(personalDetails.dateOfBirth),
      occupation: personalDetails.occupation || '',
      maritalStatus: personalDetails.maritalStatus || '',
      dependents: personalDetails.dependents || 0,
      address: {
        street: contactInfo.address?.line1 || '',
        city: contactInfo.address?.city || '',
        postcode: contactInfo.address?.postcode || '',
        country: contactInfo.address?.country || 'UK'
      },
      contactDetails: {
        phone: contactInfo.phone || '',
        email: contactInfo.email || '',
        preferredContact: contactInfo.preferredContact || 'email'
      },
      createdAt: dbClient.created_at,
      updatedAt: dbClient.updated_at
    }
  }

  private calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0
    const today = new Date()
    const birth = new Date(dateOfBirth)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  getClientDisplayName(client: ClientProfile): string {
    const title = client.title ? `${client.title} ` : ''
    return `${title}${client.firstName} ${client.lastName}`.trim()
  }
}

// Real document service that uses your templates
export class RealDocumentService {
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async getTemplates() {
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  async generateDocument(templateId: string, clientId: string, client: ClientProfile) {
    try {
      // Get template
      const { data: template } = await this.supabase
        .from('document_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (!template) throw new Error('Template not found')

      // Process template variables
      const variables = {
        CLIENT_NAME: new RealClientService().getClientDisplayName(client),
        CLIENT_EMAIL: client.contactDetails.email,
        CLIENT_REF: client.clientRef,
        ADVISOR_NAME: 'Professional Advisor',
        REPORT_DATE: new Date().toLocaleDateString('en-GB'),
        RISK_PROFILE: 'Moderate', // Get from client risk assessment
        INVESTMENT_AMOUNT: 0, // Get from client financial profile
        ANNUAL_INCOME: 0,
        NET_WORTH: 0,
        RECOMMENDATION: 'Based on your financial situation and objectives...'
      }

      // Replace template variables
      let content = template.template_content
      Object.entries(variables).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      })

      // Use the document generation service
      const documentService = new (await import('./documentGenerationService')).DocumentGenerationService()
      const result = await documentService.generateDocument({
        content,
        title: `${template.name} - ${variables.CLIENT_NAME}`,
        clientId,
        templateId,
        metadata: {
          templateName: template.name,
          clientRef: client.clientRef
        }
      })

      return result
    } catch (error) {
      console.error('Real document generation error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed' }
    }
  }
}
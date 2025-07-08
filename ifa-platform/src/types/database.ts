// File: src/types/database.ts
export interface Database {
  public: {
    Tables: {
      firms: {
        Row: {
          id: string
          name: string
          fca_number: string | null
          address: any
          settings: any
          subscription_tier: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          fca_number?: string | null
          address?: any
          settings?: any
          subscription_tier?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          fca_number?: string | null
          address?: any
          settings?: any
          subscription_tier?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          role: 'advisor' | 'supervisor' | 'admin'
          firm_id: string | null
          permissions: any
          preferences: any
          avatar_url: string | null
          phone: string | null
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          role: 'advisor' | 'supervisor' | 'admin'
          firm_id?: string | null
          permissions?: any
          preferences?: any
          avatar_url?: string | null
          phone?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          first_name?: string
          last_name?: string
          role?: 'advisor' | 'supervisor' | 'admin'
          firm_id?: string | null
          permissions?: any
          preferences?: any
          avatar_url?: string | null
          phone?: string | null
          last_login_at?: string | null
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          advisor_id: string | null
          firm_id: string | null
          client_ref: string
          personal_details: any
          contact_info: any
          financial_profile: any
          vulnerability_assessment: any
          risk_profile: any
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          advisor_id?: string | null
          firm_id?: string | null
          client_ref: string
          personal_details?: any
          contact_info?: any
          financial_profile?: any
          vulnerability_assessment?: any
          risk_profile?: any
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string | null
          firm_id?: string | null
          client_ref?: string
          personal_details?: any
          contact_info?: any
          financial_profile?: any
          vulnerability_assessment?: any
          risk_profile?: any
          status?: string
          updated_at?: string
        }
      }
      assessments: {
        Row: {
          id: string
          client_id: string | null
          advisor_id: string | null
          legacy_form_id: string | null
          assessment_data: any
          risk_analysis: any
          vulnerability_analysis: any
          consumer_duty_compliance: any
          version: number
          status: string
          completed_at: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          advisor_id?: string | null
          legacy_form_id?: string | null
          assessment_data?: any
          risk_analysis?: any
          vulnerability_analysis?: any
          consumer_duty_compliance?: any
          version?: number
          status?: string
          completed_at?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          advisor_id?: string | null
          legacy_form_id?: string | null
          assessment_data?: any
          risk_analysis?: any
          vulnerability_analysis?: any
          consumer_duty_compliance?: any
          version?: number
          status?: string
          completed_at?: string | null
          reviewed_at?: string | null
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          client_id: string | null
          assessment_id: string | null
          name: string
          type: string
          category: string
          file_path: string | null
          file_size: number | null
          mime_type: string | null
          tags: string[]
          requires_signature: boolean
          signature_status: string
          docuseal_template_id: string | null
          docuseal_submission_id: string | null
          signed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          assessment_id?: string | null
          name: string
          type: string
          category: string
          file_path?: string | null
          file_size?: number | null
          mime_type?: string | null
          tags?: string[]
          requires_signature?: boolean
          signature_status?: string
          docuseal_template_id?: string | null
          docuseal_submission_id?: string | null
          signed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          assessment_id?: string | null
          name?: string
          type?: string
          category?: string
          file_path?: string | null
          file_size?: number | null
          mime_type?: string | null
          tags?: string[]
          requires_signature?: boolean
          signature_status?: string
          docuseal_template_id?: string | null
          docuseal_submission_id?: string | null
          signed_at?: string | null
          updated_at?: string
        }
      }
    }
  }
}
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string | null
          client_id: string | null
          created_at: string | null
          date: string | null
          firm_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          type: string | null
          user_agent: string | null
          user_name: string | null
        }
        Insert: {
          action?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string | null
          firm_id?: string | null
          id: string
          ip_address?: string | null
          metadata?: Json | null
          type?: string | null
          user_agent?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string | null
          firm_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          type?: string | null
          user_agent?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_check_history: {
        Row: {
          aml_client_status_id: string | null
          changed_at: string | null
          changed_by: string | null
          field_changed: string
          firm_id: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          aml_client_status_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          field_changed: string
          firm_id: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          aml_client_status_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string
          firm_id?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aml_check_history_aml_client_status_id_fkey"
            columns: ["aml_client_status_id"]
            isOneToOne: false
            referencedRelation: "aml_client_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aml_check_history_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_client_status: {
        Row: {
          client_id: string | null
          created_at: string | null
          edd_notes: string | null
          firm_id: string
          id: string
          id_verification: string | null
          last_review_date: string | null
          last_updated_by: string | null
          next_review_date: string | null
          pep_status: string | null
          review_frequency: string | null
          risk_rating: string | null
          sanctions_status: string | null
          source_of_funds: string | null
          source_of_wealth: string | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          edd_notes?: string | null
          firm_id: string
          id?: string
          id_verification?: string | null
          last_review_date?: string | null
          last_updated_by?: string | null
          next_review_date?: string | null
          pep_status?: string | null
          review_frequency?: string | null
          risk_rating?: string | null
          sanctions_status?: string | null
          source_of_funds?: string | null
          source_of_wealth?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          edd_notes?: string | null
          firm_id?: string
          id?: string
          id_verification?: string | null
          last_review_date?: string | null
          last_updated_by?: string | null
          next_review_date?: string | null
          pep_status?: string | null
          review_frequency?: string | null
          risk_rating?: string | null
          sanctions_status?: string | null
          source_of_funds?: string | null
          source_of_wealth?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aml_client_status_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      app_cache: {
        Row: {
          created_at: string | null
          data: Json
          expires_at: string | null
          id: string
          key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          expires_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          expires_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assessment_documents: {
        Row: {
          assessment_id: string
          assessment_type: string
          document_id: string | null
          generated_at: string | null
          id: string
          template_used: string | null
          variables_used: Json | null
        }
        Insert: {
          assessment_id: string
          assessment_type: string
          document_id?: string | null
          generated_at?: string | null
          id?: string
          template_used?: string | null
          variables_used?: Json | null
        }
        Update: {
          assessment_id?: string
          assessment_type?: string
          document_id?: string | null
          generated_at?: string | null
          id?: string
          template_used?: string | null
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "assessment_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_drafts: {
        Row: {
          assessment_id: string | null
          assessment_type: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          draft_data: Json
          expires_at: string | null
          id: string
          last_modified_by: string | null
          last_saved_at: string | null
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          assessment_type?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          draft_data?: Json
          expires_at?: string | null
          id?: string
          last_modified_by?: string | null
          last_saved_at?: string | null
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          assessment_type?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          draft_data?: Json
          expires_at?: string | null
          id?: string
          last_modified_by?: string | null
          last_saved_at?: string | null
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessment_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessment_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assessment_drafts_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_assessment_drafts_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_assessment_drafts_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_history: {
        Row: {
          action: string
          assessment_id: string | null
          assessment_type: string
          changes: Json | null
          client_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          performed_at: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          assessment_id?: string | null
          assessment_type: string
          changes?: Json | null
          client_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          performed_at?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          assessment_id?: string | null
          assessment_type?: string
          changes?: Json | null
          client_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          performed_at?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_history_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessment_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessment_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessment_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_progress: {
        Row: {
          assessment_type: string
          client_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          last_updated: string | null
          metadata: Json | null
          progress_percentage: number | null
          score: Json | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assessment_type: string
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          progress_percentage?: number | null
          score?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assessment_type?: string
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          progress_percentage?: number | null
          score?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessment_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessment_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_progress_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_progress_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assessment_shares: {
        Row: {
          access_count: number | null
          advisor_id: string | null
          assessment_type: string
          client_email: string | null
          client_id: string | null
          client_name: string | null
          completed_at: string | null
          created_at: string | null
          custom_message: string | null
          expires_at: string
          firm_id: string | null
          id: string
          max_access_count: number | null
          metadata: Json | null
          password_hash: string | null
          response_data: Json | null
          status: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          access_count?: number | null
          advisor_id?: string | null
          assessment_type: string
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at: string
          firm_id?: string | null
          id?: string
          max_access_count?: number | null
          metadata?: Json | null
          password_hash?: string | null
          response_data?: Json | null
          status?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          access_count?: number | null
          advisor_id?: string | null
          assessment_type?: string
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          custom_message?: string | null
          expires_at?: string
          firm_id?: string | null
          id?: string
          max_access_count?: number | null
          metadata?: Json | null
          password_hash?: string | null
          response_data?: Json | null
          status?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_shares_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessment_shares_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessment_shares_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          advisor_id: string | null
          assessment_data: Json
          assessment_type: string | null
          client_id: string | null
          completed_at: string | null
          consumer_duty_compliance: Json | null
          created_at: string | null
          id: string
          legacy_form_id: string | null
          reviewed_at: string | null
          risk_analysis: Json | null
          status: string | null
          updated_at: string | null
          version: number | null
          vulnerability_analysis: Json | null
        }
        Insert: {
          advisor_id?: string | null
          assessment_data?: Json
          assessment_type?: string | null
          client_id?: string | null
          completed_at?: string | null
          consumer_duty_compliance?: Json | null
          created_at?: string | null
          id?: string
          legacy_form_id?: string | null
          reviewed_at?: string | null
          risk_analysis?: Json | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
          vulnerability_analysis?: Json | null
        }
        Update: {
          advisor_id?: string | null
          assessment_data?: Json
          assessment_type?: string | null
          client_id?: string | null
          completed_at?: string | null
          consumer_duty_compliance?: Json | null
          created_at?: string | null
          id?: string
          legacy_form_id?: string | null
          reviewed_at?: string | null
          risk_analysis?: Json | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
          vulnerability_analysis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      atr_assessments: {
        Row: {
          answers: Json
          assessment_date: string | null
          category_scores: Json | null
          client_id: string
          completed_by: string | null
          created_at: string | null
          id: string
          is_current: boolean | null
          notes: string | null
          recommendations: string[] | null
          risk_category: string
          risk_level: number
          total_score: number
          updated_at: string | null
          version: number | null
        }
        Insert: {
          answers?: Json
          assessment_date?: string | null
          category_scores?: Json | null
          client_id: string
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          recommendations?: string[] | null
          risk_category: string
          risk_level: number
          total_score: number
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          answers?: Json
          assessment_date?: string | null
          category_scores?: Json | null
          client_id?: string
          completed_by?: string | null
          created_at?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          recommendations?: string[] | null
          risk_category?: string
          risk_level?: number
          total_score?: number
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atr_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "atr_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "atr_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          client_id: string | null
          details: Json | null
          id: string
          ip_address: unknown
          resource: string
          resource_id: string | null
          success: boolean | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource: string
          resource_id?: string | null
          success?: boolean | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource?: string
          resource_id?: string | null
          success?: boolean | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      breach_register: {
        Row: {
          affected_clients: number | null
          assigned_to: string | null
          breach_date: string
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string
          discovered_date: string
          fca_notification_date: string | null
          fca_notified: boolean | null
          firm_id: string | null
          id: string
          lessons_learned: string | null
          priority: string
          reference_number: string | null
          remediation_actions: string | null
          remediation_date: string | null
          root_cause: string | null
          severity: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          affected_clients?: number | null
          assigned_to?: string | null
          breach_date: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          discovered_date: string
          fca_notification_date?: string | null
          fca_notified?: boolean | null
          firm_id?: string | null
          id?: string
          lessons_learned?: string | null
          priority?: string
          reference_number?: string | null
          remediation_actions?: string | null
          remediation_date?: string | null
          root_cause?: string | null
          severity?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          affected_clients?: number | null
          assigned_to?: string | null
          breach_date?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          discovered_date?: string
          fca_notification_date?: string | null
          fca_notified?: boolean | null
          firm_id?: string | null
          id?: string
          lessons_learned?: string | null
          priority?: string
          reference_number?: string | null
          remediation_actions?: string | null
          remediation_date?: string | null
          root_cause?: string | null
          severity?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breach_register_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breach_register_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "breach_register_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_operations_log: {
        Row: {
          completed_at: string | null
          created_at: string | null
          document_ids: string[]
          error_message: string | null
          failed_count: number | null
          firm_id: string
          id: string
          initiated_by: string
          operation_name: string | null
          operation_type: string
          results: Json | null
          started_at: string | null
          status: string | null
          successful_count: number | null
          total_documents: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          document_ids: string[]
          error_message?: string | null
          failed_count?: number | null
          firm_id: string
          id?: string
          initiated_by: string
          operation_name?: string | null
          operation_type: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          successful_count?: number | null
          total_documents: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          document_ids?: string[]
          error_message?: string | null
          failed_count?: number | null
          firm_id?: string
          id?: string
          initiated_by?: string
          operation_name?: string | null
          operation_type?: string
          results?: Json | null
          started_at?: string | null
          status?: string | null
          successful_count?: number | null
          total_documents?: number
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          client_id: string | null
          color: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          reminders: Json | null
          start_date: string
          title: string
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          client_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminders?: Json | null
          start_date: string
          title: string
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          client_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminders?: Json | null
          start_date?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_projections: {
        Row: {
          annual_surplus_deficit: number | null
          cash_savings: number | null
          client_age: number | null
          created_at: string | null
          discretionary_expenses: number | null
          employment_income: number | null
          essential_expenses: number | null
          id: string
          investment_income: number | null
          investment_portfolio: number | null
          lifestyle_expenses: number | null
          other_income: number | null
          pension_income: number | null
          pension_pot_value: number | null
          projection_year: number | null
          scenario_id: string | null
          state_pension: number | null
          sustainability_ratio: number | null
          total_assets: number | null
          total_expenses: number | null
          total_income: number | null
        }
        Insert: {
          annual_surplus_deficit?: number | null
          cash_savings?: number | null
          client_age?: number | null
          created_at?: string | null
          discretionary_expenses?: number | null
          employment_income?: number | null
          essential_expenses?: number | null
          id?: string
          investment_income?: number | null
          investment_portfolio?: number | null
          lifestyle_expenses?: number | null
          other_income?: number | null
          pension_income?: number | null
          pension_pot_value?: number | null
          projection_year?: number | null
          scenario_id?: string | null
          state_pension?: number | null
          sustainability_ratio?: number | null
          total_assets?: number | null
          total_expenses?: number | null
          total_income?: number | null
        }
        Update: {
          annual_surplus_deficit?: number | null
          cash_savings?: number | null
          client_age?: number | null
          created_at?: string | null
          discretionary_expenses?: number | null
          employment_income?: number | null
          essential_expenses?: number | null
          id?: string
          investment_income?: number | null
          investment_portfolio?: number | null
          lifestyle_expenses?: number | null
          other_income?: number | null
          pension_income?: number | null
          pension_pot_value?: number | null
          projection_year?: number | null
          scenario_id?: string | null
          state_pension?: number | null
          sustainability_ratio?: number | null
          total_assets?: number | null
          total_expenses?: number | null
          total_income?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_projections_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_projections_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenario_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_projections_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_scenarios: {
        Row: {
          alternative_allocation: number | null
          assumption_basis: string | null
          attitudetoriskscore: number | null
          bond_allocation: number | null
          capacity_for_loss_score: number | null
          cash_allocation: number | null
          client_age: number | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          current_expenses: number | null
          current_income: number | null
          current_savings: number | null
          dependents: number | null
          discretionary_expenses: number | null
          emergency_fund_target: number | null
          equity_allocation: number | null
          essential_expenses: number | null
          firm_id: string
          id: string
          inflation_rate: number | null
          investment_value: number | null
          is_active: boolean | null
          knowledge_experience_score: number | null
          last_analysis_date: string | null
          last_assumptions_review: string | null
          last_sensitivity_analysis: string | null
          legacy_target: number | null
          life_expectancy: number | null
          lifestyle_expenses: number | null
          market_data_source: string | null
          monte_carlo_runs: number | null
          mortgage_balance: number | null
          mortgage_payment: number | null
          other_debts: number | null
          other_income: number | null
          pension_contributions: number | null
          pension_pot_value: number | null
          pension_value: number | null
          projection_years: number | null
          property_value: number | null
          real_bond_return: number | null
          real_cash_return: number | null
          real_equity_return: number | null
          retirement_age: number | null
          retirement_income_desired: number | null
          retirement_income_target: number | null
          risk_score: number | null
          scenario_name: string
          scenario_template_id: string | null
          scenario_type: string | null
          state_pension_age: number | null
          state_pension_amount: number | null
          updated_at: string | null
          vulnerability_adjustments: Json | null
        }
        Insert: {
          alternative_allocation?: number | null
          assumption_basis?: string | null
          attitudetoriskscore?: number | null
          bond_allocation?: number | null
          capacity_for_loss_score?: number | null
          cash_allocation?: number | null
          client_age?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_expenses?: number | null
          current_income?: number | null
          current_savings?: number | null
          dependents?: number | null
          discretionary_expenses?: number | null
          emergency_fund_target?: number | null
          equity_allocation?: number | null
          essential_expenses?: number | null
          firm_id?: string
          id?: string
          inflation_rate?: number | null
          investment_value?: number | null
          is_active?: boolean | null
          knowledge_experience_score?: number | null
          last_analysis_date?: string | null
          last_assumptions_review?: string | null
          last_sensitivity_analysis?: string | null
          legacy_target?: number | null
          life_expectancy?: number | null
          lifestyle_expenses?: number | null
          market_data_source?: string | null
          monte_carlo_runs?: number | null
          mortgage_balance?: number | null
          mortgage_payment?: number | null
          other_debts?: number | null
          other_income?: number | null
          pension_contributions?: number | null
          pension_pot_value?: number | null
          pension_value?: number | null
          projection_years?: number | null
          property_value?: number | null
          real_bond_return?: number | null
          real_cash_return?: number | null
          real_equity_return?: number | null
          retirement_age?: number | null
          retirement_income_desired?: number | null
          retirement_income_target?: number | null
          risk_score?: number | null
          scenario_name: string
          scenario_template_id?: string | null
          scenario_type?: string | null
          state_pension_age?: number | null
          state_pension_amount?: number | null
          updated_at?: string | null
          vulnerability_adjustments?: Json | null
        }
        Update: {
          alternative_allocation?: number | null
          assumption_basis?: string | null
          attitudetoriskscore?: number | null
          bond_allocation?: number | null
          capacity_for_loss_score?: number | null
          cash_allocation?: number | null
          client_age?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_expenses?: number | null
          current_income?: number | null
          current_savings?: number | null
          dependents?: number | null
          discretionary_expenses?: number | null
          emergency_fund_target?: number | null
          equity_allocation?: number | null
          essential_expenses?: number | null
          firm_id?: string
          id?: string
          inflation_rate?: number | null
          investment_value?: number | null
          is_active?: boolean | null
          knowledge_experience_score?: number | null
          last_analysis_date?: string | null
          last_assumptions_review?: string | null
          last_sensitivity_analysis?: string | null
          legacy_target?: number | null
          life_expectancy?: number | null
          lifestyle_expenses?: number | null
          market_data_source?: string | null
          monte_carlo_runs?: number | null
          mortgage_balance?: number | null
          mortgage_payment?: number | null
          other_debts?: number | null
          other_income?: number | null
          pension_contributions?: number | null
          pension_pot_value?: number | null
          pension_value?: number | null
          projection_years?: number | null
          property_value?: number | null
          real_bond_return?: number | null
          real_cash_return?: number | null
          real_equity_return?: number | null
          retirement_age?: number | null
          retirement_income_desired?: number | null
          retirement_income_target?: number | null
          risk_score?: number | null
          scenario_name?: string
          scenario_template_id?: string | null
          scenario_type?: string | null
          state_pension_age?: number | null
          state_pension_amount?: number | null
          updated_at?: string | null
          vulnerability_adjustments?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cfl_assessments: {
        Row: {
          answers: Json
          assessment_date: string | null
          capacity_category: string
          capacity_level: number
          client_id: string
          completed_by: string | null
          confidence_level: number
          created_at: string | null
          emergency_fund: number | null
          id: string
          is_current: boolean | null
          max_loss_percentage: number
          monthly_expenses: number | null
          monthly_income: number | null
          notes: string | null
          other_investments: number | null
          recommendations: string[] | null
          total_score: number
          updated_at: string | null
          version: number | null
        }
        Insert: {
          answers?: Json
          assessment_date?: string | null
          capacity_category: string
          capacity_level: number
          client_id: string
          completed_by?: string | null
          confidence_level: number
          created_at?: string | null
          emergency_fund?: number | null
          id?: string
          is_current?: boolean | null
          max_loss_percentage: number
          monthly_expenses?: number | null
          monthly_income?: number | null
          notes?: string | null
          other_investments?: number | null
          recommendations?: string[] | null
          total_score: number
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          answers?: Json
          assessment_date?: string | null
          capacity_category?: string
          capacity_level?: number
          client_id?: string
          completed_by?: string | null
          confidence_level?: number
          created_at?: string | null
          emergency_fund?: number | null
          id?: string
          is_current?: boolean | null
          max_loss_percentage?: number
          monthly_expenses?: number | null
          monthly_income?: number | null
          notes?: string | null
          other_investments?: number | null
          recommendations?: string[] | null
          total_score?: number
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cfl_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cfl_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cfl_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communications: {
        Row: {
          assessment_id: string | null
          client_id: string | null
          communication_date: string
          communication_type: string
          contact_method: string | null
          content: string | null
          created_at: string | null
          created_by: string
          direction: string | null
          document_id: string | null
          firm_id: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          followup_completed: boolean | null
          followup_date: string | null
          id: string
          method: string | null
          requires_followup: boolean | null
          status: string | null
          subject: string | null
          summary: string
        }
        Insert: {
          assessment_id?: string | null
          client_id?: string | null
          communication_date: string
          communication_type: string
          contact_method?: string | null
          content?: string | null
          created_at?: string | null
          created_by: string
          direction?: string | null
          document_id?: string | null
          firm_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          followup_completed?: boolean | null
          followup_date?: string | null
          id?: string
          method?: string | null
          requires_followup?: boolean | null
          status?: string | null
          subject?: string | null
          summary: string
        }
        Update: {
          assessment_id?: string | null
          client_id?: string | null
          communication_date?: string
          communication_type?: string
          contact_method?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string
          direction?: string | null
          document_id?: string | null
          firm_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          followup_completed?: boolean | null
          followup_date?: string | null
          id?: string
          method?: string | null
          requires_followup?: boolean | null
          status?: string | null
          subject?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communications_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      client_goals: {
        Row: {
          client_id: string | null
          created_at: string | null
          current_progress: number | null
          funding_status: string | null
          goal_name: string
          goal_type: string | null
          id: string
          is_active: boolean | null
          linked_scenario_id: string | null
          priority: string | null
          probability_of_success: number | null
          target_amount: number | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          current_progress?: number | null
          funding_status?: string | null
          goal_name: string
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          linked_scenario_id?: string | null
          priority?: string | null
          probability_of_success?: number | null
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          current_progress?: number | null
          funding_status?: string | null
          goal_name?: string
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          linked_scenario_id?: string | null
          priority?: string | null
          probability_of_success?: number | null
          target_amount?: number | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_goals_linked_scenario_id_fkey"
            columns: ["linked_scenario_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_goals_linked_scenario_id_fkey"
            columns: ["linked_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenario_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_goals_linked_scenario_id_fkey"
            columns: ["linked_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      client_relationships: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          primary_client_id: string | null
          related_client_id: string | null
          relationship_details: Json | null
          relationship_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          primary_client_id?: string | null
          related_client_id?: string | null
          relationship_details?: Json | null
          relationship_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          primary_client_id?: string | null
          related_client_id?: string | null
          relationship_details?: Json | null
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_relationships_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_relationships_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_relationships_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_relationships_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_relationships_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_relationships_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reviews: {
        Row: {
          changes_made: Json | null
          client_id: string | null
          completed_by: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string
          due_date: string
          id: string
          next_review_date: string | null
          notes: string | null
          outcome: string | null
          recommendations: Json | null
          reminder_date: string | null
          reminder_sent: boolean | null
          review_summary: string | null
          review_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          changes_made?: Json | null
          client_id?: string | null
          completed_by?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by: string
          due_date: string
          id?: string
          next_review_date?: string | null
          notes?: string | null
          outcome?: string | null
          recommendations?: Json | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          review_summary?: string | null
          review_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          changes_made?: Json | null
          client_id?: string | null
          completed_by?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string
          due_date?: string
          id?: string
          next_review_date?: string | null
          notes?: string | null
          outcome?: string | null
          recommendations?: Json | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          review_summary?: string | null
          review_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          decumulation_justification: string | null
          decumulation_strategy: string | null
          firm_id: string | null
          id: string
          platform_justification: Json | null
          platform_selected: string | null
          services_selected: Json | null
          suitability_justification: string | null
          sustainability_assessment: Json | null
          target_market_checks: Json | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          decumulation_justification?: string | null
          decumulation_strategy?: string | null
          firm_id?: string | null
          id?: string
          platform_justification?: Json | null
          platform_selected?: string | null
          services_selected?: Json | null
          suitability_justification?: string | null
          sustainability_assessment?: Json | null
          target_market_checks?: Json | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          decumulation_justification?: string | null
          decumulation_strategy?: string | null
          firm_id?: string | null
          id?: string
          platform_justification?: Json | null
          platform_selected?: string | null
          services_selected?: Json | null
          suitability_justification?: string | null
          sustainability_assessment?: Json | null
          target_market_checks?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      client_workflows: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          workflow_type: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_type: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          advisor_id: string | null
          assessment_count: number | null
          assessment_summary: Json | null
          client_ref: string
          contact_info: Json
          created_at: string | null
          financial_profile: Json | null
          firm_id: string | null
          id: string
          last_assessment_date: string | null
          last_assessment_type: string | null
          next_review_date: string | null
          personal_details: Json
          risk_profile: Json | null
          status: string | null
          updated_at: string | null
          vulnerability_assessment: Json | null
        }
        Insert: {
          advisor_id?: string | null
          assessment_count?: number | null
          assessment_summary?: Json | null
          client_ref: string
          contact_info?: Json
          created_at?: string | null
          financial_profile?: Json | null
          firm_id?: string | null
          id?: string
          last_assessment_date?: string | null
          last_assessment_type?: string | null
          next_review_date?: string | null
          personal_details?: Json
          risk_profile?: Json | null
          status?: string | null
          updated_at?: string | null
          vulnerability_assessment?: Json | null
        }
        Update: {
          advisor_id?: string | null
          assessment_count?: number | null
          assessment_summary?: Json | null
          client_ref?: string
          contact_info?: Json
          created_at?: string | null
          financial_profile?: Json | null
          firm_id?: string | null
          id?: string
          last_assessment_date?: string | null
          last_assessment_type?: string | null
          next_review_date?: string | null
          personal_details?: Json
          risk_profile?: Json | null
          status?: string | null
          updated_at?: string | null
          vulnerability_assessment?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      clients_vulnerability_backup: {
        Row: {
          client_ref: string | null
          id: string | null
          updated_at: string | null
          vulnerability_assessment: Json | null
        }
        Insert: {
          client_ref?: string | null
          id?: string | null
          updated_at?: string | null
          vulnerability_assessment?: Json | null
        }
        Update: {
          client_ref?: string | null
          id?: string | null
          updated_at?: string | null
          vulnerability_assessment?: Json | null
        }
        Relationships: []
      }
      communications: {
        Row: {
          attachments: Json | null
          client_id: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          date: string | null
          duration_minutes: number | null
          firm_id: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          outcome: string | null
          status: string | null
          subject: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          client_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          duration_minutes?: number | null
          firm_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          outcome?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          client_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          duration_minutes?: number | null
          firm_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          outcome?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      complaint_register: {
        Row: {
          assigned_to: string | null
          category: string | null
          client_id: string | null
          complaint_date: string
          created_at: string | null
          created_by: string | null
          description: string
          fca_reportable: boolean | null
          firm_id: string | null
          id: string
          lessons_learned: string | null
          priority: string
          received_via: string | null
          redress_amount: number | null
          reference_number: string | null
          resolution: string | null
          resolution_date: string | null
          root_cause: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          complaint_date: string
          created_at?: string | null
          created_by?: string | null
          description: string
          fca_reportable?: boolean | null
          firm_id?: string | null
          id?: string
          lessons_learned?: string | null
          priority?: string
          received_via?: string | null
          redress_amount?: number | null
          reference_number?: string | null
          resolution?: string | null
          resolution_date?: string | null
          root_cause?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          client_id?: string | null
          complaint_date?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          fca_reportable?: boolean | null
          firm_id?: string | null
          id?: string
          lessons_learned?: string | null
          priority?: string
          received_via?: string | null
          redress_amount?: number | null
          reference_number?: string | null
          resolution?: string | null
          resolution_date?: string | null
          root_cause?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_register_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_register_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "complaint_register_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "complaint_register_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "complaint_register_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_register_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_comments: {
        Row: {
          content: string
          created_at: string
          firm_id: string
          id: string
          source_id: string
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          firm_id: string
          id?: string
          source_id: string
          source_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          firm_id?: string
          id?: string
          source_id?: string
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_comments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compliance_evidence: {
        Row: {
          archived_at: string | null
          client_id: string
          compliance_ref: string
          compliance_requirement: string
          compliance_risk_level: string | null
          compliance_status: string | null
          created_at: string | null
          document_path: string | null
          document_size_bytes: number | null
          document_type: string | null
          evidence_summary: string | null
          evidence_type: string
          expires_at: string | null
          id: string
          mitigation_actions: string[] | null
          next_review_date: string | null
          regulation_reference: string | null
          review_date: string | null
          reviewer_name: string | null
          reviewer_role: string | null
          risk_factors: string[] | null
          stress_test_id: string | null
          updated_at: string | null
          validation_criteria: string[] | null
          validation_results: Json | null
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          compliance_ref: string
          compliance_requirement: string
          compliance_risk_level?: string | null
          compliance_status?: string | null
          created_at?: string | null
          document_path?: string | null
          document_size_bytes?: number | null
          document_type?: string | null
          evidence_summary?: string | null
          evidence_type: string
          expires_at?: string | null
          id?: string
          mitigation_actions?: string[] | null
          next_review_date?: string | null
          regulation_reference?: string | null
          review_date?: string | null
          reviewer_name?: string | null
          reviewer_role?: string | null
          risk_factors?: string[] | null
          stress_test_id?: string | null
          updated_at?: string | null
          validation_criteria?: string[] | null
          validation_results?: Json | null
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          compliance_ref?: string
          compliance_requirement?: string
          compliance_risk_level?: string | null
          compliance_status?: string | null
          created_at?: string | null
          document_path?: string | null
          document_size_bytes?: number | null
          document_type?: string | null
          evidence_summary?: string | null
          evidence_type?: string
          expires_at?: string | null
          id?: string
          mitigation_actions?: string[] | null
          next_review_date?: string | null
          regulation_reference?: string | null
          review_date?: string | null
          reviewer_name?: string | null
          reviewer_role?: string | null
          risk_factors?: string[] | null
          stress_test_id?: string | null
          updated_at?: string | null
          validation_criteria?: string[] | null
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_compliance_evidence_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_compliance_evidence_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_compliance_evidence_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_compliance_evidence_stress_test"
            columns: ["stress_test_id"]
            isOneToOne: false
            referencedRelation: "latest_stress_test_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_compliance_evidence_stress_test"
            columns: ["stress_test_id"]
            isOneToOne: false
            referencedRelation: "stress_test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rules: {
        Row: {
          configuration: Json
          created_at: string | null
          firm_id: string | null
          id: string
          is_active: boolean | null
          rule_name: string
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          configuration?: Json
          created_at?: string | null
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          rule_name: string
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          firm_id?: string | null
          id?: string
          is_active?: boolean | null
          rule_name?: string
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_rules_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_duty_status: {
        Row: {
          client_id: string | null
          consumer_support_evidence: string | null
          consumer_support_last_review: string | null
          consumer_support_status: string | null
          consumer_understanding_evidence: string | null
          consumer_understanding_last_review: string | null
          consumer_understanding_status: string | null
          created_at: string | null
          firm_id: string | null
          id: string
          next_review_date: string | null
          notes: string | null
          overall_status: string | null
          price_value_evidence: string | null
          price_value_last_review: string | null
          price_value_status: string | null
          products_services_evidence: string | null
          products_services_last_review: string | null
          products_services_status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          consumer_support_evidence?: string | null
          consumer_support_last_review?: string | null
          consumer_support_status?: string | null
          consumer_understanding_evidence?: string | null
          consumer_understanding_last_review?: string | null
          consumer_understanding_status?: string | null
          created_at?: string | null
          firm_id?: string | null
          id?: string
          next_review_date?: string | null
          notes?: string | null
          overall_status?: string | null
          price_value_evidence?: string | null
          price_value_last_review?: string | null
          price_value_status?: string | null
          products_services_evidence?: string | null
          products_services_last_review?: string | null
          products_services_status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          consumer_support_evidence?: string | null
          consumer_support_last_review?: string | null
          consumer_support_status?: string | null
          consumer_understanding_evidence?: string | null
          consumer_understanding_last_review?: string | null
          consumer_understanding_status?: string | null
          created_at?: string | null
          firm_id?: string | null
          id?: string
          next_review_date?: string | null
          notes?: string | null
          overall_status?: string | null
          price_value_evidence?: string | null
          price_value_last_review?: string | null
          price_value_status?: string | null
          products_services_evidence?: string | null
          products_services_last_review?: string | null
          products_services_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumer_duty_status_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          action: string
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: unknown
          notes: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_analytics: {
        Row: {
          compliance_score: number | null
          created_at: string | null
          date: string
          documents_downloaded: number | null
          documents_uploaded: number | null
          firm_id: string
          id: string
          overdue_reviews: number | null
          signatures_completed: number | null
          signatures_requested: number | null
          storage_used_bytes: number | null
          updated_at: string | null
        }
        Insert: {
          compliance_score?: number | null
          created_at?: string | null
          date: string
          documents_downloaded?: number | null
          documents_uploaded?: number | null
          firm_id: string
          id?: string
          overdue_reviews?: number | null
          signatures_completed?: number | null
          signatures_requested?: number | null
          storage_used_bytes?: number | null
          updated_at?: string | null
        }
        Update: {
          compliance_score?: number | null
          created_at?: string | null
          date?: string
          documents_downloaded?: number | null
          documents_uploaded?: number | null
          firm_id?: string
          id?: string
          overdue_reviews?: number | null
          signatures_completed?: number | null
          signatures_requested?: number | null
          storage_used_bytes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          document_id: string | null
          firm_id: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          firm_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          firm_id?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          compliance_level: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          requires_signature: boolean | null
          template_available: boolean | null
          updated_at: string | null
        }
        Insert: {
          compliance_level?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          requires_signature?: boolean | null
          template_available?: boolean | null
          updated_at?: string | null
        }
        Update: {
          compliance_level?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          requires_signature?: boolean | null
          template_available?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_events: {
        Row: {
          created_at: string | null
          document_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          tracking_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          tracking_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_events_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "document_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      document_generation_logs: {
        Row: {
          assessment_ids: Json | null
          client_id: string | null
          completed_at: string | null
          created_by: string | null
          document_id: string | null
          error_message: string | null
          generation_type: string
          id: string
          metadata: Json | null
          started_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          assessment_ids?: Json | null
          client_id?: string | null
          completed_at?: string | null
          created_by?: string | null
          document_id?: string | null
          error_message?: string | null
          generation_type: string
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          assessment_ids?: Json | null
          client_id?: string | null
          completed_at?: string | null
          created_by?: string | null
          document_id?: string | null
          error_message?: string | null
          generation_type?: string
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_generation_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_generation_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_generation_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          access_count: number | null
          can_download: boolean | null
          can_view: boolean | null
          created_at: string | null
          created_by: string
          document_id: string | null
          expires_at: string | null
          firm_id: string
          id: string
          last_accessed_at: string | null
          max_access_count: number | null
          password_hash: string | null
          password_protected: boolean | null
          recipient_email: string | null
          recipient_name: string | null
          share_token: string
        }
        Insert: {
          access_count?: number | null
          can_download?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          created_by: string
          document_id?: string | null
          expires_at?: string | null
          firm_id?: string
          id?: string
          last_accessed_at?: string | null
          max_access_count?: number | null
          password_hash?: string | null
          password_protected?: boolean | null
          recipient_email?: string | null
          recipient_name?: string | null
          share_token: string
        }
        Update: {
          access_count?: number | null
          can_download?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          created_by?: string
          document_id?: string | null
          expires_at?: string | null
          firm_id?: string
          id?: string
          last_accessed_at?: string | null
          max_access_count?: number | null
          password_hash?: string | null
          password_protected?: boolean | null
          recipient_email?: string | null
          recipient_name?: string | null
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          advisor_id: string | null
          assessment_type: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          docuseal_template_id: string | null
          firm_id: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_featured: boolean | null
          last_used_at: string | null
          name: string
          requires_approval: boolean | null
          requires_signature: boolean | null
          template_content: string | null
          template_variables: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          advisor_id?: string | null
          assessment_type?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          docuseal_template_id?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_featured?: boolean | null
          last_used_at?: string | null
          name: string
          requires_approval?: boolean | null
          requires_signature?: boolean | null
          template_content?: string | null
          template_variables?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          advisor_id?: string | null
          assessment_type?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          docuseal_template_id?: string | null
          firm_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_featured?: boolean | null
          last_used_at?: string | null
          name?: string
          requires_approval?: boolean | null
          requires_signature?: boolean | null
          template_content?: string | null
          template_variables?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tracking: {
        Row: {
          client_id: string | null
          created_at: string | null
          document_id: string | null
          docuseal_submission_id: string | null
          expired_at: string | null
          id: string
          ip_address: string | null
          sent_at: string | null
          signature_request_url: string | null
          signed_at: string | null
          signed_document_url: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_agent: string | null
          view_count: number | null
          viewed_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          document_id?: string | null
          docuseal_submission_id?: string | null
          expired_at?: string | null
          id?: string
          ip_address?: string | null
          sent_at?: string | null
          signature_request_url?: string | null
          signed_at?: string | null
          signed_document_url?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          view_count?: number | null
          viewed_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          document_id?: string | null
          docuseal_submission_id?: string | null
          expired_at?: string | null
          id?: string
          ip_address?: string | null
          sent_at?: string | null
          signature_request_url?: string | null
          signed_at?: string | null
          signed_document_url?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          view_count?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_tracking_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_tracking_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_tracking_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tracking_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tracking_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tracking_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_description: string | null
          created_at: string | null
          created_by: string | null
          document_id: string | null
          file_size: number | null
          id: string
          storage_path: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          file_size?: number | null
          id?: string
          storage_path: string
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          file_size?: number | null
          id?: string
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_workflows: {
        Row: {
          client_id: string | null
          created_at: string | null
          current_step: number | null
          id: string
          metadata: Json | null
          status: string | null
          steps: Json
          updated_at: string | null
          workflow_type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          metadata?: Json | null
          status?: string | null
          steps?: Json
          updated_at?: string | null
          workflow_type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          metadata?: Json | null
          status?: string | null
          steps?: Json
          updated_at?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "document_workflows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          assessment_id: string | null
          assessment_version: number | null
          category: string
          category_id: string | null
          client_id: string | null
          client_name: string | null
          compliance_status: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_type: string | null
          external_submission_id: string | null
          external_template_id: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          file_type: string | null
          firm_id: string
          id: string
          is_archived: boolean | null
          is_template: boolean | null
          last_modified_by: string | null
          metadata: Json | null
          mime_type: string | null
          name: string
          requires_signature: boolean | null
          signature_provider: string | null
          signature_request_id: string | null
          signature_status: string | null
          signed_at: string | null
          status: string | null
          storage_path: string
          tags: string[] | null
          type: string
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          assessment_id?: string | null
          assessment_version?: number | null
          category: string
          category_id?: string | null
          client_id?: string | null
          client_name?: string | null
          compliance_status?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string | null
          external_submission_id?: string | null
          external_template_id?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          firm_id?: string
          id?: string
          is_archived?: boolean | null
          is_template?: boolean | null
          last_modified_by?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          requires_signature?: boolean | null
          signature_provider?: string | null
          signature_request_id?: string | null
          signature_status?: string | null
          signed_at?: string | null
          status?: string | null
          storage_path?: string
          tags?: string[] | null
          type: string
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          assessment_id?: string | null
          assessment_version?: number | null
          category?: string
          category_id?: string | null
          client_id?: string | null
          client_name?: string | null
          compliance_status?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string | null
          external_submission_id?: string | null
          external_template_id?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          firm_id?: string
          id?: string
          is_archived?: boolean | null
          is_template?: boolean | null
          last_modified_by?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          requires_signature?: boolean | null
          signature_provider?: string | null
          signature_request_id?: string | null
          signature_status?: string | null
          signed_at?: string | null
          status?: string | null
          storage_path?: string
          tags?: string[] | null
          type?: string
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient: string
          sent_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient: string
          sent_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      file_reviews: {
        Row: {
          adviser_id: string | null
          adviser_name: string | null
          adviser_submitted_at: string | null
          checklist: Json | null
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          findings: string | null
          firm_id: string | null
          id: string
          review_type: string
          reviewer_completed_at: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          reviewer_started_at: string | null
          risk_rating: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          adviser_id?: string | null
          adviser_name?: string | null
          adviser_submitted_at?: string | null
          checklist?: Json | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          findings?: string | null
          firm_id?: string | null
          id?: string
          review_type?: string
          reviewer_completed_at?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_started_at?: string | null
          risk_rating?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          adviser_id?: string | null
          adviser_name?: string | null
          adviser_submitted_at?: string | null
          checklist?: Json | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          findings?: string | null
          firm_id?: string | null
          id?: string
          review_type?: string
          reviewer_completed_at?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          reviewer_started_at?: string | null
          risk_rating?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_reviews_adviser_id_fkey"
            columns: ["adviser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_reviews_adviser_id_fkey"
            columns: ["adviser_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "file_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "file_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "file_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_reviews_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      firms: {
        Row: {
          address: Json | null
          created_at: string | null
          fca_number: string | null
          id: string
          name: string
          settings: Json | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          fca_number?: string | null
          id?: string
          name: string
          settings?: Json | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          fca_number?: string | null
          id?: string
          name?: string
          settings?: Json | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      form_drafts: {
        Row: {
          data: Json
          form_id: string
          form_type: string
          updated_at: string | null
        }
        Insert: {
          data: Json
          form_id: string
          form_type: string
          updated_at?: string | null
        }
        Update: {
          data?: Json
          form_id?: string
          form_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          client_id: string | null
          content: string | null
          created_at: string | null
          file_name: string | null
          file_path: string | null
          file_type: string | null
          id: string
          sent_at: string | null
          signed_at: string | null
          status: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          sent_at?: string | null
          signed_at?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          client_id?: string | null
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          sent_at?: string | null
          signed_at?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "generated_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "generated_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ifa_forms: {
        Row: {
          created_at: string | null
          form_id: string
          id: string
          payload: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          form_id: string
          id?: string
          payload: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          form_id?: string
          id?: string
          payload?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      market_data_assumptions: {
        Row: {
          created_at: string | null
          data_source: string
          effective_date: string | null
          id: string
          inflation_forecast: number
          is_active: boolean | null
          real_bond_return: number
          real_cash_return: number
          real_equity_return: number
        }
        Insert: {
          created_at?: string | null
          data_source: string
          effective_date?: string | null
          id?: string
          inflation_forecast: number
          is_active?: boolean | null
          real_bond_return: number
          real_cash_return: number
          real_equity_return: number
        }
        Update: {
          created_at?: string | null
          data_source?: string
          effective_date?: string | null
          id?: string
          inflation_forecast?: number
          is_active?: boolean | null
          real_bond_return?: number
          real_cash_return?: number
          real_equity_return?: number
        }
        Relationships: []
      }
      meetings: {
        Row: {
          advisor_id: string | null
          client_id: string | null
          client_name: string
          created_at: string | null
          date: string
          duration: number | null
          id: string
          location: string | null
          notes: string | null
          time: string
          type: string
          updated_at: string | null
        }
        Insert: {
          advisor_id?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string | null
          date: string
          duration?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          time: string
          type: string
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          date?: string
          duration?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          time?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monte_carlo_results: {
        Row: {
          average_final_wealth: number
          average_shortfall_amount: number | null
          calculation_status: string | null
          client_id: string | null
          confidence_intervals: Json
          created_at: string | null
          generated_at: string | null
          id: string
          inflation_rate: number | null
          initial_wealth: number | null
          maximum_drawdown: number
          median_final_wealth: number
          risk_score: number | null
          scenario_id: string
          scenario_name: string | null
          shortfall_risk: number
          simulation_count: number
          simulation_duration_ms: number
          success_probability: number
          time_horizon: number | null
          wealth_volatility: number
          withdrawal_amount: number | null
          years_to_depletion_p50: number | null
        }
        Insert: {
          average_final_wealth: number
          average_shortfall_amount?: number | null
          calculation_status?: string | null
          client_id?: string | null
          confidence_intervals: Json
          created_at?: string | null
          generated_at?: string | null
          id?: string
          inflation_rate?: number | null
          initial_wealth?: number | null
          maximum_drawdown: number
          median_final_wealth: number
          risk_score?: number | null
          scenario_id: string
          scenario_name?: string | null
          shortfall_risk: number
          simulation_count: number
          simulation_duration_ms: number
          success_probability: number
          time_horizon?: number | null
          wealth_volatility: number
          withdrawal_amount?: number | null
          years_to_depletion_p50?: number | null
        }
        Update: {
          average_final_wealth?: number
          average_shortfall_amount?: number | null
          calculation_status?: string | null
          client_id?: string | null
          confidence_intervals?: Json
          created_at?: string | null
          generated_at?: string | null
          id?: string
          inflation_rate?: number | null
          initial_wealth?: number | null
          maximum_drawdown?: number
          median_final_wealth?: number
          risk_score?: number | null
          scenario_id?: string
          scenario_name?: string | null
          shortfall_risk?: number
          simulation_count?: number
          simulation_duration_ms?: number
          success_probability?: number
          time_horizon?: number | null
          wealth_volatility?: number
          withdrawal_amount?: number | null
          years_to_depletion_p50?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monte_carlo_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "monte_carlo_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "monte_carlo_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      monte_carlo_runs: {
        Row: {
          confidence_intervals: Json | null
          id: string
          parameters: Json | null
          run_date: string | null
          scenario_id: string | null
          success_probability: number | null
        }
        Insert: {
          confidence_intervals?: Json | null
          id?: string
          parameters?: Json | null
          run_date?: string | null
          scenario_id?: string | null
          success_probability?: number | null
        }
        Update: {
          confidence_intervals?: Json | null
          id?: string
          parameters?: Json | null
          run_date?: string | null
          scenario_id?: string | null
          success_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monte_carlo_runs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monte_carlo_runs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenario_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monte_carlo_runs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      monte_carlo_scenarios: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          inflation_rate: number | null
          initial_wealth: number | null
          risk_score: number | null
          scenario_name: string
          time_horizon: number | null
          updated_at: string | null
          withdrawal_amount: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          inflation_rate?: number | null
          initial_wealth?: number | null
          risk_score?: number | null
          scenario_name: string
          time_horizon?: number | null
          updated_at?: string | null
          withdrawal_amount?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          inflation_rate?: number | null
          initial_wealth?: number | null
          risk_score?: number | null
          scenario_name?: string
          time_horizon?: number | null
          updated_at?: string | null
          withdrawal_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monte_carlo_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "monte_carlo_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "monte_carlo_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          firm_id: string | null
          id: string
          message: string | null
          metadata: Json | null
          priority: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          firm_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          firm_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          priority?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          action_description: string | null
          action_title: string
          action_type: string
          assigned_to: string | null
          client_id: string | null
          completed_date: string | null
          created_at: string | null
          created_by: string
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          action_description?: string | null
          action_title: string
          action_type: string
          assigned_to?: string | null
          client_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          action_description?: string | null
          action_title?: string
          action_type?: string
          assigned_to?: string | null
          client_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          created_by?: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "pending_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "pending_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_assessments: {
        Row: {
          answers: Json | null
          assessment_date: string | null
          client_id: string
          communication_needs: Json | null
          completed_by: string | null
          confidence: number
          consumer_duty_alignment: Json | null
          created_at: string | null
          fears: string[] | null
          id: string
          is_current: boolean | null
          motivations: string[] | null
          notes: string | null
          persona_level: string
          persona_type: string
          psychological_profile: Json | null
          scores: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          answers?: Json | null
          assessment_date?: string | null
          client_id: string
          communication_needs?: Json | null
          completed_by?: string | null
          confidence: number
          consumer_duty_alignment?: Json | null
          created_at?: string | null
          fears?: string[] | null
          id?: string
          is_current?: boolean | null
          motivations?: string[] | null
          notes?: string | null
          persona_level: string
          persona_type: string
          psychological_profile?: Json | null
          scores?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          answers?: Json | null
          assessment_date?: string | null
          client_id?: string
          communication_needs?: Json | null
          completed_by?: string | null
          confidence?: number
          consumer_duty_alignment?: Json | null
          created_at?: string | null
          fears?: string[] | null
          id?: string
          is_current?: boolean | null
          motivations?: string[] | null
          notes?: string | null
          persona_level?: string
          persona_type?: string
          psychological_profile?: Json | null
          scores?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "persona_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "persona_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "persona_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_billing_config: {
        Row: {
          created_at: string
          currency: string
          id: string
          seat_price: number | null
          stripe_base_price_12m_id: string | null
          stripe_base_price_24m_id: string | null
          stripe_base_price_36m_id: string | null
          stripe_seat_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          seat_price?: number | null
          stripe_base_price_12m_id?: string | null
          stripe_base_price_24m_id?: string | null
          stripe_base_price_36m_id?: string | null
          stripe_seat_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          seat_price?: number | null
          stripe_base_price_12m_id?: string | null
          stripe_base_price_24m_id?: string | null
          stripe_base_price_36m_id?: string | null
          stripe_seat_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          firm_id: string | null
          first_name: string
          full_name: string | null
          id: string
          is_platform_admin: boolean | null
          last_login_at: string | null
          last_name: string
          permissions: Json | null
          phone: string | null
          preferences: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          firm_id?: string | null
          first_name: string
          full_name?: string | null
          id: string
          is_platform_admin?: boolean | null
          last_login_at?: string | null
          last_name: string
          permissions?: Json | null
          phone?: string | null
          preferences?: Json | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          firm_id?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean | null
          last_login_at?: string | null
          last_name?: string
          permissions?: Json | null
          phone?: string | null
          preferences?: Json | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      report_metadata: {
        Row: {
          accessibility: boolean | null
          client_id: string
          created_at: string | null
          created_by: string | null
          file_size: number | null
          id: string
          language: string | null
          page_count: number | null
          scenario_id: string
          template_type: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          accessibility?: boolean | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          file_size?: number | null
          id?: string
          language?: string | null
          page_count?: number | null
          scenario_id: string
          template_type: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          accessibility?: boolean | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          file_size?: number | null
          id?: string
          language?: string | null
          page_count?: number | null
          scenario_id?: string
          template_type?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_metadata_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "report_metadata_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "report_metadata_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string | null
          date: string | null
          id: string
          next_review: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          client_id?: string | null
          date?: string | null
          id: string
          next_review?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          client_id?: string | null
          date?: string | null
          id?: string
          next_review?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_profiles: {
        Row: {
          approval_date: string | null
          approved_by: string | null
          atr_assessment_id: string | null
          atr_score: number | null
          cfl_assessment_id: string | null
          cfl_score: number | null
          client_id: string
          created_at: string | null
          final_risk_category: string
          final_risk_level: number
          id: string
          is_current: boolean | null
          reconciliation_method: string | null
          reconciliation_notes: string | null
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          approved_by?: string | null
          atr_assessment_id?: string | null
          atr_score?: number | null
          cfl_assessment_id?: string | null
          cfl_score?: number | null
          client_id: string
          created_at?: string | null
          final_risk_category: string
          final_risk_level: number
          id?: string
          is_current?: boolean | null
          reconciliation_method?: string | null
          reconciliation_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          approved_by?: string | null
          atr_assessment_id?: string | null
          atr_score?: number | null
          cfl_assessment_id?: string | null
          cfl_score?: number | null
          client_id?: string
          created_at?: string | null
          final_risk_category?: string
          final_risk_level?: number
          id?: string
          is_current?: boolean | null
          reconciliation_method?: string | null
          reconciliation_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_profiles_atr_assessment_id_fkey"
            columns: ["atr_assessment_id"]
            isOneToOne: false
            referencedRelation: "atr_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_profiles_cfl_assessment_id_fkey"
            columns: ["cfl_assessment_id"]
            isOneToOne: false
            referencedRelation: "cfl_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "risk_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "risk_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reviews: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          review_type: string
          scheduled_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          review_type: string
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          review_type?: string
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "scheduled_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "scheduled_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitivity_analyses: {
        Row: {
          base_value: number | null
          created_at: string | null
          id: string
          impact_results: Json | null
          parameter_name: string | null
          scenario_id: string | null
          test_values: Json | null
        }
        Insert: {
          base_value?: number | null
          created_at?: string | null
          id?: string
          impact_results?: Json | null
          parameter_name?: string | null
          scenario_id?: string | null
          test_values?: Json | null
        }
        Update: {
          base_value?: number | null
          created_at?: string | null
          id?: string
          impact_results?: Json | null
          parameter_name?: string | null
          scenario_id?: string | null
          test_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sensitivity_analyses_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensitivity_analyses_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenario_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensitivity_analyses_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_audit_log: {
        Row: {
          created_at: string | null
          event_timestamp: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          signature_request_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          event_timestamp?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signature_request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signature_request_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_audit_log_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          signature_request_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          signature_request_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          signature_request_id?: string | null
        }
        Relationships: []
      }
      signature_requests: {
        Row: {
          auto_reminder: boolean | null
          client_id: string | null
          client_ref: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          document_id: string | null
          docuseal_status: string | null
          docuseal_submission_id: string | null
          docuseal_template_id: string | null
          expires_at: string | null
          firm_id: string
          id: string
          message: string | null
          opensign_metadata: Json | null
          original_document_hash: string | null
          recipient_email: string
          recipient_name: string
          recipient_role: string | null
          remind_once_in_every: number | null
          sent_at: string | null
          signature_image_path: string | null
          signature_ip_address: string | null
          signature_user_agent: string | null
          signed_document_hash: string | null
          signed_document_path: string | null
          signer_consent_given: boolean | null
          signer_consent_timestamp: string | null
          signers: Json | null
          signing_method: string | null
          signing_token: string | null
          signing_token_expires_at: string | null
          signing_token_used: boolean | null
          status: string | null
          subject: string | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          auto_reminder?: boolean | null
          client_id?: string | null
          client_ref?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          docuseal_status?: string | null
          docuseal_submission_id?: string | null
          docuseal_template_id?: string | null
          expires_at?: string | null
          firm_id: string
          id?: string
          message?: string | null
          opensign_metadata?: Json | null
          original_document_hash?: string | null
          recipient_email: string
          recipient_name: string
          recipient_role?: string | null
          remind_once_in_every?: number | null
          sent_at?: string | null
          signature_image_path?: string | null
          signature_ip_address?: string | null
          signature_user_agent?: string | null
          signed_document_hash?: string | null
          signed_document_path?: string | null
          signer_consent_given?: boolean | null
          signer_consent_timestamp?: string | null
          signers?: Json | null
          signing_method?: string | null
          signing_token?: string | null
          signing_token_expires_at?: string | null
          signing_token_used?: boolean | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          auto_reminder?: boolean | null
          client_id?: string | null
          client_ref?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          docuseal_status?: string | null
          docuseal_submission_id?: string | null
          docuseal_template_id?: string | null
          expires_at?: string | null
          firm_id?: string
          id?: string
          message?: string | null
          opensign_metadata?: Json | null
          original_document_hash?: string | null
          recipient_email?: string
          recipient_name?: string
          recipient_role?: string | null
          remind_once_in_every?: number | null
          sent_at?: string | null
          signature_image_path?: string | null
          signature_ip_address?: string | null
          signature_user_agent?: string | null
          signed_document_hash?: string | null
          signed_document_path?: string | null
          signer_consent_given?: boolean | null
          signer_consent_timestamp?: string | null
          signers?: Json | null
          signing_method?: string | null
          signing_token?: string | null
          signing_token_expires_at?: string | null
          signing_token_used?: boolean | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_test_configs: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          custom_parameters: Json | null
          id: string
          name: string | null
          selected_scenarios: string[] | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_parameters?: Json | null
          id: string
          name?: string | null
          selected_scenarios?: string[] | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_parameters?: Json | null
          id?: string
          name?: string | null
          selected_scenarios?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "stress_test_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "stress_test_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "stress_test_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_test_results: {
        Row: {
          average_survival_probability: number | null
          client_id: string
          created_at: string | null
          duration_years: number | null
          error_message: string | null
          executed_by: string | null
          executive_summary: Json | null
          id: string
          iterations_count: number | null
          key_findings: string[] | null
          max_shortfall_risk: number | null
          overall_resilience_score: number | null
          processing_time_ms: number | null
          recommendations: string[] | null
          report_id: string | null
          results_json: Json
          scenario_id: string
          scenarios_selected: string[] | null
          severity_level: string | null
          status: string | null
          test_date: string | null
          test_version: string | null
          updated_at: string | null
          worst_case_scenario_id: string | null
        }
        Insert: {
          average_survival_probability?: number | null
          client_id: string
          created_at?: string | null
          duration_years?: number | null
          error_message?: string | null
          executed_by?: string | null
          executive_summary?: Json | null
          id?: string
          iterations_count?: number | null
          key_findings?: string[] | null
          max_shortfall_risk?: number | null
          overall_resilience_score?: number | null
          processing_time_ms?: number | null
          recommendations?: string[] | null
          report_id?: string | null
          results_json: Json
          scenario_id: string
          scenarios_selected?: string[] | null
          severity_level?: string | null
          status?: string | null
          test_date?: string | null
          test_version?: string | null
          updated_at?: string | null
          worst_case_scenario_id?: string | null
        }
        Update: {
          average_survival_probability?: number | null
          client_id?: string
          created_at?: string | null
          duration_years?: number | null
          error_message?: string | null
          executed_by?: string | null
          executive_summary?: Json | null
          id?: string
          iterations_count?: number | null
          key_findings?: string[] | null
          max_shortfall_risk?: number | null
          overall_resilience_score?: number | null
          processing_time_ms?: number | null
          recommendations?: string[] | null
          report_id?: string | null
          results_json?: Json
          scenario_id?: string
          scenarios_selected?: string[] | null
          severity_level?: string | null
          status?: string | null
          test_date?: string | null
          test_version?: string | null
          updated_at?: string | null
          worst_case_scenario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenario_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_test_runs: {
        Row: {
          config_id: string | null
          executed_at: string | null
          id: string
          report_id: string | null
          results: Json | null
        }
        Insert: {
          config_id?: string | null
          executed_at?: string | null
          id: string
          report_id?: string | null
          results?: Json | null
        }
        Update: {
          config_id?: string | null
          executed_at?: string | null
          id?: string
          report_id?: string | null
          results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stress_test_runs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "stress_test_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_test_scenarios_catalog: {
        Row: {
          created_at: string | null
          default_duration_years: number | null
          frequency_estimate: string | null
          historical_precedent: string | null
          is_active: boolean | null
          last_occurred_date: string | null
          last_used_date: string | null
          parameters_json: Json
          scenario_category: string
          scenario_description: string | null
          scenario_id: string
          scenario_name: string
          scenario_type: string
          severity_level: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          default_duration_years?: number | null
          frequency_estimate?: string | null
          historical_precedent?: string | null
          is_active?: boolean | null
          last_occurred_date?: string | null
          last_used_date?: string | null
          parameters_json: Json
          scenario_category: string
          scenario_description?: string | null
          scenario_id: string
          scenario_name: string
          scenario_type: string
          severity_level: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          default_duration_years?: number | null
          frequency_estimate?: string | null
          historical_precedent?: string | null
          is_active?: boolean | null
          last_occurred_date?: string | null
          last_used_date?: string | null
          parameters_json?: Json
          scenario_category?: string
          scenario_description?: string | null
          scenario_id?: string
          scenario_name?: string
          scenario_type?: string
          severity_level?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      suitability_assessments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessment_date: string | null
          assessment_reason: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          completion_percentage: number | null
          computed_metrics: Json | null
          consumer_duty_check: boolean | null
          contact_details: Json | null
          costs_charges: Json | null
          created_at: string | null
          created_by: string | null
          existing_arrangements: Json | null
          financial_situation: Json | null
          id: string
          investment_objectives: Json | null
          is_active: boolean | null
          is_current: boolean | null
          is_draft: boolean | null
          is_final: boolean | null
          knowledge_experience: Json | null
          locked_at: string | null
          locked_by: string | null
          metadata: Json | null
          next_review_date: string | null
          objectives: Json | null
          parent_assessment_id: string | null
          personal_circumstances: Json | null
          recommendations: Json | null
          regulatory: Json | null
          review_required: boolean | null
          risk_assessment: Json | null
          risk_profile: Json | null
          status: string | null
          suitability_outcome: string | null
          updated_at: string | null
          updated_by: string | null
          version_number: number | null
          vulnerability: Json | null
          vulnerability_considered: boolean | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_date?: string | null
          assessment_reason?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          completion_percentage?: number | null
          computed_metrics?: Json | null
          consumer_duty_check?: boolean | null
          contact_details?: Json | null
          costs_charges?: Json | null
          created_at?: string | null
          created_by?: string | null
          existing_arrangements?: Json | null
          financial_situation?: Json | null
          id?: string
          investment_objectives?: Json | null
          is_active?: boolean | null
          is_current?: boolean | null
          is_draft?: boolean | null
          is_final?: boolean | null
          knowledge_experience?: Json | null
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json | null
          next_review_date?: string | null
          objectives?: Json | null
          parent_assessment_id?: string | null
          personal_circumstances?: Json | null
          recommendations?: Json | null
          regulatory?: Json | null
          review_required?: boolean | null
          risk_assessment?: Json | null
          risk_profile?: Json | null
          status?: string | null
          suitability_outcome?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version_number?: number | null
          vulnerability?: Json | null
          vulnerability_considered?: boolean | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_date?: string | null
          assessment_reason?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_percentage?: number | null
          computed_metrics?: Json | null
          consumer_duty_check?: boolean | null
          contact_details?: Json | null
          costs_charges?: Json | null
          created_at?: string | null
          created_by?: string | null
          existing_arrangements?: Json | null
          financial_situation?: Json | null
          id?: string
          investment_objectives?: Json | null
          is_active?: boolean | null
          is_current?: boolean | null
          is_draft?: boolean | null
          is_final?: boolean | null
          knowledge_experience?: Json | null
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json | null
          next_review_date?: string | null
          objectives?: Json | null
          parent_assessment_id?: string | null
          personal_circumstances?: Json | null
          recommendations?: Json | null
          regulatory?: Json | null
          review_required?: boolean | null
          risk_assessment?: Json | null
          risk_profile?: Json | null
          status?: string | null
          suitability_outcome?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version_number?: number | null
          vulnerability?: Json | null
          vulnerability_considered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "suitability_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "suitability_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "suitability_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suitability_assessments_parent_assessment_id_fkey"
            columns: ["parent_assessment_id"]
            isOneToOne: false
            referencedRelation: "latest_suitability_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suitability_assessments_parent_assessment_id_fkey"
            columns: ["parent_assessment_id"]
            isOneToOne: false
            referencedRelation: "suitability_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_document_queue: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          processed_at: string | null
          status: string | null
          template_id: string | null
          trigger_event: string | null
          variables: Json | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id: string
          processed_at?: string | null
          status?: string | null
          template_id?: string | null
          trigger_event?: string | null
          variables?: Json | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          status?: string | null
          template_id?: string | null
          trigger_event?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "system_document_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "system_document_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "system_document_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_document_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_document_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          advisor_id: string | null
          assessment_id: string | null
          assigned_by: string | null
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by_workflow: boolean | null
          description: string | null
          due_date: string | null
          firm_id: string | null
          id: string
          is_recurring: boolean
          metadata: Json
          parent_task_id: string | null
          priority: string | null
          recurrence_rule: string | null
          requires_sign_off: boolean
          signed_off_at: string | null
          signed_off_by: string | null
          source_id: string | null
          source_type: string | null
          status: string | null
          task_type: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          advisor_id?: string | null
          assessment_id?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by_workflow?: boolean | null
          description?: string | null
          due_date?: string | null
          firm_id?: string | null
          id?: string
          is_recurring?: boolean
          metadata?: Json
          parent_task_id?: string | null
          priority?: string | null
          recurrence_rule?: string | null
          requires_sign_off?: boolean
          signed_off_at?: string | null
          signed_off_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          task_type?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string | null
          assessment_id?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by_workflow?: boolean | null
          description?: string | null
          due_date?: string | null
          firm_id?: string | null
          id?: string
          is_recurring?: boolean
          metadata?: Json
          parent_task_id?: string | null
          priority?: string | null
          recurrence_rule?: string | null
          requires_sign_off?: boolean
          signed_off_at?: string | null
          signed_off_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "latest_suitability_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "suitability_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      template_analytics: {
        Row: {
          avg_sign_time_hours: number | null
          created_at: string | null
          id: string
          last_used_at: string | null
          signature_count: number | null
          template_id: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          avg_sign_time_hours?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          signature_count?: number | null
          template_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          avg_sign_time_hours?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          signature_count?: number | null
          template_id?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "template_usage_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      vulnerability_register: {
        Row: {
          assessment_date: string
          assigned_to: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          firm_id: string | null
          id: string
          next_review_date: string | null
          priority: string
          review_frequency: string | null
          severity: string
          status: string | null
          support_measures: string | null
          updated_at: string | null
          vulnerability_type: string
        }
        Insert: {
          assessment_date?: string
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          firm_id?: string | null
          id?: string
          next_review_date?: string | null
          priority?: string
          review_frequency?: string | null
          severity?: string
          status?: string | null
          support_measures?: string | null
          updated_at?: string | null
          vulnerability_type: string
        }
        Update: {
          assessment_date?: string
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          firm_id?: string | null
          id?: string
          next_review_date?: string | null
          priority?: string
          review_frequency?: string | null
          severity?: string
          status?: string | null
          support_measures?: string | null
          updated_at?: string | null
          vulnerability_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vulnerability_register_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerability_register_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vulnerability_register_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "vulnerability_register_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "vulnerability_register_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerability_register_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      assessment_overview: {
        Row: {
          client_id: string | null
          client_ref: string | null
          completed_assessments: number | null
          completion_percentage: number | null
          first_name: string | null
          in_progress_assessments: number | null
          is_vulnerable: string | null
          last_assessment_date: string | null
          last_name: string | null
          next_review_date: string | null
          not_started_assessments: number | null
        }
        Relationships: []
      }
      client_document_summary: {
        Row: {
          client_id: string | null
          client_name: string | null
          client_ref: string | null
          compliance_score: number | null
          firm_id: string | null
          last_activity_date: string | null
          last_document_date: string | null
          pending_signatures: number | null
          recent_documents: number | null
          signed_documents: number | null
          total_documents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          category: string | null
          client_id: string | null
          compliance_status: string | null
          created_at: string | null
          document_id: string | null
          document_name: string | null
          document_type: string | null
          file_name: string | null
          firm_id: string | null
          id: string | null
          is_archived: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          compliance_status?: string | null
          created_at?: string | null
          document_id?: string | null
          document_name?: string | null
          document_type?: never
          file_name?: string | null
          firm_id?: string | null
          id?: never
          is_archived?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string | null
          compliance_status?: string | null
          created_at?: string | null
          document_id?: string | null
          document_name?: string | null
          document_type?: never
          file_name?: string | null
          firm_id?: string | null
          id?: never
          is_archived?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_statistics_view: {
        Row: {
          active_count: number | null
          archived_count: number | null
          inactive_count: number | null
          prospect_count: number | null
          review_due_count: number | null
          total_count: number | null
          vulnerable_count: number | null
        }
        Relationships: []
      }
      compliance_comments_with_user: {
        Row: {
          content: string | null
          created_at: string | null
          firm_id: string | null
          id: string | null
          source_id: string | null
          source_type: string | null
          updated_at: string | null
          user_avatar_url: string | null
          user_first_name: string | null
          user_id: string | null
          user_last_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_comments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      compliance_evidence_summary: {
        Row: {
          client_id: string | null
          compliant_items: number | null
          last_review_date: string | null
          next_review_due: string | null
          non_compliant_items: number | null
          overdue_reviews: number | null
          total_evidence_items: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_compliance_evidence_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_compliance_evidence_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_compliance_evidence_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      document_statistics: {
        Row: {
          avg_sign_time_hours: number | null
          expired_documents: number | null
          pending_documents: number | null
          signature_rate: number | null
          signed_documents: number | null
          total_documents: number | null
        }
        Relationships: []
      }
      latest_stress_test_results: {
        Row: {
          average_survival_probability: number | null
          client_id: string | null
          created_at: string | null
          duration_years: number | null
          error_message: string | null
          executed_by: string | null
          executive_summary: Json | null
          id: string | null
          iterations_count: number | null
          key_findings: string[] | null
          max_shortfall_risk: number | null
          overall_resilience_score: number | null
          processing_time_ms: number | null
          recommendations: string[] | null
          report_id: string | null
          results_json: Json | null
          scenario_id: string | null
          scenarios_selected: string[] | null
          severity_level: string | null
          status: string | null
          test_date: string | null
          test_version: string | null
          updated_at: string | null
          worst_case_scenario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenario_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      latest_suitability_assessments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessment_date: string | null
          assessment_reason: string | null
          client_id: string | null
          completed_at: string | null
          completed_by: string | null
          completion_percentage: number | null
          consumer_duty_check: boolean | null
          contact_details: Json | null
          costs_charges: Json | null
          created_at: string | null
          existing_arrangements: Json | null
          financial_situation: Json | null
          id: string | null
          investment_objectives: Json | null
          is_active: boolean | null
          is_current: boolean | null
          is_draft: boolean | null
          is_final: boolean | null
          knowledge_experience: Json | null
          locked_at: string | null
          locked_by: string | null
          metadata: Json | null
          next_review_date: string | null
          objectives: Json | null
          parent_assessment_id: string | null
          personal_circumstances: Json | null
          recommendations: Json | null
          regulatory: Json | null
          review_required: boolean | null
          risk_assessment: Json | null
          risk_profile: Json | null
          status: string | null
          suitability_outcome: string | null
          updated_at: string | null
          version_number: number | null
          vulnerability: Json | null
          vulnerability_considered: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "suitability_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "suitability_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "suitability_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suitability_assessments_parent_assessment_id_fkey"
            columns: ["parent_assessment_id"]
            isOneToOne: false
            referencedRelation: "latest_suitability_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suitability_assessments_parent_assessment_id_fkey"
            columns: ["parent_assessment_id"]
            isOneToOne: false
            referencedRelation: "suitability_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      monte_carlo_summary: {
        Row: {
          average_final_wealth: number | null
          average_shortfall_amount: number | null
          calculation_status: string | null
          client_id: string | null
          client_name: string | null
          client_ref: string | null
          client_status: string | null
          confidence_intervals: Json | null
          created_at: string | null
          id: string | null
          maximum_drawdown: number | null
          median_final_wealth: number | null
          scenario_id: string | null
          shortfall_risk: number | null
          simulation_count: number | null
          simulation_duration_ms: number | null
          success_probability: number | null
          wealth_volatility: number | null
          years_to_depletion_p50: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monte_carlo_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "monte_carlo_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "monte_carlo_results_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_summaries: {
        Row: {
          client_id: string | null
          created_at: string | null
          goal_count: number | null
          id: string | null
          max_projection_year: number | null
          projection_count: number | null
          scenario_name: string | null
          scenario_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          alternative_allocation: number | null
          assumption_basis: string | null
          attitudetoriskscore: number | null
          bond_allocation: number | null
          capacity_for_loss_score: number | null
          cash_allocation: number | null
          client_age: number | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          current_expenses: number | null
          current_income: number | null
          current_savings: number | null
          dependents: number | null
          discretionary_expenses: number | null
          emergency_fund_target: number | null
          equity_allocation: number | null
          essential_expenses: number | null
          firm_id: string | null
          id: string | null
          inflation_rate: number | null
          investment_value: number | null
          is_active: boolean | null
          knowledge_experience_score: number | null
          last_assumptions_review: string | null
          legacy_target: number | null
          life_expectancy: number | null
          lifestyle_expenses: number | null
          market_data_source: string | null
          mortgage_balance: number | null
          mortgage_payment: number | null
          other_debts: number | null
          other_income: number | null
          pension_contributions: number | null
          pension_pot_value: number | null
          pension_value: number | null
          projection_years: number | null
          property_value: number | null
          real_bond_return: number | null
          real_cash_return: number | null
          real_equity_return: number | null
          retirement_age: number | null
          retirement_income_desired: number | null
          retirement_income_target: number | null
          risk_score: number | null
          scenario_name: string | null
          scenario_type: string | null
          state_pension_age: number | null
          state_pension_amount: number | null
          updated_at: string | null
          vulnerability_adjustments: Json | null
        }
        Insert: {
          alternative_allocation?: number | null
          assumption_basis?: string | null
          attitudetoriskscore?: number | null
          bond_allocation?: number | null
          capacity_for_loss_score?: number | null
          cash_allocation?: number | null
          client_age?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_expenses?: number | null
          current_income?: number | null
          current_savings?: number | null
          dependents?: number | null
          discretionary_expenses?: number | null
          emergency_fund_target?: number | null
          equity_allocation?: number | null
          essential_expenses?: number | null
          firm_id?: string | null
          id?: string | null
          inflation_rate?: number | null
          investment_value?: number | null
          is_active?: boolean | null
          knowledge_experience_score?: number | null
          last_assumptions_review?: string | null
          legacy_target?: number | null
          life_expectancy?: number | null
          lifestyle_expenses?: number | null
          market_data_source?: string | null
          mortgage_balance?: number | null
          mortgage_payment?: number | null
          other_debts?: number | null
          other_income?: number | null
          pension_contributions?: number | null
          pension_pot_value?: number | null
          pension_value?: number | null
          projection_years?: number | null
          property_value?: number | null
          real_bond_return?: number | null
          real_cash_return?: number | null
          real_equity_return?: number | null
          retirement_age?: number | null
          retirement_income_desired?: number | null
          retirement_income_target?: number | null
          risk_score?: number | null
          scenario_name?: string | null
          scenario_type?: string | null
          state_pension_age?: number | null
          state_pension_amount?: number | null
          updated_at?: string | null
          vulnerability_adjustments?: Json | null
        }
        Update: {
          alternative_allocation?: number | null
          assumption_basis?: string | null
          attitudetoriskscore?: number | null
          bond_allocation?: number | null
          capacity_for_loss_score?: number | null
          cash_allocation?: number | null
          client_age?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_expenses?: number | null
          current_income?: number | null
          current_savings?: number | null
          dependents?: number | null
          discretionary_expenses?: number | null
          emergency_fund_target?: number | null
          equity_allocation?: number | null
          essential_expenses?: number | null
          firm_id?: string | null
          id?: string | null
          inflation_rate?: number | null
          investment_value?: number | null
          is_active?: boolean | null
          knowledge_experience_score?: number | null
          last_assumptions_review?: string | null
          legacy_target?: number | null
          life_expectancy?: number | null
          lifestyle_expenses?: number | null
          market_data_source?: string | null
          mortgage_balance?: number | null
          mortgage_payment?: number | null
          other_debts?: number | null
          other_income?: number | null
          pension_contributions?: number | null
          pension_pot_value?: number | null
          pension_value?: number | null
          projection_years?: number | null
          property_value?: number | null
          real_bond_return?: number | null
          real_cash_return?: number | null
          real_equity_return?: number | null
          retirement_age?: number | null
          retirement_income_desired?: number | null
          retirement_income_target?: number | null
          risk_score?: number | null
          scenario_name?: string | null
          scenario_type?: string | null
          state_pension_age?: number | null
          state_pension_amount?: number | null
          updated_at?: string | null
          vulnerability_adjustments?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cash_flow_scenarios_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_test_performance: {
        Row: {
          average_survival_probability: number | null
          client_id: string | null
          max_shortfall_risk: number | null
          overall_resilience_score: number | null
          resilience_rating: string | null
          risk_rating: string | null
          scenario_id: string | null
          test_date: string | null
        }
        Insert: {
          average_survival_probability?: number | null
          client_id?: string | null
          max_shortfall_risk?: number | null
          overall_resilience_score?: number | null
          resilience_rating?: never
          risk_rating?: never
          scenario_id?: string | null
          test_date?: string | null
        }
        Update: {
          average_survival_probability?: number | null
          client_id?: string | null
          max_shortfall_risk?: number | null
          overall_resilience_score?: number | null
          resilience_rating?: never
          risk_rating?: never
          scenario_id?: string | null
          test_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_stress_test_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenario_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stress_test_scenario"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks_with_details: {
        Row: {
          advisor_id: string | null
          assessment_id: string | null
          assigned_by: string | null
          assigned_by_first_name: string | null
          assigned_by_last_name: string | null
          assigned_to: string | null
          assigned_to_first_name: string | null
          assigned_to_last_name: string | null
          client_first_name: string | null
          client_id: string | null
          client_last_name: string | null
          client_ref: string | null
          comment_count: number | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by_workflow: boolean | null
          description: string | null
          due_date: string | null
          firm_id: string | null
          id: string | null
          is_recurring: boolean | null
          metadata: Json | null
          parent_task_id: string | null
          priority: string | null
          recurrence_rule: string | null
          requires_sign_off: boolean | null
          signed_off_at: string | null
          signed_off_by: string | null
          status: string | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "latest_suitability_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "suitability_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "assessment_overview"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_document_summary"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "user_task_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      template_usage_stats: {
        Row: {
          id: string | null
          last_used: string | null
          name: string | null
          signed_count: number | null
          success_rate: number | null
          usage_count: number | null
        }
        Relationships: []
      }
      user_task_summary: {
        Row: {
          completed_this_week: number | null
          due_this_week: number | null
          firm_id: string | null
          in_progress_count: number | null
          overdue_count: number | null
          pending_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_hashed_token: string; p_invitation_id: string }
        Returns: Json
      }
      allocate_firm_seat: {
        Args: { p_firm_id: string; p_invitation_id: string; p_user_id: string }
        Returns: Json
      }
      calculate_client_risk_score: {
        Args: { client_uuid: string }
        Returns: number
      }
      calculate_suitability_completeness: {
        Args: { assessment_id: string }
        Returns: {
          completeness_percentage: number
          missing_fields: string[]
          section_name: string
        }[]
      }
      cleanup_expired_assessment_drafts: { Args: never; Returns: number }
      cleanup_old_monte_carlo_results: { Args: never; Returns: undefined }
      cleanup_old_stress_test_results: { Args: never; Returns: number }
      create_invitation_with_seat_check: {
        Args: {
          p_email: string
          p_expires_at: string
          p_firm_id: string
          p_hashed_token: string
          p_invited_by: string
          p_role: string
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_active_scenarios: {
        Args: { p_client_id: string }
        Returns: {
          client_id: string
          id: string
          is_active: boolean
          last_review: string
          scenario_name: string
        }[]
      }
      get_assessment_metrics: {
        Args: { p_client_id: string }
        Returns: {
          completed_assessments: number
          completion_percentage: number
          days_since_last_assessment: number
          in_progress_assessments: number
          is_review_due: boolean
          total_assessments: number
        }[]
      }
      get_client_statistics: {
        Args: never
        Returns: {
          active_count: number
          archived_count: number
          inactive_count: number
          prospect_count: number
          review_due_count: number
          total_count: number
          vulnerable_count: number
        }[]
      }
      get_document_content: { Args: { doc_id: string }; Returns: string }
      get_document_metrics: {
        Args: { time_range?: string }
        Returns: {
          avg_sign_time_hours: number
          pending_documents: number
          signature_rate: number
          signed_documents: number
          total_documents: number
        }[]
      }
      get_document_statistics: {
        Args: never
        Returns: {
          documents_by_category: Json
          documents_by_status: Json
          pending_signatures: number
          recent_uploads: number
          total_documents: number
        }[]
      }
      get_document_stats_simple: {
        Args: never
        Returns: {
          recent_uploads: number
          total_categories: number
          total_documents: number
          total_templates: number
        }[]
      }
      get_firm_user_emails: {
        Args: { firm_uuid: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_my_firm_id: { Args: never; Returns: string }
      get_pending_actions_count: {
        Args: { p_client_id: string }
        Returns: number
      }
      get_suitability_assessment: {
        Args: { p_client_id: string }
        Returns: {
          client_id: string
          completion_percentage: number
          contact_details: Json
          costs_charges: Json
          created_at: string
          existing_arrangements: Json
          financial_situation: Json
          id: string
          investment_objectives: Json
          knowledge_experience: Json
          metadata: Json
          personal_circumstances: Json
          recommendations: Json
          regulatory: Json
          risk_assessment: Json
          status: string
          updated_at: string
          vulnerability: Json
        }[]
      }
      log_signature_event: {
        Args: {
          p_event_type: string
          p_ip_address?: string
          p_metadata?: Json
          p_signature_request_id: string
          p_user_agent?: string
        }
        Returns: string
      }
      migrate_legacy_clients: { Args: never; Returns: undefined }
      search_clients: {
        Args: { search_term: string }
        Returns: {
          advisor_id: string | null
          assessment_count: number | null
          assessment_summary: Json | null
          client_ref: string
          contact_info: Json
          created_at: string | null
          financial_profile: Json | null
          firm_id: string | null
          id: string
          last_assessment_date: string | null
          last_assessment_type: string | null
          next_review_date: string | null
          personal_details: Json
          risk_profile: Json | null
          status: string | null
          updated_at: string | null
          vulnerability_assessment: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_overdue_reviews: { Args: never; Returns: undefined }
      update_scenario_usage_stats: { Args: never; Returns: undefined }
      validate_signing_token: {
        Args: { p_token: string }
        Returns: {
          error_code: string
          error_message: string
          signature_request_id: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// -------------------------------------------------------------------
// Convenience type aliases used across the app codebase.
// These are safe re-exports on top of the generated `Tables*` helpers.
// -------------------------------------------------------------------

export type DbTableKey = keyof Database['public']['Tables']
export type DbViewKey = keyof Database['public']['Views']

export type DbRow<T extends DbTableKey> = Tables<T>
export type DbInsert<T extends DbTableKey> = TablesInsert<T>
export type DbUpdate<T extends DbTableKey> = TablesUpdate<T>

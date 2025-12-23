// =====================================================
// FILE: src/lib/audit/index.ts
// PURPOSE: FCA compliance audit logging for assessments
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/errors'

/**
 * Audit action types for assessment activities
 */
export type AuditAction =
  | 'assessment.created'
  | 'assessment.updated'
  | 'assessment.deleted'
  | 'assessment.viewed'
  | 'assessment.submitted'
  | 'assessment.finalized'
  | 'share.created'
  | 'share.accessed'
  | 'share.completed'
  | 'share.revoked'
  | 'client.accessed'
  | 'report.generated'
  | 'report.downloaded'

/**
 * Resource types that can be audited
 */
export type AuditResourceType =
  | 'atr_assessment'
  | 'cfl_assessment'
  | 'suitability_assessment'
  | 'investor_persona'
  | 'assessment_share'
  | 'client'
  | 'report'

/**
 * Audit log entry structure
 */
export interface AuditEntry {
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string
  userId?: string
  clientId?: string
  firmId?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, unknown>
}

/**
 * Audit logger class for FCA compliance
 */
export class AuditLogger {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Log an audit event
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('assessment_audit_log')
        .insert({
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          user_id: entry.userId,
          client_id: entry.clientId,
          firm_id: entry.firmId,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          details: entry.details
        })

      if (error) {
        // Log error but don't throw - audit logging should not break main flow
        logger.error('Failed to write audit log', error, {
          action: entry.action,
          resourceType: entry.resourceType
        })
      }
    } catch (error) {
      logger.error('Audit logging exception', error, {
        action: entry.action,
        resourceType: entry.resourceType
      })
    }
  }

  /**
   * Log assessment creation
   */
  async logAssessmentCreated(
    assessmentType: AuditResourceType,
    assessmentId: string,
    clientId: string,
    userId: string,
    firmId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action: 'assessment.created',
      resourceType: assessmentType,
      resourceId: assessmentId,
      clientId,
      userId,
      firmId,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log assessment submission
   */
  async logAssessmentSubmitted(
    assessmentType: AuditResourceType,
    assessmentId: string,
    clientId: string,
    userId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action: 'assessment.submitted',
      resourceType: assessmentType,
      resourceId: assessmentId,
      clientId,
      userId,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log share link creation
   */
  async logShareCreated(
    shareId: string,
    clientId: string,
    advisorId: string,
    assessmentType: string,
    clientEmail: string
  ): Promise<void> {
    await this.log({
      action: 'share.created',
      resourceType: 'assessment_share',
      resourceId: shareId,
      clientId,
      userId: advisorId,
      details: {
        assessmentType,
        clientEmail,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log share link access (client viewing)
   */
  async logShareAccessed(
    shareId: string,
    clientId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      action: 'share.accessed',
      resourceType: 'assessment_share',
      resourceId: shareId,
      clientId,
      ipAddress,
      userAgent,
      details: {
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log share completion (client submitted)
   */
  async logShareCompleted(
    shareId: string,
    clientId: string,
    assessmentType: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      action: 'share.completed',
      resourceType: 'assessment_share',
      resourceId: shareId,
      clientId,
      ipAddress,
      details: {
        assessmentType,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log report generation
   */
  async logReportGenerated(
    reportType: string,
    clientId: string,
    userId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action: 'report.generated',
      resourceType: 'report',
      clientId,
      userId,
      details: {
        reportType,
        ...details,
        timestamp: new Date().toISOString()
      }
    })
  }
}

/**
 * Create an audit logger instance
 */
export function createAuditLogger(supabase: SupabaseClient): AuditLogger {
  return new AuditLogger(supabase)
}

/**
 * Extract IP address from request headers
 */
export function getClientIP(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    undefined
  )
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined
}

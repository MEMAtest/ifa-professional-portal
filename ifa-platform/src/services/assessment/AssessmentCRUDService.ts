// =====================================================
// FILE: src/services/assessment/AssessmentCRUDService.ts
// PURPOSE: Shared CRUD operations for ATR/CFL assessments
// Phase 3: Extract duplicate code from ATR/CFL routes
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { logger, DatabaseError, NotFoundError, ValidationError, getErrorMessage } from '@/lib/errors'

/**
 * Supported assessment types
 */
export type AssessmentType = 'atr' | 'cfl'

/**
 * Table names for each assessment type
 */
const TABLE_NAMES: Record<AssessmentType, string> = {
  atr: 'atr_assessments',
  cfl: 'cfl_assessments'
}

/**
 * Base assessment data common to both types
 */
export interface BaseAssessmentData {
  client_id: string
  answers?: Record<string, unknown>
  total_score: number
  recommendations?: string[]
  notes?: string
  completed_by?: string | null
}

/**
 * ATR-specific assessment data
 */
export interface ATRAssessmentData extends BaseAssessmentData {
  risk_category: string
  risk_level: number
  category_scores?: Record<string, unknown>
}

/**
 * CFL-specific assessment data
 */
export interface CFLAssessmentData extends BaseAssessmentData {
  capacity_category: string
  capacity_level: number
  max_loss_percentage?: number
  confidence_level?: number
  monthly_income?: number
  monthly_expenses?: number
  emergency_fund?: number
  other_investments?: number
}

/**
 * Union type for assessment data
 */
export type AssessmentData = ATRAssessmentData | CFLAssessmentData

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Shared service for assessment CRUD operations
 * Eliminates code duplication between ATR and CFL routes
 */
export class AssessmentCRUDService {
  constructor(
    private supabase: SupabaseClient,
    private assessmentType: AssessmentType
  ) {}

  /**
   * Get the table name for this assessment type
   */
  private get tableName(): string {
    return TABLE_NAMES[this.assessmentType]
  }

  /**
   * Get the label for logging (ATR or CFL)
   */
  private get label(): string {
    return this.assessmentType.toUpperCase()
  }

  /**
   * Get the latest/current assessment for a client
   */
  async getLatestForClient(clientId: string): Promise<ServiceResult<unknown>> {
    try {
      logger.debug(`Fetching ${this.label} data for client`, { clientId })

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        logger.error(`${this.label} database fetch error`, error, { clientId })
        throw new DatabaseError(`Failed to fetch ${this.label} data`, {
          clientId,
          originalError: getErrorMessage(error)
        })
      }

      // Get total version count
      const { count: versionCount } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)

      return {
        success: true,
        data: {
          assessment: data,
          hasAssessment: !!data,
          totalVersions: versionCount || 0
        }
      }
    } catch (error) {
      logger.error(`${this.label} getLatestForClient error`, error, { clientId })
      return {
        success: false,
        error: getErrorMessage(error)
      }
    }
  }

  /**
   * Get the latest version number for a client
   */
  async getLatestVersionNumber(clientId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('version')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        logger.error(`Error fetching latest ${this.label} version`, error, { clientId })
        throw error
      }

      return data?.version || 0
    } catch (error) {
      logger.error(`${this.label} getLatestVersionNumber error`, error, { clientId })
      return 0
    }
  }

  /**
   * Mark all previous assessments as not current
   */
  private async markPreviousAsNotCurrent(clientId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        is_current: false,
        updated_at: new Date().toISOString()
      })
      .eq('client_id', clientId)
      .eq('is_current', true)

    if (error) {
      logger.warn(`Error marking previous ${this.label} assessments as not current`, { clientId, error: getErrorMessage(error) })
      // Don't throw - this shouldn't fail the main operation
    }
  }

  /**
   * Create a new assessment with proper versioning
   */
  async create(data: AssessmentData): Promise<ServiceResult<unknown>> {
    try {
      const { client_id } = data

      // Get current version and increment
      const currentMaxVersion = await this.getLatestVersionNumber(client_id)
      const newVersion = currentMaxVersion + 1

      logger.info(`Creating ${this.label} assessment version ${newVersion}`, { clientId: client_id })

      // Mark previous assessments as not current
      if (currentMaxVersion > 0) {
        await this.markPreviousAsNotCurrent(client_id)
      }

      // Create new assessment
      const insertData = {
        ...data,
        version: newVersion,
        is_current: true,
        assessment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        logger.error(`${this.label} creation error`, error, { clientId: client_id })
        throw new DatabaseError(`Failed to create ${this.label} assessment`, {
          clientId: client_id,
          originalError: getErrorMessage(error)
        })
      }

      logger.info(`${this.label} assessment created successfully`, {
        assessmentId: result.id,
        version: newVersion,
        clientId: client_id
      })

      return {
        success: true,
        data: result,
        message: `${this.label} assessment created successfully (Version ${newVersion})`
      }
    } catch (error) {
      logger.error(`${this.label} create error`, error)
      return {
        success: false,
        error: getErrorMessage(error)
      }
    }
  }

  /**
   * Update an existing assessment
   */
  async update(assessmentId: string, updateData: Partial<AssessmentData>): Promise<ServiceResult<unknown>> {
    try {
      logger.debug(`Updating ${this.label} assessment`, { assessmentId })

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId)
        .select()
        .single()

      if (error) {
        logger.error(`${this.label} update error`, error, { assessmentId })
        throw new DatabaseError(`Failed to update ${this.label} assessment`, {
          assessmentId,
          originalError: getErrorMessage(error)
        })
      }

      logger.info(`${this.label} assessment updated successfully`, { assessmentId })

      return {
        success: true,
        data,
        message: `${this.label} assessment updated successfully`
      }
    } catch (error) {
      logger.error(`${this.label} update error`, error, { assessmentId })
      return {
        success: false,
        error: getErrorMessage(error)
      }
    }
  }

  /**
   * Delete an assessment
   */
  async delete(assessmentId: string): Promise<ServiceResult<void>> {
    try {
      logger.debug(`Deleting ${this.label} assessment`, { assessmentId })

      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', assessmentId)

      if (error) {
        logger.error(`${this.label} deletion error`, error, { assessmentId })
        throw new DatabaseError(`Failed to delete ${this.label} assessment`, {
          assessmentId,
          originalError: getErrorMessage(error)
        })
      }

      logger.info(`${this.label} assessment deleted successfully`, { assessmentId })

      return {
        success: true,
        message: `${this.label} assessment deleted successfully`
      }
    } catch (error) {
      logger.error(`${this.label} delete error`, error, { assessmentId })
      return {
        success: false,
        error: getErrorMessage(error)
      }
    }
  }

  /**
   * Get the client ID for an assessment (for access control)
   */
  async getClientIdForAssessment(assessmentId: string): Promise<string | null> {
    try {
      const { data } = await this.supabase
        .from(this.tableName)
        .select('client_id')
        .eq('id', assessmentId)
        .maybeSingle()

      return data?.client_id || null
    } catch (error) {
      logger.error(`Error getting client ID for ${this.label} assessment`, error, { assessmentId })
      return null
    }
  }

  /**
   * Get assessment history for a client
   */
  async getHistory(clientId: string): Promise<ServiceResult<unknown[]>> {
    try {
      logger.debug(`Fetching ${this.label} history for client`, { clientId })

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('client_id', clientId)
        .order('version', { ascending: false })

      if (error) {
        logger.error(`${this.label} history fetch error`, error, { clientId })
        throw new DatabaseError(`Failed to fetch ${this.label} history`, {
          clientId,
          originalError: getErrorMessage(error)
        })
      }

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      logger.error(`${this.label} getHistory error`, error, { clientId })
      return {
        success: false,
        error: getErrorMessage(error),
        data: []
      }
    }
  }
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Validate score is between 0 and 100
 */
export function validateScore(score: unknown, fieldName: string): void {
  if (typeof score !== 'number' || score < 0 || score > 100) {
    throw new ValidationError(`${fieldName} must be a number between 0 and 100`, { [fieldName]: score })
  }
}

/**
 * Validate level is between 1 and 10
 */
export function validateLevel(level: unknown, fieldName: string): void {
  if (typeof level !== 'number' || level < 1 || level > 10) {
    throw new ValidationError(`${fieldName} must be a number between 1 and 10`, { [fieldName]: level })
  }
}

/**
 * Validate percentage is between 0 and 100 (if provided)
 */
export function validatePercentage(value: unknown, fieldName: string): void {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new ValidationError(`${fieldName} must be a number between 0 and 100`, { [fieldName]: value })
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Create an AssessmentCRUDService instance
 */
export function createAssessmentService(
  supabase: SupabaseClient,
  type: AssessmentType
): AssessmentCRUDService {
  return new AssessmentCRUDService(supabase, type)
}

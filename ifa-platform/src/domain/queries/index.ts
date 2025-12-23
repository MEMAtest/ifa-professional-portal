// =====================================================
// FILE: src/domain/queries/index.ts
// PURPOSE: Single source of truth for assessment queries
// Priority 1: Architectural Unification
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  ClientProfile,
  AssessmentVersion,
  SuitabilityDraft,
  AssessmentProgress
} from '../models'
import {
  toClientProfile,
  toAssessmentVersion,
  toSuitabilityDraft,
  toAssessmentProgress
} from '../converters'

// =====================================================
// CLIENT QUERIES
// =====================================================

/**
 * Get client profile by ID
 */
export async function getClientProfile(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (error || !data) return null
  return toClientProfile(data)
}

/**
 * Get clients for an advisor
 */
export async function getAdvisorClients(
  supabase: SupabaseClient,
  advisorId: string,
  options?: { status?: string; limit?: number; offset?: number }
): Promise<ClientProfile[]> {
  let query = supabase
    .from('clients')
    .select('*')
    .eq('advisor_id', advisorId)
    .order('updated_at', { ascending: false })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error || !data) return []
  return data.map(toClientProfile)
}

// =====================================================
// ASSESSMENT QUERIES - SINGLE SOURCE OF TRUTH
// =====================================================

/**
 * Get the CURRENT (latest) version of any assessment type
 * THIS IS THE CANONICAL WAY TO GET THE CURRENT ASSESSMENT
 */
export async function getCurrentAssessment(
  supabase: SupabaseClient,
  clientId: string,
  type: 'atr' | 'cfl' | 'persona'
): Promise<AssessmentVersion | null> {
  const tableName = getAssessmentTableName(type)

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .single()

  if (error || !data) {
    // Fallback: get the most recent by created_at
    const { data: fallbackData } = await supabase
      .from(tableName)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!fallbackData) return null
    return toAssessmentVersion(fallbackData, type)
  }

  return toAssessmentVersion(data, type)
}

/**
 * Get a specific version of an assessment by ID
 */
export async function getAssessmentById(
  supabase: SupabaseClient,
  assessmentId: string,
  type: 'atr' | 'cfl' | 'persona'
): Promise<AssessmentVersion | null> {
  const tableName = getAssessmentTableName(type)

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', assessmentId)
    .single()

  if (error || !data) return null
  return toAssessmentVersion(data, type)
}

/**
 * Get assessment version history for a client
 */
export async function getAssessmentHistory(
  supabase: SupabaseClient,
  clientId: string,
  type: 'atr' | 'cfl' | 'persona',
  limit = 10
): Promise<AssessmentVersion[]> {
  const tableName = getAssessmentTableName(type)

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(row => toAssessmentVersion(row, type))
}

/**
 * Get all current assessments for a client
 */
export async function getAllCurrentAssessments(
  supabase: SupabaseClient,
  clientId: string
): Promise<{
  atr: AssessmentVersion | null
  cfl: AssessmentVersion | null
  persona: AssessmentVersion | null
}> {
  const [atr, cfl, persona] = await Promise.all([
    getCurrentAssessment(supabase, clientId, 'atr'),
    getCurrentAssessment(supabase, clientId, 'cfl'),
    getCurrentAssessment(supabase, clientId, 'persona')
  ])

  return { atr, cfl, persona }
}

// =====================================================
// SUITABILITY QUERIES
// =====================================================

/**
 * Get current suitability draft for a client
 */
export async function getCurrentSuitabilityDraft(
  supabase: SupabaseClient,
  clientId: string
): Promise<SuitabilityDraft | null> {
  const { data, error } = await supabase
    .from('suitability_assessments')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_current', true)
    .single()

  if (error || !data) {
    // Fallback: get most recent
    const { data: fallbackData } = await supabase
      .from('suitability_assessments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!fallbackData) return null
    return toSuitabilityDraft(fallbackData)
  }

  return toSuitabilityDraft(data)
}

/**
 * Get suitability by ID (for snapshot references)
 */
export async function getSuitabilityById(
  supabase: SupabaseClient,
  suitabilityId: string
): Promise<SuitabilityDraft | null> {
  const { data, error } = await supabase
    .from('suitability_assessments')
    .select('*')
    .eq('id', suitabilityId)
    .single()

  if (error || !data) return null
  return toSuitabilityDraft(data)
}

/**
 * Get suitability version history
 */
export async function getSuitabilityHistory(
  supabase: SupabaseClient,
  clientId: string,
  limit = 10
): Promise<SuitabilityDraft[]> {
  const { data, error } = await supabase
    .from('suitability_assessments')
    .select('*')
    .eq('client_id', clientId)
    .order('version_number', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(toSuitabilityDraft)
}

// =====================================================
// PROGRESS QUERIES
// =====================================================

/**
 * Get assessment progress for a client
 */
export async function getAssessmentProgress(
  supabase: SupabaseClient,
  clientId: string
): Promise<AssessmentProgress[]> {
  const { data, error } = await supabase
    .from('assessment_progress')
    .select('*')
    .eq('client_id', clientId)

  if (error || !data) return []
  return data.map(toAssessmentProgress)
}

/**
 * Get progress for a specific assessment type
 */
export async function getProgressByType(
  supabase: SupabaseClient,
  clientId: string,
  type: 'atr' | 'cfl' | 'persona' | 'suitability'
): Promise<AssessmentProgress | null> {
  const { data, error } = await supabase
    .from('assessment_progress')
    .select('*')
    .eq('client_id', clientId)
    .eq('assessment_type', type)
    .single()

  if (error || !data) return null
  return toAssessmentProgress(data)
}

/**
 * Upsert assessment progress
 */
export async function upsertProgress(
  supabase: SupabaseClient,
  progress: Partial<AssessmentProgress> & { clientId: string; assessmentType: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('assessment_progress')
    .upsert({
      client_id: progress.clientId,
      assessment_type: progress.assessmentType,
      status: progress.status || 'not_started',
      completion_percentage: progress.completionPercentage || 0,
      current_version: progress.currentVersion,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'client_id,assessment_type'
    })

  return !error
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getAssessmentTableName(type: 'atr' | 'cfl' | 'persona'): string {
  const tables: Record<string, string> = {
    atr: 'atr_assessments',
    cfl: 'cfl_assessments',
    persona: 'investor_persona_assessments'
  }
  return tables[type]
}

/**
 * Calculate overall completion percentage across all assessments
 */
export function calculateOverallProgress(progress: AssessmentProgress[]): number {
  if (progress.length === 0) return 0

  const total = progress.reduce((sum, p) => sum + p.completionPercentage, 0)
  return Math.round(total / progress.length)
}

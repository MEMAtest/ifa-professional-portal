// app/api/compliance/consumer-duty/assess/route.ts
// ================================================================
// CONSUMER DUTY ASSESSMENT API
// Save and retrieve Consumer Duty assessments with audit trail
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logging/structured'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

// Types
interface AssessmentAnswers {
  [outcomeId: string]: {
    [questionId: string]: {
      value: string | string[]
      notes?: string
      evidenceRef?: string
    }
  }
}

interface AssessmentScores {
  [outcomeId: string]: {
    score: number
    maxScore: number
    status: 'compliant' | 'partially_compliant' | 'non_compliant'
  }
}

// POST - Save/Submit Consumer Duty Assessment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
      firmId,
      assessorId,
      answers,
      scores,
      overallScore,
      overallStatus,
      isDraft = false
    } = body

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Try to get version from consumer_duty_assessments, fall back to 1 if table doesn't exist
    let nextVersion = 1
    try {
      const { data: existingAssessments, error: versionError } = await supabase
        .from('consumer_duty_assessments')
        .select('version')
        .eq('client_id', clientId)
        .order('version', { ascending: false })
        .limit(1)

      if (!versionError && existingAssessments?.[0]?.version) {
        nextVersion = existingAssessments[0].version + 1
      }
    } catch (e) {
      // Table might not exist, use version 1
      log.debug('consumer_duty_assessments table may not exist, using version 1')
    }

    // Prepare outcome statuses and scores
    const outcomeStatuses = scores ? {
      products_services_score: scores.products_services?.score || 0,
      products_services_status: scores.products_services?.status || 'not_assessed',
      price_value_score: scores.price_value?.score || 0,
      price_value_status: scores.price_value?.status || 'not_assessed',
      consumer_understanding_score: scores.consumer_understanding?.score || 0,
      consumer_understanding_status: scores.consumer_understanding?.status || 'not_assessed',
      consumer_support_score: scores.consumer_support?.score || 0,
      consumer_support_status: scores.consumer_support?.status || 'not_assessed'
    } : {}

    // Create assessment record
    const assessmentRecord = {
      client_id: clientId,
      firm_id: firmId || null,
      ...outcomeStatuses,
      answers: answers || {},
      overall_score: overallScore || 0,
      overall_status: overallStatus || 'not_assessed',
      status: isDraft ? 'draft' : 'submitted',
      assessed_by: assessorId || null,
      assessed_at: isDraft ? null : now,
      version: nextVersion,
      created_at: now,
      updated_at: now
    }

    // Always try to save to consumer_duty_status (reliable fallback)
    const statusRecord = {
      client_id: clientId,
      firm_id: firmId || null,
      products_services_status: scores?.products_services?.status || 'not_assessed',
      price_value_status: scores?.price_value?.status || 'not_assessed',
      consumer_understanding_status: scores?.consumer_understanding?.status || 'not_assessed',
      consumer_support_status: scores?.consumer_support?.status || 'not_assessed',
      overall_status: overallStatus || 'not_assessed',
      last_assessment_date: isDraft ? null : now,
      assessed_by: assessorId || null,
      assessment_data: {
        answers,
        scores,
        overallScore,
        version: nextVersion
      },
      updated_at: now
    }

    // Try to get existing status record
    const { data: existingStatus, error: statusQueryError } = await supabase
      .from('consumer_duty_status')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle()

    if (statusQueryError && statusQueryError.code !== 'PGRST116') {
      log.error('Error checking existing status:', statusQueryError)
    }

    // Upsert to consumer_duty_status
    if (existingStatus?.id) {
      const { error: updateError } = await supabase
        .from('consumer_duty_status')
        .update(statusRecord)
        .eq('id', existingStatus.id)

      if (updateError) {
        log.error('Error updating consumer_duty_status:', updateError)
        throw updateError
      }
    } else {
      const { error: insertError } = await supabase
        .from('consumer_duty_status')
        .insert({
          ...statusRecord,
          created_at: now
        })

      if (insertError) {
        log.error('Error inserting consumer_duty_status:', insertError)
        throw insertError
      }
    }

    // Now try to also save to consumer_duty_assessments (if table exists)
    let assessmentId = null
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('consumer_duty_assessments')
        .select('id')
        .limit(1)

      if (!tableError) {
        // Table exists, insert the full assessment record
        const { data: newAssessment, error: insertError } = await supabase
          .from('consumer_duty_assessments')
          .insert(assessmentRecord)
          .select('id')
          .single()

        if (!insertError && newAssessment) {
          assessmentId = newAssessment.id
        }
      }
    } catch (e) {
      // Table doesn't exist, that's fine - we already saved to consumer_duty_status
      log.debug('consumer_duty_assessments table not available')
    }

    return NextResponse.json({
      success: true,
      message: isDraft ? 'Draft saved' : 'Assessment submitted',
      assessmentId,
      version: nextVersion,
      savedAt: now
    })
  } catch (error) {
    log.error('Error saving Consumer Duty assessment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save assessment' },
      { status: 500 }
    )
  }
}

// GET - Retrieve Consumer Duty Assessment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const assessmentId = searchParams.get('assessmentId')
    const includeDrafts = searchParams.get('includeDrafts') === 'true'

    if (!clientId && !assessmentId) {
      return NextResponse.json(
        { success: false, error: 'Either clientId or assessmentId is required' },
        { status: 400 }
      )
    }

    // Try consumer_duty_assessments first
    let query = supabase.from('consumer_duty_assessments').select('*')

    if (assessmentId) {
      query = query.eq('id', assessmentId)
    } else if (clientId) {
      query = query.eq('client_id', clientId)
      if (!includeDrafts) {
        query = query.neq('status', 'draft')
      }
      query = query.order('version', { ascending: false }).limit(1)
    }

    const { data: assessment, error } = await query.maybeSingle()

    // If no assessment found or table doesn't exist, check consumer_duty_status
    if (!assessment || error) {
      const { data: status, error: statusError } = await supabase
        .from('consumer_duty_status')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle()

      if (statusError && statusError.code !== 'PGRST116') {
        throw statusError
      }

      if (!status) {
        return NextResponse.json({
          success: true,
          assessment: null,
          message: 'No assessment found for this client'
        })
      }

      // Convert consumer_duty_status to assessment format
      return NextResponse.json({
        success: true,
        assessment: {
          id: status.id,
          clientId: status.client_id,
          firmId: status.firm_id,
          answers: status.assessment_data?.answers || {},
          scores: status.assessment_data?.scores || null,
          overallScore: status.assessment_data?.overallScore || null,
          overallStatus: status.overall_status,
          outcomeStatuses: {
            products_services: status.products_services_status,
            price_value: status.price_value_status,
            consumer_understanding: status.consumer_understanding_status,
            consumer_support: status.consumer_support_status
          },
          version: status.assessment_data?.version || 1,
          status: 'submitted',
          assessedAt: status.last_assessment_date,
          assessedBy: status.assessed_by,
          createdAt: status.created_at,
          updatedAt: status.updated_at
        },
        source: 'consumer_duty_status'
      })
    }

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        clientId: assessment.client_id,
        firmId: assessment.firm_id,
        answers: assessment.answers,
        scores: {
          products_services: {
            score: assessment.products_services_score,
            status: assessment.products_services_status
          },
          price_value: {
            score: assessment.price_value_score,
            status: assessment.price_value_status
          },
          consumer_understanding: {
            score: assessment.consumer_understanding_score,
            status: assessment.consumer_understanding_status
          },
          consumer_support: {
            score: assessment.consumer_support_score,
            status: assessment.consumer_support_status
          }
        },
        overallScore: assessment.overall_score,
        overallStatus: assessment.overall_status,
        version: assessment.version,
        status: assessment.status,
        assessedAt: assessment.assessed_at,
        assessedBy: assessment.assessed_by,
        approvedAt: assessment.approved_at,
        approvedBy: assessment.approved_by,
        createdAt: assessment.created_at,
        updatedAt: assessment.updated_at
      },
      source: 'consumer_duty_assessments'
    })
  } catch (error) {
    log.error('Error fetching Consumer Duty assessment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assessment' },
      { status: 500 }
    )
  }
}

// Helper function - not exported as Route handler
// Can be used by importing from a separate utility file if needed
async function getAssessmentHistory(clientId: string) {
  const { data, error } = await supabase
    .from('consumer_duty_assessments')
    .select('id, version, overall_score, overall_status, status, assessed_at, assessed_by, created_at')
    .eq('client_id', clientId)
    .order('version', { ascending: false })

  if (error) throw error
  return data
}

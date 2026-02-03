// src/app/api/clients/[id]/assessments/route.ts
// API for fetching and managing client assessment shares

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createRequestLogger } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, getValidatedFirmId } from '@/lib/auth/apiAuth'
import { parseRequestBody } from '@/app/api/utils'

interface AssessmentShare {
  id: string
  token: string
  assessment_type: 'atr' | 'cfl' | 'investor_persona'
  status: 'pending' | 'viewed' | 'started' | 'completed' | 'expired' | 'revoked'
  created_at: string
  expires_at: string
  completed_at: string | null
  client_email: string
  custom_message: string | null
}

interface CompletedAssessment {
  completed: boolean
  date?: string
  score?: number
  rating?: string
  type?: string
}

interface AssessmentsResponse {
  shares: AssessmentShare[]
  completedAssessments: {
    atr: CompletedAssessment
    cfl: CompletedAssessment
    investorPersona: CompletedAssessment
  }
}

/**
 * GET /api/clients/[id]/assessments
 * Get all assessment shares and completion status for a client
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmId = getValidatedFirmId(auth.context)
    if (!firmId) {
      return NextResponse.json({ error: 'Firm ID required' }, { status: 403 })
    }

    const supabase: any = getSupabaseServiceClient()

    const clientId = context?.params?.id

    if (!clientId || clientId === 'undefined') {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('firm_id', firmId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    logger.debug('Fetching assessments for client', { clientId })

    // Fetch all assessment shares for this client
    const { data: shares, error: sharesError } = await supabase
      .from('assessment_shares')
      .select('id, token, assessment_type, status, created_at, expires_at, completed_at, client_email, custom_message')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (sharesError) {
      logger.error('Error fetching assessment shares', sharesError)
      return NextResponse.json({ error: 'Failed to fetch assessment shares' }, { status: 500 })
    }

    // Update expired shares
    const now = new Date()
    const updatedShares = (shares || []).map((share: AssessmentShare) => {
      if (share.status !== 'completed' && share.status !== 'revoked' && new Date(share.expires_at) < now) {
        return { ...share, status: 'expired' as const }
      }
      return share
    })

    // Fetch completed assessments from each table
    // Note: Column names vary by table - atr uses total_score/risk_category,
    // cfl may use capacity_score/capacity_rating, etc.
    const [atrResult, cflResult, personaResult] = await Promise.all([
      supabase
        .from('atr_assessments')
        .select('created_at, total_score, risk_category, is_current')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('cfl_assessments')
        .select('created_at, total_score, capacity_rating, is_current')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('investor_persona_assessments')
        .select('created_at, persona_type, is_current')
        .eq('client_id', clientId)
        .eq('is_current', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])

    const response: AssessmentsResponse = {
      shares: updatedShares,
      completedAssessments: {
        atr: {
          completed: !!atrResult.data,
          date: atrResult.data?.created_at,
          score: atrResult.data?.total_score,
          rating: atrResult.data?.risk_category
        },
        cfl: {
          completed: !!cflResult.data,
          date: cflResult.data?.created_at,
          score: cflResult.data?.total_score,
          rating: cflResult.data?.capacity_rating
        },
        investorPersona: {
          completed: !!personaResult.data,
          date: personaResult.data?.created_at,
          type: personaResult.data?.persona_type
        }
      }
    }

    logger.info('Assessments fetched successfully', {
      clientId,
      sharesCount: updatedShares.length,
      atrCompleted: response.completedAssessments.atr.completed,
      cflCompleted: response.completedAssessments.cfl.completed,
      personaCompleted: response.completedAssessments.investorPersona.completed
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error in GET /api/clients/[id]/assessments', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/clients/[id]/assessments
 * Revoke an assessment share
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const logger = createRequestLogger(request)

  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const firmId = getValidatedFirmId(auth.context)
    if (!firmId) {
      return NextResponse.json({ error: 'Firm ID required' }, { status: 403 })
    }

    const supabase: any = getSupabaseServiceClient()

    const clientId = context?.params?.id
    const body = await parseRequestBody(request)
    const { shareId, action } = body

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 })
    }

    if (action === 'revoke') {
      const { error } = await supabase
        .from('assessment_shares')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString()
        })
        .eq('id', shareId)
        .eq('client_id', clientId)
        .eq('firm_id', firmId)

      if (error) {
        logger.error('Error revoking assessment share', error)
        return NextResponse.json({ error: 'Failed to revoke assessment' }, { status: 500 })
      }

      logger.info('Assessment share revoked', { shareId, clientId })
      return NextResponse.json({ success: true, message: 'Assessment revoked' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    logger.error('Error in PATCH /api/clients/[id]/assessments', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

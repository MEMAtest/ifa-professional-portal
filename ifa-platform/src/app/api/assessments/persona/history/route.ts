// =====================================================
// FILE: src/app/api/assessments/persona/history/route.ts
// Fetch all Persona assessment versions for a client
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

import { getAuthContext } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'
import { isUUID } from '@/lib/utils'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required', success: false }, { status: 400 })
    }

    if (!isUUID(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format', success: false }, { status: 400 })
    }

    const auth = await getAuthContext(request)
    if (!auth.success) {
      return auth.response || NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }

    const ctx = auth.context!
    const supabase = getSupabaseServiceClient()

    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx,
      select: 'id,firm_id,advisor_id'
    })
    if (!access.ok) return access.response

    const { data: assessments, error } = await supabase
      .from('persona_assessments')
      .select(
        'id,client_id,persona_level,persona_type,scores,confidence,answers,motivations,fears,psychological_profile,communication_needs,consumer_duty_alignment,notes,assessment_date,version,is_current,completed_by,created_at,updated_at'
      )
      .eq('client_id', clientId)
      .order('version', { ascending: false })
      .order('assessment_date', { ascending: false })

    if (error) {
      log.error('Error fetching Persona history', error)
      return NextResponse.json({ error: 'Failed to fetch Persona history', success: false }, { status: 500 })
    }

    const versions: any[] = assessments || []
    const current = versions.find((a: any) => a.is_current) || versions[0] || null

    const averageConfidence = versions.length
      ? versions.reduce((sum: number, a: any) => sum + (typeof a.confidence === 'number' ? a.confidence : 0), 0) / versions.length
      : 0

    const stats = {
      totalAssessments: versions.length,
      latestVersion: current?.version || 0,
      averageConfidence,
      personaProgression: versions.map((a: any) => ({
        version: a.version || 1,
        type: a.persona_type,
        level: a.persona_level,
        confidence: a.confidence,
        date: a.assessment_date
      }))
    }

    const personaDistribution = versions.reduce((acc: Record<string, number>, assessment: any) => {
      const type = assessment.persona_type || 'Unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const personaChanges: Array<{
      fromVersion: number
      toVersion: number
      fromType: string
      toType: string
      date: string
    }> = []

    for (let i = 0; i < versions.length - 1; i++) {
      const currentVersion = versions[i]
      const previousVersion = versions[i + 1]
      if (currentVersion?.persona_type !== previousVersion?.persona_type) {
        personaChanges.push({
          fromVersion: previousVersion?.version || 1,
          toVersion: currentVersion?.version || 1,
          fromType: previousVersion?.persona_type || 'Unknown',
          toType: currentVersion?.persona_type || 'Unknown',
          date: currentVersion?.assessment_date || currentVersion?.created_at || ''
        })
      }
    }

    return NextResponse.json({
      success: true,
      current,
      versions,
      stats,
      personaDistribution,
      personaChanges,
      clientId
    })
  } catch (error) {
    log.error('Persona history route error', error)
    return NextResponse.json(
      { error: 'Internal server error', message: '', success: false },
      { status: 500 }
    )
  }
}

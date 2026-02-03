// src/app/api/assessments/atr/history/route.ts
// Fetches all ATR assessment versions for a client

import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId } from '@/lib/auth/apiAuth'
import { requireClientAccess } from '@/lib/auth/requireClientAccess'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID format' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()
    const access = await requireClientAccess({
      supabase,
      clientId,
      ctx: auth.context,
      select: 'id, firm_id, advisor_id'
    })
    if (!access.ok) {
      return access.response
    }

    log.info('Fetching all ATR assessments for client', { clientId })

    // Fetch ALL ATR assessments for this client (not just current)
    const { data, error } = await supabase
      .from('atr_assessments')
      .select(`
        id,
        client_id,
        risk_level,
        risk_category,
        total_score,
        category_scores,
        recommendations,
        answers,
        notes,
        assessment_date,
        version,
        is_current,
        completed_by,
        created_at,
        updated_at
      `)
      .eq('client_id', clientId)
      .order('version', { ascending: false }) // Latest version first
      .order('assessment_date', { ascending: false }) // Then by date

    const assessments: any[] = data || []

    if (error) {
      log.error('Error fetching ATR history', error)
      return NextResponse.json(
        { error: 'Failed to fetch ATR history' },
        { status: 500 }
      )
    }

    // Get the current assessment
    const currentAssessment = assessments.find((a: any) => a.is_current) || assessments[0]

    // Calculate statistics
    const stats = {
      totalAssessments: assessments.length,
      latestVersion: currentAssessment?.version || 0,
      averageScore: assessments.length
        ? assessments.reduce((sum: number, a: any) => sum + (a.total_score || 0), 0) / assessments.length
        : 0,
      averageRiskLevel: assessments.length
        ? assessments.reduce((sum: number, a: any) => sum + (a.risk_level || 0), 0) / assessments.length
        : 0,
      scoreProgression: assessments.map((a: any) => ({
        version: a.version || 1,
        score: a.total_score,
        riskLevel: a.risk_level,
        date: a.assessment_date
      })),
      categoryScoreProgression: assessments.map((a: any) => ({
        version: a.version || 1,
        attitude: a.category_scores?.attitude || 0,
        experience: a.category_scores?.experience || 0,
        knowledge: a.category_scores?.knowledge || 0,
        emotional: a.category_scores?.emotional || 0,
        date: a.assessment_date
      }))
    }

    // Group by risk category to show distribution over time
    const riskDistribution = assessments.reduce((acc: Record<string, number>, assessment: any) => {
      const category = assessment.risk_category || 'Unknown'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Track risk changes over versions
    const riskChanges: Array<{
      fromVersion: number;
      toVersion: number;
      fromCategory: string;
      toCategory: string;
      riskLevelChange: number;
      scoreChange: number;
      date: string;
    }> = []

    for (let i = 0; i < assessments.length - 1; i++) {
      const current = assessments[i]
      const previous = assessments[i + 1]
      
      if (current.risk_category !== previous.risk_category || 
          current.risk_level !== previous.risk_level) {
        riskChanges.push({
          fromVersion: previous.version || 1,
          toVersion: current.version || 2,
          fromCategory: previous.risk_category,
          toCategory: current.risk_category,
          riskLevelChange: current.risk_level - previous.risk_level,
          scoreChange: (current.total_score || 0) - (previous.total_score || 0),
          date: current.assessment_date
        })
      }
    }

    // Category score trends
    const categoryTrends = {
      attitude: { trend: 'stable', change: 0 },
      experience: { trend: 'stable', change: 0 },
      knowledge: { trend: 'stable', change: 0 },
      emotional: { trend: 'stable', change: 0 }
    }

    if (assessments.length > 1) {
      const latest = assessments[0]
      const oldest = assessments[assessments.length - 1]

      const categories = ['attitude', 'experience', 'knowledge', 'emotional'] as const

      categories.forEach(cat => {
        const latestScore = latest.category_scores?.[cat] || 0
        const oldestScore = oldest.category_scores?.[cat] || 0
        const change = latestScore - oldestScore
        
        categoryTrends[cat] = {
          trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
          change: change
        }
      })
    }

    // Find most consistent and most volatile categories
    const categoryVolatility: Record<string, number> = {
      attitude: 0,
      experience: 0,
      knowledge: 0,
      emotional: 0
    }

    if (assessments.length > 2) {
      const categories = ['attitude', 'experience', 'knowledge', 'emotional'] as const

      categories.forEach(cat => {
        const scores = assessments.map((a: any) => a.category_scores?.[cat] || 0)
        const mean = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
        const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - mean, 2), 0) / scores.length
        categoryVolatility[cat] = Math.sqrt(variance) // Standard deviation
      })
    }

    const mostConsistent = Object.entries(categoryVolatility)
      .sort((a, b) => a[1] - b[1])[0]?.[0] || 'unknown'
    
    const mostVolatile = Object.entries(categoryVolatility)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'

    return NextResponse.json({
      success: true,
      current: currentAssessment,
      versions: assessments,
      stats,
      riskDistribution,
      riskChanges,
      categoryTrends,
      insights: {
        mostConsistentCategory: mostConsistent,
        mostVolatileCategory: mostVolatile,
        categoryVolatility,
        overallTrend: assessments.length > 1
          ? (assessments[0].risk_level > assessments[assessments.length - 1].risk_level ? 'increasing' :
             assessments[0].risk_level < assessments[assessments.length - 1].risk_level ? 'decreasing' : 'stable')
          : 'insufficient_data'
      },
      clientId
    })

  } catch (error) {
    log.error('ATR history route error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

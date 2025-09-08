// =====================================================
// FILE: src/app/api/assessments/persona/history/route.ts
// Fetches all Persona assessment versions for a client
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
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

    console.log('Fetching all Persona assessments for client:', clientId)

    // Fetch ALL persona assessments for this client (not just current)
    const { data: assessments, error } = await supabase
      .from('persona_assessments')
      .select(`
        id,
        client_id,
        persona_level,
        persona_type,
        scores,
        confidence,
        answers,
        motivations,
        fears,
        psychological_profile,
        communication_needs,
        consumer_duty_alignment,
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

    if (error) {
      console.error('Error fetching Persona history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch Persona history', message: error.message },
        { status: 500 }
      )
    }

    // Get the current assessment
    const currentAssessment = assessments?.find(a => a.is_current) || assessments?.[0]
    
    // Calculate statistics
    const stats = {
      totalAssessments: assessments?.length || 0,
      latestVersion: currentAssessment?.version || 0,
      averageConfidence: assessments?.length 
        ? assessments.reduce((sum, a) => sum + (a.confidence || 0), 0) / assessments.length
        : 0,
      personaProgression: assessments?.map(a => ({
        version: a.version || 1,
        type: a.persona_type,
        level: a.persona_level,
        confidence: a.confidence,
        date: a.assessment_date
      })) || []
    }

    // Group by persona type to show distribution over time
    const personaDistribution = assessments?.reduce((acc, assessment) => {
      const type = assessment.persona_type || 'Unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Track persona changes
    const personaChanges: Array<{
  fromVersion: number;
  toVersion: number;
  fromType: string;
  toType: string;
  date: string;
}> = [];
    for (let i = 0; i < assessments.length - 1; i++) {
      const current = assessments[i];
      const previous = assessments[i + 1];
      if (current.persona_type !== previous.persona_type) {
        personaChanges.push({
          fromVersion: previous.version,
          toVersion: current.version,
          fromType: previous.persona_type,
          toType: current.persona_type,
          date: current.assessment_date
        });
      }
    }

    return NextResponse.json({
      success: true,
      current: currentAssessment,
      versions: assessments || [],
      stats,
      personaDistribution,
      personaChanges,
      clientId
    })

  } catch (error) {
    console.error('Persona history route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
// src/app/api/assessments/cfl/history/route.ts
// Fetches all CFL assessment versions for a client

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logging/structured'

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

    log.info('Fetching all CFL assessments for client', { clientId })

    // Fetch ALL CFL assessments for this client (not just current)
    const { data: assessments, error } = await supabase
      .from('cfl_assessments')
      .select(`
        id,
        client_id,
        capacity_level,
        capacity_category,
        total_score,
        max_loss_percentage,
        confidence_level,
        monthly_income,
        monthly_expenses,
        emergency_fund,
        other_investments,
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

    if (error) {
      log.error('Error fetching CFL history', error)
      return NextResponse.json(
        { error: 'Failed to fetch CFL history', message: error.message },
        { status: 500 }
      )
    }

    // Get the current assessment
    const currentAssessment = assessments?.find(a => a.is_current) || assessments?.[0]
    
    // Calculate statistics
    const stats = {
      totalAssessments: assessments?.length || 0,
      latestVersion: currentAssessment?.version || 0,
      averageCapacity: assessments?.length 
        ? assessments.reduce((sum, a) => sum + (a.capacity_level || 0), 0) / assessments.length
        : 0,
      averageMaxLoss: assessments?.length
        ? assessments.reduce((sum, a) => sum + (a.max_loss_percentage || 0), 0) / assessments.length
        : 0,
      capacityProgression: assessments?.map(a => ({
        version: a.version || 1,
        capacity: a.capacity_level,
        maxLoss: a.max_loss_percentage,
        date: a.assessment_date
      })) || [],
      incomeProgression: assessments?.map(a => ({
        version: a.version || 1,
        income: a.monthly_income || 0,
        expenses: a.monthly_expenses || 0,
        surplus: (a.monthly_income || 0) - (a.monthly_expenses || 0),
        date: a.assessment_date
      })) || []
    }

    // Group by capacity category to show distribution
    const capacityDistribution = assessments?.reduce((acc, assessment) => {
      const category = assessment.capacity_category || 'Unknown'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Track capacity changes over versions
    const capacityChanges: Array<{
      fromVersion: number;
      toVersion: number;
      fromCategory: string;
      toCategory: string;
      capacityChange: number;
      date: string;
    }> = []
    
    for (let i = 0; i < (assessments?.length || 0) - 1; i++) {
      const current = assessments![i]
      const previous = assessments![i + 1]
      
      if (current.capacity_category !== previous.capacity_category || 
          current.capacity_level !== previous.capacity_level) {
        capacityChanges.push({
          fromVersion: previous.version || 1,
          toVersion: current.version || 2,
          fromCategory: previous.capacity_category,
          toCategory: current.capacity_category,
          capacityChange: current.capacity_level - previous.capacity_level,
          date: current.assessment_date
        })
      }
    }

    // Financial trends
    const financialTrends = {
      incomeChange: null as number | null,
      expenseChange: null as number | null,
      emergencyFundChange: null as number | null,
    }

    if (assessments && assessments.length > 1) {
      const latest = assessments[0]
      const oldest = assessments[assessments.length - 1]
      
      if (latest.monthly_income && oldest.monthly_income) {
        financialTrends.incomeChange = ((latest.monthly_income - oldest.monthly_income) / oldest.monthly_income) * 100
      }
      
      if (latest.monthly_expenses && oldest.monthly_expenses) {
        financialTrends.expenseChange = ((latest.monthly_expenses - oldest.monthly_expenses) / oldest.monthly_expenses) * 100
      }
      
      if (latest.emergency_fund && oldest.emergency_fund) {
        financialTrends.emergencyFundChange = ((latest.emergency_fund - oldest.emergency_fund) / oldest.emergency_fund) * 100
      }
    }

    return NextResponse.json({
      success: true,
      current: currentAssessment,
      versions: assessments || [],
      stats,
      capacityDistribution,
      capacityChanges,
      financialTrends,
      clientId
    })

  } catch (error) {
    log.error('CFL history route error', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
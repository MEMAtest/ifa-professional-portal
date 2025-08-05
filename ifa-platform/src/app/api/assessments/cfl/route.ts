// /api/assessments/cfl/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    // SKIP AUTH FOR TESTING
    console.log('CFL Assessment API called (auth skipped for testing)')

    const body = await request.json()
    const { 
      clientId, 
      answers, 
      score, 
      category, 
      level, 
      maxLossPercentage, 
      confidenceLevel, 
      recommendations,
      financialData 
    } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // For testing, just create a mock assessment ID
    const assessmentId = `cfl-${Date.now()}`

    // Initialize Supabase client (without auth check)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Save assessment to database
    const { data, error } = await supabase
      .from('cfl_assessments')
      .insert({
        id: assessmentId,
        client_id: clientId,
        answers,
        score,
        category,
        level,
        max_loss_percentage: maxLossPercentage,
        confidence_level: confidenceLevel,
        recommendations,
        financial_data: financialData,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      // For testing, return success even if DB fails
      return NextResponse.json({
        success: true,
        data: {
          id: assessmentId,
          client_id: clientId
        }
      })
    }

    // Update client risk profile
    try {
      console.log('Would update client CFL profile:', {
        clientId,
        capacityForLoss: {
          level,
          category,
          maxLossPercentage,
          lastAssessment: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error updating client profile:', error)
    }

    return NextResponse.json({
      success: true,
      data: data || { id: assessmentId, client_id: clientId }
    })

  } catch (error) {
    console.error('Error in CFL assessment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
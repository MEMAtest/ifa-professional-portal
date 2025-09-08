// =====================================================
// FILE: src/app/api/assessments/cfl/route.ts
// COMPLETE VERSION - WITH PROPER VERSION INCREMENTING
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper function to get user context
async function getCurrentUserContext() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('No authenticated user found, using development fallback')
      return {
        user: null,
        firmId: '12345678-1234-1234-1234-123456789012',
        userId: null
      }
    }

    const firmId = user.user_metadata?.firm_id || 
                   user.user_metadata?.firmId || 
                   '12345678-1234-1234-1234-123456789012'

    return { user, firmId, userId: user.id }
  } catch (error) {
    console.error('getCurrentUserContext error:', error)
    return {
      user: null,
      firmId: '12345678-1234-1234-1234-123456789012',
      userId: null
    }
  }
}

// GET method to fetch CFL scores for a client
export async function GET(request: NextRequest) {
  try {
    console.log('CFL GET request received')
    
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    console.log('Client ID from request:', clientId)
    
    if (!clientId) {
      console.error('No client ID provided in CFL GET request')
      return NextResponse.json(
        { 
          error: 'Client ID is required',
          success: false 
        },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      console.error('Invalid client ID format:', clientId)
      return NextResponse.json(
        { 
          error: 'Invalid client ID format',
          success: false 
        },
        { status: 400 }
      )
    }

    console.log('Fetching CFL data from database for client:', clientId)

    // Fetch current CFL assessment data from database
    const { data: cflData, error } = await supabase
      .from('cfl_assessments')
      .select(`
        id,
        capacity_level,
        capacity_category,
        total_score,
        max_loss_percentage,
        confidence_level,
        assessment_date,
        monthly_income,
        monthly_expenses,
        emergency_fund,
        other_investments,
        recommendations,
        is_current,
        notes,
        completed_by,
        version,
        created_at,
        updated_at
      `)
      .eq('client_id', clientId)
      .eq('is_current', true)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('CFL database fetch error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch CFL data',
          message: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    // Also get the total count of versions for this client
    const { count: versionCount } = await supabase
      .from('cfl_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    console.log('CFL data fetched successfully:', cflData ? 'Found' : 'Not found')

    // Return successful response
    return NextResponse.json({
      success: true,
      data: cflData,
      hasAssessment: !!cflData,
      totalVersions: versionCount || 0,
      clientId: clientId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('CFL GET route error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}

// POST method for creating new CFL assessments with PROPER VERSION INCREMENTING
export async function POST(request: NextRequest) {
  try {
    console.log('CFL POST request received')
    
    const { firmId, userId } = await getCurrentUserContext()
    
    const body = await request.json()
    console.log('CFL POST body received:', { ...body, answers: body.answers ? 'PRESENT' : 'MISSING' })
    
    const {
      clientId,
      answers,
      totalScore,
      capacityCategory,
      capacityLevel,
      maxLossPercentage,
      confidenceLevel,
      recommendations,
      monthlyIncome,
      monthlyExpenses,
      emergencyFund,
      otherInvestments,
      notes
    } = body

    // Validate required fields
    if (!clientId) {
      console.error('No client ID provided in CFL POST request')
      return NextResponse.json(
        { 
          error: 'Client ID is required',
          success: false 
        },
        { status: 400 }
      )
    }

    if (!totalScore || !capacityCategory || !capacityLevel) {
      console.error('Missing required CFL assessment data')
      return NextResponse.json(
        { 
          error: 'Missing required assessment data: totalScore, capacityCategory, and capacityLevel are required',
          success: false 
        },
        { status: 400 }
      )
    }

    // Validate score and level ranges
    if (typeof totalScore !== 'number' || totalScore < 0 || totalScore > 100) {
      return NextResponse.json(
        { 
          error: 'Total score must be a number between 0 and 100',
          success: false 
        },
        { status: 400 }
      )
    }

    if (typeof capacityLevel !== 'number' || capacityLevel < 1 || capacityLevel > 10) {
      return NextResponse.json(
        { 
          error: 'Capacity level must be a number between 1 and 10',
          success: false 
        },
        { status: 400 }
      )
    }

    // Validate percentage values
    if (maxLossPercentage !== undefined && (typeof maxLossPercentage !== 'number' || maxLossPercentage < 0 || maxLossPercentage > 100)) {
      return NextResponse.json(
        { 
          error: 'Max loss percentage must be a number between 0 and 100',
          success: false 
        },
        { status: 400 }
      )
    }

    if (confidenceLevel !== undefined && (typeof confidenceLevel !== 'number' || confidenceLevel < 0 || confidenceLevel > 100)) {
      return NextResponse.json(
        { 
          error: 'Confidence level must be a number between 0 and 100',
          success: false 
        },
        { status: 400 }
      )
    }

    // START TRANSACTION - Get the latest version number for this client
    console.log('Getting latest CFL version for client:', clientId)
    
    const { data: latestAssessment, error: versionError } = await supabase
      .from('cfl_assessments')
      .select('version')
      .eq('client_id', clientId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionError && versionError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine for first assessment
      console.error('Error fetching latest version:', versionError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch version information',
          message: versionError.message,
          success: false 
        },
        { status: 500 }
      )
    }

    // Calculate new version number
    const currentMaxVersion = latestAssessment?.version || 0
    const newVersion = currentMaxVersion + 1
    
    console.log(`Creating CFL assessment version ${newVersion} for client ${clientId}`)

    // Mark all previous assessments as not current
    if (currentMaxVersion > 0) {
      console.log('Marking previous CFL assessments as not current')
      
      const { error: updateError } = await supabase
        .from('cfl_assessments')
        .update({ 
          is_current: false,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)
        .eq('is_current', true)

      if (updateError) {
        console.error('Error updating previous CFL assessments:', updateError)
        // Don't fail the request, but log the error
      }
    }

    // Create new assessment with proper version number
    const { data, error } = await supabase
      .from('cfl_assessments')
      .insert({
        client_id: clientId,
        answers: answers || {},
        total_score: totalScore,
        capacity_category: capacityCategory,
        capacity_level: capacityLevel,
        max_loss_percentage: maxLossPercentage || 0,
        confidence_level: confidenceLevel || 0,
        monthly_income: monthlyIncome || 0,
        monthly_expenses: monthlyExpenses || 0,
        emergency_fund: emergencyFund || 0,
        other_investments: otherInvestments || 0,
        recommendations: recommendations || [],
        version: newVersion, // EXPLICITLY SET VERSION
        is_current: true,
        completed_by: userId,
        notes: notes || '',
        assessment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('CFL creation error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create CFL assessment',
          message: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    console.log(`CFL assessment created successfully with ID: ${data.id}, Version: ${newVersion}`)

    // Update client risk profile
    try {
      console.log('Updating client risk profile with CFL data')
      
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({
          'riskProfile.capacityForLoss': capacityCategory,
          'riskProfile.riskCapacity': capacityCategory,
          'riskProfile.lastAssessment': new Date().toISOString(),
          'riskProfile.lastAssessmentId': data.id,
          'riskProfile.lastAssessmentDate': new Date().toISOString(),
          'riskProfile.currentCFLVersion': newVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)

      if (clientUpdateError) {
        console.error('Error updating client risk profile:', clientUpdateError)
        // Don't fail the request if profile update fails
      } else {
        console.log('Client risk profile updated successfully')
      }
    } catch (profileError) {
      console.error('Exception updating client risk profile:', profileError)
      // Don't fail the request if profile update fails
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: data,
      message: `CFL assessment created successfully (Version ${newVersion})`,
      clientId: clientId,
      assessmentId: data.id,
      version: newVersion,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('CFL POST route error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}

// PUT method for updating existing CFL assessments
export async function PUT(request: NextRequest) {
  try {
    console.log('CFL PUT request received')
    
    const { userId } = await getCurrentUserContext()
    
    const body = await request.json()
    const {
      assessmentId,
      clientId,
      answers,
      totalScore,
      capacityCategory,
      capacityLevel,
      maxLossPercentage,
      confidenceLevel,
      recommendations,
      monthlyIncome,
      monthlyExpenses,
      emergencyFund,
      otherInvestments,
      notes
    } = body

    if (!assessmentId) {
      console.error('No assessment ID provided in CFL PUT request')
      return NextResponse.json(
        { 
          error: 'Assessment ID is required for updates',
          success: false 
        },
        { status: 400 }
      )
    }

    console.log('Updating CFL assessment:', assessmentId)

    // Update existing assessment
    const { data, error } = await supabase
      .from('cfl_assessments')
      .update({
        answers: answers || {},
        total_score: totalScore,
        capacity_category: capacityCategory,
        capacity_level: capacityLevel,
        max_loss_percentage: maxLossPercentage || 0,
        confidence_level: confidenceLevel || 0,
        monthly_income: monthlyIncome || 0,
        monthly_expenses: monthlyExpenses || 0,
        emergency_fund: emergencyFund || 0,
        other_investments: otherInvestments || 0,
        recommendations: recommendations || [],
        completed_by: userId,
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single()

    if (error) {
      console.error('CFL update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update CFL assessment',
          message: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    console.log('CFL assessment updated successfully')

    // Update client risk profile if clientId provided
    if (clientId && capacityLevel && capacityCategory) {
      try {
        await supabase
          .from('clients')
          .update({
            'riskProfile.capacityForLoss': capacityCategory,
            'riskProfile.riskCapacity': capacityCategory,
            'riskProfile.lastAssessment': new Date().toISOString(),
            'riskProfile.lastAssessmentId': assessmentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId)
      } catch (profileError) {
        console.error('Error updating client profile during PUT:', profileError)
      }
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'CFL assessment updated successfully',
      assessmentId: assessmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('CFL PUT route error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}

// DELETE method for removing CFL assessments
export async function DELETE(request: NextRequest) {
  try {
    console.log('CFL DELETE request received')
    
    const { searchParams } = new URL(request.url)
    const assessmentId = searchParams.get('assessmentId')
    
    if (!assessmentId) {
      return NextResponse.json(
        { 
          error: 'Assessment ID is required for deletion',
          success: false 
        },
        { status: 400 }
      )
    }

    console.log('Deleting CFL assessment:', assessmentId)

    // Delete assessment
    const { error } = await supabase
      .from('cfl_assessments')
      .delete()
      .eq('id', assessmentId)

    if (error) {
      console.error('CFL deletion error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to delete CFL assessment',
          message: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    console.log('CFL assessment deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'CFL assessment deleted successfully',
      assessmentId: assessmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('CFL DELETE route error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}
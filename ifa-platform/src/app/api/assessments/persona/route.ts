// =====================================================
// FILE: src/app/api/assessments/persona/route.ts
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

// GET method to fetch Persona assessment for a client
export async function GET(request: NextRequest) {
  try {
    console.log('Persona GET request received')
    
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    
    console.log('Client ID from request:', clientId)
    
    if (!clientId) {
      console.error('No client ID provided in Persona GET request')
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

    console.log('Fetching Persona data from database for client:', clientId)

    // Fetch current Persona assessment data from database
    const { data: personaData, error } = await supabase
      .from('persona_assessments')
      .select(`
        id,
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
      .eq('is_current', true)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Persona database fetch error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch Persona data',
          message: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    // Also get the total count of versions for this client
    const { count: versionCount } = await supabase
      .from('persona_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)

    console.log('Persona data fetched successfully:', personaData ? 'Found' : 'Not found')

    // Return successful response
    return NextResponse.json({
      success: true,
      data: personaData,
      hasAssessment: !!personaData,
      totalVersions: versionCount || 0,
      clientId: clientId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Persona GET route error:', error)
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

// POST method for creating new Persona assessments with PROPER VERSION INCREMENTING
export async function POST(request: NextRequest) {
  try {
    console.log('Persona POST request received')
    
    const { firmId, userId } = await getCurrentUserContext()
    
    const body = await request.json()
    console.log('Persona POST body received:', { ...body, answers: body.answers ? 'PRESENT' : 'MISSING' })
    
    const {
      clientId,
      personaLevel,
      personaType,
      scores,
      confidence,
      answers,
      motivations,
      fears,
      psychologicalProfile,
      communicationNeeds,
      consumerDutyAlignment,
      notes
    } = body

    // Validate required fields
    if (!clientId) {
      console.error('No client ID provided in Persona POST request')
      return NextResponse.json(
        { 
          error: 'Client ID is required',
          success: false 
        },
        { status: 400 }
      )
    }

    if (!personaLevel || !personaType) {
      console.error('Missing required Persona assessment data')
      return NextResponse.json(
        { 
          error: 'Missing required assessment data: personaLevel and personaType are required',
          success: false 
        },
        { status: 400 }
      )
    }

    // Validate confidence level
    if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 100)) {
      return NextResponse.json(
        { 
          error: 'Confidence must be a number between 0 and 100',
          success: false 
        },
        { status: 400 }
      )
    }

    // START TRANSACTION - Get the latest version number for this client
    console.log('Getting latest Persona version for client:', clientId)
    
    const { data: latestAssessment, error: versionError } = await supabase
      .from('persona_assessments')
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
    
    console.log(`Creating Persona assessment version ${newVersion} for client ${clientId}`)

    // Mark all previous assessments as not current
    if (currentMaxVersion > 0) {
      console.log('Marking previous Persona assessments as not current')
      
      const { error: updateError } = await supabase
        .from('persona_assessments')
        .update({ 
          is_current: false,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', clientId)
        .eq('is_current', true)

      if (updateError) {
        console.error('Error updating previous Persona assessments:', updateError)
        // Don't fail the request, but log the error
      }
    }

    // Create new assessment with proper version number
    const { data, error } = await supabase
      .from('persona_assessments')
      .insert({
        client_id: clientId,
        persona_level: personaLevel,
        persona_type: personaType,
        scores: scores || {},
        confidence: confidence || 0,
        answers: answers || {},
        motivations: motivations || [],
        fears: fears || [],
        psychological_profile: psychologicalProfile || {},
        communication_needs: communicationNeeds || {},
        consumer_duty_alignment: consumerDutyAlignment || {},
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
      console.error('Persona creation error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create Persona assessment',
          message: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    console.log(`Persona assessment created successfully with ID: ${data.id}, Version: ${newVersion}`)

    // Update client profile with persona information
    try {
      console.log('Updating client profile with Persona data')
      
      const { error: clientUpdateError } = await supabase
        .from('clients')
        .update({
          'riskProfile.investorPersona': personaType,
          'riskProfile.personaLevel': personaLevel,
          'riskProfile.personaConfidence': confidence,
          'riskProfile.lastAssessment': new Date().toISOString(),
          'riskProfile.lastAssessmentId': data.id,
          'riskProfile.lastAssessmentDate': new Date().toISOString(),
          'riskProfile.currentPersonaVersion': newVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)

      if (clientUpdateError) {
        console.error('Error updating client profile:', clientUpdateError)
        // Don't fail the request if profile update fails
      } else {
        console.log('Client profile updated successfully')
      }
    } catch (profileError) {
      console.error('Exception updating client profile:', profileError)
      // Don't fail the request if profile update fails
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      data: data,
      message: `Persona assessment created successfully (Version ${newVersion})`,
      clientId: clientId,
      assessmentId: data.id,
      version: newVersion,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Persona POST route error:', error)
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

// PUT method for updating existing Persona assessments
export async function PUT(request: NextRequest) {
  try {
    console.log('Persona PUT request received')
    
    const { userId } = await getCurrentUserContext()
    
    const body = await request.json()
    const {
      assessmentId,
      clientId,
      personaLevel,
      personaType,
      scores,
      confidence,
      answers,
      motivations,
      fears,
      psychologicalProfile,
      communicationNeeds,
      consumerDutyAlignment,
      notes
    } = body

    if (!assessmentId) {
      console.error('No assessment ID provided in Persona PUT request')
      return NextResponse.json(
        { 
          error: 'Assessment ID is required for updates',
          success: false 
        },
        { status: 400 }
      )
    }

    console.log('Updating Persona assessment:', assessmentId)

    // Update existing assessment
    const { data, error } = await supabase
      .from('persona_assessments')
      .update({
        persona_level: personaLevel,
        persona_type: personaType,
        scores: scores || {},
        confidence: confidence || 0,
        answers: answers || {},
        motivations: motivations || [],
        fears: fears || [],
        psychological_profile: psychologicalProfile || {},
        communication_needs: communicationNeeds || {},
        consumer_duty_alignment: consumerDutyAlignment || {},
        completed_by: userId,
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single()

    if (error) {
      console.error('Persona update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update Persona assessment',
          message: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    console.log('Persona assessment updated successfully')

    // Update client profile if clientId provided
    if (clientId && personaType && personaLevel) {
      try {
        await supabase
          .from('clients')
          .update({
            'riskProfile.investorPersona': personaType,
            'riskProfile.personaLevel': personaLevel,
            'riskProfile.personaConfidence': confidence,
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
      message: 'Persona assessment updated successfully',
      assessmentId: assessmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Persona PUT route error:', error)
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

// DELETE method for removing Persona assessments
export async function DELETE(request: NextRequest) {
  try {
    console.log('Persona DELETE request received')
    
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

    console.log('Deleting Persona assessment:', assessmentId)

    // Delete assessment
    const { error } = await supabase
      .from('persona_assessments')
      .delete()
      .eq('id', assessmentId)

    if (error) {
      console.error('Persona deletion error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to delete Persona assessment',
          message: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    console.log('Persona assessment deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Persona assessment deleted successfully',
      assessmentId: assessmentId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Persona DELETE route error:', error)
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
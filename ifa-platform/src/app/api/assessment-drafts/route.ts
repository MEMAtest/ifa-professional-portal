// app/api/assessment-drafts/route.ts
// FIXED VERSION FOR NEXT.JS 14+ WITH PROPER ASYNC HANDLING
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface SaveDraftRequest {
  clientId: string
  assessmentType: string
  assessmentId?: string | null
  draftData: any
  metadata?: any
  expiresIn?: number // days until expiration
  userId?: string
}

interface DraftRecord {
  id?: string
  client_id: string
  assessment_type: string
  assessment_id?: string | null
  draft_data: any
  metadata?: any
  expires_at?: string
  created_at?: string
  updated_at?: string
  last_saved_at?: string
  created_by?: string
  last_modified_by?: string
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const calculateExpiryDate = (days: number = 30): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const getUserIdentifier = async (supabase: any): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || user?.email || 'anonymous-user'
  } catch {
    return 'anonymous-user'
  }
}

// Create Supabase server client - FIXED FOR NEXT.JS 14+
const createSupabaseClient = async () => {
  return createClient()
}

// =====================================================
// POST - SAVE/UPDATE DRAFT (UPSERT)
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client with async handling
    const supabase = await createSupabaseClient()
    
    // Parse request body
    const body: SaveDraftRequest = await request.json()
    
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Draft save request:', { 
        clientId: body.clientId, 
        assessmentType: body.assessmentType 
      })
    }
    
    // Validate required fields
    if (!body.clientId || !body.assessmentType || !body.draftData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields', 
          code: 'VALIDATION_ERROR',
          details: 'clientId, assessmentType, and draftData are required' 
        },
        { status: 400 }
      )
    }
    
    // Validate UUID format for clientId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(body.clientId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid client ID format', 
          code: 'VALIDATION_ERROR',
          details: 'clientId must be a valid UUID' 
        },
        { status: 400 }
      )
    }
    
    // Verify client exists
    const { data: clientExists, error: clientCheckError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', body.clientId)
      .single()
    
    if (clientCheckError || !clientExists) {
      console.error('Client check error:', clientCheckError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client not found', 
          code: 'CLIENT_NOT_FOUND',
          details: `No client found with ID: ${body.clientId}` 
        },
        { status: 404 }
      )
    }
    
    // Get user identifier for audit trail
    const userId = body.userId || await getUserIdentifier(supabase)
    
    // Check if draft already exists
    const { data: existingDraft, error: checkError } = await supabase
      .from('assessment_drafts')
      .select('id, created_at, created_by')
      .eq('client_id', body.clientId)
      .eq('assessment_type', body.assessmentType)
      .maybeSingle()
    
    let result
    let operationType: 'insert' | 'update'
    
    if (existingDraft) {
      // UPDATE existing draft
      operationType = 'update'
      
      const updateData: Partial<DraftRecord> = {
        draft_data: body.draftData,
        metadata: {
          ...body.metadata,
          lastModifiedAt: new Date().toISOString(),
          lastModifiedBy: userId,
          source: 'web',
          version: (body.metadata?.version || 0) + 1
        },
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString(),
        last_modified_by: userId,
        expires_at: calculateExpiryDate(body.expiresIn || 30)
      }
      
      // Include assessment_id if provided
      if (body.assessmentId) {
        updateData.assessment_id = body.assessmentId
      }
      
      const { data, error } = await supabase
        .from('assessment_drafts')
        .update(updateData)
        .eq('id', existingDraft.id)
        .select()
        .single()
      
      if (error) {
        console.error('Update error:', error)
        throw error
      }
      
      result = data
      
    } else {
      // INSERT new draft
      operationType = 'insert'
      
      const insertData: DraftRecord = {
        client_id: body.clientId,
        assessment_type: body.assessmentType,
        assessment_id: body.assessmentId || null,
        draft_data: body.draftData,
        metadata: {
          ...body.metadata,
          createdAt: new Date().toISOString(),
          lastModifiedAt: new Date().toISOString(),
          createdBy: userId,
          lastModifiedBy: userId,
          source: 'web',
          version: 1
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString(),
        expires_at: calculateExpiryDate(body.expiresIn || 30),
        created_by: userId,
        last_modified_by: userId
      }
      
      const { data, error } = await supabase
        .from('assessment_drafts')
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        // Handle duplicate key error
        if (error.code === '23505') {
          // Race condition - draft was created between check and insert
          // Retry as update
          console.log('Race condition detected, retrying as update...')
          
          const { data: retryData, error: retryError } = await supabase
            .from('assessment_drafts')
            .update({
              draft_data: body.draftData,
              metadata: body.metadata,
              updated_at: new Date().toISOString(),
              last_saved_at: new Date().toISOString(),
              last_modified_by: userId,
              expires_at: calculateExpiryDate(body.expiresIn || 30)
            })
            .eq('client_id', body.clientId)
            .eq('assessment_type', body.assessmentType)
            .select()
            .single()
          
          if (retryError) {
            console.error('Retry update error:', retryError)
            throw retryError
          }
          
          result = retryData
          operationType = 'update'
        } else {
          console.error('Insert error:', error)
          throw error
        }
      } else {
        result = data
      }
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: result,
      operation: operationType,
      metadata: {
        clientId: body.clientId,
        assessmentType: body.assessmentType,
        savedAt: new Date().toISOString(),
        expiresAt: result?.expires_at,
        userId
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('Save draft error:', error)
    
    // Determine error type and message
    let errorMessage = 'Failed to save draft'
    let errorCode = 'SAVE_ERROR'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for specific Supabase errors
      if (error.message.includes('23505')) {
        errorCode = 'DUPLICATE_KEY'
        errorMessage = 'A draft already exists for this assessment'
      } else if (error.message.includes('23503')) {
        errorCode = 'FOREIGN_KEY'
        errorMessage = 'Invalid client reference'
        statusCode = 400
      } else if (error.message.includes('22P02')) {
        errorCode = 'INVALID_DATA'
        errorMessage = 'Invalid data format'
        statusCode = 400
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: errorCode,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    )
  }
}

// =====================================================
// GET - RETRIEVE DRAFT WITH ATR/CFL DATA
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const clientId = searchParams.get('client_id')
    const assessmentType = searchParams.get('assessment_type') || 'suitability'
    const includeRelated = searchParams.get('include_related') === 'true'
    
    // Validate required parameters
    if (!clientId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters',
          code: 'VALIDATION_ERROR',
          details: 'client_id is required' 
        },
        { status: 400 }
      )
    }
    
    // Get draft data
    const { data: draftData, error: draftError } = await supabase
      .from('assessment_drafts')
      .select('*')
      .eq('client_id', clientId)
      .eq('assessment_type', assessmentType)
      .maybeSingle()
    
    if (draftError && draftError.code !== 'PGRST116') {
      console.error('Get draft error:', draftError)
      throw draftError
    }
    
    // Check if draft has expired
    if (draftData?.expires_at && new Date(draftData.expires_at) < new Date()) {
      // Delete expired draft
      await supabase
        .from('assessment_drafts')
        .delete()
        .eq('id', draftData.id)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Draft has expired',
          code: 'EXPIRED' 
        },
        { status: 404 }
      )
    }
    
    // Include ATR/CFL data if requested
    let atrData: { assessment_data: any; risk_analysis: any; created_at: any; } | null = null
    let cflData: { assessment_data: any; risk_analysis: any; created_at: any; } | null = null
    
    if (includeRelated) {
      // Get latest ATR assessment
      const { data: atr } = await supabase
        .from('assessments')
        .select('assessment_data, risk_analysis, created_at')
        .eq('client_id', clientId)
        .eq('assessment_type', 'atr')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      // Get latest CFL assessment
      const { data: cfl } = await supabase
        .from('assessments')
        .select('assessment_data, risk_analysis, created_at')
        .eq('client_id', clientId)
        .eq('assessment_type', 'cfl')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      atrData = atr
      cflData = cfl
    }
    
    return NextResponse.json({
      success: true,
      data: draftData,
      relatedAssessments: {
        atr: atrData,
        cfl: cflData
      },
      metadata: {
        retrievedAt: new Date().toISOString(),
        expiresAt: draftData?.expires_at,
        lastSaved: draftData?.last_saved_at,
        hasATR: !!atrData,
        hasCFL: !!cflData
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('Get draft error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve draft',
        code: 'GET_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// =====================================================
// DELETE - REMOVE DRAFT
// =====================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const clientId = searchParams.get('client_id')
    const assessmentType = searchParams.get('assessment_type')
    const draftId = searchParams.get('draft_id')
    
    // Validate parameters
    if (!clientId && !draftId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters',
          code: 'VALIDATION_ERROR',
          details: 'Either client_id or draft_id is required' 
        },
        { status: 400 }
      )
    }
    
    let query = supabase.from('assessment_drafts').delete()
    
    if (draftId) {
      query = query.eq('id', draftId)
    } else {
      query = query.eq('client_id', clientId)
      if (assessmentType) {
        query = query.eq('assessment_type', assessmentType)
      }
    }
    
    const { error } = await query
    
    if (error) {
      console.error('Delete draft error:', error)
      throw error
    }
    
    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
      metadata: {
        deletedAt: new Date().toISOString(),
        clientId,
        assessmentType
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('Delete draft error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete draft',
        code: 'DELETE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT - SUBMIT FINAL ASSESSMENT
// =====================================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const body = await request.json()
    
    if (!body.clientId || !body.assessmentData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const userId = await getUserIdentifier(supabase)
    
    // Save to assessments table
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        client_id: body.clientId,
        assessment_type: body.assessmentType || 'suitability',
        assessment_data: body.assessmentData,
        risk_analysis: body.riskAnalysis || {},
        vulnerability_analysis: body.vulnerabilityAnalysis || {},
        consumer_duty_compliance: body.complianceData || {},
        status: 'completed',
        completed_at: new Date().toISOString(),
        version: 1
      })
      .select()
      .single()
    
    if (assessmentError) {
      throw assessmentError
    }
    
    // Delete draft after successful submission
    await supabase
      .from('assessment_drafts')
      .delete()
      .eq('client_id', body.clientId)
      .eq('assessment_type', body.assessmentType || 'suitability')
    
    // Update client last assessment info
    await supabase
      .from('clients')
      .update({
        last_assessment_date: new Date().toISOString(),
        last_assessment_type: body.assessmentType || 'suitability',
        assessment_count: body.assessmentCount || 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.clientId)
    
    return NextResponse.json({
      success: true,
      data: assessment,
      metadata: {
        submittedAt: new Date().toISOString(),
        assessmentId: assessment.id
      }
    }, { status: 200 })
    
  } catch (error) {
    console.error('Submit assessment error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit assessment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
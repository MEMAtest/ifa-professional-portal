// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

// ===================================================================
// src/app/api/documents/categories/route.ts - REAL DATA Categories
// ===================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { log } from '@/lib/logging/structured'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const includeCount = searchParams.get('include_count') === 'true'
    const systemOnly = searchParams.get('system_only') === 'true'
    const complianceLevel = searchParams.get('compliance_level')
    const requiresSignature = searchParams.get('requires_signature')

    const supabase = getSupabaseServiceClient()
    
    // ✅ REAL: Get categories from your actual database
    let query = supabase
      .from('document_categories')
      .select('*')

    // Apply filters
    if (systemOnly) {
      query = query.eq('is_system', true)
    }
    
    if (complianceLevel) {
      query = query.eq('compliance_level', complianceLevel)
    }
    
    if (requiresSignature !== null) {
      const requiresSig = requiresSignature === 'true'
      query = query.eq('requires_signature', requiresSig)
    }

    // Execute query
    const { data: categories, error } = await query.order('name')

    if (error) {
      log.error('Database query error', error)
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    // ✅ REAL: Get document counts if requested
    let categoriesWithCounts: any[] = categories || []

    if (includeCount) {
      const auth = await getAuthContext(request)
      if (!auth.success || !auth.context) {
        return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const firmId = auth.context.firmId
      if (!firmId) {
        return NextResponse.json(
          { error: 'Firm ID not configured. Please contact support.' },
          { status: 403 }
        )
      }
      
      const categoriesWithCountsPromise = categoriesWithCounts.map(async (category) => {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('firm_id', firmId)
          .eq('is_archived', false)

        return {
          ...category,
          document_count: count || 0
        }
      })

      categoriesWithCounts = await Promise.all(categoriesWithCountsPromise)
    }

    // Transform data to match frontend expectations
    const responseCategories = categoriesWithCounts.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || 'FileText',
      color: cat.color || '#6B7280',
      is_system: cat.is_system || false,
      requires_signature: cat.requires_signature || false,
      compliance_level: cat.compliance_level || 'standard',
      ...(includeCount && { document_count: cat.document_count }),
      created_at: cat.created_at,
      updated_at: cat.updated_at
    }))

    return NextResponse.json({
      categories: responseCategories,
      total: responseCategories.length,
      system_categories: responseCategories.filter(cat => cat.is_system).length,
      custom_categories: responseCategories.filter(cat => !cat.is_system).length,
      metadata: {
        include_count: includeCount,
        filters_applied: {
          system_only: systemOnly,
          compliance_level: complianceLevel || null,
          requires_signature: requiresSignature || null
        }
      }
    })
    
  } catch (error) {
    log.error('Categories API error', error)

    return NextResponse.json(
      { 
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = auth.context.userId
    const supabase = getSupabaseServiceClient()
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }
    
    // ✅ REAL: Check if category name already exists in your database
    const { data: existingCategory } = await supabase
      .from('document_categories')
      .select('id, name')
      .ilike('name', body.name)
      .single()
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 409 }
      )
    }
    
    // Validate compliance level
    const validComplianceLevels = ['standard', 'high', 'critical']
    if (body.compliance_level && !validComplianceLevels.includes(body.compliance_level)) {
      return NextResponse.json(
        { 
          error: 'Invalid compliance level',
          valid_levels: validComplianceLevels
        },
        { status: 400 }
      )
    }
    
    // ✅ REAL: Insert new category into your database
    const { data: newCategory, error } = await supabase
      .from('document_categories')
      .insert({
        name: body.name,
        description: body.description || '',
        icon: body.icon || 'FileText',
        color: body.color || '#6B7280',
        is_system: false, // Custom categories are never system categories
        requires_signature: body.requires_signature || false,
        compliance_level: body.compliance_level || 'standard',
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single()
    
    if (error) {
      log.error('Category creation error', error)
      throw new Error(`Failed to create category: ${error.message}`)
    }
    
    return NextResponse.json({
      success: true,
      category: {
        ...newCategory,
        document_count: 0 // New categories start with 0 documents
      },
      message: 'Category created successfully'
    })
    
  } catch (error) {
    log.error('Category creation error', error)

    return NextResponse.json(
      {
        error: 'Failed to create category',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = auth.context.userId
    const supabase = getSupabaseServiceClient()
    const { id } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }
    
    // ✅ REAL: Find category to update in your database
    const { data: category, error: fetchError } = await supabase
      .from('document_categories')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }
    
    // Check if it's a system category (can't be fully modified)
    if ((category as any).is_system && (body.name || body.compliance_level)) {
      return NextResponse.json(
        { error: 'Cannot modify core properties of system categories' },
        { status: 403 }
      )
    }
    
    // Validate compliance level if provided
    if (body.compliance_level) {
      const validComplianceLevels = ['standard', 'high', 'critical']
      if (!validComplianceLevels.includes(body.compliance_level)) {
        return NextResponse.json(
          { 
            error: 'Invalid compliance level',
            valid_levels: validComplianceLevels
          },
          { status: 400 }
        )
      }
    }
    
    // ✅ REAL: Update category in your database
    const updateData = {
      ...body,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.is_system
    delete updateData.created_at
    delete updateData.created_by
    
    const { data: updatedCategory, error: updateError } = await supabase
      .from('document_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      log.error('Category update error', updateError)
      throw new Error(`Failed to update category: ${updateError.message}`)
    }
    
    return NextResponse.json({
      success: true,
      category: updatedCategory,
      message: 'Category updated successfully'
    })
    
  } catch (error) {
    log.error('Category update error', error)

    return NextResponse.json(
      {
        error: 'Failed to update category',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const firmId = auth.context.firmId ?? undefined
    const supabase = getSupabaseServiceClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }
    
    // ✅ REAL: Find category to delete in your database
    const { data: category, error: fetchError } = await supabase
      .from('document_categories')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }
    
    // Check if it's a system category (can't be deleted)
    if ((category as any).is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system categories' },
        { status: 403 }
      )
    }
    
    // ✅ REAL: Check if category has documents in your database
    let documentsQuery = supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_archived', false)

    if (firmId) {
      documentsQuery = documentsQuery.eq('firm_id', firmId)
    }

    const { count: documentCount } = await documentsQuery
    
    if (documentCount && documentCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete category with existing documents',
          suggestion: 'Move documents to another category first',
          document_count: documentCount
        },
        { status: 409 }
      )
    }
    
    // ✅ REAL: Delete category from your database
    const { error: deleteError } = await supabase
      .from('document_categories')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      log.error('Category deletion error', deleteError)
      throw new Error(`Failed to delete category: ${deleteError.message}`)
    }
    
    return NextResponse.json({
      success: true,
      deleted_category: {
        id: category.id,
        name: category.name
      },
      message: 'Category deleted successfully'
    })
    
  } catch (error) {
    log.error('Category deletion error', error)

    return NextResponse.json(
      {
        error: 'Failed to delete category',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle method validation
export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use PUT for updates.' 
    },
    { status: 405 }
  )
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// src/app/api/clients/[id]/holdings/route.ts
// API route for client product holdings

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'

interface ProductHolding {
  id?: string
  client_id: string
  firm_id?: string | null
  service_id: string
  product_name: string
  product_provider?: string
  product_type?: string
  product_reference?: string
  current_value?: number
  purchase_value?: number
  last_valued_date?: string
  status?: 'active' | 'transferred' | 'encashed' | 'matured'
  acquisition_date?: string
  notes?: string
}

/**
 * GET /api/clients/[id]/holdings
 * Get all product holdings for a client
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = context?.params?.id
    if (!clientId || clientId === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS
    const supabaseService = getSupabaseServiceClient() as any
    const { data, error } = await supabaseService
      .from('client_product_holdings')
      .select('*')
      .eq('client_id', clientId)
      .order('service_id', { ascending: true })
      .order('product_name', { ascending: true })

    if (error) {
      // Table might not exist yet
      if (error.message?.includes('client_product_holdings')) {
        return NextResponse.json({ success: true, holdings: [] })
      }
      console.error('Error fetching holdings:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, holdings: data || [] })
  } catch (error) {
    console.error('Holdings GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients/[id]/holdings
 * Create a new product holding
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = context?.params?.id
    if (!clientId || clientId === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    const body: ProductHolding = await request.json()

    if (!body.service_id || !body.product_name) {
      return NextResponse.json(
        { success: false, error: 'Service ID and product name are required' },
        { status: 400 }
      )
    }

    // Get firm_id from user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single()

    const supabaseService = getSupabaseServiceClient() as any
    const { data, error } = await supabaseService
      .from('client_product_holdings')
      .insert({
        client_id: clientId,
        firm_id: profile?.firm_id || null,
        service_id: body.service_id,
        product_name: body.product_name,
        product_provider: body.product_provider || null,
        product_type: body.product_type || null,
        product_reference: body.product_reference || null,
        current_value: body.current_value || null,
        purchase_value: body.purchase_value || null,
        last_valued_date: body.last_valued_date || null,
        status: body.status || 'active',
        acquisition_date: body.acquisition_date || null,
        notes: body.notes || null,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating holding:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, holding: data })
  } catch (error) {
    console.error('Holdings POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clients/[id]/holdings
 * Update an existing product holding
 */
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const holdingId = body.id

    if (!holdingId) {
      return NextResponse.json(
        { success: false, error: 'Holding ID is required' },
        { status: 400 }
      )
    }

    const supabaseService = getSupabaseServiceClient() as any
    const { data, error } = await supabaseService
      .from('client_product_holdings')
      .update({
        product_name: body.product_name,
        product_provider: body.product_provider || null,
        product_type: body.product_type || null,
        product_reference: body.product_reference || null,
        current_value: body.current_value || null,
        purchase_value: body.purchase_value || null,
        last_valued_date: body.last_valued_date || null,
        status: body.status || 'active',
        acquisition_date: body.acquisition_date || null,
        notes: body.notes || null
      })
      .eq('id', holdingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating holding:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, holding: data })
  } catch (error) {
    console.error('Holdings PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/clients/[id]/holdings
 * Delete a product holding (pass id in query params)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const holdingId = searchParams.get('holdingId')

    if (!holdingId) {
      return NextResponse.json(
        { success: false, error: 'Holding ID is required' },
        { status: 400 }
      )
    }

    const supabaseService = getSupabaseServiceClient() as any
    const { error } = await supabaseService
      .from('client_product_holdings')
      .delete()
      .eq('id', holdingId)

    if (error) {
      console.error('Error deleting holding:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Holdings DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

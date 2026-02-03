// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { getAuthContext, requireFirmId, requirePermission } from '@/lib/auth/apiAuth'
import { createRequestLogger } from '@/lib/logging/structured'
import type { BulkClientRequest, BulkClientResponse, BulkClientResult } from '@/types/bulk-setup'
import { parseRequestBody } from '@/app/api/utils'

const MAX_BATCH_SIZE = 50
const CLIENT_REF_PATTERN = /^[A-Za-z0-9\-_]{1,50}$/

function sanitizeString(value: string): string {
  return value.replace(/[<>"'&]/g, '').trim().slice(0, 200)
}

function validateClientInput(client: BulkClientRequest['clients'][number]): string | null {
  if (!client.firstName || !sanitizeString(client.firstName)) return 'firstName is required'
  if (!client.lastName || !sanitizeString(client.lastName)) return 'lastName is required'
  if (!client.clientRef || !CLIENT_REF_PATTERN.test(client.clientRef)) {
    return 'clientRef must be 1-50 alphanumeric characters, hyphens, or underscores'
  }
  if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
    return 'Invalid email format'
  }
  return null
}

function buildDefaultClientData(
  client: BulkClientRequest['clients'][number],
  firmId: string,
  advisorId: string
) {
  const now = new Date().toISOString()
  const oneYearFromNow = new Date()
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  const firstName = sanitizeString(client.firstName)
  const lastName = sanitizeString(client.lastName)
  const rawEmail = client.email?.trim() || ''
  const email = rawEmail ? sanitizeString(rawEmail) : ''

  const data: Record<string, unknown> = {
    client_ref: client.clientRef.trim(),
    status: 'prospect',
    personal_details: {
      firstName,
      lastName,
      email,
      nationality: 'GB',
      maritalStatus: 'single',
      dependents: 0,
    },
    contact_info: {
      email,
      preferredContact: 'email',
      country: 'United Kingdom',
    },
    financial_profile: {
      annualIncome: 0,
      monthlyExpenses: 0,
      totalAssets: 0,
      netWorth: 0,
      liquidAssets: 0,
      investmentObjectives: [],
      existingInvestments: [],
      pensionArrangements: [],
      insurancePolicies: [],
    },
    vulnerability_assessment: {
      is_vulnerable: false,
      vulnerabilityFactors: [],
      supportNeeds: [],
      assessmentNotes: '',
      assessmentDate: now,
      reviewDate: oneYearFromNow.toISOString(),
    },
    risk_profile: {
      riskTolerance: '',
      riskCapacity: '',
      attitudeToRisk: 5,
      capacityForLoss: '',
      knowledgeExperience: '',
      lastAssessment: now,
      assessmentHistory: [],
    },
    firm_id: firmId,
    created_at: now,
    updated_at: now,
  }

  return data
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request)

  try {
    // Verify authentication
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const permissionError = requirePermission(auth.context, 'clients:write')
    if (permissionError) {
      return permissionError
    }

    const body: BulkClientRequest = await parseRequestBody(request)

    if (!body.clients || !Array.isArray(body.clients)) {
      return NextResponse.json(
        { success: false, error: 'clients array is required' },
        { status: 400 }
      )
    }

    if (body.clients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one client is required' },
        { status: 400 }
      )
    }

    if (body.clients.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_BATCH_SIZE} clients per batch` },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS (matches admin operation pattern)
    const supabase = getSupabaseServiceClient()
    const firmResult = requireFirmId(auth.context)
    if (!('firmId' in firmResult)) {
      return firmResult
    }
    const firmId = firmResult.firmId
    const advisorId = auth.context.advisorId || auth.context.userId

    // SECURITY: Require firm context to prevent cross-tenant data access
    if (!firmId) {
      logger.warn('POST /api/setup/bulk-clients - No firm_id available, refusing to create unscoped clients')
      return NextResponse.json({ error: 'Firm context required' }, { status: 403 })
    }

    logger.info('POST /api/setup/bulk-clients - Creating batch', {
      firmId,
      count: body.clients.length,
    })

    // Check for duplicate client refs within the batch
    const clientRefs = body.clients.map(c => c.clientRef?.trim()).filter(Boolean)
    const refSet = new Set<string>()
    for (const ref of clientRefs) {
      if (refSet.has(ref.toLowerCase())) {
        return NextResponse.json(
          { success: false, error: `Duplicate client ref in batch: ${ref}` },
          { status: 400 }
        )
      }
      refSet.add(ref.toLowerCase())
    }

    // Check for existing client refs in the database
    if (clientRefs.length > 0) {
      const { data: existing } = await supabase
        .from('clients')
        .select('client_ref')
        .in('client_ref', clientRefs)
        .eq('firm_id', firmId)

      if (existing && existing.length > 0) {
        const dupes = existing.map((e: { client_ref: string }) => e.client_ref).join(', ')
        return NextResponse.json(
          { success: false, error: `Client refs already exist: ${dupes}` },
          { status: 409 }
        )
      }
    }

    const results: BulkClientResult[] = []
    let created = 0
    let failed = 0

    // Create each client individually so one failure doesn't block others
    for (const client of body.clients) {
      const validationError = validateClientInput(client)
      if (validationError) {
        results.push({
          clientRef: (client.clientRef || '').slice(0, 50),
          clientId: null,
          success: false,
          error: validationError,
        })
        failed++
        continue
      }

      const clientData = buildDefaultClientData(client, firmId, advisorId)

      const { data, error } = await supabase
        .from('clients')
        .insert([clientData] as any)
        .select('id, client_ref')
        .single()

      if (error) {
        logger.warn('Failed to create client in batch', {
          clientRef: client.clientRef,
          error: error.message,
        })
        results.push({
          clientRef: client.clientRef,
          clientId: null,
          success: false,
          error: 'Failed to create client',
        })
        failed++
      } else {
        results.push({
          clientRef: client.clientRef,
          clientId: data.id,
          success: true,
        })
        created++
      }
    }

    logger.info('Bulk client creation complete', { created, failed })

    const response: BulkClientResponse = { results, created, failed }

    return NextResponse.json({
      success: true,
      ...response,
    })
  } catch (error) {
    logger.error('POST /api/setup/bulk-clients error', error)
    return NextResponse.json(
      {
        success: false,
        error: '',
      },
      { status: 500 }
    )
  }
}

// src/app/api/compliance/prod-services/clients/route.ts
// Firm-wide client target market and service selection summary

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { createRequestLogger } from '@/lib/logging/structured'
import { DEFAULT_PROD_SERVICES } from '@/lib/prod/serviceCatalog'

type ServiceCheckCountMap = Record<string, number>

const isValidFirmId = (value?: string | null) => {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

const buildServiceCheckMap = (services: Array<any>): ServiceCheckCountMap => {
  return services.reduce<ServiceCheckCountMap>((acc, service) => {
    const serviceId = service?.id || service?.service_id || service?.name || service?.label
    if (!serviceId) return acc
    const checks = Array.isArray(service?.targetMarketChecks)
      ? service.targetMarketChecks
      : Array.isArray(service?.target_market_checks)
        ? service.target_market_checks
        : []
    acc[serviceId] = checks.length
    return acc
  }, {})
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth.success) {
    return auth.response!
  }

  const logger = createRequestLogger(request)
  const supabase = getSupabaseServiceClient() as any

  try {
    let firmId = auth.context?.firmId ?? null
    if (!isValidFirmId(firmId)) {
      firmId = null
    }

    const statusFilter = request.nextUrl.searchParams.get('status') || 'active'
    let servicesCatalog: Array<{ id: string; label: string }> = []
    let serviceCheckMap: ServiceCheckCountMap = buildServiceCheckMap(DEFAULT_PROD_SERVICES)

    if (firmId) {
      const { data: firm, error } = await supabase
        .from('firms')
        .select('settings')
        .eq('id', firmId)
        .maybeSingle()

      if (!error && firm?.settings?.services_prod?.services) {
        const rawServices = firm.settings.services_prod.services as Array<any>
        servicesCatalog = rawServices.map((service) => ({
          id: service?.id || service?.service_id || service?.name || service?.label,
          label: service?.label || service?.name || service?.id || 'Service'
        })).filter((service) => service.id)
        serviceCheckMap = buildServiceCheckMap(rawServices)
      }
    }

    const clientQuery = supabase
      .from('clients')
      .select('id, client_ref, personal_details, status, firm_id, updated_at')
      .order('updated_at', { ascending: false })

    if (firmId) {
      clientQuery.or(`firm_id.eq.${firmId},firm_id.is.null`)
    }

    const { data: clients, error: clientError } = await clientQuery

    if (clientError) {
      logger.error('Failed to fetch clients for PROD dashboard', clientError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch clients', details: clientError.message },
        { status: 500 }
      )
    }

    const clientIds = (clients || []).map((client: any) => client.id)

    let servicesData: Array<any> = []
    if (clientIds.length > 0) {
      const { data: services, error: servicesError } = await supabase
        .from('client_services')
        .select('client_id, services_selected, target_market_checks, updated_at, created_at')
        .in('client_id', clientIds)

      if (servicesError) {
        logger.error('Failed to fetch client services for PROD dashboard', servicesError)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch client services', details: servicesError.message },
          { status: 500 }
        )
      }

      servicesData = services || []
    }

    const servicesByClient = new Map<string, any>()
    servicesData.forEach((record) => {
      servicesByClient.set(record.client_id, record)
    })

    const normalizeStatus = (value?: string | null) => (value || '').toString().trim().toLowerCase()
    const activeStatuses = new Set([
      'active',
      'review_due',
      'review due',
      'review-due',
      'current',
      'client'
    ])

    const filteredClients = (clients || []).filter((client: any) => {
      if (!statusFilter || statusFilter === 'all') return true
      const normalized = normalizeStatus(client.status)
      if (statusFilter === 'active') {
        return normalized === '' || activeStatuses.has(normalized)
      }
      return normalized === statusFilter.toLowerCase()
    })

    const responseClients = filteredClients.map((client: any) => {
      const serviceRecord = servicesByClient.get(client.id) || null
      const servicesSelected = Array.isArray(serviceRecord?.services_selected)
        ? serviceRecord.services_selected
        : []
      const checksByService = serviceRecord?.target_market_checks || {}

      let totalChecks = 0
      let completedChecks = 0

      servicesSelected.forEach((serviceId: string) => {
        const expectedChecks = serviceCheckMap[serviceId]
          ?? Object.keys(checksByService?.[serviceId] || {}).length
        totalChecks += expectedChecks
        const completedForService = Object.values(checksByService?.[serviceId] || {}).filter(Boolean).length
        completedChecks += Math.min(completedForService, expectedChecks)
      })

      const completionStatus =
        totalChecks === 0
          ? 'none'
          : completedChecks >= totalChecks
            ? 'complete'
            : completedChecks > 0
              ? 'partial'
              : 'none'

      const personal = client.personal_details || {}
      const firstName = personal.first_name || personal.firstName || ''
      const lastName = personal.last_name || personal.lastName || ''
      const clientName = `${firstName} ${lastName}`.trim() || personal.full_name || personal.fullName || 'Unknown'

      return {
        clientId: client.id,
        clientName,
        clientRef: client.client_ref,
        status: client.status || 'active',
        firmId: client.firm_id,
        updatedAt: client.updated_at,
        servicesSelected,
        servicesUpdatedAt: serviceRecord?.updated_at || serviceRecord?.created_at || null,
        checksCompleted: completedChecks,
        checksTotal: totalChecks,
        completionStatus
      }
    })

    return NextResponse.json({
      success: true,
      clients: responseClients,
      servicesCatalog
    })
  } catch (error) {
    logger.error('Error building PROD client summary', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

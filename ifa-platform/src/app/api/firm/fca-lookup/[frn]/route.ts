export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getFCAConfig, isFCAApiError } from '@/lib/fca-register'

interface RouteParams {
  params: Promise<{ frn: string }>
}

async function fcaFetch(endpoint: string, config: { email: string; apiKey: string; baseUrl: string }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      headers: {
        'X-AUTH-EMAIL': config.email,
        'X-AUTH-KEY': config.apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }
    return response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * GET /api/firm/fca-lookup/[frn]
 * Look up a firm by its FRN (Firm Reference Number) on the FCA Register
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Auth check - any authenticated user
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { frn } = await params

    if (!frn || !/^\d{1,10}$/.test(frn)) {
      return NextResponse.json(
        { error: 'Invalid FRN format. FRN must be 1-10 digits.' },
        { status: 400 }
      )
    }

    let config: { email: string; apiKey: string; baseUrl: string }
    try {
      config = getFCAConfig()
    } catch {
      return NextResponse.json(
        { error: 'FCA Register not configured', message: 'FCA API credentials are not set up' },
        { status: 503 }
      )
    }

    // Parallel fetch: firm details + address
    const [firmResponse, addressResponse] = await Promise.all([
      fcaFetch(`/Firm/${frn}`, config),
      fcaFetch(`/Firm/${frn}/Address`, config),
    ])

    if (!firmResponse?.Data || firmResponse.Data.length === 0) {
      return NextResponse.json(
        { error: 'Firm not found' },
        { status: 404 }
      )
    }

    const firm = firmResponse.Data[0]

    // Get principal place of business address
    const addresses = addressResponse?.Data || []
    const principalAddress = addresses.find(
      (a: Record<string, string>) => a['Address Type'] === 'Principal Place of Business'
    ) || addresses[0]

    const normalized = {
      frn: firm['FRN'],
      name: firm['Organisation Name'],
      status: firm['Status'],
      statusEffectiveDate: firm['Status Effective Date'],
      address: principalAddress ? {
        line1: principalAddress['Address Line 1'],
        line2: principalAddress['Address Line 2'],
        town: principalAddress['Town'],
        county: principalAddress['County'],
        country: principalAddress['Country'],
        postcode: principalAddress['Postcode'],
      } : null,
      phone: principalAddress?.['Phone Number'],
      website: principalAddress?.['Website Address'],
    }

    return NextResponse.json({ firm: normalized })
  } catch (error) {
    console.error('FCA Register firm lookup error:', error)

    if (isFCAApiError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: 'Unable to fetch firm details' },
      { status: 500 }
    )
  }
}

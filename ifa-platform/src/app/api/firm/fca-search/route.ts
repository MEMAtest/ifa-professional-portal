export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/apiAuth'
import { getFCAConfig, isFCAApiError } from '@/lib/fca-register'
import { log } from '@/lib/logging/structured'

async function fcaFetch(url: string, config: { email: string; apiKey: string }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      headers: {
        'X-AUTH-EMAIL': config.email,
        'X-AUTH-KEY': config.apiKey,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * GET /api/firm/fca-search?q={query}
 * Search for firms on the FCA Register by name or FRN.
 * - If query is all digits, does a direct FRN lookup.
 * - If query contains letters, searches by firm name.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext(request)
    if (!authResult.success || !authResult.context) {
      return authResult.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get('q')?.trim()
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query too short', message: 'Enter at least 2 characters to search' },
        { status: 400 }
      )
    }

    let config: { email: string; apiKey: string; baseUrl: string }
    try {
      config = getFCAConfig()
    } catch {
      return NextResponse.json(
        { error: 'FCA Register not configured' },
        { status: 503 }
      )
    }

    const isNumeric = /^\d+$/.test(query)

    if (isNumeric) {
      // Direct FRN lookup
      const [firmResponse, addressResponse] = await Promise.all([
        fcaFetch(`${config.baseUrl}/Firm/${query}`, config),
        fcaFetch(`${config.baseUrl}/Firm/${query}/Address`, config),
      ])

      if (!firmResponse?.Data?.length) {
        return NextResponse.json({ results: [] })
      }

      const firm = firmResponse.Data[0]
      const addresses = addressResponse?.Data || []
      const addr = addresses.find(
        (a: Record<string, string>) => a['Address Type'] === 'Principal Place of Business'
      ) || addresses[0]

      return NextResponse.json({
        results: [{
          frn: firm['FRN'],
          name: firm['Organisation Name'],
          status: firm['Status'],
          statusEffectiveDate: firm['Status Effective Date'],
          address: addr ? {
            line1: addr['Address Line 1'],
            town: addr['Town'],
            postcode: addr['Postcode'],
          } : null,
        }],
      })
    }

    // Name-based search via FCA Register search endpoint
    const searchUrl = `${config.baseUrl}/Search?q=${encodeURIComponent(query)}&type=firm`
    const searchResponse = await fcaFetch(searchUrl, config)

    if (!searchResponse?.Data?.length) {
      return NextResponse.json({ results: [] })
    }

    // FCA Search API returns: "Reference Number", "Name" (with postcode appended), "Status", "URL"
    // FCA Firm API returns: "FRN", "Organisation Name", "Status"
    const results = searchResponse.Data
      .filter((item: Record<string, any>) => item['Type of business or Individual'] === 'Firm' || !item['Type of business or Individual'])
      .slice(0, 10)
      .map((firm: Record<string, any>) => ({
        frn: firm['Reference Number'] || firm['FRN'] || firm['Firm Reference Number'] || '',
        name: (firm['Name'] || firm['Organisation Name'] || '').replace(/\s*\(Postcode:.*?\)\s*$/, ''),
        status: firm['Status'] || '',
        statusEffectiveDate: firm['Status Effective Date'],
        address: null,
      }))

    return NextResponse.json({ results })
  } catch (error) {
    log.error('FCA Register search error:', error)

    if (isFCAApiError(error)) {
      return NextResponse.json({ error: 'FCA search failed' }, { status: error.status })
    }

    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

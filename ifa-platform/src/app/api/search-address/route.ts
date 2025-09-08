import { createClient } from "@/lib/supabase/server"
// src/app/api/search-address/route.ts
// ✅ FIXED: Added dynamic export to prevent static generation errors

import { NextRequest, NextResponse } from 'next/server';

// ✅ CRITICAL FIX: Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

/**
 * Check rate limit for IP address
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  userLimit.count++;
  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count 
  };
}

/**
 * OS API Response interface
 */
interface OSAPIResponse {
  header?: {
    totalresults?: number;
  };
  results?: Array<{
    GAZETTEER_ENTRY?: {
      NAME1?: string;
      DISTRICT_BOROUGH?: string;
      COUNTY_UNITARY?: string;
      POSTCODE_DISTRICT?: string;
      COUNTRY?: string;
      LOCAL_TYPE?: string;
      GEOMETRY_X?: number;
      GEOMETRY_Y?: number;
    };
  }>;
}

/**
 * Generate mock addresses for testing/fallback
 */
function generateMockAddresses(query: string) {
  const mockData = [
    {
      displayName: `${query} High Street`,
      fullAddress: `${query} High Street, London, SW1A 1AA`,
      postcode: 'SW1A 1AA',
      type: 'Street',
      coordinates: { lat: 51.5074, lng: -0.1278 }
    },
    {
      displayName: `${query} Business Park`,
      fullAddress: `${query} Business Park, Manchester, M1 1AA`,
      postcode: 'M1 1AA',
      type: 'Commercial',
      coordinates: { lat: 53.4808, lng: -2.2426 }
    },
    {
      displayName: `${query} Shopping Centre`,
      fullAddress: `${query} Shopping Centre, Birmingham, B1 1AA`,
      postcode: 'B1 1AA',
      type: 'Retail',
      coordinates: { lat: 52.4862, lng: -1.8904 }
    }
  ];

  return mockData.slice(0, Math.min(3, Math.max(1, query.length / 2)));
}

/**
 * Format OS API results
 */
function formatOSResults(results: OSAPIResponse['results']) {
  if (!results) return [];

  return results.map(result => {
    const gazEntry = result.GAZETTEER_ENTRY;
    if (!gazEntry) return null;

    const name = gazEntry.NAME1 || 'Unknown';
    const district = gazEntry.DISTRICT_BOROUGH || '';
    const county = gazEntry.COUNTY_UNITARY || '';
    const postcode = gazEntry.POSTCODE_DISTRICT || '';
    
    // Build address parts
    const addressParts = [district, county].filter(Boolean);
    const displayName = name;
    const fullAddress = `${name}${addressParts.length > 0 ? ', ' + addressParts.join(', ') : ''}`;
    
    return {
      displayName: displayName,
      fullAddress: fullAddress,
      postcode: postcode,
      type: gazEntry?.LOCAL_TYPE || 'Location',
      coordinates: {
        lat: parseFloat(gazEntry?.GEOMETRY_Y?.toString() || '0') || 0,
        lng: parseFloat(gazEntry?.GEOMETRY_X?.toString() || '0') || 0
      }
    };
  }).filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + 60000).toString()
          }
        }
      );
    }

    // ✅ FIXED: Use proper Next.js App Router syntax
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    // Validate input
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (query.length > 100) {
      return NextResponse.json(
        { error: 'Query too long' },
        { status: 400 }
      );
    }

    // Get API credentials from environment
    const apiKey = process.env.OS_API_KEY;
    const apiSecret = process.env.OS_API_SECRET;

    if (!apiKey) {
      console.error('OS_API_KEY not configured');
      // Fallback to enhanced mock data
      const mockResults = generateMockAddresses(query);
      return NextResponse.json(
        { 
          results: mockResults,
          source: 'mock',
          message: 'API key not configured - using mock data'
        },
        { 
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          }
        }
      );
    }

    // Log API key status for debugging
    console.log(`OS API Key present: ${!!apiKey}, Length: ${apiKey?.length}, First 4: ${apiKey?.substring(0, 4)}`);

    // Use Names API (which works with your API key)
    const osApiUrl = new URL('https://api.os.uk/search/names/v1/find');
    osApiUrl.searchParams.append('query', query);
    osApiUrl.searchParams.append('key', apiKey);
    osApiUrl.searchParams.append('maxresults', '10');

    // Make request to OS API
    const response = await fetch(osApiUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'IFA-Assessment-Platform/1.0',
        'Accept': 'application/json'
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error(`OS API Error: ${response.status} ${response.statusText}`);
      
      // Fallback to mock data
      const mockResults = generateMockAddresses(query);
      return NextResponse.json(
        { 
          results: mockResults,
          source: 'mock',
          message: `OS API unavailable (${response.status}) - using fallback data`
        },
        { 
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          }
        }
      );
    }

    const data: OSAPIResponse = await response.json();
    
    // Format results using Names API response structure
    const formattedResults = data.results ? formatOSResults(data.results) : [];
    
    // If no results from OS API, try mock data
    if (formattedResults.length === 0) {
      const mockResults = generateMockAddresses(query);
      return NextResponse.json(
        { 
          results: mockResults,
          source: 'mock',
          message: 'No OS API results found - using fallback data'
        },
        { 
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString()
          }
        }
      );
    }

    // Return successful results
    return NextResponse.json(
      { 
        results: formattedResults,
        source: 'os_api',
        totalResults: data.header?.totalresults || formattedResults.length
      },
      { 
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    );

  } catch (error) {
    console.error('Address search API error:', error);
    
    // Get query for fallback
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    
    // Fallback to mock data
    const mockResults = generateMockAddresses(query);
    
    return NextResponse.json(
      { 
        results: mockResults,
        source: 'mock',
        message: 'Service temporarily unavailable - using fallback data'
      },
      { 
        status: 200,  // Don't fail the request
        headers: {
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
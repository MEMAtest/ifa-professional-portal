// app/api/search-address/route.ts
// Backend API route for secure OS API integration

import { NextRequest, NextResponse } from 'next/server';

// Types for OS API response - Updated to match actual Names API structure
interface OSGazetteerEntry {
  ID?: string;
  NAMES_URI?: string;
  NAME1?: string;
  NAME2?: string;
  TYPE?: string;
  LOCAL_TYPE?: string;
  GEOMETRY_X?: number;
  GEOMETRY_Y?: number;
  MOST_DETAIL_VIEW_RES?: number;
  LEAST_DETAIL_VIEW_RES?: number;
  POPULATED_PLACE?: string;
  POPULATED_PLACE_URI?: string;
  POPULATED_PLACE_TYPE?: string;
  DISTRICT_BOROUGH?: string;
  DISTRICT_BOROUGH_URI?: string;
  DISTRICT_BOROUGH_TYPE?: string;
  COUNTY_UNITARY?: string;
  COUNTY_UNITARY_URI?: string;
  COUNTY_UNITARY_TYPE?: string;
  REGION?: string;
  REGION_URI?: string;
  COUNTRY?: string;
  COUNTRY_URI?: string;
  POSTCODE_DISTRICT?: string;
}

interface OSResult {
  GAZETTEER_ENTRY: OSGazetteerEntry;
}

interface OSAPIResponse {
  results?: OSResult[];
  header?: {
    totalresults: number;
  };
}

interface FormattedAddress {
  displayName: string;
  fullAddress: string;
  postcode: string;
  type: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 30; // Max 30 requests per minute per IP

  const current = rateLimitStore.get(ip);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

// Enhanced mock address generator for fallback
function generateMockAddresses(query: string): FormattedAddress[] {
  const ukLocations = [
    { name: "London", county: "Greater London", postcode: "SW1A 1AA", type: "City" },
    { name: "Manchester", county: "Greater Manchester", postcode: "M1 1AA", type: "City" },
    { name: "Birmingham", county: "West Midlands", postcode: "B1 1AA", type: "City" },
    { name: "Leeds", county: "West Yorkshire", postcode: "LS1 1AA", type: "City" },
    { name: "Glasgow", county: "Scotland", postcode: "G1 1AA", type: "City" },
    { name: "Cardiff", county: "Wales", postcode: "CF1 1AA", type: "City" },
    { name: "Belfast", county: "Northern Ireland", postcode: "BT1 1AA", type: "City" },
    { name: "Liverpool", county: "Merseyside", postcode: "L1 1AA", type: "City" },
    { name: "Newcastle", county: "Tyne and Wear", postcode: "NE1 1AA", type: "City" },
    { name: "Bristol", county: "Gloucestershire", postcode: "BS1 1AA", type: "City" },
    { name: "Edinburgh", county: "Scotland", postcode: "EH1 1AA", type: "City" },
    { name: "Nottingham", county: "Nottinghamshire", postcode: "NG1 1AA", type: "City" },
    { name: "Sheffield", county: "South Yorkshire", postcode: "S1 1AA", type: "City" },
    { name: "Leicester", county: "Leicestershire", postcode: "LE1 1AA", type: "City" },
    { name: "Southampton", county: "Hampshire", postcode: "SO1 1AA", type: "City" }
  ];

  return ukLocations
    .filter(location => 
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      location.postcode.toLowerCase().includes(query.toLowerCase()) ||
      location.county.toLowerCase().includes(query.toLowerCase())
    )
    .map(location => ({
      displayName: location.name,
      fullAddress: `${location.name}, ${location.county}`,
      postcode: location.postcode,
      type: location.type,
      coordinates: { lat: 51.5074, lng: -0.1278 } // Default to London coords
    }))
    .slice(0, 8);
}

// Format OS Names API response to our standard format
function formatOSResults(results: OSResult[]): FormattedAddress[] {
  return results.map(result => {
    const gazEntry = result.GAZETTEER_ENTRY;
    const postcode = gazEntry?.NAME1 || ''; // Names API puts postcode in NAME1
    const area = gazEntry?.POPULATED_PLACE || '';
    const district = gazEntry?.DISTRICT_BOROUGH || '';
    const county = gazEntry?.COUNTY_UNITARY || '';
    
    // Build display name and full address
    const displayName = area || postcode;
    const addressParts = [area, district, county].filter(part => part && part !== area);
    const fullAddress = `${displayName}${addressParts.length > 0 ? ', ' + addressParts.join(', ') : ''}`;
    
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
  });
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

    // Get query parameter
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
// src/app/api/search-address/route.ts
// Address search API - uses multiple providers:
// 1. Photon (free, OSM-based) - provides street-level addresses
// 2. postcodes.io (free) - UK postcode validation and area data
// 3. GetAddress.io (paid, optional) - premium UK address data

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logging/structured';
import { getAuthContext } from '@/lib/auth/apiAuth'
import { rateLimit } from '@/lib/security/rateLimit'

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// GetAddress.io API key from environment (optional - for premium lookups)
const GETADDRESS_API_KEY = process.env.GETADDRESS_API_KEY;
// Ordnance Survey Places API key (free tier supported)
const OS_API_KEY = process.env.OS_API_KEY;

/**
 * GetAddress.io response interface
 */
interface GetAddressResponse {
  postcode: string;
  latitude: number;
  longitude: number;
  addresses: string[];
}

/**
 * Ordnance Survey Places API (free tier) response interface
 */
interface OsPlacesResult {
  DPA?: {
    ADDRESS?: string;
    POSTCODE?: string;
    POST_TOWN?: string;
    ADMINISTRATIVE_AREA?: string;
    LOCALITY_NAME?: string;
    THOROUGHFARE_NAME?: string;
    BUILDING_NUMBER?: string;
    BUILDING_NAME?: string;
    ORGANISATION_NAME?: string;
    SUB_BUILDING_NAME?: string;
    DEPENDENT_THOROUGHFARE_NAME?: string;
    DEPENDENT_LOCALITY?: string;
    LAT?: number;
    LNG?: number;
  };
  LPI?: {
    ADDRESS?: string;
    POSTCODE?: string;
    POST_TOWN?: string;
    ADMINISTRATIVE_AREA?: string;
    LOCALITY_NAME?: string;
    THOROUGHFARE_NAME?: string;
    BUILDING_NUMBER?: string;
    BUILDING_NAME?: string;
    ORGANISATION_NAME?: string;
    SUB_BUILDING_NAME?: string;
    DEPENDENT_THOROUGHFARE_NAME?: string;
    DEPENDENT_LOCALITY?: string;
    LAT?: number;
    LNG?: number;
  };
}

interface OsPlacesResponse {
  results?: OsPlacesResult[];
}

/**
 * Search addresses using Ordnance Survey Places API (free tier)
 * https://osdatahub.os.uk/docs/places/overview
 */
async function searchWithOsPlaces(query: string): Promise<any[]> {
  if (!OS_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.os.uk/search/places/v1/find?query=${encodeURIComponent(query)}&key=${OS_API_KEY}&output_srs=WGS84&maxresults=10`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'IFA-Platform/1.0'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      log.error('OS Places API error', { status: response.status });
      return [];
    }

    const data: OsPlacesResponse = await response.json();
    const results = data.results || [];

    return results
      .map((result) => {
        const record = result.DPA || result.LPI;
        if (!record) return null;

        const postcode = record.POSTCODE || '';
        const line1 =
          [
            record.BUILDING_NUMBER,
            record.THOROUGHFARE_NAME || record.DEPENDENT_THOROUGHFARE_NAME
          ]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          record.BUILDING_NAME ||
          record.SUB_BUILDING_NAME ||
          record.ORGANISATION_NAME ||
          (record.ADDRESS ? record.ADDRESS.split(',')[0].trim() : '');

        const city = record.POST_TOWN || record.LOCALITY_NAME || record.DEPENDENT_LOCALITY || '';
        const county = record.ADMINISTRATIVE_AREA || '';

        const displayName = [line1, city, postcode].filter(Boolean).join(', ');

        return {
          displayName,
          fullAddress: record.ADDRESS || displayName,
          postcode,
          type: 'Address',
          town: city,
          administrative_area: county,
          components: {
            line1,
            line2: '',
            city,
            county,
            postcode,
            country: 'United Kingdom'
          },
          coordinates: record.LAT && record.LNG ? {
            lat: Number(record.LAT),
            lng: Number(record.LNG)
          } : undefined
        };
      })
      .filter((address): address is NonNullable<typeof address> => !!address && !!address.components.line1);
  } catch (error) {
    log.error('OS Places API fetch error', error);
    return [];
  }
}

/**
 * Search addresses using GetAddress.io API (provides full street addresses)
 */
async function searchWithGetAddress(postcode: string): Promise<any[]> {
  if (!GETADDRESS_API_KEY) {
    return [];
  }

  const formattedPostcode = postcode.replace(/\s+/g, '').toUpperCase();

  try {
    const response = await fetch(
      `https://api.getaddress.io/find/${formattedPostcode}?api-key=${GETADDRESS_API_KEY}&expand=true`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        log.debug('Postcode not found in GetAddress.io', { postcode });
        return [];
      }
      log.error('GetAddress.io API error', { status: response.status, postcode });
      return [];
    }

    const data: GetAddressResponse = await response.json();

    // Parse GetAddress.io response into our format
    // Each address is a comma-separated string like "10, Downing Street, , , , London, Greater London"
    return data.addresses.map((addressStr: string) => {
      const parts = addressStr.split(',').map(p => p.trim());

      // GetAddress.io format: building_number, thoroughfare, line_2, line_3, line_4, locality, town_or_city, county
      // But the 'expand=true' parameter gives us an object instead
      let line1 = '';
      let line2 = '';
      let city = '';
      let county = '';

      if (typeof addressStr === 'string') {
        // String format - parse the comma-separated parts
        const [buildingNum, street, l2, l3, l4, locality, townCity, countyName] = parts;

        // Build line1 from building number and street
        line1 = [buildingNum, street].filter(Boolean).join(' ').trim();
        // line2 from additional address lines
        line2 = [l2, l3, l4].filter(Boolean).join(', ').trim();
        // City from locality or town
        city = townCity || locality || '';
        county = countyName || '';
      }

      const displayName = [line1, city, data.postcode].filter(Boolean).join(', ');

      return {
        displayName,
        fullAddress: addressStr,
        postcode: data.postcode,
        type: 'Address',
        town: city,
        administrative_area: county,
        components: {
          line1,
          line2,
          city,
          county,
          postcode: data.postcode,
          country: 'United Kingdom'
        },
        coordinates: {
          lat: data.latitude,
          lng: data.longitude
        }
      };
    });
  } catch (error) {
    log.error('GetAddress.io fetch error', error);
    return [];
  }
}

/**
 * Autocomplete partial postcodes using GetAddress.io
 */
async function autocompleteWithGetAddress(query: string): Promise<string[]> {
  if (!GETADDRESS_API_KEY) {
    return [];
  }

  const normalized = query.replace(/\s+/g, '').toUpperCase();

  try {
    const response = await fetch(
      `https://api.getaddress.io/autocomplete/${normalized}?api-key=${GETADDRESS_API_KEY}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.suggestions?.map((s: any) => s.postcode || s) || [];
  } catch (error) {
    log.error('GetAddress.io autocomplete error', error);
    return [];
  }
}

/**
 * Photon API response interface (OSM-based free geocoding)
 */
interface PhotonFeature {
  type: string;
  geometry: {
    coordinates: [number, number]; // [lng, lat]
    type: string;
  };
  properties: {
    osm_id: number;
    osm_type: string;
    country: string;
    countrycode: string;
    city?: string;
    postcode?: string;
    street?: string;
    housenumber?: string;
    name?: string;
    state?: string;
    county?: string;
    district?: string;
    locality?: string;
    type?: string;
  };
}

interface PhotonResponse {
  type: string;
  features: PhotonFeature[];
}

/**
 * Search addresses using Photon API (FREE - OpenStreetMap based)
 * https://photon.komoot.io/
 */
async function searchWithPhoton(query: string): Promise<any[]> {
  try {
    // Photon API - free OSM-based geocoding with UK bbox filter
    // bbox format: minLon,minLat,maxLon,maxLat (UK approximate bounds)
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en&bbox=-10.5,49.5,2.0,61.0`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'IFA-Platform/1.0'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      log.error('Photon API error', { status: response.status });
      return [];
    }

    const data: PhotonResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    // Filter to UK results only and map to our format
    return data.features
      .filter(f => f.properties.countrycode === 'GB')
      .map(feature => {
        const props = feature.properties;
        const coords = feature.geometry.coordinates;

        // Build line1 from house number and street
        let line1 = '';
        if (props.housenumber && props.street) {
          line1 = `${props.housenumber} ${props.street}`;
        } else if (props.street) {
          line1 = props.street;
        } else if (props.name) {
          line1 = props.name;
        }

        const city = props.city || props.locality || props.district || '';
        const county = props.county || props.state || '';
        const postcode = props.postcode || '';

        const displayParts = [line1, city, postcode].filter(Boolean);
        const displayName = displayParts.join(', ');

        return {
          displayName,
          fullAddress: displayName,
          postcode,
          type: props.type || 'Address',
          town: city,
          administrative_area: county,
          components: {
            line1,
            line2: '',
            city,
            county,
            postcode,
            country: 'United Kingdom'
          },
          coordinates: {
            lat: coords[1],
            lng: coords[0]
          }
        };
      })
      .filter(addr => addr.components.line1); // Only return results with actual street addresses
  } catch (error) {
    log.error('Photon API fetch error', error);
    return [];
  }
}

/**
 * postcodes.io response interface
 */
interface PostcodesIOResponse {
  status: number;
  result: {
    postcode: string;
    quality: number;
    eastings: number;
    northings: number;
    country: string;
    nhs_ha: string;
    longitude: number;
    latitude: number;
    european_electoral_region: string;
    primary_care_trust: string;
    region: string;
    lsoa: string;
    msoa: string;
    incode: string;
    outcode: string;
    parliamentary_constituency: string;
    admin_district: string;
    parish: string;
    admin_county: string | null;
    admin_ward: string;
    ced: string | null;
    ccg: string;
    nuts: string;
    codes: {
      admin_district: string;
      admin_county: string;
      admin_ward: string;
      parish: string;
      parliamentary_constituency: string;
      ccg: string;
      ced: string;
      nuts: string;
    };
  } | null;
}

interface PostcodesIOAutocompleteResponse {
  status: number;
  result: string[] | null;
}

/**
 * Check if query looks like a UK postcode
 */
function isUKPostcode(query: string): boolean {
  const normalized = query.replace(/\s+/g, '').toUpperCase();
  // Full UK postcode regex (with or without space)
  const fullPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/;
  // Partial postcode (outward code only): A9, A99, AA9, AA99, A9A, AA9A
  const partialPostcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?$/;

  return fullPostcodeRegex.test(normalized) || partialPostcodeRegex.test(normalized);
}

/**
 * Format postcode for API call (ensure proper spacing)
 */
function formatPostcode(query: string): string {
  const normalized = query.replace(/\s+/g, '').toUpperCase();
  if (normalized.length > 4) {
    return normalized.slice(0, -3) + ' ' + normalized.slice(-3);
  }
  return normalized;
}

/**
 * Lookup a full postcode using postcodes.io
 */
async function lookupPostcode(postcode: string) {
  const formattedPostcode = formatPostcode(postcode);
  const encodedPostcode = encodeURIComponent(formattedPostcode);

  const response = await fetch(`https://api.postcodes.io/postcodes/${encodedPostcode}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    log.error('postcodes.io lookup failed', { status: response.status, postcode: formattedPostcode });
    return null;
  }

  const data: PostcodesIOResponse = await response.json();
  return data.result;
}

/**
 * Autocomplete partial postcodes using postcodes.io
 */
async function autocompletePostcode(query: string): Promise<string[]> {
  const normalized = query.replace(/\s+/g, '').toUpperCase();

  const response = await fetch(`https://api.postcodes.io/postcodes/${normalized}/autocomplete`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    log.error('postcodes.io autocomplete failed', { status: response.status, query });
    return [];
  }

  const data: PostcodesIOAutocompleteResponse = await response.json();
  return data.result || [];
}

/**
 * Format postcodes.io result to our address format
 * Note: postcodes.io provides postcode + area data, not street addresses
 * User will need to enter line1/line2 manually
 */
function formatPostcodeResult(result: PostcodesIOResponse['result'], postcode: string) {
  if (!result) return null;

  const ward = result.admin_ward || '';
  const district = result.admin_district || '';
  const region = result.region || '';

  // Build display name
  const displayParts = [ward, district].filter(Boolean);
  const displayName = displayParts.length > 0
    ? `${result.postcode}, ${displayParts.join(', ')}`
    : result.postcode;

  return {
    displayName: displayName,
    fullAddress: `${result.postcode}, ${district}, ${region}`,
    postcode: result.postcode,
    type: 'Postcode',
    town: district,
    administrative_area: result.admin_county || region,
    components: {
      line1: '',
      line2: '',
      city: district,
      county: result.admin_county || region,
      postcode: result.postcode,
      country: 'United Kingdom'
    },
    coordinates: {
      lat: result.latitude,
      lng: result.longitude
    }
  };
}

// Cache for postcode lookups (15 minute TTL)
const postcodeCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get streets for a postcode using postcodes.io + Overpass API (direct OSM query)
 * OPTIMIZED: Parallel API calls + caching for speed
 */
async function getStreetsForPostcode(postcode: string) {
  const cacheKey = postcode.replace(/\s/g, '').toUpperCase();

  // Check cache first
  const cached = postcodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    log.debug('Returning cached postcode result', { postcode: cacheKey });
    return cached.data;
  }

  // Step 1: Get coordinates and area info from postcodes.io
  const pcResponse = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s/g, ''))}`,
    { signal: AbortSignal.timeout(5000) }
  );

  if (!pcResponse.ok) {
    return null;
  }

  const pcData = await pcResponse.json();
  if (!pcData.result) {
    return null;
  }

  const { latitude, longitude, admin_district, admin_county, postcode: formattedPostcode } = pcData.result;

  // Step 2: Run Nominatim and Overpass in PARALLEL for speed
  const overpassQuery = `[out:json][timeout:8];(way["highway"]["name"](around:500,${latitude},${longitude}););out tags;`;

  const [nominatimResult, overpassResult] = await Promise.allSettled([
    // Nominatim reverse geocode
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'IFA-Platform/1.0 (contact@memaconsultants.com)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(4000)
      }
    ).then(r => r.ok ? r.json() : null).catch(() => null),

    // Overpass API - use faster timeout
    fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`,
      {
        headers: {
          'User-Agent': 'IFA-Platform/1.0',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      }
    ).then(r => r.ok ? r.json() : null).catch(() => null)
  ]);

  const streets: string[] = [];

  // Process Nominatim result (exact street at postcode)
  if (nominatimResult.status === 'fulfilled' && nominatimResult.value?.address?.road) {
    streets.push(nominatimResult.value.address.road);
  }

  // Process Overpass result (all streets in area)
  if (overpassResult.status === 'fulfilled' && overpassResult.value?.elements) {
    const osmStreets = overpassResult.value.elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => el.tags.name);

    for (const street of osmStreets) {
      if (!streets.includes(street)) {
        streets.push(street);
      }
    }
  }

  // Step 3: Only use Photon fallback if we got very few streets (parallel calls failed)
  if (streets.length < 3) {
    try {
      const photonResponse = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(admin_district)}&lat=${latitude}&lon=${longitude}&limit=30&lang=en`,
        {
          headers: { 'User-Agent': 'IFA-Platform/1.0' },
          signal: AbortSignal.timeout(4000)
        }
      );

      if (photonResponse.ok) {
        const photonData = await photonResponse.json();
        const photonStreets = photonData.features
          ?.filter((f: any) => f.properties?.street && f.properties?.countrycode === 'GB')
          .map((f: any) => f.properties.street) || [];

        for (const street of photonStreets) {
          if (!streets.includes(street)) {
            streets.push(street);
          }
        }
      }
    } catch (e) {
      log.debug('Photon fallback failed', { error: String(e) });
    }
  }

  // Sort streets alphabetically (but keep the first one - exact match from reverse geocode - at top)
  const exactMatch = streets[0];
  const sortedRest = streets.slice(1).sort();
  const finalStreets = exactMatch ? [exactMatch, ...sortedRest] : sortedRest;

  const result = {
    postcode: formattedPostcode,
    city: admin_district,
    county: admin_county || '',
    coordinates: { lat: latitude, lng: longitude },
    streets: finalStreets
  };

  // Cache the result
  postcodeCache.set(cacheKey, { data: result, timestamp: Date.now() });

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth.success || !auth.context) {
      return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResponse = await rateLimit(request, 'address')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const mode = searchParams.get('mode');
    const postcode = searchParams.get('postcode');

    // MODE: streets - Get list of streets for a postcode
    if (mode === 'streets' && postcode) {
      log.debug('Getting streets for postcode', { postcode });

      const result = await getStreetsForPostcode(postcode);

      if (!result) {
        return NextResponse.json(
          { error: 'Invalid postcode or postcode not found' },
          { status: 404 }
        );
      }

      log.info('Streets lookup successful', {
        postcode: result.postcode,
        streetCount: result.streets.length
      });

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
    }

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

    log.debug('Address search request', {
      query,
      hasGetAddressKey: !!GETADDRESS_API_KEY,
      hasOsPlacesKey: !!OS_API_KEY
    });

    const results: any[] = [];
    const isPostcode = isUKPostcode(query);

    // First, try Photon for any query (free, provides street-level addresses)
    log.debug('Trying Photon API for address search', { query });
    const photonResults = await searchWithPhoton(query);
    if (photonResults.length > 0) {
      results.push(...photonResults);
      log.debug('Photon returned results', { count: photonResults.length });
    }

    // If Photon didn't return results, try OS Places (free tier, UK addresses)
    if (results.length === 0 && OS_API_KEY) {
      log.debug('Trying OS Places API for address search', { query });
      const osPlacesResults = await searchWithOsPlaces(query);
      if (osPlacesResults.length > 0) {
        results.push(...osPlacesResults);
        log.debug('OS Places returned results', { count: osPlacesResults.length });
      }
    }

    // If Photon didn't return results and it looks like a postcode, try postcode-specific lookups
    if (results.length === 0 && isPostcode) {
      const normalized = query.replace(/\s+/g, '').toUpperCase();
      const isFullPostcode = normalized.length >= 5 && /[0-9][A-Z]{2}$/.test(normalized);

      if (isFullPostcode) {
        // Try GetAddress.io if available (provides actual street addresses)
        if (GETADDRESS_API_KEY && results.length === 0) {
          log.debug('Using GetAddress.io for full postcode lookup', { query });
          const getAddressResults = await searchWithGetAddress(query);
          if (getAddressResults.length > 0) {
            results.push(...getAddressResults);
          }
        }

        // Fall back to postcodes.io (area data only, user enters street manually)
        if (results.length === 0) {
          log.debug('Falling back to postcodes.io', { query });
          const result = await lookupPostcode(query);
          if (result) {
            const formatted = formatPostcodeResult(result, query);
            if (formatted) {
              results.push(formatted);
            }
          }
        }
      } else {
        // Partial postcode - autocomplete
        if (GETADDRESS_API_KEY && results.length === 0) {
          log.debug('Using GetAddress.io autocomplete', { query });
          const suggestions = await autocompleteWithGetAddress(query);
          for (const postcode of suggestions.slice(0, 3)) {
            const addresses = await searchWithGetAddress(postcode);
            results.push(...addresses.slice(0, 3));
          }
        }

        // Fall back to postcodes.io
        if (results.length === 0) {
          log.debug('Falling back to postcodes.io autocomplete', { query });
          const postcodes = await autocompletePostcode(query);
          const lookupPromises = postcodes.slice(0, 5).map(async (pc) => {
            const result = await lookupPostcode(pc);
            if (result) {
              return formatPostcodeResult(result, pc);
            }
            return null;
          });
          const lookedUp = await Promise.all(lookupPromises);
          results.push(...lookedUp.filter(Boolean));
        }
      }
    }

    // For non-postcode queries with no Photon results, provide guidance
    if (results.length === 0 && !isPostcode) {
      log.debug('Non-postcode query with no results', { query });

      return NextResponse.json(
        {
          results: [],
          source: 'photon',
          message: 'No addresses found. Try entering a full address (e.g., "10 Downing Street London") or a UK postcode.'
        }
      );
    }

    if (results.length === 0) {
      log.info('No results found', { query });
      return NextResponse.json(
        {
          results: [],
          source: 'photon',
          message: 'No addresses found. Please check the address or postcode and try again.'
        }
      );
    }

    // Determine the source based on what returned results
    const source = photonResults.length > 0
      ? 'photon'
      : (OS_API_KEY ? 'os_places' : (GETADDRESS_API_KEY ? 'getaddress.io' : 'postcodes.io'));
    log.info('Address search successful', { query, resultCount: results.length, source });

    return NextResponse.json(
      {
        results,
        source,
        totalResults: results.length
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    );

  } catch (error) {
    log.error('Address search API error', error);

    return NextResponse.json(
      {
        results: [],
        source: 'error',
        message: 'Address search service temporarily unavailable. Please try again.'
      },
      {
        status: 200, // Don't fail the request
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

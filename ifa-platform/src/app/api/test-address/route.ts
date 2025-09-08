import { createClient } from "@/lib/supabase/server"
// src/app/api/test-address/route.ts
// ✅ FIXED: Added dynamic export to prevent static generation errors
// Debug endpoint to test OS API directly

import { NextRequest, NextResponse } from 'next/server';

// ✅ CRITICAL FIX: Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // ✅ FIXED: Use proper Next.js App Router syntax
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || 'SE20';

  const apiKey = process.env.OS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ 
      error: 'API key not configured',
      message: 'OS_API_KEY environment variable is missing'
    });
  }

  try {
    // Test different OS API endpoints
    const endpoints = [
      {
        name: 'Places API - Postcode',
        url: `https://api.os.uk/search/places/v1/postcode?postcode=${query}&key=${apiKey}`,
      },
      {
        name: 'Places API - Find',
        url: `https://api.os.uk/search/places/v1/find?text=${query}&key=${apiKey}`,
      },
      {
        name: 'Names API - Find',
        url: `https://api.os.uk/search/names/v1/find?query=${query}&key=${apiKey}`,
      }
    ];

    type Result = {
      endpoint: string;
      status: number | string;
      success: boolean;
      data?: any;
      error?: string;
      url: string;
      responseTime: number | null;
    };
    const results: Result[] = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint.name}`);
        
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'IFA-Assessment-Platform/1.0',
            'Accept': 'application/json'
          },
          // 10 second timeout per endpoint
          signal: AbortSignal.timeout(10000)
        });
        
        const data = await response.json();
        
        results.push({
          endpoint: endpoint.name,
          status: response.status,
          success: response.ok,
          data: response.ok ? data : { error: data },
          url: endpoint.url.replace(apiKey, 'HIDDEN_KEY'),
          responseTime: Date.now() // Simple timing
        });
        
        console.log(`✅ ${endpoint.name}: ${response.status}`);
        
      } catch (error) {
        console.error(`❌ ${endpoint.name} failed:`, error);
        
        results.push({
          endpoint: endpoint.name,
          status: 'ERROR',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          url: endpoint.url.replace(apiKey, 'HIDDEN_KEY'),
          responseTime: null
        });
      }
    }

    // Summary
    const successfulEndpoints = results.filter(r => r.success).length;
    const totalEndpoints = results.length;

    return NextResponse.json({
      query,
      timestamp: new Date().toISOString(),
      summary: {
        total: totalEndpoints,
        successful: successfulEndpoints,
        failed: totalEndpoints - successfulEndpoints,
        apiKeyConfigured: true,
        apiKeyLength: apiKey.length
      },
      results,
      recommendations: generateRecommendations(results)
    });

  } catch (error) {
    console.error('❌ Test address API failed:', error);
    
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      query,
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        successful: 0,
        failed: 1,
        apiKeyConfigured: true,
        apiKeyLength: apiKey.length
      }
    });
  }
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(results: any[]): string[] {
  const recommendations: string[] = [];
  
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  if (successfulResults.length === 0) {
    recommendations.push('❌ All API endpoints failed - check your API key and network connectivity');
  } else if (successfulResults.length < results.length) {
    recommendations.push(`⚠️ ${failedResults.length} out of ${results.length} endpoints failed`);
  } else {
    recommendations.push('✅ All API endpoints are working correctly');
  }
  
  // Check specific endpoints
  const namesApiResult = results.find(r => r.endpoint.includes('Names API'));
  if (namesApiResult?.success) {
    recommendations.push('✅ Names API is working - this is the recommended endpoint for address search');
  }
  
  const placesApiResult = results.find(r => r.endpoint.includes('Places API'));
  if (placesApiResult && !placesApiResult.success) {
    recommendations.push('⚠️ Places API failed - consider using Names API as fallback');
  }
  
  // Check for common error patterns
  const unauthorizedErrors = results.filter(r => 
    r.status === 401 || 
    (r.error && r.error.toString().toLowerCase().includes('unauthorized'))
  );
  
  if (unauthorizedErrors.length > 0) {
    recommendations.push('🔑 API key authentication failed - verify your OS_API_KEY is correct');
  }
  
  const rateLimitErrors = results.filter(r => r.status === 429);
  if (rateLimitErrors.length > 0) {
    recommendations.push('⏱️ Rate limit exceeded - reduce request frequency');
  }
  
  return recommendations;
}

/**
 * OPTIONS method for CORS
 */
export async function OPTIONS() {
  return NextResponse.json(
    { message: 'OK' },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
}
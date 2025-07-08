// app/api/test-address/route.ts
// Debug endpoint to test OS API directly

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || 'SE20';

  const apiKey = process.env.OS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' });
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

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();
        
        results.push({
          endpoint: endpoint.name,
          status: response.status,
          success: response.ok,
          data: response.ok ? data : { error: data },
          url: endpoint.url.replace(apiKey, 'HIDDEN_KEY')
        });
      } catch (error) {
        results.push({
          endpoint: endpoint.name,
          status: 'ERROR',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          url: endpoint.url.replace(apiKey, 'HIDDEN_KEY')
        });
      }
    }

    return NextResponse.json({
      query,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
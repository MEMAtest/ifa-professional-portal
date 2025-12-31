#!/usr/bin/env node
// ================================================================
// OPENSIGN API VERSION AND BASE PATH DISCOVERY
// ================================================================

const API_KEY = 'test.31sA2OOGMnS99Jd7sUu2TF';

async function testOpenSignAPIVersions() {
  console.log('🔍 OPENSIGN API VERSION DISCOVERY');
  console.log('==================================');

  const basePaths = [
    'https://app.opensignlabs.com/api/v1',
    'https://app.opensignlabs.com/api/v1.1',
    'https://app.opensignlabs.com/api/v2',
    'https://app.opensignlabs.com/api',
    'https://app.opensignlabs.com/v1',
    'https://api.opensignlabs.com/v1',
    'https://api.opensignlabs.com/api/v1',
    'https://opensignlabs.com/api/v1'
  ];

  const testEndpoints = [
    '',
    '/health',
    '/status',
    '/info',
    '/credits',
    '/documents',
    '/templates'
  ];

  const results = [];

  for (const basePath of basePaths) {
    console.log(`\n🔗 Testing base path: ${basePath}`);

    for (const endpoint of testEndpoints) {
      const url = `${basePath}${endpoint}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-token': API_KEY,
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`   ${endpoint || '/'}: ${response.status}`);

        if (response.status !== 404) {
          const responseText = await response.text();
          console.log(`      Response: ${responseText.substring(0, 150)}...`);

          results.push({
            basePath,
            endpoint,
            status: response.status,
            response: responseText.substring(0, 300)
          });
        }

      } catch (error) {
        console.log(`   ${endpoint || '/'}: ERROR - ${error.message}`);
      }
    }
  }

  // Test without authentication
  console.log('\n🔓 TESTING WITHOUT AUTHENTICATION');
  console.log('=================================');

  const publicEndpoints = [
    'https://app.opensignlabs.com/',
    'https://app.opensignlabs.com/api',
    'https://api.opensignlabs.com/',
    'https://docs.opensignlabs.com/api'
  ];

  for (const url of publicEndpoints) {
    try {
      const response = await fetch(url);
      console.log(`${url}: ${response.status}`);

      if (response.status === 200) {
        const text = await response.text();
        console.log(`   Content preview: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`${url}: ERROR - ${error.message}`);
    }
  }

  // Check if we can find any valid API patterns
  console.log('\n🕵️ SEARCHING FOR API PATTERNS');
  console.log('=============================');

  // Test the main app to see if we can find API references
  try {
    const response = await fetch('https://app.opensignlabs.com/');
    if (response.ok) {
      const html = await response.text();

      // Look for API references in the HTML
      const apiMatches = html.match(/\/api\/[^"'\s]+/g) || [];
      const uniqueApiPaths = [...new Set(apiMatches)];

      if (uniqueApiPaths.length > 0) {
        console.log('Found API paths in main app:');
        uniqueApiPaths.forEach(path => console.log(`   ${path}`));
      } else {
        console.log('No API paths found in main app HTML');
      }
    }
  } catch (error) {
    console.log(`Error fetching main app: ${error.message}`);
  }

  // Summary
  console.log('\n📋 DISCOVERY SUMMARY');
  console.log('====================');

  if (results.length > 0) {
    console.log('Found these working combinations:');
    results.forEach(result => {
      console.log(`✅ ${result.basePath}${result.endpoint} - ${result.status}`);
    });
  } else {
    console.log('❌ No working API endpoints found');
    console.log('\nPossible reasons:');
    console.log('- Test API key may not be valid');
    console.log('- API may require account upgrade');
    console.log('- API may not be publicly accessible');
    console.log('- Different authentication method required');
  }

  return results;
}

testOpenSignAPIVersions();
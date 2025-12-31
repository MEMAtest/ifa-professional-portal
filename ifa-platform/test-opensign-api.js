#!/usr/bin/env node
// ================================================================
// OPENSIGN API ENDPOINT DISCOVERY TEST
// ================================================================

const API_KEY = 'test.31sA2OOGMnS99Jd7sUu2TF';
const BASE_URL = 'https://app.opensignlabs.com/api/v1';

async function testOpenSignAPI() {
  console.log('🔍 OPENSIGN API ENDPOINT DISCOVERY');
  console.log('===================================');
  console.log('API Key:', API_KEY);
  console.log('Base URL:', BASE_URL);
  console.log('');

  const endpoints = [
    '/documents',
    '/document',
    '/docs',
    '/doc',
    '/templates',
    '/template',
    '/credits',
    '/credit',
    '/health',
    '/status',
    '/info',
    '/upload',
    '/files',
    '/file'
  ];

  const results = [];

  // Test GET requests first
  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`📡 Testing GET ${endpoint}...`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-token': API_KEY,
          'Content-Type': 'application/json'
        }
      });

      const responseText = await response.text();
      console.log(`   Status: ${response.status}`);

      if (response.status !== 404) {
        console.log(`   Response (first 200 chars): ${responseText.substring(0, 200)}...`);
        results.push({
          endpoint,
          method: 'GET',
          status: response.status,
          success: response.status < 400,
          response: responseText.substring(0, 500)
        });
      }

    } catch (error) {
      console.log(`   Error: ${error.message}`);
      results.push({
        endpoint,
        method: 'GET',
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }
  }

  console.log('\n🔍 TESTING KNOWN WORKING ENDPOINTS');
  console.log('==================================');

  // Test credits endpoint specifically (this worked before)
  console.log('📊 Testing /credits endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/credits`, {
      headers: {
        'x-api-token': API_KEY
      }
    });

    const responseText = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${responseText}`);

    if (response.ok) {
      results.push({
        endpoint: '/credits',
        method: 'GET',
        status: response.status,
        success: true,
        response: responseText
      });
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  // Test POST endpoints for document creation
  console.log('\n📝 TESTING DOCUMENT CREATION ENDPOINTS');
  console.log('=====================================');

  const documentEndpoints = [
    { endpoint: '/documents', method: 'POST' },
    { endpoint: '/document', method: 'POST' },
    { endpoint: '/docs', method: 'POST' },
    { endpoint: '/doc', method: 'POST' },
    { endpoint: '/upload', method: 'POST' },
    { endpoint: '/files', method: 'POST' },
    { endpoint: '/file', method: 'POST' }
  ];

  // Simple test payload
  const testPayload = {
    name: 'Test Document',
    file: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QgRG9jdW1lbnQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyMDQgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI5NwolJUVPRg==',
    signers: [
      {
        email: 'test@example.com',
        name: 'Test User'
      }
    ]
  };

  for (const { endpoint, method } of documentEndpoints) {
    console.log(`📤 Testing ${method} ${endpoint}...`);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          'x-api-token': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      const responseText = await response.text();
      console.log(`   Status: ${response.status}`);

      if (response.status !== 404) {
        console.log(`   Response: ${responseText.substring(0, 200)}...`);
        results.push({
          endpoint,
          method,
          status: response.status,
          success: response.status < 400,
          response: responseText.substring(0, 500)
        });
      }

    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n📋 API DISCOVERY SUMMARY');
  console.log('========================');

  const successful = results.filter(r => r.success).length;
  console.log(`Found ${successful} working endpoints out of ${results.length} tested`);

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.method} ${result.endpoint} - ${result.status}`);
    if (result.success && result.response) {
      console.log(`   Response: ${result.response.substring(0, 100)}...`);
    }
  });

  if (successful > 0) {
    console.log('\n🎯 RECOMMENDED NEXT STEPS:');
    console.log('Use the working endpoints found above to update OpenSignService.ts');
  } else {
    console.log('\n⚠️ NO WORKING ENDPOINTS FOUND');
    console.log('Possible issues:');
    console.log('- API key might be invalid');
    console.log('- Account might need upgrade for API access');
    console.log('- API endpoints might be different');
  }
}

testOpenSignAPI();
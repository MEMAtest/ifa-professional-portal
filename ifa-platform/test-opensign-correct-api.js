#!/usr/bin/env node
// ================================================================
// OPENSIGN CORRECT API ENDPOINT TESTING
// ================================================================

const API_KEY = 'test.31sA2OOGMnS99Jd7sUu2TF';
const BASE_URL = 'https://app.opensignlabs.com/api'; // Correct base found

async function testCorrectOpenSignAPI() {
  console.log('🔍 OPENSIGN CORRECT API TESTING');
  console.log('================================');
  console.log('Base URL:', BASE_URL);
  console.log('API Key:', API_KEY);
  console.log('');

  // Test the base API endpoint first
  console.log('📡 Testing base API endpoint...');
  try {
    const response = await fetch(BASE_URL);
    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  // Test with authentication
  console.log('\n🔐 Testing with authentication...');
  const endpoints = [
    '/v1/credits',
    '/v1/documents',
    '/v1/templates',
    '/v1/folders',
    '/v1.1/credits',
    '/v1.1/documents',
    '/v1.1/templates',
    '/credits',
    '/documents',
    '/templates',
    '/upload',
    '/health',
    '/status'
  ];

  const results = [];

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`📡 Testing ${endpoint}...`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-token': API_KEY,
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const responseText = await response.text();
      console.log(`   Status: ${response.status}`);

      if (response.status < 500 && response.status !== 404) {
        console.log(`   Response: ${responseText.substring(0, 150)}...`);
        results.push({
          endpoint,
          status: response.status,
          success: response.status < 400,
          response: responseText.substring(0, 300)
        });
      }

    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }

  // Test POST endpoints for document creation
  console.log('\n📝 TESTING DOCUMENT CREATION');
  console.log('============================');

  const createEndpoints = [
    '/v1/documents',
    '/v1.1/documents',
    '/documents',
    '/upload',
    '/create'
  ];

  // Minimal test payload with base64 PDF
  const testPayload = {
    name: 'Test Document',
    file: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QgRG9jdW1lbnQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDU4IDAwMDAwIG4KMDAwMDAwMDExNSAwMDAwMCBuCjAwMDAwMDAyMDQgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI5NwolJUVPRg=='
  };

  for (const endpoint of createEndpoints) {
    console.log(`📤 Testing POST ${endpoint}...`);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'x-api-token': API_KEY,
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      const responseText = await response.text();
      console.log(`   Status: ${response.status}`);

      if (response.status < 500 && response.status !== 404) {
        console.log(`   Response: ${responseText.substring(0, 200)}...`);
        results.push({
          endpoint: `POST ${endpoint}`,
          status: response.status,
          success: response.status < 400,
          response: responseText.substring(0, 300)
        });
      }

    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }

  // Test multipart form data (common for file uploads)
  console.log('\n📎 TESTING MULTIPART UPLOADS');
  console.log('============================');

  const formData = new FormData();
  formData.append('name', 'Test Document');
  formData.append('file', new Blob(['%PDF test content'], { type: 'application/pdf' }), 'test.pdf');

  for (const endpoint of createEndpoints) {
    console.log(`📎 Testing MULTIPART ${endpoint}...`);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'x-api-token': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
          // Don't set Content-Type for FormData - let browser set it
        },
        body: formData
      });

      const responseText = await response.text();
      console.log(`   Status: ${response.status}`);

      if (response.status < 500 && response.status !== 404) {
        console.log(`   Response: ${responseText.substring(0, 200)}...`);
        results.push({
          endpoint: `MULTIPART ${endpoint}`,
          status: response.status,
          success: response.status < 400,
          response: responseText.substring(0, 300)
        });
      }

    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n📋 CORRECT API TESTING SUMMARY');
  console.log('==============================');

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`Found ${successful} working endpoints out of ${total} tested`);

  if (successful > 0) {
    console.log('\n✅ WORKING ENDPOINTS:');
    results.filter(r => r.success).forEach(result => {
      console.log(`   ${result.endpoint} - ${result.status}`);
      console.log(`      Response: ${result.response.substring(0, 100)}...`);
    });
  }

  if (total > successful) {
    console.log('\n⚠️ NON-WORKING ENDPOINTS:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   ${result.endpoint} - ${result.status}`);
    });
  }

  return results;
}

testCorrectOpenSignAPI();
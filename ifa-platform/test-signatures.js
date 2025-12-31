#!/usr/bin/env node
// ================================================================
// OPENSIGN SIGNATURE SYSTEM TEST
// ================================================================

async function testSignatureSystem() {
  console.log('🔍 OPENSIGN SIGNATURE SYSTEM TEST');
  console.log('==================================');

  const tests = [
    {
      name: 'Create Signature Request',
      request: {
        documentId: '442e2c18-596d-4847-9b20-f1802d9d0079', // Real document ID
        signers: [
          {
            email: 'test@example.com',
            name: 'Test Signer',
            role: 'Client'
          }
        ],
        options: {
          expiryDays: 30,
          autoReminder: true,
          remindOnceInEvery: 3,
          mergeCertificate: true
        }
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n📋 Testing: ${test.name}`);
    console.log('Request:', JSON.stringify(test.request, null, 2));

    try {
      const startTime = Date.now();

      let response;
      let endpoint;

      // Determine endpoint based on test type
      if (test.name === 'Create Signature Request') {
        endpoint = 'http://localhost:3000/api/signatures/create';
      } else if (test.name === 'Send Signature Request') {
        endpoint = 'http://localhost:3000/api/signatures/send';
      } else if (test.name === 'Get Signature Status') {
        endpoint = `http://localhost:3000/api/signatures/status/${test.request.signatureRequestId}`;
      }

      if (test.name === 'Get Signature Status') {
        response = await fetch(endpoint);
      } else {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test.request)
        });
      }

      const duration = Date.now() - startTime;
      console.log(`📡 Response Status: ${response.status} (${duration}ms)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response Error:', errorText);
        results.push({
          name: test.name,
          success: false,
          error: errorText,
          duration,
          status: response.status
        });
        continue;
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ SUCCESS');
        console.log('- Signature Request ID:', result.signatureRequestId || 'N/A');
        console.log('- OpenSign Document ID:', result.opensignDocumentId || 'N/A');
        console.log('- Status:', result.status || 'N/A');
        console.log('- Expires At:', result.expiresAt || 'N/A');

        results.push({
          name: test.name,
          success: true,
          duration,
          result: result,
          signatureRequestId: result.signatureRequestId
        });

        // If this was a create request, test sending it
        if (test.name === 'Create Signature Request' && result.signatureRequestId) {
          console.log('\n📤 Auto-testing: Send Signature Request');

          try {
            const sendResponse = await fetch('http://localhost:3000/api/signatures/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                signatureRequestId: result.signatureRequestId
              })
            });

            const sendDuration = Date.now() - startTime;
            console.log(`📡 Send Response Status: ${sendResponse.status} (${sendDuration}ms)`);

            if (sendResponse.ok) {
              const sendResult = await sendResponse.json();
              if (sendResult.success) {
                console.log('✅ SEND SUCCESS');
                console.log('- Status:', sendResult.status);
                console.log('- Sent At:', sendResult.sentAt);

                results.push({
                  name: 'Send Signature Request (Auto)',
                  success: true,
                  duration: sendDuration,
                  result: sendResult
                });
              } else {
                console.log('❌ SEND FAILED:', sendResult.error);
                results.push({
                  name: 'Send Signature Request (Auto)',
                  success: false,
                  error: sendResult.error,
                  duration: sendDuration
                });
              }
            } else {
              const errorText = await sendResponse.text();
              console.log('❌ SEND FAILED:', errorText);
              results.push({
                name: 'Send Signature Request (Auto)',
                success: false,
                error: errorText,
                duration: sendDuration
              });
            }
          } catch (sendError) {
            console.log('❌ SEND ERROR:', sendError.message);
            results.push({
              name: 'Send Signature Request (Auto)',
              success: false,
              error: sendError.message
            });
          }
        }

      } else {
        console.log('❌ FAILED');
        console.log('- Error:', result.error);
        results.push({
          name: test.name,
          success: false,
          error: result.error,
          duration
        });
      }

    } catch (error) {
      console.error('❌ Test Error:', error.message);
      results.push({
        name: test.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n📋 SIGNATURE SYSTEM TEST SUMMARY');
  console.log('=================================');

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`Overall: ${passed}/${total} tests passed`);

  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`${status} - ${result.name} ${duration}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    if (result.signatureRequestId) {
      console.log(`  Signature Request ID: ${result.signatureRequestId}`);
    }
  });

  if (passed === total) {
    console.log('\n🎉 ALL SIGNATURE TESTS PASSED - OPENSIGN INTEGRATION COMPLETE!');
  } else {
    console.log('\n⚠️  Some signature tests need attention');
  }

  // Test OpenSign service directly
  console.log('\n🔧 TESTING OPENSIGN SERVICE DIRECTLY');
  console.log('====================================');

  try {
    const { openSignService } = await import('./src/services/OpenSignService.ts');

    // Test getting credits
    console.log('📊 Testing OpenSign credits...');
    const credits = await openSignService.getCredits();
    if (credits) {
      console.log('✅ Credits check successful:', credits);
    } else {
      console.log('⚠️  Credits check failed or no credits data');
    }

    // Test listing documents
    console.log('📄 Testing OpenSign document list...');
    const documents = await openSignService.listDocuments(5);
    console.log(`✅ Document list successful: ${documents.length} documents found`);

  } catch (serviceError) {
    console.error('❌ OpenSign service test error:', serviceError.message);
  }
}

testSignatureSystem();
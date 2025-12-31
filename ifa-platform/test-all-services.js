#!/usr/bin/env node
// ================================================================
// SYSTEMATIC END-TO-END SERVICE VALIDATION
// ================================================================

async function testAllServices() {
  console.log('🔍 SYSTEMATIC END-TO-END SERVICE VALIDATION');
  console.log('============================================');

  const tests = [
    {
      name: 'Basic Cash Flow Report',
      request: {
        type: 'cashflow',
        dataId: '442e2c18-596d-4847-9b20-f1802d9d0079',
        templateType: 'cashflow',
        options: {
          includeCharts: true,
          includeAssumptions: true,
          reportPeriodYears: 20
        }
      }
    },
    {
      name: 'Enhanced Cash Flow Report',
      request: {
        type: 'enhanced-cashflow',
        dataId: '442e2c18-596d-4847-9b20-f1802d9d0079',
        templateType: 'cashflow',
        options: {
          outputFormat: 'pdf',
          includeCharts: true,
          chartTypes: ['portfolio', 'income_expense']
        }
      }
    },
    {
      name: 'ATR Assessment Report',
      request: {
        type: 'atr',
        dataId: '2e68b4b0-357a-4a80-b519-95f184f5e263',
        options: {
          includeCharts: true,
          outputFormat: 'pdf'
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
      const response = await fetch('http://localhost:3000/api/test-enhanced-cashflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.request)
      });

      const duration = Date.now() - startTime;
      console.log(`📡 Response Status: ${response.status} (${duration}ms)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response Error:', errorText);
        results.push({ name: test.name, success: false, error: errorText, duration });
        continue;
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ SUCCESS');
        console.log('- Download URL:', !!result.downloadUrl ? 'Generated' : 'Missing');
        console.log('- Service:', result.metadata?.service);
        results.push({ name: test.name, success: true, duration, metadata: result.metadata });
      } else {
        console.log('❌ FAILED');
        console.log('- Error:', result.error);
        results.push({ name: test.name, success: false, error: result.error, duration });
      }

    } catch (error) {
      console.error('❌ Test Error:', error.message);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }

  // Summary
  console.log('\n📋 COMPREHENSIVE TEST SUMMARY');
  console.log('==============================');

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
  });

  if (passed === total) {
    console.log('\n🎉 ALL SERVICES WORKING - UNIFIED REPORTING SYSTEM COMPLETE!');
  } else {
    console.log('\n⚠️  Some services need attention');
  }
}

testAllServices();
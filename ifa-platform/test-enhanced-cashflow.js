#!/usr/bin/env node
// ================================================================
// SYSTEMATIC ENHANCED CASH FLOW TEST
// ================================================================

async function testEnhancedCashFlow() {
  console.log('🔍 SYSTEMATIC ENHANCED CASH FLOW TEST');
  console.log('=====================================');

  const testRequest = {
    type: 'enhanced-cashflow',
    dataId: '442e2c18-596d-4847-9b20-f1802d9d0079',
    templateType: 'cashflow',
    options: {
      outputFormat: 'pdf',
      includeCharts: true,
      chartTypes: ['portfolio', 'income_expense']
    }
  };

  console.log('📋 Test Request:', JSON.stringify(testRequest, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/test-enhanced-cashflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });

    console.log('📡 Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response Error:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Response Result:', result);

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testEnhancedCashFlow();
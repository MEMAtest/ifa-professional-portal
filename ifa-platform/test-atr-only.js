#!/usr/bin/env node
// ================================================================
// TEST ATR REPORT ONLY - Phase 2 Validation
// ================================================================

const path = require('path');

async function testATROnly() {
  console.log('🎯 PHASE 2: ATR Report Test Only\n');

  try {
    // Import ATRReportService (using dynamic import for ES modules)
    const ATRServiceModule = await import('file://' + path.resolve(__dirname, 'src/services/ATRReportService.ts'));
    const { ATRReportService } = ATRServiceModule;

    const atrService = new ATRReportService();
    console.log('✅ ATRReportService imported and instantiated');

    // Test with our real client data
    const TEST_CLIENT_ID = '05b8095d-caa1-4bca-a4f0-c2cf2bf98f9c'; // CLI465526

    const atrRequest = {
      type: 'atr',
      dataId: TEST_CLIENT_ID,
      options: {
        includeCharts: true,
        outputFormat: 'pdf'
      }
    };

    console.log('🚀 Testing ATR report generation...');
    const startTime = Date.now();

    const result = await atrService.generateReport(atrRequest);
    const duration = Date.now() - startTime;

    console.log(`⏱️ Duration: ${duration}ms`);

    if (result.success) {
      console.log('✅ ATR report generated successfully!');
      console.log('📊 Metadata:', {
        service: result.metadata?.service,
        clientId: result.metadata?.clientId,
        riskLevel: result.metadata?.riskLevel,
        riskCategory: result.metadata?.riskCategory,
        downloadUrl: result.downloadUrl ? 'Generated' : 'None'
      });

      // Check content
      if (result.reportContent) {
        const hasKey = result.reportContent.includes('Attitude to Risk');
        console.log('📝 Content check:', hasKey ? 'Contains ATR content' : 'Missing ATR content');
      }

    } else {
      console.log('❌ ATR report generation failed');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testATROnly();
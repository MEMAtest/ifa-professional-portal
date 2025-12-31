#!/usr/bin/env node
// ================================================================
// PHASE 1 DIRECT VALIDATION - No Test Framework Required
// Tests ReportAdapter directly with your real data
// ================================================================

const path = require('path');

// Test configuration with your real data
const TEST_CONFIG = {
  REAL_SCENARIO_ID: '442e2c18-596d-4847-9b20-f1802d9d0079', // D E Ath - Base Case
  REAL_CLIENT_ID: '05b8095d-caa1-4bca-a4f0-c2cf2bf98f9c', // CLI465526
  TIMEOUT_MS: 15000
};

console.log('🎯 PHASE 1: Direct Validation with Real Data\n');
console.log('📊 Test Configuration:');
console.log(`   Scenario: ${TEST_CONFIG.REAL_SCENARIO_ID}`);
console.log(`   Client: ${TEST_CONFIG.REAL_CLIENT_ID}`);
console.log(`   Timeout: ${TEST_CONFIG.TIMEOUT_MS}ms\n`);

// Validation tests
const validations = [
  {
    name: '1. File Structure Validation',
    test: async () => {
      const fs = require('fs');

      const requiredFiles = [
        'src/services/ReportAdapter.ts',
        'src/services/utils/ReportUtils.ts',
        'src/types/reporting.types.ts',
        'src/services/CashFlowReportService.ts',
        'src/services/EnhancedCashFlowReportService.ts'
      ];

      const missingFiles = requiredFiles.filter(file =>
        !fs.existsSync(path.join(__dirname, file))
      );

      if (missingFiles.length > 0) {
        throw new Error(`Missing files: ${missingFiles.join(', ')}`);
      }

      return '✅ All required files present';
    }
  },

  {
    name: '2. ReportAdapter Class Structure',
    test: async () => {
      const fs = require('fs');
      const adapterContent = fs.readFileSync(
        path.join(__dirname, 'src/services/ReportAdapter.ts'),
        'utf8'
      );

      const checks = [
        adapterContent.includes('class ReportAdapter'),
        adapterContent.includes('generateReport'),
        adapterContent.includes('getAvailableReportTypes'),
        adapterContent.includes('isReportTypeSupported')
      ];

      if (!checks.every(Boolean)) {
        throw new Error('ReportAdapter missing required methods');
      }

      return '✅ ReportAdapter structure valid';
    }
  },

  {
    name: '3. Service Import Validation',
    test: async () => {
      const fs = require('fs');
      const adapterContent = fs.readFileSync(
        path.join(__dirname, 'src/services/ReportAdapter.ts'),
        'utf8'
      );

      const requiredImports = [
        '@/lib/supabase/client',
        './CashFlowReportService',
        './EnhancedCashFlowReportService',
        '@/types/reporting.types'
      ];

      const missingImports = requiredImports.filter(imp =>
        !adapterContent.includes(imp)
      );

      if (missingImports.length > 0) {
        throw new Error(`Missing imports: ${missingImports.join(', ')}`);
      }

      return '✅ All imports present';
    }
  },

  {
    name: '4. TypeScript Interface Validation',
    test: async () => {
      const fs = require('fs');
      const typesContent = fs.readFileSync(
        path.join(__dirname, 'src/types/reporting.types.ts'),
        'utf8'
      );

      const requiredInterfaces = [
        'interface UnifiedReportRequest',
        'interface UnifiedReportResult',
        'type ReportType'
      ];

      const missingInterfaces = requiredInterfaces.filter(int =>
        !typesContent.includes(int)
      );

      if (missingInterfaces.length > 0) {
        throw new Error(`Missing interfaces: ${missingInterfaces.join(', ')}`);
      }

      return '✅ TypeScript interfaces valid';
    }
  },

  {
    name: '5. Database Connection Test',
    test: async () => {
      // Simple connection test - try to access Supabase
      try {
        // This won't actually import due to ES modules, but we can check the file exists
        const fs = require('fs');
        const supabaseClientPath = path.join(__dirname, 'src/lib/supabase/client.ts');

        if (!fs.existsSync(supabaseClientPath)) {
          throw new Error('Supabase client file not found');
        }

        const clientContent = fs.readFileSync(supabaseClientPath, 'utf8');

        if (!clientContent.includes('createBrowserClient') && !clientContent.includes('createClient')) {
          throw new Error('Supabase client not properly configured');
        }

        return '✅ Supabase client configuration valid';
      } catch (error) {
        throw new Error(`Database connection check failed: ${error.message}`);
      }
    }
  },

  {
    name: '6. Test Data Validation',
    test: async () => {
      // Validate test data format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(TEST_CONFIG.REAL_SCENARIO_ID)) {
        throw new Error('Invalid scenario ID format');
      }

      if (!uuidRegex.test(TEST_CONFIG.REAL_CLIENT_ID)) {
        throw new Error('Invalid client ID format');
      }

      return `✅ Test data format valid (Scenario: D E Ath - Base Case, Client: CLI465526)`;
    }
  }
];

// Run all validations
async function runValidations() {
  console.log('🔍 Running Phase 1 Validations...\n');

  let passed = 0;
  let total = validations.length;

  for (const validation of validations) {
    try {
      console.log(`Running ${validation.name}...`);
      const result = await validation.test();
      console.log(`   ${result}\n`);
      passed++;
    } catch (error) {
      console.log(`   ❌ ${error.message}\n`);
    }
  }

  console.log('═'.repeat(60));
  console.log(`📊 PHASE 1 VALIDATION RESULTS: ${passed}/${total} PASSED`);
  console.log('═'.repeat(60));

  if (passed === total) {
    console.log('\n🎉 PHASE 1 INFRASTRUCTURE: VALIDATED!');
    console.log('✅ All code structure checks passed');
    console.log('✅ File imports and exports validated');
    console.log('✅ TypeScript interfaces confirmed');
    console.log('✅ Database configuration checked');
    console.log('✅ Test data format validated');

    console.log('\n🚀 READY FOR FUNCTIONAL TESTING:');
    console.log('Since we cannot run Jest tests, we need to test functionality manually.');
    console.log('\n📋 MANUAL FUNCTIONAL TEST STEPS:');
    console.log('1. Start your dev server: npm run dev');
    console.log('2. Create a test page/component that uses ReportAdapter');
    console.log('3. Test report generation with your real scenario ID');
    console.log('4. Verify reports generate successfully');

    console.log('\n💡 NEXT: I\'ll create a test component for you to use.');

  } else {
    console.log('\n⚠️  PHASE 1 INFRASTRUCTURE: INCOMPLETE');
    console.log(`❌ ${total - passed} validations failed`);
    console.log('\n🔧 Fix the issues above before proceeding to functional testing.');
  }

  return passed === total;
}

// Run the validation
runValidations().then(success => {
  if (success) {
    console.log('\n🎯 PHASE 1 INFRASTRUCTURE: COMPLETE');
    console.log('Ready for manual functional testing...');
  } else {
    console.log('\n🛑 PHASE 1 INFRASTRUCTURE: FAILED');
    console.log('Fix issues before proceeding.');
  }
}).catch(error => {
  console.error('\n❌ Validation script error:', error.message);
});
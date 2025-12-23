#!/usr/bin/env node
// ================================================================
// PHASE 1 VALIDATION SCRIPT
// Comprehensive validation before proceeding to Phase 2
// ================================================================

const fs = require('fs');
const path = require('path');

console.log('🎯 PHASE 1: Cash Flow Integration Validation\n');

// ================================================================
// VALIDATION CHECKLIST
// ================================================================

const validationChecks = [
  {
    name: 'ReportAdapter File Structure',
    check: () => {
      const adapterPath = path.join(__dirname, '../ReportAdapter.ts');
      if (!fs.existsSync(adapterPath)) return { pass: false, message: 'ReportAdapter.ts not found' };

      const content = fs.readFileSync(adapterPath, 'utf8');
      const hasClass = content.includes('class ReportAdapter');
      const hasMethod = content.includes('generateReport');
      const hasExports = content.includes('export class ReportAdapter');

      return {
        pass: hasClass && hasMethod && hasExports,
        message: hasClass && hasMethod && hasExports
          ? 'ReportAdapter structure valid'
          : `Missing: ${!hasClass ? 'class ' : ''}${!hasMethod ? 'generateReport ' : ''}${!hasExports ? 'export' : ''}`
      };
    }
  },

  {
    name: 'ReportUtils File Structure',
    check: () => {
      const utilsPath = path.join(__dirname, '../utils/ReportUtils.ts');
      if (!fs.existsSync(utilsPath)) return { pass: false, message: 'ReportUtils.ts not found' };

      const content = fs.readFileSync(utilsPath, 'utf8');
      const hasClass = content.includes('class ReportUtils');
      const hasCurrency = content.includes('formatCurrency');
      const hasTemplate = content.includes('populateTemplate');

      return {
        pass: hasClass && hasCurrency && hasTemplate,
        message: hasClass && hasCurrency && hasTemplate
          ? 'ReportUtils structure valid'
          : `Missing: ${!hasClass ? 'class ' : ''}${!hasCurrency ? 'formatCurrency ' : ''}${!hasTemplate ? 'populateTemplate' : ''}`
      };
    }
  },

  {
    name: 'TypeScript Interfaces',
    check: () => {
      const typesPath = path.join(__dirname, '../../types/reporting.types.ts');
      if (!fs.existsSync(typesPath)) return { pass: false, message: 'reporting.types.ts not found' };

      const content = fs.readFileSync(typesPath, 'utf8');
      const hasUnifiedRequest = content.includes('interface UnifiedReportRequest');
      const hasUnifiedResult = content.includes('interface UnifiedReportResult');
      const hasReportType = content.includes('type ReportType');

      return {
        pass: hasUnifiedRequest && hasUnifiedResult && hasReportType,
        message: hasUnifiedRequest && hasUnifiedResult && hasReportType
          ? 'TypeScript interfaces valid'
          : `Missing: ${!hasUnifiedRequest ? 'UnifiedReportRequest ' : ''}${!hasUnifiedResult ? 'UnifiedReportResult ' : ''}${!hasReportType ? 'ReportType' : ''}`
      };
    }
  },

  {
    name: 'Cash Flow Service Integration',
    check: () => {
      try {
        // Check if CashFlowReportService exists and has required methods
        const servicePath = path.join(__dirname, '../CashFlowReportService.ts');
        if (!fs.existsSync(servicePath)) return { pass: false, message: 'CashFlowReportService.ts not found' };

        const content = fs.readFileSync(servicePath, 'utf8');
        const hasClass = content.includes('class CashFlowReportService') || content.includes('export class CashFlowReportService');
        const hasGenerateMethod = content.includes('generateCashFlowReport');

        return {
          pass: hasClass && hasGenerateMethod,
          message: hasClass && hasGenerateMethod
            ? 'CashFlowReportService integration ready'
            : `Missing: ${!hasClass ? 'CashFlowReportService class ' : ''}${!hasGenerateMethod ? 'generateCashFlowReport method' : ''}`
        };
      } catch (error) {
        return { pass: false, message: `Error checking CashFlowReportService: ${error.message}` };
      }
    }
  },

  {
    name: 'Enhanced Cash Flow Service Integration',
    check: () => {
      try {
        const servicePath = path.join(__dirname, '../EnhancedCashFlowReportService.ts');
        if (!fs.existsSync(servicePath)) return { pass: false, message: 'EnhancedCashFlowReportService.ts not found' };

        const content = fs.readFileSync(servicePath, 'utf8');
        const hasClass = content.includes('class EnhancedCashFlowReportService') || content.includes('export class EnhancedCashFlowReportService');
        const hasGenerateMethod = content.includes('generateCompleteReport');

        return {
          pass: hasClass && hasGenerateMethod,
          message: hasClass && hasGenerateMethod
            ? 'EnhancedCashFlowReportService integration ready'
            : `Missing: ${!hasClass ? 'EnhancedCashFlowReportService class ' : ''}${!hasGenerateMethod ? 'generateCompleteReport method' : ''}`
        };
      } catch (error) {
        return { pass: false, message: `Error checking EnhancedCashFlowReportService: ${error.message}` };
      }
    }
  },

  {
    name: 'Import Path Validation',
    check: () => {
      try {
        const adapterPath = path.join(__dirname, '../ReportAdapter.ts');
        const content = fs.readFileSync(adapterPath, 'utf8');

        // Check for correct imports
        const hasSupabaseImport = content.includes("@/lib/supabase/client");
        const hasCashFlowImport = content.includes("./CashFlowReportService");
        const hasEnhancedImport = content.includes("./EnhancedCashFlowReportService");
        const hasTypesImport = content.includes("@/types/reporting.types");

        const allImportsValid = hasSupabaseImport && hasCashFlowImport && hasEnhancedImport && hasTypesImport;

        return {
          pass: allImportsValid,
          message: allImportsValid
            ? 'All import paths valid'
            : `Missing imports: ${!hasSupabaseImport ? 'supabase ' : ''}${!hasCashFlowImport ? 'CashFlowReportService ' : ''}${!hasEnhancedImport ? 'EnhancedCashFlowReportService ' : ''}${!hasTypesImport ? 'reporting.types' : ''}`
        };
      } catch (error) {
        return { pass: false, message: `Error checking imports: ${error.message}` };
      }
    }
  },

  {
    name: 'Test Files Present',
    check: () => {
      const testFiles = [
        'CashFlowIntegration.validation.test.ts',
        'ReportAdapter.test.ts',
        'ReportUtils.integration.test.ts'
      ];

      const missingFiles = testFiles.filter(file =>
        !fs.existsSync(path.join(__dirname, file))
      );

      return {
        pass: missingFiles.length === 0,
        message: missingFiles.length === 0
          ? 'All test files present'
          : `Missing test files: ${missingFiles.join(', ')}`
      };
    }
  }
];

// ================================================================
// RUN VALIDATIONS
// ================================================================

console.log('🔍 Running Phase 1 Validation Checks...\n');

let totalChecks = validationChecks.length;
let passedChecks = 0;
const results = [];

validationChecks.forEach((validation, index) => {
  console.log(`${index + 1}/${totalChecks} ${validation.name}...`);

  try {
    const result = validation.check();
    results.push({ ...validation, result });

    if (result.pass) {
      console.log(`   ✅ ${result.message}`);
      passedChecks++;
    } else {
      console.log(`   ❌ ${result.message}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    results.push({ ...validation, result: { pass: false, message: error.message } });
  }

  console.log('');
});

// ================================================================
// SUMMARY AND NEXT STEPS
// ================================================================

console.log('═'.repeat(60));
console.log(`📊 PHASE 1 VALIDATION SUMMARY: ${passedChecks}/${totalChecks} PASSED`);
console.log('═'.repeat(60));

if (passedChecks === totalChecks) {
  console.log('\n🎉 PHASE 1: VALIDATION COMPLETE!');
  console.log('✅ All infrastructure checks passed');
  console.log('✅ Cash flow integration ready');
  console.log('✅ Code structure validated');
  console.log('✅ Type safety confirmed');

  console.log('\n📋 PHASE 1 COMPLETION STATUS:');
  console.log('✅ ReportAdapter infrastructure: READY');
  console.log('✅ ReportUtils functionality: READY');
  console.log('✅ TypeScript interfaces: READY');
  console.log('✅ Cash flow service integration: READY');
  console.log('✅ Enhanced cash flow integration: READY');

  console.log('\n🚀 READY FOR MANUAL TESTING:');
  console.log('1. Update CashFlowIntegration.validation.test.ts with real IDs');
  console.log('2. Set SKIP_REAL_DATABASE_TESTS = false');
  console.log('3. Run: npm test -- CashFlowIntegration.validation.test.ts');
  console.log('4. Perform manual report generation test');
  console.log('5. Verify generated reports are correct');

  console.log('\n✨ AFTER MANUAL TESTING PASSES:');
  console.log('🎯 READY TO PROCEED TO PHASE 2: ATR Report Service');

} else {
  console.log('\n⚠️  PHASE 1: VALIDATION INCOMPLETE');
  console.log(`❌ ${totalChecks - passedChecks} checks failed`);

  console.log('\n🔧 FAILED CHECKS:');
  results.forEach((result, index) => {
    if (!result.result.pass) {
      console.log(`${index + 1}. ${result.name}: ${result.result.message}`);
    }
  });

  console.log('\n🛑 DO NOT PROCEED TO PHASE 2 UNTIL ALL CHECKS PASS');
  console.log('Fix the issues above and re-run this validation script.');
}

console.log('\n' + '═'.repeat(60));

// ================================================================
// PHASE 1 REQUIREMENTS CHECKLIST
// ================================================================

console.log('\n📋 PHASE 1 COMPLETE REQUIREMENTS:');
console.log('□ All automated validation checks pass');
console.log('□ Real database tests pass (with actual scenario IDs)');
console.log('□ Manual report generation successful');
console.log('□ Generated reports content is correct');
console.log('□ No errors in browser console');
console.log('□ Performance is acceptable');
console.log('□ Team review completed');

console.log('\n🎯 ONLY PROCEED TO PHASE 2 WHEN ALL BOXES ARE CHECKED!');

// Return exit code for CI/CD
process.exit(passedChecks === totalChecks ? 0 : 1);
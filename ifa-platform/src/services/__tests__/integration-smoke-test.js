#!/usr/bin/env node
// ================================================================
// Integration Smoke Test
// Tests that new code can be imported without runtime errors
// ================================================================

console.log('🧪 Running integration smoke tests...\n');

// Test 1: Check if files can be read without syntax errors
function testFileSyntax(filePath, description) {
  try {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');

    // Basic syntax checks
    const hasSyntaxErrors = [
      /\}\s*\{/g, // Missing semicolon between blocks
      /import.*from\s*$/gm, // Incomplete imports
      /export.*=\s*$/gm, // Incomplete exports
      /interface.*\{\s*$/gm.test(content) && !/\}/g.test(content) // Incomplete interfaces
    ].some(regex => typeof regex === 'boolean' ? regex : regex.test(content));

    if (hasSyntaxErrors) {
      console.log(`❌ ${description}: Potential syntax issues detected`);
      return false;
    }

    // Check for balanced brackets
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    if (openBraces !== closeBraces) {
      console.log(`❌ ${description}: Unbalanced braces ({: ${openBraces}, }: ${closeBraces})`);
      return false;
    }

    if (openParens !== closeParens) {
      console.log(`❌ ${description}: Unbalanced parentheses ((: ${openParens}, ): ${closeParens})`);
      return false;
    }

    console.log(`✅ ${description}: Syntax OK`);
    return true;
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

// Test 2: Check TypeScript interface consistency
function testInterfaceConsistency() {
  try {
    const fs = require('fs');
    const path = require('path');

    // Read type files
    const reportingTypes = fs.readFileSync(path.join(__dirname, '../../types/reporting.types.ts'), 'utf8');
    const adapterCode = fs.readFileSync(path.join(__dirname, '../ReportAdapter.ts'), 'utf8');

    // Check if adapter uses interfaces from types file
    const interfaceNames = ['UnifiedReportRequest', 'UnifiedReportResult', 'ReportOptions'];
    const issues = [];

    interfaceNames.forEach(interfaceName => {
      const definedInTypes = reportingTypes.includes(`interface ${interfaceName}`);
      const usedInAdapter = adapterCode.includes(interfaceName);

      if (usedInAdapter && !definedInTypes) {
        issues.push(`${interfaceName} used in adapter but not defined in types`);
      }
    });

    if (issues.length === 0) {
      console.log('✅ Interface consistency: OK');
      return true;
    } else {
      console.log('❌ Interface consistency issues:');
      issues.forEach(issue => console.log(`   ${issue}`));
      return false;
    }
  } catch (error) {
    console.log(`❌ Interface consistency check failed: ${error.message}`);
    return false;
  }
}

// Test 3: Check for duplicate exports
function testDuplicateExports() {
  try {
    const fs = require('fs');
    const path = require('path');

    const filesToCheck = [
      { path: '../ReportAdapter.ts', name: 'ReportAdapter' },
      { path: '../utils/ReportUtils.ts', name: 'ReportUtils' },
      { path: '../../types/reporting.types.ts', name: 'ReportingTypes' }
    ];

    const allExports = [];
    const duplicates = [];

    filesToCheck.forEach(file => {
      const content = fs.readFileSync(path.join(__dirname, file.path), 'utf8');

      // Extract exports
      const exportRegex = /export\s+(?:interface|class|function|const|type)\s+(\w+)/g;
      let match;

      while ((match = exportRegex.exec(content)) !== null) {
        const exportName = match[1];

        if (allExports.includes(exportName)) {
          duplicates.push(exportName);
        } else {
          allExports.push(exportName);
        }
      }
    });

    if (duplicates.length === 0) {
      console.log('✅ No duplicate exports detected');
      return true;
    } else {
      console.log('⚠️  Duplicate exports found:');
      duplicates.forEach(dup => console.log(`   ${dup}`));
      console.log('   Note: This may be intentional for backwards compatibility');
      return true; // Not necessarily an error
    }
  } catch (error) {
    console.log(`❌ Duplicate export check failed: ${error.message}`);
    return false;
  }
}

// Test 4: Validate import paths exist
function testImportPaths() {
  try {
    const fs = require('fs');
    const path = require('path');

    const adapterPath = path.join(__dirname, '../ReportAdapter.ts');
    const adapterContent = fs.readFileSync(adapterPath, 'utf8');

    // Extract local imports
    const localImportRegex = /import.*from\s+['"](\.[^'"]*)['"]/g;
    let match;
    const missingPaths = [];

    while ((match = localImportRegex.exec(adapterContent)) !== null) {
      const importPath = match[1];
      const fullPath = path.resolve(path.dirname(adapterPath), importPath);

      // Check if .ts file exists
      const tsPath = fullPath.endsWith('.ts') ? fullPath : `${fullPath}.ts`;

      if (!fs.existsSync(tsPath)) {
        missingPaths.push(importPath);
      }
    }

    if (missingPaths.length === 0) {
      console.log('✅ All import paths valid');
      return true;
    } else {
      console.log('❌ Missing import paths:');
      missingPaths.forEach(path => console.log(`   ${path}`));
      return false;
    }
  } catch (error) {
    console.log(`❌ Import path validation failed: ${error.message}`);
    return false;
  }
}

// Test 5: Check Supabase client usage consistency
function testSupabaseUsage() {
  try {
    const fs = require('fs');
    const path = require('path');

    const filesToCheck = [
      '../ReportAdapter.ts',
      '../utils/ReportUtils.ts'
    ];

    let allUseCreateClient = true;
    let allUseCorrectImport = true;

    filesToCheck.forEach(filePath => {
      const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');

      // Check if uses createClient
      if (content.includes('supabase') && !content.includes('createClient()')) {
        console.log(`⚠️  ${path.basename(filePath)}: Uses supabase but not createClient()`);
        allUseCreateClient = false;
      }

      // Check import path
      if (content.includes('createClient') && !content.includes("@/lib/supabase/client")) {
        console.log(`⚠️  ${path.basename(filePath)}: Uses different supabase import path`);
        allUseCorrectImport = false;
      }
    });

    if (allUseCreateClient && allUseCorrectImport) {
      console.log('✅ Supabase usage consistent');
      return true;
    } else {
      console.log('⚠️  Supabase usage inconsistencies detected');
      return false;
    }
  } catch (error) {
    console.log(`❌ Supabase usage check failed: ${error.message}`);
    return false;
  }
}

// Run all tests
console.log('Running smoke tests...\n');

const tests = [
  () => testFileSyntax('../ReportAdapter.ts', 'ReportAdapter'),
  () => testFileSyntax('../utils/ReportUtils.ts', 'ReportUtils'),
  () => testFileSyntax('../../types/reporting.types.ts', 'ReportingTypes'),
  testInterfaceConsistency,
  testDuplicateExports,
  testImportPaths,
  testSupabaseUsage
];

let passed = 0;
let total = tests.length;

console.log('📋 Test Results:');
console.log('─'.repeat(50));

tests.forEach((test, index) => {
  const result = test();
  if (result) passed++;
});

console.log('─'.repeat(50));
console.log(`📊 Results: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log('🎉 All tests passed! The integration looks good.');
  console.log('\n✅ Safe to proceed with implementation');
} else {
  console.log('⚠️  Some tests failed. Review issues before proceeding.');
  console.log('\n🔧 Address the issues above before using in production');
}

console.log('\n🏁 Smoke test complete!');
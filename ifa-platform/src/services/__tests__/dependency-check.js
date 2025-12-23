#!/usr/bin/env node
// ================================================================
// Dependency and Import Analysis Script
// Checks for circular dependencies and import issues
// ================================================================

const fs = require('fs');
const path = require('path');

// Files to analyze
const filesToCheck = [
  '../ReportAdapter.ts',
  '../utils/ReportUtils.ts',
  '../../types/reporting.types.ts'
];

console.log('🔍 Analyzing dependencies and imports...\n');

function extractImports(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Extract import statements
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Extract type imports
    const typeImportRegex = /import\s+type\s+{[^}]*}\s+from\s+['"]([^'"]+)['"]/g;

    while ((match = typeImportRegex.exec(content)) !== null) {
      imports.push(`${match[1]} (type only)`);
    }

    return imports;
  } catch (error) {
    return [`ERROR: Could not read file - ${error.message}`];
  }
}

function analyzeFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`📄 ${fileName}`);
  console.log('─'.repeat(50));

  const imports = extractImports(filePath);

  if (imports.length === 0) {
    console.log('  No imports found');
  } else {
    imports.forEach(imp => {
      const isRelative = imp.startsWith('./') || imp.startsWith('../');
      const isExternal = imp.startsWith('@') || !imp.includes('/');
      const isInternal = !isRelative && !isExternal;

      let prefix = '  ';
      if (isRelative) prefix += '🔗 ';
      else if (isExternal) prefix += '📦 ';
      else prefix += '🏠 ';

      console.log(`${prefix}${imp}`);
    });
  }

  console.log('');
  return imports;
}

function checkForCircularDependencies(fileImports) {
  console.log('🔄 Checking for potential circular dependencies...\n');

  const internalImports = {};

  Object.keys(fileImports).forEach(file => {
    internalImports[file] = fileImports[file].filter(imp =>
      imp.startsWith('./') || imp.startsWith('../') || imp.startsWith('@/')
    );
  });

  // Simple circular dependency check
  let circularFound = false;

  Object.keys(internalImports).forEach(fileA => {
    internalImports[fileA].forEach(importPath => {
      const targetFile = Object.keys(internalImports).find(file =>
        file.includes(importPath.replace('./', '').replace('../', '').replace('@/', ''))
      );

      if (targetFile && internalImports[targetFile]) {
        const hasReverse = internalImports[targetFile].some(imp =>
          fileA.includes(imp.replace('./', '').replace('../', '').replace('@/', ''))
        );

        if (hasReverse) {
          console.log(`⚠️  Potential circular dependency: ${path.basename(fileA)} ↔ ${path.basename(targetFile)}`);
          circularFound = true;
        }
      }
    });
  });

  if (!circularFound) {
    console.log('✅ No circular dependencies detected');
  }

  console.log('');
}

function checkImportPaths() {
  console.log('🔍 Checking import path consistency...\n');

  const issues = [];

  filesToCheck.forEach(file => {
    const imports = extractImports(file);

    imports.forEach(imp => {
      // Check for potential issues
      if (imp.includes('..') && imp.split('../').length > 3) {
        issues.push(`${path.basename(file)}: Deep relative import - ${imp}`);
      }

      if (imp.includes('services') && imp.includes('types')) {
        issues.push(`${path.basename(file)}: Mixed import path - ${imp}`);
      }

      if (imp.endsWith('.ts') || imp.endsWith('.tsx')) {
        issues.push(`${path.basename(file)}: Explicit extension in import - ${imp}`);
      }
    });
  });

  if (issues.length === 0) {
    console.log('✅ No import path issues detected');
  } else {
    console.log('⚠️  Import path issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }

  console.log('');
}

// Run analysis
const allImports = {};

filesToCheck.forEach(file => {
  allImports[file] = analyzeFile(file);
});

checkForCircularDependencies(allImports);
checkImportPaths();

console.log('📊 Summary:');
console.log('─'.repeat(30));
console.log(`Files analyzed: ${filesToCheck.length}`);
console.log(`Total imports: ${Object.values(allImports).flat().length}`);

// Check for common patterns
const allImportsList = Object.values(allImports).flat();
const supabaseImports = allImportsList.filter(imp => imp.includes('supabase')).length;
const typeImports = allImportsList.filter(imp => imp.includes('(type only)')).length;
const relativeImports = allImportsList.filter(imp => imp.startsWith('./') || imp.startsWith('../')).length;

console.log(`Supabase imports: ${supabaseImports}`);
console.log(`Type-only imports: ${typeImports}`);
console.log(`Relative imports: ${relativeImports}`);

console.log('\n✅ Dependency analysis complete!');
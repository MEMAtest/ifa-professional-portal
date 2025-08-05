// ===================================================================
// File: fix-api-routes.js
// Run with: node fix-api-routes.js
// ===================================================================

const fs = require('fs');
const path = require('path');

const DYNAMIC_EXPORT = `// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

`;

function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findRouteFiles(fullPath, files);
    } else if (item === 'route.ts' || item === 'route.js') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it already has the dynamic export
  if (content.includes('export const dynamic')) {
    console.log(`⏭️  Skipping ${filePath} (already has dynamic export)`);
    return;
  }
  
  // Add the dynamic export at the beginning
  const newContent = DYNAMIC_EXPORT + content;
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✅ Fixed ${filePath}`);
}

// Main execution
console.log('🔍 Finding all API route files...\n');

const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
const routeFiles = findRouteFiles(apiDir);

console.log(`Found ${routeFiles.length} route files\n`);

routeFiles.forEach(fixRouteFile);

console.log('\n✨ Done! All API routes have been updated.');
console.log('\nNow you can:');
console.log('1. Commit the changes: git add -A && git commit -m "fix: add dynamic export to API routes"');
console.log('2. Push to trigger deployment: git push origin main');
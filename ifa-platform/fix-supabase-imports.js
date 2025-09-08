const fs = require('fs');
const path = require('path');

// Define file categories
const FILES = {
  client: [
    'src/components/layout/Sidebar.tsx',
    'src/components/monte-carlo/NuclearMonteCarlo.tsx',
    'src/components/clients/ClientDetails.tsx',
    'src/components/clients/RiskProfileTab.tsx',
    'src/components/reviews/EditReviewModal.tsx',
    'src/components/reviews/ScheduleReviewModal.tsx',
    'src/hooks/useAuth.tsx',
    'src/hooks/useAssessmentProgress.ts',
    'src/hooks/useAutoSave.ts',
    'src/app/messages/page.tsx',
    'src/app/calls/page.tsx',
    'src/app/cashflow/page.tsx',
    'src/app/calendar/page.tsx',
    'src/app/inbox/page.tsx',
    'src/app/compliance/page.tsx',
    'src/app/rebalancing/page.tsx',
    'src/app/monte-carlo/page.tsx',
    'src/app/risk/page.tsx',
    'src/app/assessments/new/page.tsx',
    'src/app/assessments/suitability/useSuitabilityAssessment.ts',
    'src/app/assessments/client/[id]/page.tsx',
    'src/app/assessments/page.tsx',
    'src/app/assessments/suitability-clients/[clientId]/page.tsx',
    'src/app/reviews/page.tsx',
    'src/app/settings/page.tsx',
  ],
  services: [
    'src/utils/saveClientData.ts',
    'src/services/CashFlowDataService.ts',
    'src/services/AssessmentService.ts',
    'src/services/ClientLifecycleService.ts',
    'src/services/SuitabilityAssessmentService.ts',
    'src/services/CashFlowScenarioService.ts',
    'src/services/MarketDataService.ts',
  ],
  api: [
    'src/app/api/utils.ts',
    'src/app/api/cashflow/scenarios/route.ts',
    'src/app/api/communications/route.ts',
    'src/app/api/dashboard/weekly-activity/route.ts',
    'src/app/api/dashboard/stats/route.ts',
    'src/app/api/documents/bulk/actions/route.ts',
    'src/app/api/documents/dashboard/stats/route.ts',
    'src/app/api/documents/activity/feed/route.ts',
    'src/app/api/clients/route.ts',
    'src/app/api/clients/statistics/route.ts',
  ]
};

function fixClientFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the import
  content = content.replace(
    /import\s+{\s*supabase(?:,\s*[^}]+)?\s*}\s+from\s+['"]@\/lib\/supabase['"]/g,
    "import { createClient } from '@/lib/supabase/client'"
  );
  
  // For CashFlowDataService specifically
  if (filePath.includes('CashFlowDataService')) {
    content = content.replace(
      /import\s+{\s*supabase\s*,\s*transformToSnakeCase\s*,\s*transformToCamelCase\s*}\s+from\s+['"]@\/lib\/supabase['"]/g,
      `import { createClient } from '@/lib/supabase/client'

// Add these transform functions locally since they're not in the client file
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => \`_\${letter.toLowerCase()}\`)
}

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function transformToSnakeCase(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) {
    return obj.map(item => transformToSnakeCase(item))
  }
  
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key)
    result[snakeKey] = transformToSnakeCase(value)
  }
  return result
}

function transformToCamelCase(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) {
    return obj.map(item => transformToCamelCase(item))
  }
  
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    result[camelKey] = transformToCamelCase(value)
  }
  return result
}`
    );
  }
  
  // Add supabase client creation for React components
  if (filePath.endsWith('.tsx') && filePath.includes('/app/')) {
    // For page components
    if (content.includes('export default function')) {
      content = content.replace(
        /export default function (\w+)\(\) {/,
        'export default function $1() {\n  const supabase = createClient()'
      );
    }
  }
  
  // For hooks and services (class-based or function-based)
  if (filePath.includes('/hooks/') || filePath.includes('/services/')) {
    // If it's a service class
    if (content.includes('export class')) {
      content = content.replace(
        /export class (\w+) {/,
        'export class $1 {\n  private supabase = createClient()\n'
      );
      // Replace this.supabase references if needed
      content = content.replace(/supabase\./g, 'this.supabase.');
    }
    // If it's a hook or function
    else if (content.includes('export function') || content.includes('export const')) {
      // Add client creation at the beginning of the function
      content = content.replace(
        /(export (?:const|function) \w+.*?{)/,
        '$1\n  const supabase = createClient()'
      );
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed client file: ${filePath}`);
}

function fixApiFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the import
  content = content.replace(
    /import\s+{\s*supabase\s*}\s+from\s+['"]@\/lib\/supabase['"]/g,
    "import { createClient } from '@/lib/supabase/server'"
  );
  
  // For API route handlers, add await createClient() at the beginning
  if (content.includes('export async function')) {
    content = content.replace(
      /(export async function \w+\([^)]*\) {)/g,
      '$1\n  const supabase = await createClient()'
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed API file: ${filePath}`);
}

// Process all files
console.log('🚀 Starting fix process...\n');

// Fix client files
console.log('📁 Fixing client components...');
FILES.client.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fixClientFile(filePath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

// Fix service files
console.log('\n📁 Fixing service files...');
FILES.services.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fixClientFile(filePath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

// Fix API files
console.log('\n📁 Fixing API routes...');
FILES.api.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fixApiFile(filePath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✨ Fix process completed!');
console.log('\n⚠️  IMPORTANT: Please review the following:');
console.log('1. Some files may need manual adjustment for supabase client creation');
console.log('2. Run "npm run build" to verify all issues are resolved');
console.log('3. Check that transform functions are properly imported where needed');
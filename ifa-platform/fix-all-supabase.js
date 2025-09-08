const fs = require('fs');
const path = require('path');

// Define all files and their fixes
const fixes = [
  // Service files - need client import
  {
    files: [
      'src/services/documentService.ts',
      'src/services/clientDocumentService.ts',
      'src/services/documentTemplateService.ts',
      'src/services/EnhancedDocumentGenerationService.ts',
      'src/services/ClientService.ts',
      'src/services/documentGenerationService.ts',
      'src/services/aiAssistantService.ts',
      'src/services/integratedClientService.ts',
      'src/services/realIntegratedServices.ts',
      'src/services/EnhancedChartService.ts',
      'src/services/EnhancedCashFlowReportService.ts',
      'src/services/StressTestReportService.ts',
      'src/services/CashFlowReportService.ts',
      'src/services/AssessmentDocumentIntegration.ts'
    ],
    addImport: 'import { createClient } from "@/lib/supabase/client"',
    replacements: [
      ['createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)', 'createClient()'],
      ['createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!\n  )', 'createClient()'],
      ['ReturnType<typeof createBrowserClient>', 'any'],
      ['getSupabaseBrowserClient()', 'createClient()']
    ]
  },
  // API routes - need server import with await
  {
    files: [
      'src/app/api/reviews/route.ts',
      'src/app/api/activity-log/route.ts'
    ],
    addImport: 'import { createClient } from "@/lib/supabase/server"',
    replacements: [
      ['createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)', 'await createClient()'],
      ['const supabase = createClient()', 'const supabase = await createClient()']
    ]
  },
  // Page components - need client import
  {
    files: [
      'src/app/documents/page.tsx',
      'src/app/documents/status/page.tsx',
      'src/app/templates/editor/page.tsx'
    ],
    addImport: 'import { createClient } from "@/lib/supabase/client"',
    replacements: [
      ['createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)', 'createClient()']
    ]
  },
  // Components - need client import
  {
    files: [
      'src/components/AuthTest.tsx',
      'src/components/suitability/SuitabilityForm.tsx'
    ],
    addImport: 'import { createClient } from "@/lib/supabase/client"',
    replacements: [
      ['createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)', 'createClient()']
    ]
  },
  // Hooks - need client import
  {
    files: [
      'src/hooks/suitability/useSuitabilityForm.ts',
      'src/hooks/suitability/useATRCFLIntegration.ts'
    ],
    addImport: 'import { createClient } from "@/lib/supabase/client"',
    replacements: [
      ['getSupabaseBrowserClient()', 'createClient()'],
      ['createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)', 'createClient()']
    ]
  },
  // Special case - lib/services/documentService.ts needs client not server
  {
    files: ['src/lib/services/documentService.ts'],
    addImport: 'import { createClient } from "@/lib/supabase/client"',
    replacements: [
      ['import { createClient } from "@/lib/supabase/server"', 'import { createClient } from "@/lib/supabase/client"'],
      ['await createClient()', 'createClient()']
    ]
  }
];

// Process each fix group
fixes.forEach(fixGroup => {
  fixGroup.files.forEach(filePath => {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
      }
      
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Add import if not present
      if (fixGroup.addImport && !content.includes('import { createClient }')) {
        content = fixGroup.addImport + '\n' + content;
        modified = true;
        console.log(`Added import to ${filePath}`);
      }
      
      // Apply replacements
      fixGroup.replacements.forEach(([find, replace]) => {
        if (content.includes(find)) {
          content = content.split(find).join(replace);
          modified = true;
          console.log(`Replaced in ${filePath}: ${find.substring(0, 30)}...`);
        }
      });
      
      // Save if modified
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Fixed ${filePath}`);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  });
});

console.log('\n✓ All fixes applied!');
console.log('Now run: npm run dev');
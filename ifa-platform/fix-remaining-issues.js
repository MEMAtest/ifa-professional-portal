const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'src/app/assessments/suitability/useSuitabilityAssessment.ts',
    fix: (content) => {
      // Add supabase instance after imports
      if (!content.includes('const supabase = createClient()')) {
        const importEnd = content.lastIndexOf("import");
        const nextLine = content.indexOf('\n', importEnd);
        content = content.slice(0, nextLine + 1) + '\nconst supabase = createClient()\n' + content.slice(nextLine + 1);
      }
      return content;
    }
  },
  {
    file: 'src/app/calendar/page.tsx',
    fix: (content) => {
      // Remove duplicate supabase declarations
      const lines = content.split('\n');
      const seen = new Set();
      const filtered = lines.filter(line => {
        if (line.trim() === 'const supabase = createClient()') {
          if (seen.has('supabase')) {
            return false; // Skip duplicate
          }
          seen.add('supabase');
        }
        return true;
      });
      return filtered.join('\n');
    }
  },
  {
    file: 'src/components/layout/Sidebar.tsx',
    fix: (content) => {
      // Add supabase instance if not present
      if (!content.includes('const supabase = createClient()')) {
        // Add inside the component
        content = content.replace(
          /export (?:default )?function Sidebar\([^)]*\) {/,
          'export default function Sidebar($&) {\n  const supabase = createClient()'
        );
        if (!content.includes('const supabase')) {
          // If still not added, try another pattern
          content = content.replace(
            /const Sidebar.*?= \([^)]*\) => {/,
            '$&\n  const supabase = createClient()'
          );
        }
      }
      return content;
    }
  },
  {
    file: 'src/components/monte-carlo/NuclearMonteCarlo.tsx',
    fix: (content) => {
      // Add supabase instance if not present
      if (!content.includes('const supabase = createClient()')) {
        content = content.replace(
          /export (?:default )?function NuclearMonteCarlo\([^)]*\) {/,
          '$&\n  const supabase = createClient()'
        );
        if (!content.includes('const supabase')) {
          // Try arrow function pattern
          content = content.replace(
            /const NuclearMonteCarlo.*?= \([^)]*\) => {/,
            '$&\n  const supabase = createClient()'
          );
        }
      }
      return content;
    }
  },
  {
    file: 'src/utils/saveClientData.ts',
    fix: (content) => {
      // Add supabase instance after imports if not present
      if (!content.includes('const supabase = createClient()')) {
        const importEnd = content.lastIndexOf("import");
        const nextLine = content.indexOf('\n', importEnd);
        content = content.slice(0, nextLine + 1) + '\nconst supabase = createClient()\n' + content.slice(nextLine + 1);
      }
      return content;
    }
  }
];

fixes.forEach(({ file, fix }) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      content = fix(content);
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${file}`);
    } catch (error) {
      console.log(`❌ Error fixing ${file}: ${error.message}`);
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✨ Done! Run "npm run build" to check if all issues are resolved.');

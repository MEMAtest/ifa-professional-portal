#!/usr/bin/env node

/**
 * Apply RLS Critical Fixes Migration
 * Runs the SQL migration using Supabase management API
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  console.log('\n🔧 Applying RLS Critical Fixes Migration\n')
  console.log('='.repeat(50))

  // Read the migration file
  const migrationPath = join(__dirname, '../supabase/migrations/20250109_fix_rls_critical.sql')
  const migrationSql = readFileSync(migrationPath, 'utf-8')

  // Split into individual statements (excluding BEGIN/COMMIT for Supabase API)
  const statements = migrationSql
    .replace(/BEGIN;/gi, '')
    .replace(/COMMIT;/gi, '')
    .split(/;[\s]*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`\n📋 Found ${statements.length} SQL statements to execute\n`)

  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
    auth: { persistSession: false }
  })

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 60).replace(/\n/g, ' ')

    try {
      // Use raw SQL through rpc
      const { error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        // Try alternative method - some statements may need direct execution
        console.log(`  ⚠️  [${i + 1}] ${preview}...`)
        console.log(`      Note: ${error.message}`)
        errorCount++
      } else {
        console.log(`  ✅ [${i + 1}] ${preview}...`)
        successCount++
      }
    } catch (e) {
      console.log(`  ❌ [${i + 1}] ${preview}...`)
      console.log(`      Error: ${e.message}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} need manual application`)

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements could not be executed via API.')
    console.log('   Please apply the migration manually via Supabase Dashboard:')
    console.log('   1. Go to https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql')
    console.log('   2. Copy the contents of: supabase/migrations/20250109_fix_rls_critical.sql')
    console.log('   3. Paste and run in the SQL Editor')
  }
}

main().catch(console.error)

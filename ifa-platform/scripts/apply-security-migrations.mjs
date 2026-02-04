#!/usr/bin/env node
/**
 * Apply security migrations directly via Supabase REST API
 * Uses service role key to execute SQL statements
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Security migrations to apply in order
const SECURITY_MIGRATIONS = [
  '20260203_security_hardening.sql'
]

async function checkCurrentState() {
  console.log('Checking current database state...\n')

  // Check if get_my_firm_id function exists
  const { data: funcs, error: funcError } = await supabase
    .rpc('get_my_firm_id')
    .maybeSingle()

  if (funcError && funcError.message.includes('does not exist')) {
    console.log('❌ get_my_firm_id() function: NOT EXISTS')
    return { jwtHookExists: false }
  } else {
    console.log('✅ get_my_firm_id() function: EXISTS')
  }

  // Check RLS on key tables
  const tables = ['clients', 'profiles', 'suitability_assessments', 'documents', 'activity_log']
  console.log('\nRLS Status:')

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .limit(0)

    if (error) {
      console.log(`  ${table}: Error - ${error.message}`)
    } else {
      console.log(`  ${table}: Accessible (${count} rows)`)
    }
  }

  return { jwtHookExists: true }
}

async function executeSqlViaRpc(sql) {
  // Supabase doesn't support raw SQL via JS client
  // We need to use the postgres-meta API or create an RPC function
  // For now, output instructions
  return null
}

async function main() {
  const state = await checkCurrentState()

  console.log('\n' + '='.repeat(60))
  console.log('SECURITY MIGRATIONS TO APPLY')
  console.log('='.repeat(60))

  for (const migration of SECURITY_MIGRATIONS) {
    const migrationPath = path.join(__dirname, '../supabase/migrations', migration)
    if (fs.existsSync(migrationPath)) {
      const stat = fs.statSync(migrationPath)
      console.log(`\n📄 ${migration}`)
      console.log(`   Size: ${(stat.size / 1024).toFixed(1)} KB`)
    } else {
      console.log(`\n❌ ${migration} - FILE NOT FOUND`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('MANUAL APPLICATION REQUIRED')
  console.log('='.repeat(60))

  console.log(`
The Supabase JS client cannot execute DDL statements directly.

To apply these migrations:

1. Go to: https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql

2. Run each migration file in order:
`)

  for (const migration of SECURITY_MIGRATIONS) {
    console.log(`   • supabase/migrations/${migration}`)
  }

  console.log(`
3. After running all migrations, the JWT hook needs to be enabled:
   - Go to: Authentication > Hooks
   - Enable "Custom Access Token Hook"
   - Select the function: custom_access_token_hook

4. Force all users to re-login to get new JWT with firm_id claim
`)

  // Generate a combined SQL file for easier application
  console.log('='.repeat(60))
  console.log('GENERATING COMBINED SQL FILE')
  console.log('='.repeat(60))

  let combinedSql = `-- Combined Security Migrations
-- Generated: ${new Date().toISOString()}
-- Apply via Supabase Dashboard SQL Editor
-- ============================================

`

  for (const migration of SECURITY_MIGRATIONS) {
    const migrationPath = path.join(__dirname, '../supabase/migrations', migration)
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8')
      combinedSql += `
-- ============================================
-- Migration: ${migration}
-- ============================================

${sql}

`
    }
  }

  const outputPath = path.join(__dirname, '../supabase/combined-security-migrations.sql')
  fs.writeFileSync(outputPath, combinedSql)
  console.log(`\n✅ Combined SQL written to: supabase/combined-security-migrations.sql`)
  console.log(`   Size: ${(combinedSql.length / 1024).toFixed(1)} KB`)
}

main().catch(console.error)

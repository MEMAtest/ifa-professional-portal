#!/usr/bin/env node
/**
 * Apply security migrations via Supabase Management API
 *
 * Usage: SUPABASE_ACCESS_TOKEN=<token> node scripts/apply-migrations-via-api.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'maandodhonjolrmcxivo'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!ACCESS_TOKEN) {
  console.error('Missing required environment variable: SUPABASE_ACCESS_TOKEN')
  console.error('Get your token from: https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

// Security migrations to apply in order
const SECURITY_MIGRATIONS = [
  '20250109_firm_security.sql',
  '20250109_fix_rls_critical.sql',
  '20250109_fix_security_definer.sql',
  '20250110_backfill_firm_id.sql',
  '20250110_rls_assessment_tables.sql'
]

async function executeSQL(sql, description) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  })

  const result = await response.json()

  if (response.ok) {
    return { success: true, result }
  } else {
    return { success: false, error: result.message || JSON.stringify(result) }
  }
}

async function checkCurrentState() {
  console.log('Checking current database state...\n')

  // Check if get_my_firm_id function exists
  const funcCheck = await executeSQL(
    "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_my_firm_id' AND routine_schema = 'public'",
    'Check get_my_firm_id function'
  )

  if (funcCheck.success && funcCheck.result.length > 0) {
    console.log('✅ get_my_firm_id() function exists')
  } else {
    console.log('❌ get_my_firm_id() function NOT found')
  }

  // Check RLS status on key tables
  const rlsCheck = await executeSQL(
    `SELECT tablename, rowsecurity::text
     FROM pg_tables
     WHERE schemaname = 'public'
     AND tablename IN ('clients', 'profiles', 'suitability_assessments', 'documents', 'activity_log')
     ORDER BY tablename`,
    'Check RLS status'
  )

  if (rlsCheck.success) {
    console.log('\nRLS Status:')
    for (const row of rlsCheck.result) {
      const status = row.rowsecurity === 't' ? '✅ enabled' : '❌ disabled'
      console.log(`  ${row.tablename}: ${status}`)
    }
  }

  // Check number of policies
  const policyCheck = await executeSQL(
    `SELECT tablename, COUNT(*) as policy_count
     FROM pg_policies
     WHERE schemaname = 'public'
     GROUP BY tablename
     ORDER BY tablename`,
    'Check policies'
  )

  if (policyCheck.success) {
    console.log('\nPolicy counts:')
    for (const row of policyCheck.result) {
      console.log(`  ${row.tablename}: ${row.policy_count} policies`)
    }
  }

  return { funcCheck, rlsCheck, policyCheck }
}

async function applyMigration(filename) {
  const migrationPath = path.join(__dirname, '../supabase/migrations', filename)

  if (!fs.existsSync(migrationPath)) {
    return { success: false, error: 'File not found' }
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Applying: ${filename}`)
  console.log(`Size: ${(sql.length / 1024).toFixed(1)} KB`)
  console.log('='.repeat(60))

  const result = await executeSQL(sql, filename)

  if (result.success) {
    console.log('✅ Migration applied successfully')
    if (result.result && result.result.length > 0) {
      console.log('Result:', JSON.stringify(result.result, null, 2).substring(0, 500))
    }
  } else {
    console.log('❌ Migration failed:', result.error)
  }

  return result
}

async function main() {
  console.log('Security Migration Applier')
  console.log('==========================\n')

  // Check current state
  await checkCurrentState()

  console.log('\n' + '='.repeat(60))
  console.log('APPLYING SECURITY MIGRATIONS')
  console.log('='.repeat(60))

  const results = []

  for (const migration of SECURITY_MIGRATIONS) {
    const result = await applyMigration(migration)
    results.push({ migration, ...result })

    if (!result.success) {
      console.log(`\n⚠️  Stopping due to error in ${migration}`)
      // Continue anyway to see all errors
      // break
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))

  for (const r of results) {
    const status = r.success ? '✅' : '❌'
    console.log(`${status} ${r.migration}`)
  }

  // Final state check
  console.log('\n' + '='.repeat(60))
  console.log('FINAL STATE')
  console.log('='.repeat(60))
  await checkCurrentState()

  const failed = results.filter(r => !r.success)
  if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} migration(s) failed`)
    process.exit(1)
  } else {
    console.log('\n✅ All migrations applied successfully!')
  }
}

main().catch(console.error)

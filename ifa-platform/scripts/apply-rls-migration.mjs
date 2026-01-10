#!/usr/bin/env node
/**
 * Apply RLS migration directly using pg library
 * This bypasses the Supabase CLI migration history
 *
 * Usage: DATABASE_URL=<connection-string> node scripts/apply-rls-migration.mjs
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Supabase direct connection (bypasses pooler for DDL)
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('Missing required environment variable: DATABASE_URL')
  console.error('Get your connection string from Supabase Dashboard > Settings > Database')
  process.exit(1)
}

async function runMigration() {
  console.log('Applying RLS migration...\n')

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250110_rls_assessment_tables.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected!\n')

    // Check current state
    const { rows: beforeState } = await client.query(`
      SELECT tablename, rowsecurity::text
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('suitability_assessments', 'atr_assessments', 'cfl_assessments', 'documents', 'activity_log')
    `)
    console.log('Current RLS status:')
    beforeState.forEach(r => console.log(`  ${r.tablename}: RLS ${r.rowsecurity === 't' ? 'enabled' : 'disabled'}`))

    console.log('\nRunning migration...')
    await client.query(sql)
    console.log('Migration completed successfully!\n')

    // Check new state
    const { rows: afterState } = await client.query(`
      SELECT tablename, rowsecurity::text
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('suitability_assessments', 'atr_assessments', 'cfl_assessments', 'documents', 'activity_log')
    `)
    console.log('New RLS status:')
    afterState.forEach(r => console.log(`  ${r.tablename}: RLS ${r.rowsecurity === 't' ? 'enabled' : 'disabled'}`))

    // Verify policies exist
    const { rows: policies } = await client.query(`
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename IN ('suitability_assessments', 'atr_assessments', 'cfl_assessments', 'documents', 'activity_log')
      ORDER BY tablename, policyname
    `)
    console.log('\nPolicies created:')
    let currentTable = ''
    policies.forEach(p => {
      if (p.tablename !== currentTable) {
        currentTable = p.tablename
        console.log(`  ${p.tablename}:`)
      }
      console.log(`    - ${p.policyname}`)
    })

    console.log('\n✅ RLS migration applied successfully!')

  } catch (err) {
    console.error('Migration failed:', err.message)
    if (err.message.includes('password')) {
      console.log('\n⚠️  Database password required.')
      console.log('Please run manually via Supabase Dashboard SQL Editor:')
      console.log('https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration().catch(console.error)

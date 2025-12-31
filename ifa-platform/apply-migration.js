#!/usr/bin/env node
// ================================================================
// APPLY OPENSIGN DATABASE MIGRATION
// ================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

async function applyMigration() {
  console.log('🔄 APPLYING OPENSIGN DATABASE MIGRATION')
  console.log('======================================')

  try {
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Read migration file
    const migrationPath = './supabase/migrations/20241228_opensign_signature_integration.sql'
    console.log('📄 Reading migration file:', migrationPath)

    const migrationSQL = readFileSync(migrationPath, 'utf8')
    console.log('✅ Migration file loaded successfully')

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📊 Found ${statements.length} SQL statements to execute`)

    let successCount = 0
    let errorCount = 0

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement.trim()) continue

      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`)
      console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
          errorCount++
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
          successCount++
        }
      } catch (execError) {
        console.error(`❌ Execution error in statement ${i + 1}:`, execError.message)
        errorCount++
      }
    }

    // Summary
    console.log('\n📋 MIGRATION SUMMARY')
    console.log('===================')
    console.log(`✅ Successful statements: ${successCount}`)
    console.log(`❌ Failed statements: ${errorCount}`)
    console.log(`📊 Total statements: ${statements.length}`)

    if (errorCount === 0) {
      console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!')
    } else {
      console.log('\n⚠️  MIGRATION COMPLETED WITH ERRORS')
      console.log('Some statements failed. Check the errors above.')
    }

    // Test the migration by checking if tables exist
    console.log('\n🔍 VERIFYING MIGRATION RESULTS')
    console.log('=============================')

    try {
      // Check if signature_requests table has new columns
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'signature_requests')
        .eq('table_schema', 'public')

      if (columnsError) {
        console.error('❌ Error checking columns:', columnsError.message)
      } else {
        const columnNames = columns.map(c => c.column_name)
        console.log('📋 signature_requests columns:', columnNames)

        const expectedColumns = [
          'opensign_document_id',
          'expires_at',
          'auto_reminder',
          'remind_once_in_every',
          'merge_certificate',
          'certificate_url',
          'download_url',
          'opensign_metadata'
        ]

        const missingColumns = expectedColumns.filter(col => !columnNames.includes(col))
        const presentColumns = expectedColumns.filter(col => columnNames.includes(col))

        console.log(`✅ Present new columns: ${presentColumns.join(', ')}`)
        if (missingColumns.length > 0) {
          console.log(`❌ Missing columns: ${missingColumns.join(', ')}`)
        }
      }

      // Check if webhook events table exists
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'signature_webhook_events')

      if (tablesError) {
        console.error('❌ Error checking tables:', tablesError.message)
      } else {
        if (tables.length > 0) {
          console.log('✅ signature_webhook_events table created successfully')
        } else {
          console.log('❌ signature_webhook_events table not found')
        }
      }

    } catch (verifyError) {
      console.error('❌ Error verifying migration:', verifyError.message)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

applyMigration()
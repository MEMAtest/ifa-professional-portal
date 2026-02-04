#!/usr/bin/env node

/**
 * Run SQL migration using pg package
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const dbPassword = process.env.SUPABASE_DB_PASSWORD

  if (!supabaseUrl || !dbPassword) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD')
    process.exit(1)
  }

  const projectRef =
    process.env.SUPABASE_PROJECT_REF ||
    new URL(supabaseUrl).hostname.split('.')[0]

  const dbUser = process.env.SUPABASE_DB_USER || `postgres.${projectRef}`
  const poolerHost = process.env.SUPABASE_DB_POOLER_HOST || 'aws-0-eu-west-2.pooler.supabase.com'
  const poolerPort = process.env.SUPABASE_DB_POOLER_PORT || '6543'
  const directHost = process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`
  const directPort = process.env.SUPABASE_DB_PORT || '5432'

  console.log('\n🔧 Applying RLS Critical Fixes Migration\n')

  // Read the migration file
  const migrationPath = join(__dirname, '../supabase/migrations/20250109_fix_rls_critical.sql')
  const migrationSql = readFileSync(migrationPath, 'utf-8')

  // Connection string for Supabase pooler with service role
  // Format: postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres
  const connectionString = `postgresql://${dbUser}:${dbPassword}@${poolerHost}:${poolerPort}/postgres`

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('✅ Connected!\n')

    console.log('Running migration...')
    await client.query(migrationSql)
    console.log('✅ Migration applied successfully!\n')

  } catch (error) {
    console.error('❌ Error:', error.message)

    // If connection failed, try transaction mode connection
    if (error.message.includes('password') || error.message.includes('SASL')) {
      console.log('\nTrying alternative connection...')

      // Try with direct connection (port 5432)
      const directString = `postgresql://${dbUser}:${dbPassword}@${directHost}:${directPort}/postgres`

      const client2 = new pg.Client({
        connectionString: directString,
        ssl: { rejectUnauthorized: false }
      })

      try {
        await client2.connect()
        console.log('✅ Connected via direct connection!\n')
        await client2.query(migrationSql)
        console.log('✅ Migration applied successfully!\n')
        await client2.end()
        return
      } catch (e2) {
        console.error('❌ Direct connection also failed:', e2.message)
      }
    }

    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

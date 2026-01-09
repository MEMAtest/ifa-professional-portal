#!/usr/bin/env node

/**
 * Demo Environment Reset Script
 *
 * Clears all demo firm data and re-seeds fresh sample data.
 * Use between demos to ensure clean state.
 *
 * Usage:
 *   node scripts/reset-demo.mjs
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL - UAT Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY - UAT Service role key
 */

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEMO_FIRM_ID = '00000000-0000-0000-0000-000000000100'

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('\n🔄 Demo Environment Reset Script\n')
  console.log('='.repeat(50))
  console.log(`Target: ${supabaseUrl}\n`)

  // Step 1: Delete demo clients
  console.log('🗑️  Clearing demo data...')

  const { error: clientsError } = await supabase
    .from('clients')
    .delete()
    .eq('firm_id', DEMO_FIRM_ID)

  if (clientsError) {
    console.log(`   ⚠️  Clients: ${clientsError.message}`)
  } else {
    console.log('   ✅ Clients cleared')
  }

  // Step 2: Delete notifications
  const { error: notifError } = await supabase
    .from('notifications')
    .delete()
    .eq('firm_id', DEMO_FIRM_ID)

  if (notifError) {
    console.log(`   ⚠️  Notifications: ${notifError.message}`)
  } else {
    console.log('   ✅ Notifications cleared')
  }

  // Step 3: Delete file reviews
  const { error: reviewsError } = await supabase
    .from('file_reviews')
    .delete()
    .eq('firm_id', DEMO_FIRM_ID)

  if (reviewsError) {
    console.log(`   ⚠️  File reviews: ${reviewsError.message}`)
  } else {
    console.log('   ✅ File reviews cleared')
  }

  // Step 4: Delete complaints
  const { error: complaintsError } = await supabase
    .from('complaint_register')
    .delete()
    .eq('firm_id', DEMO_FIRM_ID)

  if (complaintsError) {
    console.log(`   ⚠️  Complaints: ${complaintsError.message}`)
  } else {
    console.log('   ✅ Complaints cleared')
  }

  // Step 5: Delete breaches
  const { error: breachesError } = await supabase
    .from('breach_register')
    .delete()
    .eq('firm_id', DEMO_FIRM_ID)

  if (breachesError) {
    console.log(`   ⚠️  Breaches: ${breachesError.message}`)
  } else {
    console.log('   ✅ Breaches cleared')
  }

  // Step 6: Delete vulnerabilities
  const { error: vulnError } = await supabase
    .from('vulnerability_register')
    .delete()
    .eq('firm_id', DEMO_FIRM_ID)

  if (vulnError) {
    console.log(`   ⚠️  Vulnerabilities: ${vulnError.message}`)
  } else {
    console.log('   ✅ Vulnerabilities cleared')
  }

  console.log('\n🌱 Re-seeding demo data...\n')

  // Run seed script
  const seedScript = join(__dirname, 'seed-demo.mjs')
  const child = spawn('node', [seedScript], {
    stdio: 'inherit',
    env: process.env
  })

  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Demo environment reset complete!\n')
    } else {
      console.error('❌ Seed script failed')
      process.exit(1)
    }
  })
}

main().catch(console.error)

#!/usr/bin/env node

/**
 * Backfill firm_id for existing records
 *
 * This script populates firm_id for all existing records that don't have one.
 * Run this after deploying the RLS migration to ensure all data is accessible.
 *
 * Usage:
 *   node scripts/backfill-firm-id.mjs [--dry-run]
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 */

import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables:')
    if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nLoad your .env file first: source .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`\n🔧 Firm ID Backfill Script ${dryRun ? '(DRY RUN)' : ''}\n`)
  console.log('='.repeat(50))

  // Step 1: Check for existing firms
  const { data: firms, error: firmsError } = await supabase
    .from('firms')
    .select('id, name, fca_number')
    .order('created_at', { ascending: true })

  if (firmsError) {
    console.error('Error fetching firms:', firmsError.message)
    process.exit(1)
  }

  console.log(`\n📊 Found ${firms.length} firm(s)`)

  let defaultFirmId = firms[0]?.id

  if (firms.length === 0) {
    console.log('⚠️  No firms exist - creating default firm...')
    if (!dryRun) {
      const { data: newFirm, error: createError } = await supabase
        .from('firms')
        .insert({
          name: 'Default Firm',
          fca_number: 'DEFAULT',
          settings: {
            branding: {
              primaryColor: '#2563eb',
              secondaryColor: '#1e40af'
            },
            compliance: {
              tr241Enabled: true,
              consumerDutyEnabled: true
            },
            billing: {
              maxSeats: 10,
              currentSeats: 0
            }
          },
          subscription_tier: 'professional'
        })
        .select('id, name')
        .single()

      if (createError) {
        console.error('Error creating default firm:', createError.message)
        process.exit(1)
      }

      console.log(`✅ Created default firm: ${newFirm.name} (${newFirm.id})`)
      defaultFirmId = newFirm.id
    } else {
      console.log('   Would create default firm')
      defaultFirmId = 'DRY-RUN-FIRM-ID'
    }
  } else {
    console.log(`\n🏢 Default firm: ${firms[0].name} (${defaultFirmId})`)
  }

  // Step 2: Check current state
  console.log('\n📋 Current state (NULL firm_id counts):')
  console.log('-'.repeat(40))

  const tables = [
    'profiles',
    'clients',
    'file_reviews',
    'complaint_register',
    'breach_register',
    'vulnerability_register',
    'client_services',
    'notifications'
  ]

  const nullCounts = {}
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('firm_id', null)

      if (error) throw error
      nullCounts[table] = count || 0
      console.log(`  ${table}: ${count || 0}`)
    } catch (e) {
      console.log(`  ${table}: (error: ${e.message})`)
      nullCounts[table] = -1
    }
  }

  const totalNull = Object.values(nullCounts).filter(c => c > 0).reduce((a, b) => a + b, 0)

  if (totalNull === 0) {
    console.log('\n✅ All records already have firm_id populated!')
    return
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made')
    console.log(`   Would update approximately ${totalNull} records`)
    console.log('   Run without --dry-run to apply changes')
    return
  }

  // Step 3: Backfill profiles
  if (nullCounts.profiles > 0) {
    console.log('\n🔄 Backfilling profiles...')
    const { error } = await supabase
      .from('profiles')
      .update({ firm_id: defaultFirmId })
      .is('firm_id', null)

    if (error) {
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`   Updated profiles with firm_id`)
    }
  }

  // Step 4: Backfill clients
  if (nullCounts.clients > 0) {
    console.log('\n🔄 Backfilling clients...')
    const { error } = await supabase
      .from('clients')
      .update({ firm_id: defaultFirmId })
      .is('firm_id', null)

    if (error) {
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`   Updated clients with firm_id`)
    }
  }

  // Step 5: Backfill file_reviews
  if (nullCounts.file_reviews > 0) {
    console.log('\n🔄 Backfilling file_reviews...')
    const { error } = await supabase
      .from('file_reviews')
      .update({ firm_id: defaultFirmId })
      .is('firm_id', null)

    if (error) {
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`   Updated file_reviews with firm_id`)
    }
  }

  // Step 6: Backfill complaint_register
  if (nullCounts.complaint_register > 0) {
    console.log('\n🔄 Backfilling complaint_register...')
    const { error } = await supabase
      .from('complaint_register')
      .update({ firm_id: defaultFirmId })
      .is('firm_id', null)

    if (error) {
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`   Updated complaint_register with firm_id`)
    }
  }

  // Step 7: Backfill breach_register
  if (nullCounts.breach_register > 0) {
    console.log('\n🔄 Backfilling breach_register...')
    const { error } = await supabase
      .from('breach_register')
      .update({ firm_id: defaultFirmId })
      .is('firm_id', null)

    if (error) {
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`   Updated breach_register with firm_id`)
    }
  }

  // Step 8: Backfill vulnerability_register
  if (nullCounts.vulnerability_register > 0) {
    console.log('\n🔄 Backfilling vulnerability_register...')
    const { error } = await supabase
      .from('vulnerability_register')
      .update({ firm_id: defaultFirmId })
      .is('firm_id', null)

    if (error) {
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`   Updated vulnerability_register with firm_id`)
    }
  }

  // Step 9: Backfill client_services
  if (nullCounts.client_services > 0) {
    console.log('\n🔄 Backfilling client_services...')
    const { error } = await supabase
      .from('client_services')
      .update({ firm_id: defaultFirmId })
      .is('firm_id', null)

    if (error) {
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`   Updated client_services with firm_id`)
    }
  }

  // Step 10: Backfill notifications
  if (nullCounts.notifications > 0) {
    console.log('\n🔄 Backfilling notifications...')
    const { error } = await supabase
      .from('notifications')
      .update({ firm_id: defaultFirmId })
      .is('firm_id', null)

    if (error) {
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`   Updated notifications with firm_id`)
    }
  }

  // Step 11: Verify
  console.log('\n📋 Final state (NULL firm_id counts):')
  console.log('-'.repeat(40))

  let allGood = true
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('firm_id', null)

      if (error) throw error
      const status = count === 0 ? '✅' : '⚠️'
      console.log(`  ${status} ${table}: ${count || 0}`)
      if (count > 0) allGood = false
    } catch (e) {
      console.log(`  ⏭️  ${table}: (skipped)`)
    }
  }

  if (allGood) {
    console.log('\n✅ All records now have firm_id populated!')
    console.log('\n📝 Next steps:')
    console.log('   1. Enable the JWT hook in Supabase Dashboard > Auth > Hooks')
    console.log('   2. Force users to re-login to get new JWT with firm_id')
    console.log('   3. Consider making firm_id NOT NULL on critical tables')
  } else {
    console.log('\n⚠️  Some records still have NULL firm_id')
    console.log('   Review manually and fix orphaned records')
  }
}

main().catch(console.error)

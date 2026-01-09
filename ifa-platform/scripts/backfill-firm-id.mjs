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
 *   DATABASE_URL - PostgreSQL connection string
 */

import { neon } from '@neondatabase/serverless'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log(`\n🔧 Firm ID Backfill Script ${dryRun ? '(DRY RUN)' : ''}\n`)
  console.log('=' .repeat(50))

  // Step 1: Check for existing firms
  const firms = await sql`SELECT id, name, fca_number FROM firms ORDER BY created_at ASC`
  console.log(`\n📊 Found ${firms.length} firm(s)`)

  if (firms.length === 0) {
    console.log('⚠️  No firms exist - creating default firm...')
    if (!dryRun) {
      const [newFirm] = await sql`
        INSERT INTO firms (name, fca_number, settings, subscription_tier)
        VALUES (
          'Default Firm',
          'DEFAULT',
          jsonb_build_object(
            'branding', jsonb_build_object(
              'primaryColor', '#2563eb',
              'secondaryColor', '#1e40af'
            ),
            'compliance', jsonb_build_object(
              'tr241Enabled', true,
              'consumerDutyEnabled', true
            ),
            'billing', jsonb_build_object(
              'maxSeats', 10,
              'currentSeats', 0
            )
          ),
          'professional'
        )
        RETURNING id, name
      `
      console.log(`✅ Created default firm: ${newFirm.name} (${newFirm.id})`)
      firms.push(newFirm)
    }
  }

  const defaultFirmId = firms[0].id
  console.log(`\n🏢 Default firm: ${firms[0].name} (${defaultFirmId})`)

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
      const [result] = await sql`
        SELECT COUNT(*) as count FROM ${sql(table)} WHERE firm_id IS NULL
      `
      nullCounts[table] = parseInt(result.count)
      console.log(`  ${table}: ${result.count}`)
    } catch (e) {
      console.log(`  ${table}: (table not found)`)
      nullCounts[table] = -1
    }
  }

  if (Object.values(nullCounts).every(c => c <= 0)) {
    console.log('\n✅ All records already have firm_id populated!')
    return
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN - No changes will be made')
    console.log('Run without --dry-run to apply changes')
    return
  }

  // Step 3: Backfill profiles
  if (nullCounts.profiles > 0) {
    console.log('\n🔄 Backfilling profiles...')
    const result = await sql`
      UPDATE profiles
      SET firm_id = ${defaultFirmId}
      WHERE firm_id IS NULL
    `
    console.log(`   Updated ${result.count} profiles`)
  }

  // Step 4: Backfill clients (try to get from advisor's profile first)
  if (nullCounts.clients > 0) {
    console.log('\n🔄 Backfilling clients...')
    const result = await sql`
      UPDATE clients c
      SET firm_id = COALESCE(
        (SELECT p.firm_id FROM profiles p WHERE p.id = c.advisor_id),
        ${defaultFirmId}
      )
      WHERE c.firm_id IS NULL
    `
    console.log(`   Updated ${result.count} clients`)
  }

  // Step 5: Backfill file_reviews
  if (nullCounts.file_reviews > 0) {
    console.log('\n🔄 Backfilling file_reviews...')
    const result = await sql`
      UPDATE file_reviews fr
      SET firm_id = COALESCE(
        (SELECT p.firm_id FROM profiles p WHERE p.id = fr.reviewer_id),
        ${defaultFirmId}
      )
      WHERE fr.firm_id IS NULL
    `
    console.log(`   Updated ${result.count} file_reviews`)
  }

  // Step 6: Backfill complaint_register
  if (nullCounts.complaint_register > 0) {
    console.log('\n🔄 Backfilling complaint_register...')
    const result = await sql`
      UPDATE complaint_register cr
      SET firm_id = COALESCE(
        (SELECT c.firm_id FROM clients c WHERE c.id = cr.client_id),
        ${defaultFirmId}
      )
      WHERE cr.firm_id IS NULL
    `
    console.log(`   Updated ${result.count} complaint_register`)
  }

  // Step 7: Backfill breach_register
  if (nullCounts.breach_register > 0) {
    console.log('\n🔄 Backfilling breach_register...')
    const result = await sql`
      UPDATE breach_register
      SET firm_id = ${defaultFirmId}
      WHERE firm_id IS NULL
    `
    console.log(`   Updated ${result.count} breach_register`)
  }

  // Step 8: Backfill vulnerability_register
  if (nullCounts.vulnerability_register > 0) {
    console.log('\n🔄 Backfilling vulnerability_register...')
    const result = await sql`
      UPDATE vulnerability_register vr
      SET firm_id = COALESCE(
        (SELECT c.firm_id FROM clients c WHERE c.id = vr.client_id),
        ${defaultFirmId}
      )
      WHERE vr.firm_id IS NULL
    `
    console.log(`   Updated ${result.count} vulnerability_register`)
  }

  // Step 9: Backfill client_services
  if (nullCounts.client_services > 0) {
    console.log('\n🔄 Backfilling client_services...')
    const result = await sql`
      UPDATE client_services cs
      SET firm_id = COALESCE(
        (SELECT c.firm_id FROM clients c WHERE c.id = cs.client_id),
        ${defaultFirmId}
      )
      WHERE cs.firm_id IS NULL
    `
    console.log(`   Updated ${result.count} client_services`)
  }

  // Step 10: Backfill notifications
  if (nullCounts.notifications > 0) {
    console.log('\n🔄 Backfilling notifications...')
    const result = await sql`
      UPDATE notifications n
      SET firm_id = COALESCE(
        (SELECT p.firm_id FROM profiles p WHERE p.id = n.user_id),
        ${defaultFirmId}
      )
      WHERE n.firm_id IS NULL
    `
    console.log(`   Updated ${result.count} notifications`)
  }

  // Step 11: Update firm seat counts
  console.log('\n🔄 Updating firm seat counts...')
  await sql`
    UPDATE firms f
    SET settings = jsonb_set(
      settings,
      '{billing,currentSeats}',
      (
        SELECT COALESCE(COUNT(*)::text, '0')::jsonb
        FROM profiles p
        WHERE p.firm_id = f.id
        AND (p.status IS NULL OR p.status = 'active')
      )
    )
  `
  console.log('   Done')

  // Step 12: Verify
  console.log('\n📋 Final state (NULL firm_id counts):')
  console.log('-'.repeat(40))

  let allGood = true
  for (const table of tables) {
    try {
      const [result] = await sql`
        SELECT COUNT(*) as count FROM ${sql(table)} WHERE firm_id IS NULL
      `
      const count = parseInt(result.count)
      const status = count === 0 ? '✅' : '⚠️'
      console.log(`  ${status} ${table}: ${count}`)
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

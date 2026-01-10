#!/usr/bin/env node
/**
 * Fix duplicate active assessments before running migrations
 * Keeps only the most recent active assessment per client
 *
 * Usage: SUPABASE_SERVICE_KEY=<key> node scripts/fix-duplicate-assessments.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:')
  console.error('  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function fixDuplicates() {
  console.log('Finding clients with duplicate active assessments...\n')

  // Find all active assessments grouped by client
  const { data: assessments, error } = await supabase
    .from('suitability_assessments')
    .select('id, client_id, created_at, updated_at, is_active')
    .eq('is_active', true)
    .order('client_id')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching assessments:', error.message)
    process.exit(1)
  }

  console.log(`Found ${assessments.length} active assessments`)

  // Group by client_id
  const byClient = {}
  for (const a of assessments) {
    if (!byClient[a.client_id]) {
      byClient[a.client_id] = []
    }
    byClient[a.client_id].push(a)
  }

  // Find duplicates
  const duplicates = Object.entries(byClient).filter(([_, list]) => list.length > 1)
  console.log(`Found ${duplicates.length} clients with duplicate active assessments\n`)

  if (duplicates.length === 0) {
    console.log('No duplicates to fix!')
    return
  }

  // For each client with duplicates, keep the most recent, deactivate others
  let fixed = 0
  for (const [clientId, list] of duplicates) {
    console.log(`Client ${clientId}: ${list.length} active assessments`)

    // First one is most recent (sorted by updated_at DESC)
    const keep = list[0]
    const toDeactivate = list.slice(1)

    console.log(`  Keeping: ${keep.id} (updated: ${keep.updated_at})`)

    for (const a of toDeactivate) {
      console.log(`  Deactivating: ${a.id} (updated: ${a.updated_at})`)

      const { error: updateError } = await supabase
        .from('suitability_assessments')
        .update({ is_active: false })
        .eq('id', a.id)

      if (updateError) {
        console.error(`    Error: ${updateError.message}`)
      } else {
        fixed++
      }
    }
  }

  console.log(`\n✅ Deactivated ${fixed} duplicate assessments`)

  // Verify
  const { data: remaining, error: verifyError } = await supabase
    .from('suitability_assessments')
    .select('client_id')
    .eq('is_active', true)

  if (!verifyError) {
    const byClientAfter = {}
    for (const a of remaining) {
      byClientAfter[a.client_id] = (byClientAfter[a.client_id] || 0) + 1
    }
    const stillDuplicate = Object.values(byClientAfter).filter(c => c > 1).length
    console.log(`\nVerification: ${stillDuplicate} clients still have duplicates`)
  }
}

fixDuplicates().catch(console.error)

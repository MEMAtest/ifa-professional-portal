#!/usr/bin/env node
/**
 * Update Client Genders Script
 *
 * This script updates all clients to have a gender value in their personal_details.
 * It randomly assigns 'male' or 'female' based on first name heuristics or random assignment.
 *
 * Run: node scripts/update-client-genders.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://maandodhonjolrmcxivo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5kb2Rob25qb2xybWN4aXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODc2MiwiZXhwIjoyMDY0MTI0NzYyfQ.qjHxVoq9jNUSOmKyfrkokgM3GN14t5fUX16p9qlNAuw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Common female names for heuristic matching
const femaleNames = new Set([
  'susan', 'sarah', 'emma', 'emily', 'elizabeth', 'mary', 'margaret', 'jennifer',
  'jessica', 'amanda', 'ashley', 'nicole', 'stephanie', 'katherine', 'catherine',
  'laura', 'lisa', 'anna', 'hannah', 'julia', 'olivia', 'sophia', 'isabella',
  'charlotte', 'mia', 'amelia', 'grace', 'chloe', 'victoria', 'natalie', 'claire',
  'alice', 'lucy', 'helen', 'ruth', 'patricia', 'jane', 'anne', 'rachel', 'karen',
  'nancy', 'betty', 'sandra', 'donna', 'carol', 'sharon', 'michelle', 'angela',
  'dorothy', 'barbara', 'deborah', 'linda', 'kimberly', 'melissa', 'brenda'
]);

// Common male names for heuristic matching
const maleNames = new Set([
  'peter', 'james', 'john', 'robert', 'michael', 'william', 'david', 'richard',
  'joseph', 'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony',
  'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin',
  'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
  'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin',
  'scott', 'brandon', 'benjamin', 'samuel', 'raymond', 'gregory', 'henry', 'jack',
  'dennis', 'walter', 'patrick', 'peter', 'alexander', 'adam', 'aaron', 'nathan'
]);

function inferGender(firstName) {
  if (!firstName) return Math.random() < 0.5 ? 'male' : 'female';

  const name = firstName.toLowerCase().trim();

  if (femaleNames.has(name)) return 'female';
  if (maleNames.has(name)) return 'male';

  // Random fallback with slight bias toward 50/50
  return Math.random() < 0.5 ? 'male' : 'female';
}

async function updateClientGenders() {
  console.log('🔄 Fetching all clients...\n');

  // Fetch all clients
  const { data: clients, error: fetchError } = await supabase
    .from('clients')
    .select('id, personal_details');

  if (fetchError) {
    console.error('❌ Error fetching clients:', fetchError.message);
    process.exit(1);
  }

  console.log(`📊 Found ${clients.length} clients\n`);

  // Count current state
  let withGender = 0;
  let withoutGender = 0;

  clients.forEach(client => {
    const gender = client.personal_details?.gender;
    if (gender && gender !== 'null' && gender !== null) {
      withGender++;
    } else {
      withoutGender++;
    }
  });

  console.log(`📈 Current state:`);
  console.log(`   - With gender: ${withGender}`);
  console.log(`   - Without gender: ${withoutGender}\n`);

  if (withoutGender === 0) {
    console.log('✅ All clients already have gender values. Nothing to update.');
    return;
  }

  // Update clients without gender
  let updated = 0;
  let maleCount = 0;
  let femaleCount = 0;
  const errors = [];

  for (const client of clients) {
    const currentGender = client.personal_details?.gender;

    // Skip if already has gender
    if (currentGender && currentGender !== 'null' && currentGender !== null) {
      continue;
    }

    const firstName = client.personal_details?.firstName || '';
    const gender = inferGender(firstName);

    // Update personal_details with new gender
    const updatedPersonalDetails = {
      ...client.personal_details,
      gender
    };

    const { error: updateError } = await supabase
      .from('clients')
      .update({ personal_details: updatedPersonalDetails })
      .eq('id', client.id);

    if (updateError) {
      errors.push({ clientId: client.id, error: updateError.message });
      console.error(`❌ Error updating ${firstName}: ${updateError.message}`);
    } else {
      updated++;
      if (gender === 'male') maleCount++;
      else femaleCount++;
      console.log(`✅ Updated ${firstName || 'Unknown'} -> ${gender}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total clients: ${clients.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`  - Male: ${maleCount}`);
  console.log(`  - Female: ${femaleCount}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }
  console.log('='.repeat(50));
}

// Run the script
updateClientGenders()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });

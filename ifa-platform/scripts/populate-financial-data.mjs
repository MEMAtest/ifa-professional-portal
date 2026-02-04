#!/usr/bin/env node
/**
 * Populate Client Financial Data Script
 *
 * This script updates all clients to have realistic investment and pension data
 * by distributing their existing liquid assets into proper asset classes.
 *
 * Run: node scripts/populate-financial-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Investment providers
const investmentProviders = [
  'Hargreaves Lansdown', 'AJ Bell', 'Fidelity', 'Vanguard',
  'Interactive Investor', 'Charles Stanley', 'Quilter', 'Transact'
];

// Pension providers
const pensionProviders = [
  'Scottish Widows', 'Aviva', 'Standard Life', 'Legal & General',
  'Royal London', 'Aegon', 'Prudential', 'Fidelity'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateInvestments(totalAmount) {
  const investments = [];

  // Skip if amount too small
  if (totalAmount < 10000) {
    return investments;
  }

  // ISA (typically 40-60% of investment allocation)
  const isaValue = Math.round(totalAmount * (0.4 + Math.random() * 0.2));
  investments.push({
    id: randomUUID(),
    type: 'isa',
    provider: getRandomItem(investmentProviders),
    currentValue: isaValue,
    monthlyContribution: Math.round(isaValue * 0.01), // ~1% monthly contribution
    description: 'Stocks & Shares ISA'
  });

  // General Investment Account (remaining)
  const giaValue = totalAmount - isaValue;
  if (giaValue > 5000) {
    investments.push({
      id: randomUUID(),
      type: 'general_investment',
      provider: getRandomItem(investmentProviders),
      currentValue: giaValue,
      monthlyContribution: Math.round(giaValue * 0.005), // ~0.5% monthly
      description: 'General Investment Account'
    });
  }

  return investments;
}

function generatePensions(totalAmount, age) {
  const pensions = [];

  // Skip if amount too small
  if (totalAmount < 10000) {
    return pensions;
  }

  // Determine expected retirement age based on current age
  const retirementAge = age && age > 55 ? 65 : 67;

  // SIPP (typically 50-70% of pension allocation)
  const sippValue = Math.round(totalAmount * (0.5 + Math.random() * 0.2));
  pensions.push({
    id: randomUUID(),
    type: 'sipp',
    provider: getRandomItem(pensionProviders),
    currentValue: sippValue,
    monthlyContribution: Math.round(sippValue * 0.015), // ~1.5% monthly
    expectedRetirementAge: retirementAge,
    description: 'Self-Invested Personal Pension'
  });

  // Workplace pension (remaining)
  const workplaceValue = totalAmount - sippValue;
  if (workplaceValue > 5000) {
    pensions.push({
      id: randomUUID(),
      type: 'defined_contribution',
      provider: getRandomItem(pensionProviders),
      currentValue: workplaceValue,
      monthlyContribution: Math.round(workplaceValue * 0.01), // ~1% monthly (employer match)
      expectedRetirementAge: retirementAge,
      description: 'Workplace Pension'
    });
  }

  return pensions;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

async function populateFinancialData() {
  console.log('Fetching all clients...\n');

  // Fetch all clients
  const { data: clients, error: fetchError } = await supabase
    .from('clients')
    .select('id, personal_details, financial_profile');

  if (fetchError) {
    console.error('Error fetching clients:', fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${clients.length} clients\n`);

  // Count current state
  let alreadyHasData = 0;
  let needsUpdate = 0;
  let totalLiquidAssets = 0;

  clients.forEach(client => {
    const fp = client.financial_profile || {};
    const hasInvestments = fp.existingInvestments && fp.existingInvestments.length > 0;
    const hasPensions = fp.pensionArrangements && fp.pensionArrangements.length > 0;

    if (hasInvestments || hasPensions) {
      alreadyHasData++;
    } else {
      needsUpdate++;
      totalLiquidAssets += fp.liquidAssets || 0;
    }
  });

  console.log('Current state:');
  console.log(`   - Already has investment/pension data: ${alreadyHasData}`);
  console.log(`   - Needs update: ${needsUpdate}`);
  console.log(`   - Total liquid assets to redistribute: ${totalLiquidAssets.toLocaleString()}\n`);

  if (needsUpdate === 0) {
    console.log('All clients already have investment/pension data. Nothing to update.');
    return;
  }

  // Update clients
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const client of clients) {
    const fp = client.financial_profile || {};

    // Skip if already has data
    const hasInvestments = fp.existingInvestments && fp.existingInvestments.length > 0;
    const hasPensions = fp.pensionArrangements && fp.pensionArrangements.length > 0;

    if (hasInvestments || hasPensions) {
      continue;
    }

    // Get current liquid assets
    const currentLiquid = fp.liquidAssets || 0;

    // Skip if no liquid assets to redistribute (lowered threshold)
    if (currentLiquid < 5000) {
      console.log(`Skipping ${client.personal_details?.firstName || 'Unknown'} - liquid assets too low (${currentLiquid})`);
      skipped++;
      continue;
    }

    // Calculate age for pension settings
    const age = calculateAge(client.personal_details?.dateOfBirth);

    // Distribution:
    // - 35-45% stays as liquid assets
    // - 30-40% goes to investments
    // - 20-30% goes to pensions
    const liquidPct = 0.35 + Math.random() * 0.1; // 35-45%
    const investmentPct = 0.30 + Math.random() * 0.1; // 30-40%
    // Pension gets the rest (20-35%)

    const newLiquidAssets = Math.round(currentLiquid * liquidPct);
    const investmentAmount = Math.round(currentLiquid * investmentPct);
    const pensionAmount = currentLiquid - newLiquidAssets - investmentAmount;

    // Generate investments and pensions
    const existingInvestments = generateInvestments(investmentAmount);
    const pensionArrangements = generatePensions(pensionAmount, age);

    // Update financial_profile
    const updatedFinancialProfile = {
      ...fp,
      liquidAssets: newLiquidAssets,
      existingInvestments,
      pensionArrangements
    };

    const { error: updateError } = await supabase
      .from('clients')
      .update({ financial_profile: updatedFinancialProfile })
      .eq('id', client.id);

    if (updateError) {
      errors.push({ clientId: client.id, error: updateError.message });
      console.error(`Error updating ${client.personal_details?.firstName || 'Unknown'}: ${updateError.message}`);
    } else {
      updated++;
      const firstName = client.personal_details?.firstName || 'Unknown';
      const investmentTotal = existingInvestments.reduce((sum, i) => sum + i.currentValue, 0);
      const pensionTotal = pensionArrangements.reduce((sum, p) => sum + (p.currentValue || 0), 0);

      console.log(`Updated ${firstName}:`);
      console.log(`   Liquid: ${currentLiquid.toLocaleString()} -> ${newLiquidAssets.toLocaleString()}`);
      console.log(`   Investments: ${investmentTotal.toLocaleString()} (${existingInvestments.length} accounts)`);
      console.log(`   Pensions: ${pensionTotal.toLocaleString()} (${pensionArrangements.length} arrangements)`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total clients: ${clients.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (low assets): ${skipped}`);
  console.log(`Already had data: ${alreadyHasData}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }
  console.log('='.repeat(50));
}

// Run the script
populateFinancialData()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('\nScript failed:', err);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * Check Client Financial Data Script
 * Verifies what financial data exists in the database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://maandodhonjolrmcxivo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5kb2Rob25qb2xybWN4aXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODc2MiwiZXhwIjoyMDY0MTI0NzYyfQ.qjHxVoq9jNUSOmKyfrkokgM3GN14t5fUX16p9qlNAuw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkFinancialData() {
  console.log('Fetching all clients...\n');

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, personal_details, financial_profile');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Found ${clients.length} clients\n`);

  let withInvestments = 0;
  let withPensions = 0;
  let withLiquidAssets = 0;
  let totalInvestments = 0;
  let totalPensions = 0;
  let totalLiquid = 0;

  clients.forEach((client, index) => {
    const fp = client.financial_profile || {};
    const name = `${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim() || 'Unknown';

    const investments = fp.existingInvestments || [];
    const pensions = fp.pensionArrangements || [];
    const liquidAssets = fp.liquidAssets || 0;

    const investmentTotal = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    const pensionTotal = pensions.reduce((sum, p) => sum + (p.currentValue || 0), 0);

    if (investmentTotal > 0) withInvestments++;
    if (pensionTotal > 0) withPensions++;
    if (liquidAssets > 0) withLiquidAssets++;

    totalInvestments += investmentTotal;
    totalPensions += pensionTotal;
    totalLiquid += liquidAssets;

    console.log(`${index + 1}. ${name}:`);
    console.log(`   Investments: £${investmentTotal.toLocaleString()} (${investments.length} accounts)`);
    console.log(`   Pensions: £${pensionTotal.toLocaleString()} (${pensions.length} arrangements)`);
    console.log(`   Liquid Assets: £${liquidAssets.toLocaleString()}`);
    console.log(`   TOTAL: £${(investmentTotal + pensionTotal + liquidAssets).toLocaleString()}`);
    console.log('');
  });

  console.log('='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Clients with investments: ${withInvestments}/${clients.length}`);
  console.log(`Clients with pensions: ${withPensions}/${clients.length}`);
  console.log(`Clients with liquid assets: ${withLiquidAssets}/${clients.length}`);
  console.log('');
  console.log(`Total Investments: £${totalInvestments.toLocaleString()}`);
  console.log(`Total Pensions: £${totalPensions.toLocaleString()}`);
  console.log(`Total Liquid: £${totalLiquid.toLocaleString()}`);
  console.log(`GRAND TOTAL AUM: £${(totalInvestments + totalPensions + totalLiquid).toLocaleString()}`);
}

checkFinancialData().catch(console.error);

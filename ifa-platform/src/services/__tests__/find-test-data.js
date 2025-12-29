#!/usr/bin/env node
// ================================================================
// Find Test Data Script
// Uses your existing Supabase client to find test scenario/client IDs
// ================================================================

// Import your existing Supabase client
const path = require('path');
const { createClient } = require(path.resolve(__dirname, '../../lib/supabase/client'));

async function findTestData() {
  console.log('🔍 Finding test data from your database...\n');

  try {
    // Create client using your existing setup
    const supabase = createClient();

    console.log('📊 Searching for cash flow scenarios...');

    // Try to find cashflow scenarios
    const { data: scenarios, error: scenarioError } = await supabase
      .from('cash_flow_scenarios')
      .select('id, scenario_name, client_id, scenario_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (scenarioError) {
      console.log('⚠️  Error querying cash_flow_scenarios:', scenarioError.message);

      // Try alternative table names
      console.log('🔄 Trying alternative table names...');
      const { data: tables, error: tablesError } = await supabase.rpc('get_table_names');

      if (!tablesError && tables) {
        console.log('📋 Available tables:', tables.filter(t =>
          t.includes('scenario') || t.includes('client') || t.includes('cashflow')
        ));
      }
    } else {
      console.log('✅ Found scenarios:');
      scenarios?.forEach((scenario, index) => {
        console.log(`${index + 1}. ID: ${scenario.id}`);
        console.log(`   Name: ${scenario.scenario_name}`);
        console.log(`   Client: ${scenario.client_id}`);
        console.log(`   Type: ${scenario.scenario_type}`);
        console.log(`   Created: ${scenario.created_at}\n`);
      });

      if (scenarios && scenarios.length > 0) {
        console.log('🎯 RECOMMENDED TEST SCENARIO ID:', scenarios[0].id);
      }
    }

    console.log('📊 Searching for clients...');

    // Try to find clients
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id, client_ref, personal_details, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (clientError) {
      console.log('⚠️  Error querying clients:', clientError.message);
    } else {
      console.log('✅ Found clients:');
      clients?.forEach((client, index) => {
        const firstName = client.personal_details?.firstName || 'N/A';
        const lastName = client.personal_details?.lastName || 'N/A';

        console.log(`${index + 1}. ID: ${client.id}`);
        console.log(`   Ref: ${client.client_ref}`);
        console.log(`   Name: ${firstName} ${lastName}`);
        console.log(`   Status: ${client.status}`);
        console.log(`   Created: ${client.created_at}\n`);
      });

      if (clients && clients.length > 0) {
        console.log('🎯 RECOMMENDED TEST CLIENT ID:', clients[0].id);
      }
    }

    // Generate test config
    if ((scenarios && scenarios.length > 0) && (clients && clients.length > 0)) {
      console.log('\n' + '='.repeat(60));
      console.log('🎯 TEST CONFIGURATION FOR PHASE 1:');
      console.log('='.repeat(60));
      console.log('Add this to your CashFlowIntegration.validation.test.ts:');
      console.log('');
      console.log('const TEST_CONFIG = {');
      console.log(`  REAL_SCENARIO_ID: '${scenarios[0].id}',`);
      console.log(`  REAL_CLIENT_ID: '${clients[0].id}',`);
      console.log('  SKIP_REAL_DATABASE_TESTS: false,');
      console.log('  TIMEOUT_MS: 10000');
      console.log('};');
      console.log('');
      console.log('🚀 Ready to proceed with Phase 1 testing!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check your Supabase connection configuration');
    console.log('2. Verify environment variables are set');
    console.log('3. Ensure you have read access to the database');
    console.log('4. Try running: npm run dev (to test basic connection)');
  }
}

// Run the script
findTestData();

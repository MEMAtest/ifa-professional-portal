#!/usr/bin/env node
// ================================================================
// DATABASE SCHEMA CHECKER - Check actual table structure
// ================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://maandodhonjolrmcxivo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5kb2Rob25qb2xybWN4aXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODc2MiwiZXhwIjoyMDY0MTI0NzYyfQ.qjHxVoq9jNUSOmKyfrkokgM3GN14t5fUX16p9qlNAuw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...');

  try {
    // Get one record to see the structure
    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('📋 Document template structure:');
    console.log(JSON.stringify(template, null, 2));

    // Check for cashflow template specifically
    const { data: cashflowCheck, error: cashflowError } = await supabase
      .from('document_templates')
      .select('*')
      .ilike('name', '%cashflow%');

    console.log('\n💰 Cashflow templates:');
    if (cashflowError) {
      console.error('❌ Error checking cashflow:', cashflowError);
    } else {
      console.log(cashflowCheck?.length || 0, 'found');
      if (cashflowCheck) {
        cashflowCheck.forEach(t => console.log('-', t.name));
      }
    }

    // Try to create a minimal template
    console.log('\n📝 Attempting to create minimal cashflow template...');

    const { data: newTemplate, error: createError } = await supabase
      .from('document_templates')
      .insert({
        name: 'cashflow-analysis-template',
        title: 'Cash Flow Analysis Template',
        content: '<h1>{{CLIENT_NAME}} Cash Flow Report</h1><p>{{CONTENT}}</p>',
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Create error:', createError);
    } else {
      console.log('✅ Template created:', newTemplate.name);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSchema();
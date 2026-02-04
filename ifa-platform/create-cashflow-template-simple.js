#!/usr/bin/env node
// ================================================================
// CREATE SIMPLE CASHFLOW TEMPLATE
// ================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSimpleTemplate() {
  console.log('📝 Creating simple cash flow template...');

  try {
    // Check if it exists
    const { data: existing } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', 'cashflow-analysis-template')
      .single();

    if (existing) {
      console.log('✅ Template already exists');
      return;
    }

    // Create minimal template without assessment_type
    const { data: newTemplate, error } = await supabase
      .from('document_templates')
      .insert({
        name: 'cashflow-analysis-template',
        description: 'Cash Flow Analysis Template',
        template_content: `<h1>{{CLIENT_NAME}} Cash Flow Report</h1>
<h2>Scenario: {{SCENARIO_NAME}}</h2>
<p>Generated: {{GENERATED_DATE}}</p>
<div>{{REPORT_CONTENT}}</div>`,
        template_variables: {
          "CLIENT_NAME": "Client name",
          "SCENARIO_NAME": "Scenario name",
          "GENERATED_DATE": "Generation date",
          "REPORT_CONTENT": "Report content"
        },
        is_active: true,
        requires_signature: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Template created:', newTemplate.name);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createSimpleTemplate();
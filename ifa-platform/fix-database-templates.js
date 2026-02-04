#!/usr/bin/env node
// ================================================================
// DATABASE TEMPLATE FIXER - Phase 2 Support
// Creates missing document templates needed for testing
// ================================================================

const { createClient } = require('@supabase/supabase-js');

// Use same credentials as .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabaseTemplates() {
  console.log('🔧 Fixing database templates for Phase 2 testing...');

  try {
    // Check what templates exist
    console.log('📋 Checking existing templates...');
    const { data: existingTemplates, error: fetchError } = await supabase
      .from('document_templates')
      .select('name, is_active')
      .limit(10);

    if (fetchError) {
      console.error('❌ Error fetching templates:', fetchError);
      return;
    }

    console.log('✅ Existing templates:', existingTemplates?.map(t => t.name) || 'None');

    // Check if cashflow-analysis-template exists
    const { data: cashflowTemplate } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', 'cashflow-analysis-template')
      .maybeSingle();

    if (!cashflowTemplate) {
      console.log('📝 Creating missing cashflow-analysis-template...');

      const { error: insertError } = await supabase
        .from('document_templates')
        .insert({
          name: 'cashflow-analysis-template',
          display_name: 'Cash Flow Analysis Template',
          category: 'cashflow',
          content: `
<!DOCTYPE html>
<html>
<head>
    <title>{{CLIENT_NAME}} - Cash Flow Analysis</title>
</head>
<body>
    <h1>Cash Flow Analysis Report</h1>
    <h2>Client: {{CLIENT_NAME}}</h2>
    <p>Scenario: {{SCENARIO_NAME}}</p>
    <p>Generated: {{GENERATED_DATE}}</p>

    <h3>Summary</h3>
    <p>{{REPORT_SUMMARY}}</p>

    <h3>Projections</h3>
    {{PROJECTION_TABLE}}

    <h3>Charts</h3>
    {{#if INCLUDE_CHARTS}}
    {{CHART_CONTENT}}
    {{/if}}
</body>
</html>`,
          is_active: true,
          created_by: 'system',
          updated_by: 'system',
          version: 1,
          metadata: {
            variables: ['CLIENT_NAME', 'SCENARIO_NAME', 'GENERATED_DATE', 'REPORT_SUMMARY', 'PROJECTION_TABLE', 'CHART_CONTENT', 'INCLUDE_CHARTS'],
            description: 'Basic cash flow analysis template for testing'
          }
        });

      if (insertError) {
        console.error('❌ Error creating cashflow template:', insertError);
      } else {
        console.log('✅ Cash flow template created successfully');
      }
    } else {
      console.log('✅ Cash flow template already exists');
    }

    // Check if generated_documents table exists and works
    console.log('🗃️ Testing generated_documents table...');
    const { data: testDoc, error: docError } = await supabase
      .from('generated_documents')
      .select('*')
      .limit(1);

    if (docError) {
      console.error('❌ Error accessing generated_documents:', docError);
      console.log('💡 This table might need to be created or have permissions fixed');
    } else {
      console.log('✅ generated_documents table accessible');
    }

    // Create ATR template if needed
    const { data: atrTemplate } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', 'atr-assessment-template')
      .maybeSingle();

    if (!atrTemplate) {
      console.log('📝 Creating ATR assessment template...');

      const { error: atrInsertError } = await supabase
        .from('document_templates')
        .insert({
          name: 'atr-assessment-template',
          display_name: 'ATR Assessment Template',
          category: 'assessment',
          content: `
<!DOCTYPE html>
<html>
<head>
    <title>{{CLIENT_NAME}} - Attitude to Risk Assessment</title>
</head>
<body>
    <h1>Attitude to Risk Assessment</h1>
    <h2>Client: {{CLIENT_NAME}}</h2>
    <p>Risk Level: {{RISK_LEVEL}}/10</p>
    <p>Risk Category: {{RISK_CATEGORY}}</p>
    <p>Assessment Date: {{ASSESSMENT_DATE}}</p>

    <h3>Risk Profile Summary</h3>
    <p>{{RISK_DESCRIPTION}}</p>

    <h3>Recommendations</h3>
    <ul>{{RECOMMENDATIONS}}</ul>
</body>
</html>`,
          is_active: true,
          created_by: 'system',
          updated_by: 'system',
          version: 1,
          metadata: {
            variables: ['CLIENT_NAME', 'RISK_LEVEL', 'RISK_CATEGORY', 'ASSESSMENT_DATE', 'RISK_DESCRIPTION', 'RECOMMENDATIONS'],
            description: 'ATR assessment template for Phase 2 testing'
          }
        });

      if (atrInsertError) {
        console.error('❌ Error creating ATR template:', atrInsertError);
      } else {
        console.log('✅ ATR template created successfully');
      }
    } else {
      console.log('✅ ATR template already exists');
    }

    console.log('\n🎯 Database template fix completed!');
    console.log('✅ Templates are now ready for Phase 1 & 2 testing');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixDatabaseTemplates();
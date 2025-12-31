#!/usr/bin/env node
// ================================================================
// CREATE CASHFLOW TEMPLATE - With correct schema
// ================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://maandodhonjolrmcxivo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5kb2Rob25qb2xybWN4aXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODc2MiwiZXhwIjoyMDY0MTI0NzYyfQ.qjHxVoq9jNUSOmKyfrkokgM3GN14t5fUX16p9qlNAuw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCashflowTemplate() {
  console.log('📝 Creating cash flow template with correct schema...');

  try {
    // Check if it already exists
    const { data: existing } = await supabase
      .from('document_templates')
      .select('*')
      .eq('name', 'cashflow-analysis-template')
      .single();

    if (existing) {
      console.log('✅ Cashflow template already exists:', existing.name);
      return;
    }

    // Create the template
    const { data: newTemplate, error } = await supabase
      .from('document_templates')
      .insert({
        name: 'cashflow-analysis-template',
        description: 'Cash Flow Analysis Template for Phase 1 Testing',
        template_content: `
<!DOCTYPE html>
<html>
<head>
    <title>{{CLIENT_NAME}} - Cash Flow Analysis</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2563eb; }
        .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; border: 1px solid #e5e7eb; text-align: left; }
        th { background: #f9fafb; }
    </style>
</head>
<body>
    <h1>Cash Flow Analysis Report</h1>

    <div class="summary">
        <h2>Client Information</h2>
        <p><strong>Client:</strong> {{CLIENT_NAME}}</p>
        <p><strong>Scenario:</strong> {{SCENARIO_NAME}}</p>
        <p><strong>Generated:</strong> {{GENERATED_DATE}}</p>
        <p><strong>Advisor:</strong> {{ADVISOR_NAME}}</p>
    </div>

    <h2>Executive Summary</h2>
    <p>{{REPORT_SUMMARY}}</p>

    <h2>Cash Flow Projections</h2>
    {{PROJECTION_TABLE}}

    <h2>Key Metrics</h2>
    <ul>
        <li><strong>Initial Investment:</strong> {{INITIAL_INVESTMENT}}</li>
        <li><strong>Projection Period:</strong> {{PROJECTION_YEARS}} years</li>
        <li><strong>Total Return:</strong> {{TOTAL_RETURN}}</li>
        <li><strong>Risk Level:</strong> {{RISK_LEVEL}}</li>
    </ul>

    {{#if INCLUDE_CHARTS}}
    <h2>Charts and Analysis</h2>
    {{CHART_CONTENT}}
    {{/if}}

    <h2>Assumptions</h2>
    {{ASSUMPTIONS}}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p><small>This report was generated on {{GENERATED_DATE}} by {{ADVISOR_NAME}}.</small></p>
    </div>
</body>
</html>`,
        template_variables: {
          "CLIENT_NAME": "Client full name",
          "SCENARIO_NAME": "Cash flow scenario name",
          "GENERATED_DATE": "Report generation date",
          "ADVISOR_NAME": "Advisor name",
          "REPORT_SUMMARY": "Executive summary of the analysis",
          "PROJECTION_TABLE": "HTML table of cash flow projections",
          "INITIAL_INVESTMENT": "Initial investment amount",
          "PROJECTION_YEARS": "Number of years projected",
          "TOTAL_RETURN": "Total return over period",
          "RISK_LEVEL": "Risk assessment level",
          "INCLUDE_CHARTS": "Boolean flag for including charts",
          "CHART_CONTENT": "Chart HTML content",
          "ASSUMPTIONS": "List of assumptions used"
        },
        is_active: true,
        firm_id: '12345678-1234-1234-1234-123456789012', // Default firm ID from .env
        requires_signature: false,
        assessment_type: 'cashflow'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating template:', error);
      return;
    }

    console.log('✅ Cash flow template created successfully!');
    console.log('Template ID:', newTemplate.id);
    console.log('Template Name:', newTemplate.name);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createCashflowTemplate();
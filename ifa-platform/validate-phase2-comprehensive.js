#!/usr/bin/env node
// ================================================================
// COMPREHENSIVE PHASE 2 VALIDATION - Cash Flow + ATR Reports
// ================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function validatePhase2Comprehensive() {
  console.log('🔍 COMPREHENSIVE PHASE 2 VALIDATION');
  console.log('====================================');
  console.log('Testing: Cash Flow + ATR Reports');
  console.log('');

  const testResults = {
    cashFlowBasic: false,
    atrBasic: false,
    cashFlowPDF: false,
    atrPDF: false,
    databaseIntegrity: false,
    templateSystem: false
  };

  try {
    // Test 1: Cash Flow Report Generation
    console.log('📊 Test 1: Cash Flow Report Generation');
    console.log('--------------------------------------');

    const cashFlowStart = Date.now();
    const cashFlowResponse = await fetch('http://localhost:3000/test/phase1');
    const cashFlowTime = Date.now() - cashFlowStart;

    if (cashFlowResponse.ok) {
      const cashFlowText = await cashFlowResponse.text();
      if (cashFlowText.includes('✅') && cashFlowText.includes('Cash Flow Report Generated')) {
        console.log(`✅ Cash Flow Report: PASS (${cashFlowTime}ms)`);
        testResults.cashFlowBasic = true;

        // Check for PDF download capability
        if (cashFlowText.includes('download') || cashFlowText.includes('PDF')) {
          console.log('✅ Cash Flow PDF Download: AVAILABLE');
          testResults.cashFlowPDF = true;
        }
      } else {
        console.log('❌ Cash Flow Report: FAIL - Content issues');
      }
    } else {
      console.log(`❌ Cash Flow Report: FAIL - HTTP ${cashFlowResponse.status}`);
    }

    console.log('');

    // Test 2: ATR Report Generation
    console.log('📈 Test 2: ATR Report Generation');
    console.log('--------------------------------');

    const atrStart = Date.now();
    const atrResponse = await fetch('http://localhost:3000/test/atr');
    const atrTime = Date.now() - atrStart;

    if (atrResponse.ok) {
      const atrText = await atrResponse.text();
      if (atrText.includes('✅') && atrText.includes('ATR Report Generated')) {
        console.log(`✅ ATR Report: PASS (${atrTime}ms)`);
        testResults.atrBasic = true;

        // Check for PDF download capability
        if (atrText.includes('download') || atrText.includes('PDF')) {
          console.log('✅ ATR PDF Download: AVAILABLE');
          testResults.atrPDF = true;
        }
      } else {
        console.log('❌ ATR Report: FAIL - Content issues');
      }
    } else {
      console.log(`❌ ATR Report: FAIL - HTTP ${atrResponse.status}`);
    }

    console.log('');

    // Test 3: Database Integrity Check
    console.log('🗄️  Test 3: Database Integrity');
    console.log('------------------------------');

    // Check cash_flow_scenarios table
    const { data: scenarios, error: scenarioError } = await supabase
      .from('cash_flow_scenarios')
      .select('id, client_id, scenario_name')
      .limit(1);

    if (!scenarioError && scenarios?.length > 0) {
      console.log('✅ Cash Flow Scenarios: ACCESSIBLE');

      // Check atr_assessments table
      const { data: assessments, error: assessmentError } = await supabase
        .from('atr_assessments')
        .select('id, client_id, total_score')
        .limit(1);

      if (!assessmentError && assessments?.length > 0) {
        console.log('✅ ATR Assessments: ACCESSIBLE');
        testResults.databaseIntegrity = true;
      } else {
        console.log('❌ ATR Assessments: INACCESSIBLE');
      }
    } else {
      console.log('❌ Cash Flow Scenarios: INACCESSIBLE');
    }

    console.log('');

    // Test 4: Template System Check
    console.log('📄 Test 4: Template System');
    console.log('---------------------------');

    const { data: templates, error: templateError } = await supabase
      .from('document_templates')
      .select('id, name, template_content')
      .eq('name', 'cashflow-analysis-template');

    if (!templateError && templates?.length > 0) {
      console.log('✅ Cash Flow Template: EXISTS');

      // Check if template has variable placeholders
      const templateContent = templates[0].template_content;
      if (templateContent && templateContent.includes('{{')) {
        console.log('✅ Template Variables: CONFIGURED');
        testResults.templateSystem = true;
      } else {
        console.log('❌ Template Variables: MISSING');
      }
    } else {
      console.log('❌ Cash Flow Template: MISSING');
    }

    console.log('');

    // Final Results Summary
    console.log('📋 PHASE 2 VALIDATION RESULTS');
    console.log('==============================');

    const passCount = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;

    console.log(`Overall: ${passCount}/${totalTests} tests passed`);
    console.log('');

    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} - ${testName}`);
    });

    console.log('');

    if (passCount === totalTests) {
      console.log('🎉 PHASE 2 VALIDATION: 100% SUCCESS');
      console.log('📈 Ready for Phase 3 (CFL Report Service)');
    } else {
      console.log('⚠️  PHASE 2 VALIDATION: INCOMPLETE');
      console.log('🔧 Review failed tests before proceeding');
    }

  } catch (error) {
    console.error('❌ Validation error:', error.message);
  }
}

validatePhase2Comprehensive();
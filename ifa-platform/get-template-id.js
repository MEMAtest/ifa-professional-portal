#!/usr/bin/env node
// ================================================================
// GET TEMPLATE ID - Find the correct UUID for our template
// ================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getTemplateId() {
  console.log('🔍 Finding cashflow template ID...');

  try {
    const { data: template, error } = await supabase
      .from('document_templates')
      .select('id, name')
      .eq('name', 'cashflow-analysis-template')
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (template) {
      console.log('✅ Found template:');
      console.log('Name:', template.name);
      console.log('ID:', template.id);

      // Let's also check what's in generated_documents to understand the schema
      const { data: sampleDoc, error: docError } = await supabase
        .from('generated_documents')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (docError) {
        console.log('📝 generated_documents schema info needed:', docError.message);
      } else if (sampleDoc) {
        console.log('📋 Sample generated_documents record:');
        console.log(Object.keys(sampleDoc));
      } else {
        console.log('📄 generated_documents table is empty');
      }

    } else {
      console.log('❌ Template not found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

getTemplateId();
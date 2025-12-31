#!/usr/bin/env node
// ================================================================
// CHECK GENERATED DOCUMENTS SCHEMA
// ================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://maandodhonjolrmcxivo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5kb2Rob25qb2xybWN4aXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODc2MiwiZXhwIjoyMDY0MTI0NzYyfQ.qjHxVoq9jNUSOmKyfrkokgM3GN14t5fUX16p9qlNAuw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGeneratedDocsSchema() {
  console.log('🔍 Checking generated_documents table schema...');

  try {
    // Try a minimal insert to see what fields are required
    const testRecord = {
      client_id: '05b8095d-caa1-4bca-a4f0-c2cf2bf98f9c',
      template_id: '431bb8f9-a82b-4b9a-81b8-73ea32acdd20',
      file_name: 'test-document.html',
      file_path: 'documents/test.html',
      file_type: 'text/html',
      title: 'Test Document Title' // Adding title field
    };

    console.log('🧪 Testing insert with title field...');
    const { data, error } = await supabase
      .from('generated_documents')
      .insert(testRecord)
      .select()
      .single();

    if (error) {
      console.error('❌ Insert failed:', error);

      // Try without title to see what other fields might be missing
      console.log('🧪 Testing without title...');
      const { client_id, template_id, file_name, file_path, file_type } = testRecord;
      const minimalRecord = { client_id, template_id, file_name, file_path, file_type };

      const { data: data2, error: error2 } = await supabase
        .from('generated_documents')
        .insert(minimalRecord)
        .select()
        .single();

      if (error2) {
        console.error('❌ Minimal insert also failed:', error2);
      } else {
        console.log('✅ Minimal insert succeeded - title field is the issue');
      }
    } else {
      console.log('✅ Insert with title succeeded:', data.id);

      // Clean up test record
      await supabase
        .from('generated_documents')
        .delete()
        .eq('id', data.id);
      console.log('🧹 Test record cleaned up');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkGeneratedDocsSchema();
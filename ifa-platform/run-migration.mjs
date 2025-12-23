// run-migration.mjs - Run the assessment_shares migration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://maandodhonjolrmcxivo.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5kb2Rob25qb2xybWN4aXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODc2MiwiZXhwIjoyMDY0MTI0NzYyfQ.qjHxVoq9jNUSOmKyfrkokgM3GN14t5fUX16p9qlNAuw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Checking assessment_shares table...')

  // Test if table exists
  const { data: existingTable, error: checkError } = await supabase
    .from('assessment_shares')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('✓ assessment_shares table already exists!')
    return
  }

  if (checkError.code === '42P01') {
    console.log('Table does not exist. Please run the SQL migration manually.')
    console.log('\nGo to: https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql/new')
    console.log('\nThen paste the contents of: migration-assessment-shares.sql')
    return
  }

  console.log('Error:', checkError.message)
}

runMigration().catch(console.error)

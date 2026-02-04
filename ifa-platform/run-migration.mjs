// run-migration.mjs - Run the assessment_shares migration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

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

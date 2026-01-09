#!/usr/bin/env node

/**
 * Demo Environment Seed Script
 *
 * Creates professional-looking sample data for demos:
 * - 1 Demo firm with branding
 * - 3 Demo users (admin, supervisor, advisor)
 * - 10 Sample clients with varied profiles
 * - Sample assessments and compliance data
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL - UAT Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY - UAT Service role key
 */

import { createClient } from '@supabase/supabase-js'

const DEMO_FIRM = {
  id: '00000000-0000-0000-0000-000000000100',
  name: 'Acme Financial Advisers',
  fca_number: '123456',
  settings: {
    branding: {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      logoUrl: null
    },
    compliance: {
      tr241Enabled: true,
      consumerDutyEnabled: true,
      autoReviewReminders: true,
      reviewFrequencyMonths: 12
    },
    billing: {
      maxSeats: 10,
      currentSeats: 3,
      billingEmail: 'billing@acmefinancial.demo'
    }
  },
  subscription_tier: 'professional'
}

const DEMO_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    email: 'admin@demo.plannetic.com',
    password: 'Demo123!',
    first_name: 'Sarah',
    last_name: 'Mitchell',
    role: 'admin',
    phone: '+44 20 7123 4567'
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    email: 'supervisor@demo.plannetic.com',
    password: 'Demo123!',
    first_name: 'James',
    last_name: 'Thompson',
    role: 'supervisor',
    phone: '+44 20 7123 4568'
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    email: 'advisor@demo.plannetic.com',
    password: 'Demo123!',
    first_name: 'Emma',
    last_name: 'Davies',
    role: 'advisor',
    phone: '+44 20 7123 4569'
  }
]

const DEMO_CLIENTS = [
  {
    first_name: 'Michael',
    last_name: 'Anderson',
    email: 'michael.anderson@example.com',
    phone: '+44 7700 900001',
    date_of_birth: '1975-03-15',
    address: { line1: '42 Oak Street', city: 'London', postcode: 'SW1A 1AA' },
    employment_status: 'Employed',
    annual_income: 85000,
    risk_profile: 'Balanced'
  },
  {
    first_name: 'Jennifer',
    last_name: 'Williams',
    email: 'jennifer.williams@example.com',
    phone: '+44 7700 900002',
    date_of_birth: '1982-07-22',
    address: { line1: '15 Maple Avenue', city: 'Manchester', postcode: 'M1 1AA' },
    employment_status: 'Self-employed',
    annual_income: 120000,
    risk_profile: 'Adventurous'
  },
  {
    first_name: 'David',
    last_name: 'Brown',
    email: 'david.brown@example.com',
    phone: '+44 7700 900003',
    date_of_birth: '1968-11-08',
    address: { line1: '7 Pine Road', city: 'Birmingham', postcode: 'B1 1AA' },
    employment_status: 'Retired',
    annual_income: 45000,
    risk_profile: 'Cautious'
  },
  {
    first_name: 'Sarah',
    last_name: 'Taylor',
    email: 'sarah.taylor@example.com',
    phone: '+44 7700 900004',
    date_of_birth: '1990-05-30',
    address: { line1: '23 Elm Gardens', city: 'Leeds', postcode: 'LS1 1AA' },
    employment_status: 'Employed',
    annual_income: 55000,
    risk_profile: 'Balanced'
  },
  {
    first_name: 'Robert',
    last_name: 'Johnson',
    email: 'robert.johnson@example.com',
    phone: '+44 7700 900005',
    date_of_birth: '1955-09-12',
    address: { line1: '88 Birch Lane', city: 'Glasgow', postcode: 'G1 1AA' },
    employment_status: 'Retired',
    annual_income: 62000,
    risk_profile: 'Cautious'
  },
  {
    first_name: 'Emily',
    last_name: 'Wilson',
    email: 'emily.wilson@example.com',
    phone: '+44 7700 900006',
    date_of_birth: '1988-02-18',
    address: { line1: '5 Cedar Close', city: 'Bristol', postcode: 'BS1 1AA' },
    employment_status: 'Employed',
    annual_income: 95000,
    risk_profile: 'Adventurous'
  },
  {
    first_name: 'Thomas',
    last_name: 'Moore',
    email: 'thomas.moore@example.com',
    phone: '+44 7700 900007',
    date_of_birth: '1972-12-05',
    address: { line1: '31 Willow Way', city: 'Edinburgh', postcode: 'EH1 1AA' },
    employment_status: 'Self-employed',
    annual_income: 150000,
    risk_profile: 'Balanced'
  },
  {
    first_name: 'Jessica',
    last_name: 'Clark',
    email: 'jessica.clark@example.com',
    phone: '+44 7700 900008',
    date_of_birth: '1995-08-25',
    address: { line1: '12 Ash Grove', city: 'Liverpool', postcode: 'L1 1AA' },
    employment_status: 'Employed',
    annual_income: 42000,
    risk_profile: 'Balanced'
  },
  {
    first_name: 'Christopher',
    last_name: 'Lewis',
    email: 'christopher.lewis@example.com',
    phone: '+44 7700 900009',
    date_of_birth: '1960-04-10',
    address: { line1: '67 Beech Street', city: 'Cardiff', postcode: 'CF1 1AA' },
    employment_status: 'Retired',
    annual_income: 38000,
    risk_profile: 'Very Cautious'
  },
  {
    first_name: 'Amanda',
    last_name: 'Walker',
    email: 'amanda.walker@example.com',
    phone: '+44 7700 900010',
    date_of_birth: '1985-06-14',
    address: { line1: '99 Hawthorn Drive', city: 'Newcastle', postcode: 'NE1 1AA' },
    employment_status: 'Employed',
    annual_income: 78000,
    risk_profile: 'Balanced'
  }
]

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables:')
    if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nSet UAT environment credentials first.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('\n🎭 Demo Environment Seed Script\n')
  console.log('='.repeat(50))
  console.log(`Target: ${supabaseUrl}\n`)

  // Step 1: Create demo firm
  console.log('📁 Creating demo firm...')
  const { error: firmError } = await supabase
    .from('firms')
    .upsert(DEMO_FIRM, { onConflict: 'id' })

  if (firmError) {
    console.error('   Error:', firmError.message)
  } else {
    console.log(`   ✅ ${DEMO_FIRM.name}`)
  }

  // Step 2: Create demo users
  console.log('\n👥 Creating demo users...')
  for (const user of DEMO_USERS) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name
      }
    })

    if (authError && !authError.message.includes('already been registered')) {
      console.log(`   ❌ ${user.email}: ${authError.message}`)
      continue
    }

    const userId = authData?.user?.id || user.id

    // Create/update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: user.phone,
        firm_id: DEMO_FIRM.id,
        status: 'active'
      }, { onConflict: 'id' })

    if (profileError) {
      console.log(`   ⚠️  ${user.email}: Profile error - ${profileError.message}`)
    } else {
      console.log(`   ✅ ${user.first_name} ${user.last_name} (${user.role}) - ${user.email}`)
    }
  }

  // Step 3: Create demo clients
  console.log('\n👤 Creating demo clients...')
  const advisorId = DEMO_USERS[2].id // Emma Davies (advisor)

  for (const client of DEMO_CLIENTS) {
    const { error: clientError } = await supabase
      .from('clients')
      .upsert({
        ...client,
        firm_id: DEMO_FIRM.id,
        advisor_id: advisorId,
        status: 'active'
      }, { onConflict: 'email' })

    if (clientError) {
      console.log(`   ⚠️  ${client.first_name} ${client.last_name}: ${clientError.message}`)
    } else {
      console.log(`   ✅ ${client.first_name} ${client.last_name}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('\n✅ Demo environment seeded!\n')
  console.log('Demo login credentials:')
  console.log('─'.repeat(40))
  for (const user of DEMO_USERS) {
    console.log(`  ${user.role.padEnd(12)} ${user.email}`)
    console.log(`               Password: ${user.password}`)
  }
  console.log('─'.repeat(40))
  console.log('\n')
}

main().catch(console.error)

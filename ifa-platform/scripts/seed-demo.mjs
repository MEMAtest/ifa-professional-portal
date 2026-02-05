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
    client_ref: 'CLI-DEMO-001',
    personal_details: {
      title: 'Mr', firstName: 'Michael', lastName: 'Anderson',
      dateOfBirth: '1975-03-15', gender: 'male', nationality: 'GB',
      maritalStatus: 'married', dependents: 2, employmentStatus: 'employed',
      occupation: 'Software Engineer'
    },
    contact_info: {
      email: 'michael.anderson@example.com', phone: '+44 20 7123 5001',
      mobile: '+44 7700 900001', preferredContact: 'email',
      address: { line1: '42 Oak Street', city: 'London', county: 'Greater London', postcode: 'SW1A 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 85000, netWorth: 320000, liquidAssets: 45000, monthlyExpenses: 3200 },
    risk_profile: { riskTolerance: 'balanced', attitudeToRisk: 5, knowledgeExperience: 'informed' }
  },
  {
    client_ref: 'CLI-DEMO-002',
    personal_details: {
      title: 'Mrs', firstName: 'Jennifer', lastName: 'Williams',
      dateOfBirth: '1982-07-22', gender: 'female', nationality: 'GB',
      maritalStatus: 'married', dependents: 1, employmentStatus: 'self_employed',
      occupation: 'Consultant'
    },
    contact_info: {
      email: 'jennifer.williams@example.com', phone: '+44 161 234 5002',
      mobile: '+44 7700 900002', preferredContact: 'email',
      address: { line1: '15 Maple Avenue', city: 'Manchester', county: 'Greater Manchester', postcode: 'M1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 120000, netWorth: 580000, liquidAssets: 95000, monthlyExpenses: 4500 },
    risk_profile: { riskTolerance: 'aggressive', attitudeToRisk: 8, knowledgeExperience: 'advanced' }
  },
  {
    client_ref: 'CLI-DEMO-003',
    personal_details: {
      title: 'Mr', firstName: 'David', lastName: 'Brown',
      dateOfBirth: '1968-11-08', gender: 'male', nationality: 'GB',
      maritalStatus: 'widowed', dependents: 0, employmentStatus: 'retired',
      occupation: 'Retired Teacher', retirementAge: 60
    },
    contact_info: {
      email: 'david.brown@example.com', phone: '+44 121 456 5003',
      mobile: '+44 7700 900003', preferredContact: 'phone',
      address: { line1: '7 Pine Road', city: 'Birmingham', county: 'West Midlands', postcode: 'B1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 45000, netWorth: 620000, liquidAssets: 120000, monthlyExpenses: 2100 },
    risk_profile: { riskTolerance: 'conservative', attitudeToRisk: 3, knowledgeExperience: 'informed' }
  },
  {
    client_ref: 'CLI-DEMO-004',
    personal_details: {
      title: 'Ms', firstName: 'Sarah', lastName: 'Taylor',
      dateOfBirth: '1990-05-30', gender: 'female', nationality: 'GB',
      maritalStatus: 'single', dependents: 0, employmentStatus: 'employed',
      occupation: 'Marketing Manager'
    },
    contact_info: {
      email: 'sarah.taylor@example.com', phone: '+44 113 789 5004',
      mobile: '+44 7700 900004', preferredContact: 'email',
      address: { line1: '23 Elm Gardens', city: 'Leeds', county: 'West Yorkshire', postcode: 'LS1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 55000, netWorth: 85000, liquidAssets: 15000, monthlyExpenses: 2400 },
    risk_profile: { riskTolerance: 'balanced', attitudeToRisk: 5, knowledgeExperience: 'basic' }
  },
  {
    client_ref: 'CLI-DEMO-005',
    personal_details: {
      title: 'Mr', firstName: 'Robert', lastName: 'Johnson',
      dateOfBirth: '1955-09-12', gender: 'male', nationality: 'GB',
      maritalStatus: 'married', dependents: 0, employmentStatus: 'retired',
      occupation: 'Retired Accountant', retirementAge: 65
    },
    contact_info: {
      email: 'robert.johnson@example.com', phone: '+44 141 234 5005',
      mobile: '+44 7700 900005', preferredContact: 'phone',
      address: { line1: '88 Birch Lane', city: 'Glasgow', county: 'Glasgow City', postcode: 'G1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 62000, netWorth: 890000, liquidAssets: 200000, monthlyExpenses: 2800 },
    risk_profile: { riskTolerance: 'conservative', attitudeToRisk: 2, knowledgeExperience: 'informed' }
  },
  {
    client_ref: 'CLI-DEMO-006',
    personal_details: {
      title: 'Ms', firstName: 'Emily', lastName: 'Wilson',
      dateOfBirth: '1988-02-18', gender: 'female', nationality: 'GB',
      maritalStatus: 'single', dependents: 0, employmentStatus: 'employed',
      occupation: 'Senior Developer'
    },
    contact_info: {
      email: 'emily.wilson@example.com', phone: '+44 117 345 5006',
      mobile: '+44 7700 900006', preferredContact: 'email',
      address: { line1: '5 Cedar Close', city: 'Bristol', county: 'Bristol', postcode: 'BS1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 95000, netWorth: 250000, liquidAssets: 60000, monthlyExpenses: 3000 },
    risk_profile: { riskTolerance: 'aggressive', attitudeToRisk: 7, knowledgeExperience: 'advanced' }
  },
  {
    client_ref: 'CLI-DEMO-007',
    personal_details: {
      title: 'Mr', firstName: 'Thomas', lastName: 'Moore',
      dateOfBirth: '1972-12-05', gender: 'male', nationality: 'GB',
      maritalStatus: 'married', dependents: 3, employmentStatus: 'self_employed',
      occupation: 'Business Owner'
    },
    contact_info: {
      email: 'thomas.moore@example.com', phone: '+44 131 567 5007',
      mobile: '+44 7700 900007', preferredContact: 'email',
      address: { line1: '31 Willow Way', city: 'Edinburgh', county: 'City of Edinburgh', postcode: 'EH1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 150000, netWorth: 1200000, liquidAssets: 180000, monthlyExpenses: 6500 },
    risk_profile: { riskTolerance: 'balanced', attitudeToRisk: 6, knowledgeExperience: 'advanced' }
  },
  {
    client_ref: 'CLI-DEMO-008',
    personal_details: {
      title: 'Ms', firstName: 'Jessica', lastName: 'Clark',
      dateOfBirth: '1995-08-25', gender: 'female', nationality: 'GB',
      maritalStatus: 'single', dependents: 0, employmentStatus: 'employed',
      occupation: 'Junior Doctor'
    },
    contact_info: {
      email: 'jessica.clark@example.com', phone: '+44 151 678 5008',
      mobile: '+44 7700 900008', preferredContact: 'mobile',
      address: { line1: '12 Ash Grove', city: 'Liverpool', county: 'Merseyside', postcode: 'L1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 42000, netWorth: 35000, liquidAssets: 8000, monthlyExpenses: 2000 },
    risk_profile: { riskTolerance: 'balanced', attitudeToRisk: 5, knowledgeExperience: 'basic' }
  },
  {
    client_ref: 'CLI-DEMO-009',
    personal_details: {
      title: 'Mr', firstName: 'Christopher', lastName: 'Lewis',
      dateOfBirth: '1960-04-10', gender: 'male', nationality: 'GB',
      maritalStatus: 'married', dependents: 0, employmentStatus: 'retired',
      occupation: 'Retired Civil Servant', retirementAge: 60
    },
    contact_info: {
      email: 'christopher.lewis@example.com', phone: '+44 29 2012 5009',
      mobile: '+44 7700 900009', preferredContact: 'phone',
      address: { line1: '67 Beech Street', city: 'Cardiff', county: 'Cardiff', postcode: 'CF1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 38000, netWorth: 450000, liquidAssets: 85000, monthlyExpenses: 1800 },
    risk_profile: { riskTolerance: 'conservative', attitudeToRisk: 2, knowledgeExperience: 'basic' }
  },
  {
    client_ref: 'CLI-DEMO-010',
    personal_details: {
      title: 'Mrs', firstName: 'Amanda', lastName: 'Walker',
      dateOfBirth: '1985-06-14', gender: 'female', nationality: 'GB',
      maritalStatus: 'married', dependents: 2, employmentStatus: 'employed',
      occupation: 'Solicitor'
    },
    contact_info: {
      email: 'amanda.walker@example.com', phone: '+44 191 234 5010',
      mobile: '+44 7700 900010', preferredContact: 'email',
      address: { line1: '99 Hawthorn Drive', city: 'Newcastle', county: 'Tyne and Wear', postcode: 'NE1 1AA', country: 'United Kingdom' }
    },
    financial_profile: { annualIncome: 78000, netWorth: 410000, liquidAssets: 55000, monthlyExpenses: 3500 },
    risk_profile: { riskTolerance: 'balanced', attitudeToRisk: 5, knowledgeExperience: 'informed' }
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

  // Separate client for sign-in lookups (to avoid polluting service role auth state)
  const authLookupClient = createClient(supabaseUrl, supabaseKey, {
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

  const userIdMap = {} // email -> actual auth user ID
  for (const user of DEMO_USERS) {
    let userId

    // Try to create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name
      }
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        // User exists — sign in via separate client to retrieve their actual ID
        const { data: signInData, error: signInError } = await authLookupClient.auth.signInWithPassword({
          email: user.email,
          password: user.password
        })
        if (signInError) {
          console.log(`   ❌ ${user.email}: exists but sign-in failed - ${signInError.message}`)
          continue
        }
        userId = signInData.user.id
        console.log(`   ℹ️  ${user.email}: already exists (id: ${userId.slice(0, 8)}...)`)
      } else {
        console.log(`   ❌ ${user.email}: ${authError.message}`)
        continue
      }
    } else {
      userId = authData.user.id
    }

    userIdMap[user.email] = userId

    // Create/update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: user.phone,
        firm_id: DEMO_FIRM.id
      }, { onConflict: 'id' })

    if (profileError) {
      console.log(`   ⚠️  ${user.email}: Profile error - ${profileError.message}`)
    } else {
      console.log(`   ✅ ${user.first_name} ${user.last_name} (${user.role}) - ${user.email}`)
    }
  }

  // Step 3: Create demo clients
  console.log('\n👤 Creating demo clients...')
  const advisorId = userIdMap[DEMO_USERS[2].email] || DEMO_USERS[2].id // Emma Davies (advisor)

  for (const client of DEMO_CLIENTS) {
    const { error: clientError } = await supabase
      .from('clients')
      .upsert({
        client_ref: client.client_ref,
        personal_details: client.personal_details,
        contact_info: client.contact_info,
        financial_profile: client.financial_profile,
        risk_profile: client.risk_profile,
        firm_id: DEMO_FIRM.id,
        advisor_id: advisorId,
        status: 'active'
      }, { onConflict: 'client_ref' })

    if (clientError) {
      console.log(`   ⚠️  ${client.personal_details.firstName} ${client.personal_details.lastName}: ${clientError.message}`)
    } else {
      console.log(`   ✅ ${client.personal_details.firstName} ${client.personal_details.lastName}`)
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

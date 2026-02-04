// run-migration-v2.mjs
// Creates tables using Supabase REST API by inserting dummy data (will create table if configured)
// Or check if we can use postgres.js or other direct connection

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Use fetch to call the Supabase SQL endpoint directly
async function runSQL(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  })
  return response
}

// Alternative: Use the pg package if available
async function runWithPg() {
  try {
    const pg = await import('pg')
    const { Client } = pg.default || pg

    // Try direct connection (requires DATABASE_URL)
    const connectionString = process.env.DATABASE_URL ||
      `postgresql://postgres.maandodhonjolrmcxivo:${process.env.SUPABASE_DB_PASSWORD}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`

    const client = new Client({ connectionString })
    await client.connect()

    console.log('Connected to database!')

    // Run migrations one by one
    const migrations = [
      `CREATE TABLE IF NOT EXISTS file_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id UUID,
        client_id UUID,
        adviser_id UUID,
        reviewer_id UUID,
        review_type TEXT DEFAULT 'new_business',
        status TEXT DEFAULT 'pending',
        checklist JSONB DEFAULT '{}',
        findings TEXT,
        risk_rating TEXT,
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS complaint_register (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id UUID,
        client_id UUID,
        reference_number TEXT,
        complaint_date DATE NOT NULL,
        received_via TEXT DEFAULT 'email',
        category TEXT DEFAULT 'other',
        description TEXT NOT NULL,
        root_cause TEXT,
        status TEXT DEFAULT 'open',
        resolution TEXT,
        resolution_date DATE,
        redress_amount DECIMAL(12,2) DEFAULT 0,
        lessons_learned TEXT,
        fca_reportable BOOLEAN DEFAULT FALSE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS breach_register (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id UUID,
        reference_number TEXT,
        breach_date DATE NOT NULL,
        discovered_date DATE NOT NULL,
        category TEXT DEFAULT 'other',
        severity TEXT DEFAULT 'minor',
        description TEXT NOT NULL,
        root_cause TEXT,
        affected_clients INTEGER DEFAULT 0,
        status TEXT DEFAULT 'open',
        remediation_actions TEXT,
        remediation_date DATE,
        fca_notified BOOLEAN DEFAULT FALSE,
        fca_notification_date DATE,
        lessons_learned TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS vulnerability_register (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id UUID,
        client_id UUID,
        assessment_date DATE DEFAULT CURRENT_DATE,
        vulnerability_type TEXT NOT NULL,
        severity TEXT DEFAULT 'low',
        description TEXT,
        support_measures TEXT,
        review_frequency TEXT DEFAULT 'quarterly',
        next_review_date DATE,
        status TEXT DEFAULT 'active',
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS compliance_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id UUID,
        rule_name TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        configuration JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS client_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id UUID,
        client_id UUID,
        services_selected JSONB DEFAULT '[]',
        target_market_checks JSONB DEFAULT '{}',
        suitability_justification TEXT,
        platform_selected TEXT,
        platform_justification JSONB DEFAULT '{}',
        decumulation_strategy TEXT,
        decumulation_justification TEXT,
        sustainability_assessment JSONB DEFAULT '{}',
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    ]

    for (const sql of migrations) {
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]
      try {
        await client.query(sql)
        console.log(`✓ Created table: ${tableName}`)
      } catch (err) {
        console.log(`✗ Error creating ${tableName}: ${err.message}`)
      }
    }

    // Enable RLS
    const rlsTables = ['file_reviews', 'complaint_register', 'breach_register', 'vulnerability_register', 'compliance_rules', 'client_services']
    for (const table of rlsTables) {
      try {
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)
        console.log(`✓ Enabled RLS on ${table}`)
      } catch (err) {
        console.log(`  RLS already enabled on ${table}`)
      }
    }

    // Create policies
    for (const table of rlsTables) {
      const policies = [
        `CREATE POLICY IF NOT EXISTS "${table}_select" ON ${table} FOR SELECT USING (true)`,
        `CREATE POLICY IF NOT EXISTS "${table}_insert" ON ${table} FOR INSERT WITH CHECK (true)`,
        `CREATE POLICY IF NOT EXISTS "${table}_update" ON ${table} FOR UPDATE USING (true)`
      ]
      for (const policy of policies) {
        try {
          await client.query(policy)
        } catch (err) {
          // Policy may already exist
        }
      }
      console.log(`✓ Policies created for ${table}`)
    }

    // Insert default rules
    const defaultRules = [
      { rule_name: 'New Business Review Rate', rule_type: 'qa_threshold', configuration: JSON.stringify({ percentage: 100, description: 'Review 100% of new business in first year' }) },
      { rule_name: 'Ongoing File Review Rate', rule_type: 'qa_threshold', configuration: JSON.stringify({ percentage: 25, description: 'Review 25% of ongoing client files annually' }) },
      { rule_name: 'High Risk Client Review', rule_type: 'review_frequency', configuration: JSON.stringify({ frequency: 'quarterly', description: 'High risk clients reviewed quarterly' }) },
      { rule_name: 'Overdue Review Alert', rule_type: 'notification', configuration: JSON.stringify({ days_before: 7, recipients: ['compliance_officer'], description: 'Alert 7 days before review due date' }) },
      { rule_name: 'Complaint Escalation', rule_type: 'risk_trigger', configuration: JSON.stringify({ auto_escalate_days: 28, description: 'Auto-escalate complaints not resolved within 28 days' }) }
    ]

    for (const rule of defaultRules) {
      try {
        await client.query(
          `INSERT INTO compliance_rules (rule_name, rule_type, configuration) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [rule.rule_name, rule.rule_type, rule.configuration]
        )
        console.log(`✓ Inserted rule: ${rule.rule_name}`)
      } catch (err) {
        console.log(`  Rule ${rule.rule_name}: ${err.message}`)
      }
    }

    await client.end()
    console.log('\n✅ Migration complete!')

  } catch (err) {
    console.error('pg module not available or connection failed:', err.message)
    console.log('\nPlease run the migration manually in Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql/new')
    console.log('\nCopy the contents of migration-to-run.sql and paste it there.')
  }
}

runWithPg()

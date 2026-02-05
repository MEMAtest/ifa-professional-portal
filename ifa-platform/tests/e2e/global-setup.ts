import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

/**
 * Global Setup for E2E Tests
 *
 * This file runs once before all tests to prepare the test environment.
 * Common uses:
 * - Authenticate once and save auth state
 * - Seed test database
 * - Start external services
 * - Setup test data
 *
 * To enable, uncomment the globalSetup line in playwright.config.ts
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');

  loadEnvConfig(process.cwd());

  const baseURL = (config.projects[0].use.baseURL as string | undefined) || 'http://127.0.0.1:3000';
  const storageStatePath = path.join(__dirname, '../../.auth/user.json');

  // Create auth directory if it doesn't exist
  const authDir = path.dirname(storageStatePath);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Option 1: Authenticate once and save state
  // This is more efficient than logging in for every test
  if (process.env.E2E_SHARED_AUTH !== '0') {
    console.log('🔐 Authenticating and saving session state...');
    await ensureTestUser(baseURL);
    await authenticateAndSaveState(baseURL, storageStatePath);
  }

  // Option 2: Seed test database (if applicable)
  // This would connect to your test database and insert test data
  if (process.env.E2E_SEED_DB === '1') {
    console.log('🌱 Seeding test database...');
    // await seedTestDatabase();
  }

  // Option 3: Wait for services to be ready
  if (process.env.E2E_WAIT_FOR_SERVICES === '1') {
    console.log('⏳ Waiting for services to be ready...');
    await waitForServices(baseURL);
  }

  console.log('✅ Global setup completed successfully');
}

/**
 * Authenticate once and save the session state
 * Tests can then reuse this state to skip login
 */
async function authenticateAndSaveState(baseURL: string = 'http://localhost:3000', storageStatePath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Fill login form
    const email = process.env.E2E_EMAIL || 'demo@plannetic.com';
    const password = process.env.E2E_PASSWORD || 'demo123';

    await page
      .waitForSelector('form[data-hydrated="true"]', { timeout: 15_000 })
      .catch(() => {});
    await page.fill('#email', email);
    await page.fill('#password', password);

    // Click login button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await page
      .waitForSelector('button[type="submit"]:not([disabled])', { timeout: 15_000 })
      .catch(() => {});
    await signInButton.click();

    // Wait for navigation to a post-login page (dashboard/setup/onboarding)
    await page.waitForURL(/\/(dashboard|setup|onboarding)/, { timeout: 30_000 });

    // Prefer landing on dashboard for subsequent tests
    if (!page.url().includes('/dashboard')) {
      await page.goto(`${baseURL}/dashboard`);
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 }).catch(() => {});
    }

    // Warm key pages to avoid first-test timeouts
    await page.goto(`${baseURL}/assessments/suitability?isProspect=true`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000
    }).catch(() => {});

    // Save authenticated state
    await page.context().storageState({ path: storageStatePath });

    console.log(`✅ Authentication state saved to ${storageStatePath}`);
  } catch (error) {
    console.error('❌ Failed to authenticate:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

function isLocalBaseURL(baseURL: string): boolean {
  try {
    const url = new URL(baseURL);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

async function ensureTestUser(baseURL: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('⚠️  Skipping E2E user setup: missing Supabase service role key');
    return;
  }

  if (!isLocalBaseURL(baseURL) && process.env.E2E_ALLOW_USER_SEED !== '1') {
    console.warn('⚠️  Skipping E2E user setup on non-local baseURL');
    return;
  }

  const email = process.env.E2E_EMAIL || 'demo@plannetic.com';
  const password = process.env.E2E_PASSWORD || 'demo123';

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const firmName = 'E2E Demo Firm';
  const { data: firm } = await supabase
    .from('firms')
    .select('id')
    .eq('name', firmName)
    .maybeSingle();

  const firmId =
    firm?.id ||
    (await supabase
      .from('firms')
      .insert({
        name: firmName,
        subscription_tier: 'professional',
        settings: { test: true, purpose: 'e2e-tests' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    ).data?.id;

  if (!firmId) {
    console.warn('⚠️  Unable to create or fetch E2E firm');
    return;
  }

  const { data: firmSettingsRow } = await supabase
    .from('firms')
    .select('settings')
    .eq('id', firmId)
    .maybeSingle()

  const currentSettings = (firmSettingsRow?.settings ?? {}) as Record<string, any>
  const updatedSettings = {
    ...currentSettings,
    onboarding: {
      ...(currentSettings.onboarding ?? {}),
      completed: true,
    },
    test: true,
    purpose: 'e2e-tests',
  }

  await supabase
    .from('firms')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', firmId)

  const existingUser = await findUserByEmail(supabase, email);
  let userId = existingUser?.id ?? null;

  if (existingUser?.id) {
    await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        firm_id: firmId,
        role: 'owner',
      },
    });
    userId = existingUser.id;
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        firm_id: firmId,
        role: 'owner',
      },
    });
    if (createError) {
      if (createError.message?.includes('already been registered')) {
        const existingAfter = await findUserByEmail(supabase, email);
        if (existingAfter?.id) {
          await supabase.auth.admin.updateUserById(existingAfter.id, {
            password,
            email_confirm: true,
            user_metadata: {
              firm_id: firmId,
              role: 'owner',
            },
          });
          userId = existingAfter.id;
        }
      } else {
        console.warn(`⚠️  Failed to create E2E user: ${createError.message}`);
        return;
      }
    } else {
      userId = created?.user?.id ?? null;
    }
  }

  if (!userId) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    await supabase.from('profiles').insert({
      id: userId,
      firm_id: firmId,
      role: 'owner',
      email,
      first_name: 'E2E',
      last_name: 'Tester',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    await supabase
      .from('profiles')
      .update({ firm_id: firmId, role: 'owner', email })
      .eq('id', userId);
  }
}

async function findUserByEmail(supabase: any, email: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
    if (error) break;
    const users = data?.users ?? [];
    if (users.length === 0) break;
    const match = users.find((user: any) => user.email === email);
    if (match) return match;
  }
  return null;
}

/**
 * Seed test database with required data
 * Adjust this based on your database structure
 */
async function seedTestDatabase() {
  // Example: Connect to test database and insert seed data
  // This is a placeholder - implement based on your database

  /*
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Insert test users
  const { error: userError } = await supabase.from('users').upsert([
    {
      id: 'test-user-1',
      email: 'test@example.com',
      // ... other fields
    },
  ]);

  if (userError) {
    console.error('Failed to seed users:', userError);
    throw userError;
  }

  // Insert test clients
  const { error: clientError } = await supabase.from('clients').upsert([
    {
      id: 'test-client-1',
      first_name: 'Test',
      last_name: 'Client',
      // ... other fields
    },
  ]);

  if (clientError) {
    console.error('Failed to seed clients:', clientError);
    throw clientError;
  }

  console.log('✅ Database seeded successfully');
  */

  console.log('ℹ️ Database seeding not implemented - skipping');
}

/**
 * Wait for required services to be ready
 */
async function waitForServices(baseURL: string = 'http://localhost:3000', maxAttempts = 30) {
  console.log(`Waiting for ${baseURL} to be ready...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        console.log(`✅ Service at ${baseURL} is ready`);
        return;
      }
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxAttempts}: Service not ready yet...`);
    }

    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`Service at ${baseURL} did not become ready after ${maxAttempts} attempts`);
}

/**
 * Helper to check environment is properly configured
 */
function checkEnvironment() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    console.warn('⚠️ Warning: Missing environment variables:', missing.join(', '));
    console.warn('Some tests may fail. Please check your .env.local file.');
  }
}

export default globalSetup;

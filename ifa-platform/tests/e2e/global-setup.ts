import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

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

  const { baseURL } = config.projects[0].use;
  const storageStatePath = path.join(__dirname, '../../.auth/user.json');

  // Create auth directory if it doesn't exist
  const authDir = path.dirname(storageStatePath);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Option 1: Authenticate once and save state
  // This is more efficient than logging in for every test
  if (process.env.E2E_SHARED_AUTH === '1') {
    console.log('🔐 Authenticating and saving session state...');
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

    await page.fill('#email', email);
    await page.fill('#password', password);

    // Click login button
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for navigation to dashboard (indicating successful login)
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

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

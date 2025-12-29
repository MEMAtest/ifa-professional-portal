import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global Teardown for E2E Tests
 *
 * This file runs once after all tests to clean up the test environment.
 * Common uses:
 * - Clean up test database
 * - Remove temporary files
 * - Stop external services
 * - Generate final reports
 *
 * To enable, uncomment the globalTeardown line in playwright.config.ts
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');

  // Option 1: Clean up auth state
  if (process.env.E2E_SHARED_AUTH === '1') {
    console.log('🔐 Cleaning up authentication state...');
    cleanupAuthState();
  }

  // Option 2: Clean up test database
  if (process.env.E2E_CLEANUP_DB === '1') {
    console.log('🗑️ Cleaning up test database...');
    // await cleanupTestDatabase();
  }

  // Option 3: Clean up temporary files
  if (process.env.E2E_CLEANUP_FILES === '1') {
    console.log('📁 Cleaning up temporary files...');
    cleanupTemporaryFiles();
  }

  // Option 4: Generate summary report
  if (process.env.E2E_GENERATE_SUMMARY === '1') {
    console.log('📊 Generating test summary...');
    generateTestSummary();
  }

  console.log('✅ Global teardown completed successfully');
}

/**
 * Clean up saved authentication state
 */
function cleanupAuthState() {
  const authDir = path.join(__dirname, '../../.auth');

  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true });
    console.log('✅ Authentication state cleaned up');
  }
}

/**
 * Clean up test database
 * Adjust this based on your database structure
 */
async function cleanupTestDatabase() {
  // Example: Connect to test database and remove test data
  // This is a placeholder - implement based on your database

  /*
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Delete test data (be careful with this!)
  // Only delete data created by tests
  const { error } = await supabase
    .from('clients')
    .delete()
    .like('email', '%@test.example.com');

  if (error) {
    console.error('Failed to cleanup test data:', error);
  } else {
    console.log('✅ Test database cleaned up');
  }
  */

  console.log('ℹ️ Database cleanup not implemented - skipping');
}

/**
 * Clean up temporary files created during testing
 */
function cleanupTemporaryFiles() {
  const tempDirs = [
    path.join(__dirname, '../../.temp'),
    path.join(__dirname, '../../.cache'),
  ];

  tempDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Cleaned up ${dir}`);
    }
  });
}

/**
 * Generate a summary of test results
 */
function generateTestSummary() {
  const resultsPath = path.join(__dirname, '../../test-results/results.json');

  if (!fs.existsSync(resultsPath)) {
    console.log('ℹ️ No test results file found - skipping summary');
    return;
  }

  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

    const summary = {
      total: results.suites?.reduce((acc: number, suite: any) => {
        return acc + (suite.tests?.length || 0);
      }, 0) || 0,
      passed: results.suites?.reduce((acc: number, suite: any) => {
        return acc + (suite.tests?.filter((t: any) => t.status === 'passed').length || 0);
      }, 0) || 0,
      failed: results.suites?.reduce((acc: number, suite: any) => {
        return acc + (suite.tests?.filter((t: any) => t.status === 'failed').length || 0);
      }, 0) || 0,
      skipped: results.suites?.reduce((acc: number, suite: any) => {
        return acc + (suite.tests?.filter((t: any) => t.status === 'skipped').length || 0);
      }, 0) || 0,
    };

    console.log('\n📊 Test Summary:');
    console.log(`   Total: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⏭️  Skipped: ${summary.skipped}`);

    // Write summary to file
    const summaryPath = path.join(__dirname, '../../test-results/summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Summary saved to ${summaryPath}`);

  } catch (error) {
    console.error('Failed to generate test summary:', error);
  }
}

export default globalTeardown;

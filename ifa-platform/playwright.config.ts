import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for IFA Platform E2E Testing
 *
 * Environment Variables:
 * - E2E_BASE_URL: Override base URL for tests
 * - E2E_PORT: Override port for dev server
 * - E2E_WEB_SERVER: Set to '1' to auto-start dev server
 * - E2E_EMAIL: Test user email (default: demo@plannetic.com)
 * - E2E_PASSWORD: Test user password (default: demo123)
 * - CI: Set to 'true' in CI/CD environments
 */

const envBaseURL =
  process.env.E2E_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_API_URL;
const devPort = process.env.E2E_PORT || process.env.NEXT_PORT || process.env.PORT || '3000';
const baseURL = envBaseURL || `http://127.0.0.1:${devPort}`;
const resolvedURL = new URL(baseURL);
const webServerHost = resolvedURL.hostname || '127.0.0.1';
const webServerPort =
  resolvedURL.port || (resolvedURL.protocol === 'https:' ? '443' : '80');

// Determine if running in CI
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',

  // Test timeouts
  timeout: 60_000, // 60 seconds per test
  expect: {
    timeout: 10_000, // 10 seconds for assertions
  },

  // Test execution
  fullyParallel: true,
  forbidOnly: isCI, // Prevent .only in CI
  retries: isCI ? 2 : 0, // Retry failed tests in CI
  workers: isCI ? 1 : undefined, // Serial execution in CI, parallel locally

  // Reporting
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],

  // Output
  outputDir: 'test-results/artifacts',

  // Global setup/teardown (optional - can be added later)
  // globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  // globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  // Browser defaults
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Navigation timeout
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // Collect trace when retrying the failed test
    ...(isCI && { trace: 'on-first-retry' }),
  },

  // Test projects for different browsers and devices
  projects: [
    // ============================================
    // OSO QA AGENT - BRUTAL TESTING
    // ============================================
    {
      name: 'qa-brutal',
      testDir: 'e2e/qa-agent/runners',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Longer timeouts for stress tests
        actionTimeout: 20_000,
      },
    },
    {
      name: 'qa-suitability',
      testDir: 'e2e/suitability',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // ============================================
    // STANDARD BROWSER TESTS
    // ============================================
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
    },

    // Tablet
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
      },
    },
  ],

  // Web server configuration
  webServer: process.env.E2E_WEB_SERVER === '1' ? {
    command: `npm run dev -- --hostname ${webServerHost} --port ${webServerPort}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !isCI, // Always start fresh in CI
    stdout: 'ignore',
    stderr: 'pipe',
  } : undefined,
});

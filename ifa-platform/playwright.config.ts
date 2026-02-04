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

const wantsLocalServer = process.env.E2E_WEB_SERVER === '1';
const appUrlCandidate =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL;

const isLocalUrl = (value?: string) => {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const envBaseURL =
  process.env.E2E_BASE_URL ||
  (wantsLocalServer ? (isLocalUrl(appUrlCandidate) ? appUrlCandidate : undefined) : appUrlCandidate);
const devPort = process.env.E2E_PORT || process.env.NEXT_PORT || process.env.PORT || '3000';
const baseURL = envBaseURL || `http://localhost:${devPort}`;
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

  // Global setup/teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
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
      timeout: 120_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Longer timeouts for stress tests
        actionTimeout: 20_000,
        storageState: '.auth/user.json',
      },
      testIgnore: ['**/security/**'],
    },
    {
      name: 'qa-suitability',
      testDir: 'e2e/suitability',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: '.auth/user.json',
      },
      testIgnore: ['**/security/**'],
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
      testIgnore: ['**/security/**'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
      testIgnore: ['**/security/**'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
      testIgnore: ['**/security/**'],
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
      testIgnore: ['**/security/**'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
      testIgnore: ['**/security/**'],
    },

    // Tablet
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
      },
      testIgnore: ['**/security/**'],
    },

    // ============================================
    // SECURITY - CROSS-TENANT ISOLATION
    // ============================================
    {
      name: 'security-isolation',
      testDir: 'tests/e2e/security/cross-tenant',
      testMatch: '*.spec.ts',
      fullyParallel: false,
      use: {
        baseURL,
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

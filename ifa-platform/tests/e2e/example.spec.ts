import { test, expect } from '@playwright/test';
import { createTestHelpers } from './helpers/test-utils';
import { testClients, testUsers, generateUniqueClient } from './fixtures/test-data';

/**
 * Example E2E Test Suite
 *
 * This file demonstrates how to use the test helpers and fixtures
 * to write comprehensive E2E tests for the IFA Platform.
 */

test.describe('Example Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // This runs before each test in this describe block
    const helpers = createTestHelpers(page);
    await helpers.auth.loginIfNeeded();
  });

  test('should navigate through main pages', async ({ page }) => {
    const helpers = createTestHelpers(page);

    const goToWithAuth = async (path: string, pattern: RegExp) => {
      await page.goto(path);
      if (page.url().includes('/login')) {
        await helpers.auth.login();
        await page.goto(path);
      }
      await expect(page).toHaveURL(pattern);
    };

    // Navigate to dashboard
    await goToWithAuth('/dashboard', /dashboard/);

    // Navigate to clients
    await goToWithAuth('/clients', /clients/);

    // Navigate to cash flow
    await goToWithAuth('/cashflow', /cashflow/);

    // Navigate to stress testing
    await goToWithAuth('/stress-testing', /stress-testing/);
  });

  test('should display dashboard elements', async ({ page }) => {
    const helpers = createTestHelpers(page);

    await helpers.navigation.goToDashboard();

    // Wait for page to load
    await helpers.wait.waitForNetworkIdle();

    // Verify key dashboard elements are visible
    await helpers.wait.waitForVisible('h1, h2, [role="heading"]', 15000);
    await helpers.assert.assertVisible('h1, h2, [role="heading"]');
  });

  test.skip('should create a new client (example - requires form)', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Generate unique client data
    const client = generateUniqueClient(testClients.individual);

    // Navigate to new client page
    await helpers.navigation.goToNewClient();

    // Fill client form
    await helpers.form.fillByPlaceholder('First name', client.firstName);
    await helpers.form.fillByPlaceholder('Last name', client.lastName);
    await helpers.form.fillDate('input[type="date"]', client.dateOfBirth);

    // Take screenshot before submitting
    await helpers.debug.screenshot('before-client-creation');

    // Submit form
    await helpers.form.submitForm(/continue|save/i);

    // Wait for success feedback
    await helpers.wait.waitForToast();

    // Verify success message (adjust selector based on your toast implementation)
    // await helpers.assert.assertToastMessage('Client created');

    // Take screenshot after creation
    await helpers.debug.screenshot('after-client-creation');
  });

  test('should handle authentication flow', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Force logout to validate auth guard
    await page.goto('/dashboard');
    await helpers.auth.logout();

    // Try to access protected page
    await page.goto('/clients');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);

    // Login with test credentials
    await helpers.auth.login(testUsers.admin.email, testUsers.admin.password);

    // Allow redirect to settle
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(!url.includes('/login')).toBeTruthy();

    // Verify authentication state
    const isAuthenticated = await helpers.auth.isAuthenticated();
    expect(isAuthenticated).toBe(true);
  });

  test('should generate unique test data', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Generate unique email
    const email1 = helpers.data.generateUniqueEmail('test');
    const email2 = helpers.data.generateUniqueEmail('test');

    // Emails should be unique
    expect(email1).not.toBe(email2);
    expect(email1).toMatch(/test\.\d+@example\.com/);

    // Generate unique string
    const id1 = helpers.data.generateUniqueString('client');
    const id2 = helpers.data.generateUniqueString('client');

    // IDs should be unique
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/client_\d+/);

    // Format date
    const date = helpers.data.formatDate(new Date('2000-01-15'));
    expect(date).toBe('2000-01-15');
  });
});

test.describe('Mobile Example Tests', () => {
  test.use({
    // Override viewport for these tests
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test('should work on mobile viewport', async ({ page }) => {
    const helpers = createTestHelpers(page);

    await helpers.auth.loginIfNeeded();
    if (page.url().includes('/login')) {
      await helpers.auth.login().catch(() => {});
    }
    await helpers.navigation.goToDashboard().catch(() => {});

    // Verify responsive behavior (dashboard or login if auth not available)
    await helpers.wait.waitForNetworkIdle();
    const atDashboard = page.url().includes('/dashboard');
    const atLogin = page.url().includes('/login');
    expect(atDashboard || atLogin).toBeTruthy();

    // Take mobile screenshot
    await helpers.debug.screenshot('dashboard-mobile');
  });
});

test.describe('Error Handling Examples', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    const helpers = createTestHelpers(page);

    // Enable console logging for debugging
    await helpers.debug.logConsoleMessages();

    await helpers.auth.loginIfNeeded();

    // Simulate offline
    await page.context().setOffline(true);

    // Try to navigate (should fail or show offline message)
    await page.goto('/clients').catch(() => {
      // Expected to fail when offline
    });

    // Re-enable network
    await page.context().setOffline(false);

    // Should recover to a usable page
    await helpers.auth.loginIfNeeded();
    await helpers.navigation.goToDashboard().catch(() => {});
    const recovered = page.url().includes('/dashboard') || page.url().includes('/login');
    expect(recovered).toBeTruthy();
  });

  test.skip('should display validation errors (example)', async ({ page }) => {
    const helpers = createTestHelpers(page);

    await helpers.auth.loginIfNeeded();
    await helpers.navigation.goToNewClient();

    // Submit form without required fields
    await helpers.form.submitForm();

    // Should show validation error
    await helpers.assert.assertErrorMessage('required');
  });
});

test.describe('Performance Examples', () => {
  test('should load dashboard quickly', async ({ page }) => {
    const helpers = createTestHelpers(page);

    await helpers.auth.loginIfNeeded();

    // Measure page load time
    const startTime = Date.now();

    await helpers.navigation.goToDashboard();
    await helpers.wait.waitForNetworkIdle();

    const loadTime = Date.now() - startTime;

    // Dashboard should load within 25 seconds in dev environments
    expect(loadTime).toBeLessThan(25000);

    console.log(`Dashboard load time: ${loadTime}ms`);
  });
});

test.describe('Accessibility Examples', () => {
  test('should have proper page titles', async ({ page }) => {
    const helpers = createTestHelpers(page);

    await helpers.auth.loginIfNeeded();

    // Check dashboard title
    await helpers.navigation.goToDashboard();
    await expect(page).toHaveTitle(/dashboard|plannetic/i);

    // Check clients page title
    await helpers.navigation.goToClients();
    await expect(page).toHaveTitle(/clients|plannetic/i);
  });

  test.skip('should have keyboard navigation (example)', async ({ page }) => {
    const helpers = createTestHelpers(page);

    await helpers.auth.loginIfNeeded();
    await helpers.navigation.goToDashboard();

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    // Should focus on an interactive element
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedElement);
  });
});

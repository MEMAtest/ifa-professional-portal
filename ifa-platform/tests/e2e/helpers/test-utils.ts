import { Page, expect, Locator } from '@playwright/test';

/**
 * E2E Test Utilities for IFA Platform
 *
 * This file contains reusable helper functions and utilities for E2E tests.
 */

// Environment configuration
export const TEST_CONFIG = {
  email: process.env.E2E_EMAIL || 'demo@plannetic.com',
  password: process.env.E2E_PASSWORD || 'demo123',
  baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
  timeout: {
    short: 5_000,
    medium: 15_000,
    long: 30_000,
  },
};

let uniqueCounter = 0;

function buildUniqueSuffix(): string {
  uniqueCounter += 1;
  const timestamp = Date.now().toString();
  const counter = uniqueCounter.toString().padStart(3, '0');
  return `${timestamp}${counter}`;
}

/**
 * Authentication helpers
 */
export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Login to the application
   * @param email - User email (defaults to TEST_CONFIG.email)
   * @param password - User password (defaults to TEST_CONFIG.password)
   */
  async login(email = TEST_CONFIG.email, password = TEST_CONFIG.password): Promise<void> {
    await this.page.goto('/login');
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
    await this.page.waitForURL(/\/(dashboard|setup|onboarding)/, { timeout: TEST_CONFIG.timeout.long });

    if (!this.page.url().includes('/dashboard')) {
      await this.page.goto('/dashboard');
      await this.page.waitForURL(/\/dashboard/, { timeout: TEST_CONFIG.timeout.long }).catch(() => {});
    }
  }

  /**
   * Login only if not already authenticated
   */
  async loginIfNeeded(): Promise<void> {
    await this.page.goto('/dashboard');
    if (this.page.url().includes('/login')) {
      await this.login();
      return;
    }
    if (this.page.url().includes('/setup') || this.page.url().includes('/onboarding')) {
      await this.page.goto('/dashboard');
      await this.page.waitForURL(/\/dashboard/, { timeout: TEST_CONFIG.timeout.long }).catch(() => {});
    }
  }

  /**
   * Logout from the application
   */
  async logout(): Promise<void> {
    const signOutButton = this.page.getByRole('button', { name: /logout|sign out/i });
    const isVisible = await signOutButton.isVisible().catch(() => false);

    if (!isVisible) {
      const userMenuButton = this.page.getByRole('button', { name: /user menu/i });
      if (await userMenuButton.isVisible().catch(() => false)) {
        await userMenuButton.click();
      }
    }

    if (await signOutButton.isVisible().catch(() => false)) {
      await signOutButton.click();
      await this.page.waitForURL(/\/login/, { timeout: TEST_CONFIG.timeout.medium }).catch(() => {});
    }
    if (!this.page.url().includes('/login')) {
      await this.page.context().clearCookies();
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await this.page.goto('/login');
      await this.page.waitForURL(/\/login/, { timeout: TEST_CONFIG.timeout.medium }).catch(() => {});
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    await this.page.goto('/dashboard');
    return !this.page.url().includes('/login');
  }
}

/**
 * Navigation helpers
 */
export class NavigationHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to dashboard
   */
  async goToDashboard(): Promise<void> {
    await this.page.goto('/dashboard');
    await expect(this.page).toHaveURL(/dashboard/);
  }

  /**
   * Navigate to clients page
   */
  async goToClients(): Promise<void> {
    await this.page.goto('/clients');
    await expect(this.page).toHaveURL(/clients/);
  }

  /**
   * Navigate to new client page
   */
  async goToNewClient(): Promise<void> {
    await this.page.goto('/clients/new');
    await expect(this.page).toHaveURL(/clients\/new/);
  }

  /**
   * Navigate to specific client detail page
   */
  async goToClientDetail(clientId: string): Promise<void> {
    await this.page.goto(`/clients/${clientId}`);
    await expect(this.page).toHaveURL(new RegExp(`clients/${clientId}`));
  }

  /**
   * Navigate to cash flow page
   */
  async goToCashFlow(): Promise<void> {
    await this.page.goto('/cashflow');
    await expect(this.page).toHaveURL(/cashflow/);
  }

  /**
   * Navigate to stress testing page
   */
  async goToStressTesting(): Promise<void> {
    await this.page.goto('/stress-testing');
    await expect(this.page).toHaveURL(/stress-testing/);
  }

  /**
   * Navigate to compliance page
   */
  async goToCompliance(): Promise<void> {
    await this.page.goto('/compliance/prod-services');
    await expect(this.page).toHaveURL(/compliance/);
  }

  /**
   * Navigate to reports page
   */
  async goToReports(): Promise<void> {
    await this.page.goto('/reports');
    await expect(this.page).toHaveURL(/reports/);
  }
}

/**
 * Form helpers
 */
export class FormHelpers {
  constructor(private page: Page) {}

  /**
   * Fill a form field by label
   */
  async fillByLabel(label: string, value: string): Promise<void> {
    const input = this.page.getByLabel(label);
    await input.fill(value);
  }

  /**
   * Fill a form field by placeholder
   */
  async fillByPlaceholder(placeholder: string, value: string): Promise<void> {
    const input = this.page.getByPlaceholder(placeholder);
    await input.fill(value);
  }

  /**
   * Select a dropdown option
   */
  async selectOption(selector: string, value: string): Promise<void> {
    await this.page.selectOption(selector, value);
  }

  /**
   * Check a checkbox
   */
  async checkCheckbox(selector: string): Promise<void> {
    await this.page.check(selector);
  }

  /**
   * Uncheck a checkbox
   */
  async uncheckCheckbox(selector: string): Promise<void> {
    await this.page.uncheck(selector);
  }

  /**
   * Fill a date input
   */
  async fillDate(selector: string, date: string): Promise<void> {
    await this.page.fill(selector, date);
  }

  /**
   * Submit a form
   */
  async submitForm(buttonText = /submit|save|continue/i): Promise<void> {
    await this.page.getByRole('button', { name: buttonText }).click();
  }
}

/**
 * Wait helpers
 */
export class WaitHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string, timeout = TEST_CONFIG.timeout.medium): Promise<void> {
    await this.page.locator(selector).waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for element to be hidden
   */
  async waitForHidden(selector: string, timeout = TEST_CONFIG.timeout.medium): Promise<void> {
    await this.page.locator(selector).waitFor({ state: 'hidden', timeout });
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(timeout = TEST_CONFIG.timeout.medium): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch {
      await this.page.waitForLoadState('domcontentloaded', { timeout });
    }
  }

  /**
   * Wait for a specific API response
   */
  async waitForAPIResponse(url: string | RegExp, timeout = TEST_CONFIG.timeout.medium): Promise<void> {
    await this.page.waitForResponse(url, { timeout });
  }

  /**
   * Wait for toast/notification
   */
  async waitForToast(timeout = TEST_CONFIG.timeout.short): Promise<void> {
    // Adjust selector based on your toast library (e.g., sonner, react-hot-toast)
    await this.page.locator('[data-sonner-toast], .toast, [role="alert"]').first().waitFor({
      state: 'visible',
      timeout
    });
  }
}

/**
 * Assertion helpers
 */
export class AssertionHelpers {
  constructor(private page: Page) {}

  /**
   * Assert page title contains text
   */
  async assertTitleContains(text: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(text, 'i'));
  }

  /**
   * Assert URL contains path
   */
  async assertURLContains(path: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  /**
   * Assert element is visible
   */
  async assertVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Assert element is not visible
   */
  async assertNotVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  /**
   * Assert element contains text
   */
  async assertTextContains(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  /**
   * Assert toast message appears
   */
  async assertToastMessage(message: string): Promise<void> {
    const toast = this.page.locator('[data-sonner-toast], .toast, [role="alert"]').first();
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(message);
  }

  /**
   * Assert error message appears
   */
  async assertErrorMessage(message: string): Promise<void> {
    const error = this.page.locator('[role="alert"], .error-message, .text-red-500').first();
    await expect(error).toBeVisible();
    await expect(error).toContainText(message);
  }
}

/**
 * Data helpers
 */
export class DataHelpers {
  /**
   * Generate unique email
   */
  generateUniqueEmail(prefix = 'test'): string {
    return `${prefix}.${buildUniqueSuffix()}@example.com`;
  }

  /**
   * Generate unique string
   */
  generateUniqueString(prefix = 'test'): string {
    return `${prefix}_${buildUniqueSuffix()}`;
  }

  /**
   * Format date for input fields
   */
  formatDate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate random number in range
   */
  randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random boolean
   */
  randomBoolean(): boolean {
    return Math.random() < 0.5;
  }
}

/**
 * Screenshot and debugging helpers
 */
export class DebugHelpers {
  constructor(private page: Page) {}

  /**
   * Take a screenshot with custom name
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Log page console messages
   */
  async logConsoleMessages(): Promise<void> {
    this.page.on('console', msg => console.log('BROWSER:', msg.text()));
  }

  /**
   * Log network requests
   */
  async logNetworkRequests(): Promise<void> {
    this.page.on('request', request => console.log('REQUEST:', request.url()));
    this.page.on('response', response => console.log('RESPONSE:', response.url(), response.status()));
  }

  /**
   * Get page HTML for debugging
   */
  async getPageHTML(): Promise<string> {
    return await this.page.content();
  }

  /**
   * Print element count
   */
  async countElements(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }
}

/**
 * Combined helper class with all utilities
 */
export class TestHelpers {
  auth: AuthHelpers;
  navigation: NavigationHelpers;
  form: FormHelpers;
  wait: WaitHelpers;
  assert: AssertionHelpers;
  data: DataHelpers;
  debug: DebugHelpers;

  constructor(page: Page) {
    this.auth = new AuthHelpers(page);
    this.navigation = new NavigationHelpers(page);
    this.form = new FormHelpers(page);
    this.wait = new WaitHelpers(page);
    this.assert = new AssertionHelpers(page);
    this.data = new DataHelpers();
    this.debug = new DebugHelpers(page);
  }
}

/**
 * Factory function to create test helpers
 */
export function createTestHelpers(page: Page): TestHelpers {
  return new TestHelpers(page);
}

/**
 * Utility to wait for a condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout = TEST_CONFIG.timeout.medium,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Utility to retry an action
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Cleanup helper for tests
 */
export async function cleanup(page: Page): Promise<void> {
  // Clear cookies
  await page.context().clearCookies();

  // Clear local storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

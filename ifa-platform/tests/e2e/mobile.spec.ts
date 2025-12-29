import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || 'demo@plannetic.com';
const PASSWORD = process.env.E2E_PASSWORD || 'demo123';

async function loginIfNeeded(page: Page) {
  await page.goto('/dashboard');
  if (page.url().includes('/login')) {
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  }
}

test.describe('Mobile E2E smoke', () => {
  test('core navigation flows', async ({ page }) => {
    await loginIfNeeded(page);
    await expect(page).toHaveURL(/dashboard/);

    await page.goto('/clients/new');
    await expect(
      page.getByRole('heading', { name: /add new client|new client/i }).first()
    ).toBeVisible();

    await page.fill('input[placeholder="First name"]', 'E2E');
    await page.fill('input[placeholder="Last name"]', 'Mobile');
    await page.fill('input[type="date"]', '1980-01-01');
    await page.getByRole('button', { name: /continue to/i }).click();
    const emailInput = page.locator('input[placeholder="client@example.com"]');
    await emailInput.waitFor();
    await emailInput.fill(`e2e.mobile.${Date.now()}@example.com`);

    await page.goto('/cashflow');
    const cashflowCard = page.getByText('Click to start cash flow analysis').first();
    if (await cashflowCard.isVisible()) {
      await cashflowCard.click();
      await expect(page.getByRole('heading', { name: /cash flow planning/i })).toBeVisible();
    }

    await page.goto('/stress-testing');
    await expect(page.getByText('Stress Testing')).toBeVisible();

    await page.goto('/compliance/prod-services');
    await expect(page.getByText('Services & PROD')).toBeVisible();

    await page.goto('/reports');
    await expect(page.getByText('Document Reports')).toBeVisible();
  });
});

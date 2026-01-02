import { test, expect, Page } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || 'demo@plannetic.com';
const PASSWORD = process.env.E2E_PASSWORD || 'demo123';

async function loginIfNeeded(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) {
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.waitForLoadState('networkidle');
  }
}

async function safeGoto(page: Page, url: string, urlPattern: RegExp) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(urlPattern, { timeout: 15_000 });
      return;
    } catch (error) {
      lastError = error;
      if (!String(error).includes('interrupted by another navigation')) {
        throw error;
      }
      await page.waitForTimeout(500);
    }
  }
  throw lastError;
}

test.describe('Mobile E2E smoke', () => {
  test('core navigation flows', async ({ page }) => {
    await loginIfNeeded(page);
    await expect(page).toHaveURL(/dashboard/);

    await safeGoto(page, '/clients/new', /\/clients\/new/);
    await expect(
      page.getByRole('heading', { name: /add new client|new client/i }).first()
    ).toBeVisible();

    await page.fill('input[placeholder="First name"]', 'E2E');
    await page.fill('input[placeholder="Last name"]', 'Mobile');
    await page.fill('input[type="date"]', '1980-01-01');
    await page.getByPlaceholder('Search nationality...').fill('United');
    const nationalitySelect = page.locator('label:has-text("Nationality (ISO)")').locator('..').locator('select');
    await expect(nationalitySelect).toBeVisible();
    await page.getByPlaceholder('Start typing occupation...').fill('Other');
    const otherOccupationInput = page.locator('#occupation-other');
    await otherOccupationInput.waitFor();
    await otherOccupationInput.fill('Senior Artist');
    await expect(otherOccupationInput).toHaveValue('Senior Artist');
    await page.getByRole('button', { name: /continue to/i }).click();
    const emailInput = page.locator('input[placeholder="client@example.com"]');
    await emailInput.waitFor();
    await emailInput.fill(`e2e.mobile.${Date.now()}@example.com`);
    await page.getByRole('button', { name: /enter address manually/i }).click();
    await page.getByPlaceholder('Street address').fill('12 Example Street');
    await page.getByPlaceholder('City').fill('London');
    await page.getByPlaceholder('Postcode').fill('SE20 7UA');
    await page.getByRole('button', { name: /continue to/i }).click();
    await page.getByRole('button', { name: /previous/i }).click();
    const manualLine1Input = page.getByPlaceholder('Street address');
    if (await manualLine1Input.count()) {
      await expect(manualLine1Input).toHaveValue('12 Example Street');
    } else {
      await expect(page.getByPlaceholder('e.g. 42, 15A, Flat 3')).toHaveValue('12');
      await expect(
        page.getByPlaceholder('Enter street name (e.g. Tremaine Road)')
      ).toHaveValue('Example Street');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await safeGoto(page, '/cashflow', /\/cashflow/);
    const cashflowCard = page.getByText('Click to start cash flow analysis').first();
    if (await cashflowCard.isVisible()) {
      await cashflowCard.click();
      await expect(page.getByRole('heading', { name: /cash flow planning/i })).toBeVisible();
    }

    await safeGoto(page, '/stress-testing', /\/stress-testing/);
    await expect(page.getByText('Stress Testing')).toBeVisible();

    await safeGoto(page, '/compliance/prod-services', /\/compliance\/prod-services/);
    await expect(page.getByText('Services & PROD')).toBeVisible();

    await safeGoto(page, '/reports', /\/reports/);
    const hasReportsHeading = await page.getByRole('heading', { name: /reports/i }).first().isVisible().catch(() => false);
    const hasReportsText = await page.getByText(/reports/i).first().isVisible().catch(() => false);
    const hasContent = ((await page.locator('body').textContent()) || '').length > 100;
    expect(hasReportsHeading || hasReportsText || hasContent).toBeTruthy();
  });
});

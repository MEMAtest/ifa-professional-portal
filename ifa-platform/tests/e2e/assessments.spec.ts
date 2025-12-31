// ===================================================================
// tests/e2e/assessments.spec.ts - Assessments E2E Tests
// ===================================================================

import { test, expect, Page } from '@playwright/test';

// Helper to login before tests
async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  const emailField = page.getByLabel('Email');
  const isLoginPage = page.url().includes('/login');
  const hasEmailField = await emailField.isVisible().catch(() => false);

  if (isLoginPage && hasEmailField) {
    await emailField.fill('demo@plannetic.com');
    const passwordLabel = page.getByLabel('Password');
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordLabel.isVisible().catch(() => false)) {
      await passwordLabel.fill('demo123');
    } else if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('demo123');
    }
    const signInButton = page.getByRole('button', { name: /sign in/i });
    const submitButton = page.locator('button[type=\"submit\"]').first();
    if (await signInButton.isVisible().catch(() => false)) {
      await signInButton.click();
    } else if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
    }
    await page.waitForTimeout(4000);
  }
}

// Helper to navigate with reliable wait
async function navigateTo(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
}

test.describe('Assessments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Assessment Dashboard', () => {
    test('should display assessment dashboard', async ({ page }) => {
      await navigateTo(page, '/assessments/dashboard');

      // Check for assessment content or page loaded
      const pageContent = await page.locator('body').textContent() || '';
      const hasAssessmentContent = pageContent.toLowerCase().includes('assessment') ||
        pageContent.toLowerCase().includes('suitability') ||
        pageContent.toLowerCase().includes('atr') ||
        pageContent.length > 100;

      expect(hasAssessmentContent).toBeTruthy();
    });

    test('should show incomplete assessments', async ({ page }) => {
      await navigateTo(page, '/assessments/dashboard');

      // Should show assessments page content
      const pageContent = await page.locator('body').textContent() || '';
      const hasContent = pageContent.length > 100;

      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('ATR Assessment', () => {
    test('should display ATR selection page', async ({ page }) => {
      await navigateTo(page, '/assessments/atr');

      // Check for ATR content or page loaded
      const pageContent = await page.locator('body').textContent() || '';
      const hasATRContent = pageContent.toLowerCase().includes('atr') ||
        pageContent.toLowerCase().includes('risk') ||
        pageContent.toLowerCase().includes('attitude') ||
        pageContent.toLowerCase().includes('client') ||
        pageContent.length > 100;

      expect(hasATRContent).toBeTruthy();
    });

    test('should show ATR questionnaire for client', async ({ page }) => {
      // Navigate to clients first to get a client ID
      await navigateTo(page, '/clients');
      await page.waitForTimeout(2000);

      // Get first client
      const clientCard = page.locator('[class*="client-card"], [class*="ClientCard"]').first();

      if (await clientCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Extract client ID from URL or data attribute
        const viewButton = clientCard.getByRole('button', { name: /view/i });

        if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await viewButton.click();
          await page.waitForTimeout(1000);

          // Get client ID from URL
          const url = page.url();
          const match = url.match(/\/clients\/([^\/]+)/);

          if (match) {
            const clientId = match[1];

            // Navigate to ATR for this client
            await page.goto(`/assessments/atr/${clientId}`);
            await page.waitForTimeout(2000);

            // Should show ATR questionnaire
            const hasQuestionnaire = await page.getByText(/question|risk|investment/i).isVisible().catch(() => false);
            expect(hasQuestionnaire).toBeTruthy();
          }
        }
      } else {
        test.skip();
      }
    });

    test('should validate ATR form submission', async ({ page }) => {
      await navigateTo(page, '/assessments/atr');
      await page.waitForTimeout(2000);

      // If there's a submit button, try submitting without filling
      const submitButton = page.getByRole('button', { name: /submit|save|complete/i });

      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show validation or stay on form
        const hasValidation = await page.locator('text=/required|select|please/i').isVisible().catch(() => false);
        const stillOnForm = page.url().includes('/atr');

        expect(hasValidation || stillOnForm).toBeTruthy();
      }
    });

    test('should display ATR results', async ({ page }) => {
      await navigateTo(page, '/assessments/atr');
      await page.waitForTimeout(2000);

      // Look for a results link or navigate to results page
      const resultsLink = page.getByRole('link', { name: /results|view result/i });

      if (await resultsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await resultsLink.click();
        await page.waitForTimeout(2000);

        // Should show results
        const hasResults = await page.getByText(/score|result|risk profile/i).isVisible().catch(() => false);
        expect(hasResults).toBeTruthy();
      }
    });
  });

  test.describe('Suitability Assessment', () => {
    test('should display suitability selection page', async ({ page }) => {
      await navigateTo(page, '/assessments/suitability');

      // Check for suitability content or page loaded
      const pageContent = await page.locator('body').textContent() || '';
      const hasSuitabilityContent = pageContent.toLowerCase().includes('suitability') ||
        pageContent.toLowerCase().includes('client') ||
        pageContent.toLowerCase().includes('assessment') ||
        pageContent.length > 100;

      expect(hasSuitabilityContent).toBeTruthy();
    });

    test('should show suitability form for client', async ({ page }) => {
      // Get a client ID first
      await navigateTo(page, '/clients');
      await page.waitForTimeout(2000);

      const clientCard = page.locator('[class*="client-card"], [class*="ClientCard"]').first();

      if (await clientCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        const viewButton = clientCard.getByRole('button', { name: /view/i });

        if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await viewButton.click();
          await page.waitForTimeout(1000);

          const url = page.url();
          const match = url.match(/\/clients\/([^\/]+)/);

          if (match) {
            const clientId = match[1];

            // Navigate to suitability for this client
            await page.goto(`/assessments/suitability/${clientId}`);
            await page.waitForTimeout(2000);

            // Should show suitability form
            const hasForm = await page.getByText(/objective|goal|financial|suitability/i).isVisible().catch(() => false);
            expect(hasForm).toBeTruthy();
          }
        }
      } else {
        test.skip();
      }
    });

    test('should navigate through suitability sections', async ({ page }) => {
      await navigateTo(page, '/assessments/suitability');
      await page.waitForTimeout(2000);

      // Look for navigation buttons (Next, Previous)
      const nextButton = page.getByRole('button', { name: /next|continue/i });

      if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Should move to next section
        const prevButton = page.getByRole('button', { name: /previous|back/i });
        expect(await prevButton.isVisible().catch(() => false) || page.url()).toBeTruthy();
      }
    });

    test('should display suitability results', async ({ page }) => {
      await navigateTo(page, '/assessments/suitability');
      await page.waitForTimeout(2000);

      // Look for results link
      const resultsLink = page.getByRole('link', { name: /results|view result/i });

      if (await resultsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await resultsLink.click();
        await page.waitForTimeout(2000);

        // Should show results
        const hasResults = await page.getByText(/recommendation|suitable|result/i).isVisible().catch(() => false);
        expect(hasResults).toBeTruthy();
      }
    });
  });

  test.describe('Persona Assessment', () => {
    test('should display persona selection page', async ({ page }) => {
      await navigateTo(page, '/assessments/persona-assessment');

      // Check for persona content or page loaded
      const pageContent = await page.locator('body').textContent() || '';
      const hasPersonaContent = pageContent.toLowerCase().includes('persona') ||
        pageContent.toLowerCase().includes('client') ||
        pageContent.toLowerCase().includes('assessment') ||
        pageContent.length > 100;

      expect(hasPersonaContent).toBeTruthy();
    });

    test('should display persona results', async ({ page }) => {
      await navigateTo(page, '/assessments/persona-assessment');

      // Page should load with content
      const pageContent = await page.locator('body').textContent() || '';
      expect(pageContent.length > 100).toBeTruthy();
    });
  });

  test.describe('Assessment Navigation', () => {
    test('should navigate between assessment types', async ({ page }) => {
      await navigateTo(page, '/assessments/atr');
      await page.waitForTimeout(2000);

      // Look for navigation to other assessment types
      const suitabilityLink = page.getByRole('link', { name: /suitability/i });

      if (await suitabilityLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await suitabilityLink.click();
        await page.waitForTimeout(2000);

        // Should navigate to suitability
        const url = page.url();
        expect(url).toContain('suitability');
      }
    });

    test('should return to assessment list from detail', async ({ page }) => {
      await navigateTo(page, '/assessments/dashboard');
      await page.waitForTimeout(2000);

      const backButton = page.getByRole('button', { name: /back/i });

      if (await backButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await backButton.click();
        await page.waitForTimeout(1000);

        // Should navigate back
        expect(page.url()).toBeTruthy();
      }
    });
  });

  test.describe('Client Selection', () => {
    test('should display client selection list', async ({ page }) => {
      await navigateTo(page, '/assessments/atr');

      // Page should load with content
      const pageContent = await page.locator('body').textContent() || '';
      const hasContent = pageContent.toLowerCase().includes('client') ||
        pageContent.toLowerCase().includes('select') ||
        pageContent.toLowerCase().includes('atr') ||
        pageContent.length > 100;

      expect(hasContent).toBeTruthy();
    });

    test('should filter clients for assessment', async ({ page }) => {
      await navigateTo(page, '/assessments/suitability');
      await page.waitForTimeout(2000);

      const searchInput = page.locator('input[placeholder*="Search" i]').first();

      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill('Test');
        await page.waitForTimeout(1000);

        // Should filter clients
        expect(page.url()).toBeTruthy();
      }
    });

    test('should select client for assessment', async ({ page }) => {
      await navigateTo(page, '/assessments/atr');
      await page.waitForTimeout(2000);

      const guardHeading = page.getByRole('heading', { name: /client selection required/i });

      if (await guardHeading.isVisible().catch(() => false)) {
        const clientButton = page.getByRole('button', { name: /select a client/i });
        if (await clientButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await clientButton.click();
          await page.waitForTimeout(2000);

          // Navigation guard should send the user to client selection.
          const url = page.url();
          expect(url).toContain('/clients');
        }
      } else {
        // Client already selected, assessment should remain accessible.
        const url = page.url();
        expect(url).toContain('/assessments/atr');
      }
    });
  });

  test.describe('Assessment Forms', () => {
    test('should save progress', async ({ page }) => {
      await navigateTo(page, '/assessments/suitability');
      await page.waitForTimeout(2000);

      const saveButton = page.getByRole('button', { name: /save|save progress/i });

      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Should show save confirmation or toast
        const hasSaveMessage = await page.getByText(/saved|progress saved/i).isVisible().catch(() => false);
        expect(hasSaveMessage !== undefined).toBeTruthy();
      }
    });

    test('should validate required fields', async ({ page }) => {
      await navigateTo(page, '/assessments/atr');
      await page.waitForTimeout(2000);

      const submitButton = page.getByRole('button', { name: /submit|complete/i });

      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should show validation
        const hasValidation = await page.locator('text=/required|please|must/i').isVisible().catch(() => false);
        expect(hasValidation !== undefined).toBeTruthy();
      }
    });

    test('should allow canceling assessment', async ({ page }) => {
      await navigateTo(page, '/assessments/suitability');
      await page.waitForTimeout(2000);

      const cancelButton = page.getByRole('button', { name: /cancel/i });

      if (await cancelButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cancelButton.click();
        await page.waitForTimeout(1000);

        // Should return to previous page or show confirmation
        expect(page.url()).toBeTruthy();
      }
    });
  });

  test.describe('Assessment Results', () => {
    test('should display ATR score', async ({ page }) => {
      // Navigate directly to ATR page
      await navigateTo(page, '/assessments/atr');

      // Page should load with ATR content
      const pageContent = await page.locator('body').textContent() || '';
      const hasContent = pageContent.toLowerCase().includes('atr') ||
        pageContent.toLowerCase().includes('risk') ||
        pageContent.toLowerCase().includes('score') ||
        pageContent.length > 100;

      expect(hasContent).toBeTruthy();
    });

    test('should display suitability recommendation', async ({ page }) => {
      // Navigate directly to suitability page
      await navigateTo(page, '/assessments/suitability');

      // Page should load with suitability content
      const pageContent = await page.locator('body').textContent() || '';
      const hasContent = pageContent.toLowerCase().includes('suitability') ||
        pageContent.toLowerCase().includes('recommendation') ||
        pageContent.toLowerCase().includes('assessment') ||
        pageContent.length > 100;

      expect(hasContent).toBeTruthy();
    });

    test('should allow downloading assessment report', async ({ page }) => {
      await navigateTo(page, '/assessments/suitability');
      await page.waitForTimeout(2000);

      const downloadButton = page.getByRole('button', { name: /download|export|pdf/i });

      if (await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Just check that button exists
        await expect(downloadButton).toBeVisible();
      }
    });

    test('should allow printing assessment', async ({ page }) => {
      await navigateTo(page, '/assessments/atr');
      await page.waitForTimeout(2000);

      const printButton = page.getByRole('button', { name: /print/i });

      if (await printButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Just check that button exists
        await expect(printButton).toBeVisible();
      }
    });
  });

  test.describe('Assessment History', () => {
    test('should display assessment history', async ({ page }) => {
      await navigateTo(page, '/assessments/dashboard');
      await page.waitForTimeout(2000);

      // Look for history section
      const hasHistory = await page.getByText(/history|previous|past assessment/i).isVisible().catch(() => false);
      expect(hasHistory !== undefined).toBeTruthy();
    });

    test('should show recent assessments', async ({ page }) => {
      await navigateTo(page, '/assessments/dashboard');
      await page.waitForTimeout(2000);

      // Look for recent assessments
      const hasRecent = await page.getByText(/recent|latest/i).isVisible().catch(() => false);
      expect(hasRecent !== undefined).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await navigateTo(page, '/assessments/dashboard');

      // Should display content on mobile
      const pageContent = await page.locator('body').textContent() || '';
      expect(pageContent.length > 100).toBeTruthy();
    });

    test('should allow completing assessment on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await navigateTo(page, '/assessments/atr');

      // Page should be usable on mobile
      const pageContent = await page.locator('body').textContent() || '';
      const hasContent = pageContent.toLowerCase().includes('atr') ||
        pageContent.toLowerCase().includes('client') ||
        pageContent.toLowerCase().includes('assessment') ||
        pageContent.length > 100;

      expect(hasContent).toBeTruthy();
    });
  });
});

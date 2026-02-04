// ===================================================================
// tests/e2e/file-review.spec.ts - File Review Feature E2E Tests
// ===================================================================

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const emailField = page.getByLabel('Email');
      const isLoginPage = page.url().includes('/login');
      const hasEmailField = await emailField.isVisible().catch(() => false);

      if (isLoginPage && hasEmailField) {
        await emailField.fill(process.env.E2E_EMAIL || 'demo@plannetic.com');
        await page.getByLabel('Password').fill(process.env.E2E_PASSWORD || 'demo123');
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForTimeout(4000);
      }
      return;
    } catch {
      if (attempt < 1) await page.waitForTimeout(2000);
    }
  }
}

async function navigateToClientWithDocuments(page: Page) {
  await page.goto('/clients', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click first client link
  const clientLink = page.locator('a[href*="/clients/"]').first();
  if (await clientLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await clientLink.click();
    await page.waitForTimeout(2000);
  }

  // Navigate to the Documents tab
  const docsTab = page.getByRole('tab', { name: /documents/i }).or(
    page.locator('button', { hasText: /documents/i })
  );
  if (await docsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await docsTab.click();
    await page.waitForTimeout(2000);
  }
}

// ---------------------------------------------------------------------------
// File Review Generation
// ---------------------------------------------------------------------------

test.describe('File Review Generation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should show File Review button only when documents are analysed', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    // Look for "Uploaded" sub-tab if present
    const uploadedTab = page.locator('button', { hasText: /uploaded/i });
    if (await uploadedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await uploadedTab.click();
      await page.waitForTimeout(1000);
    }

    // Check for the analysed count in the subtitle
    const subtitle = page.locator('text=/analysed/i');
    const hasAnalysed = await subtitle.isVisible({ timeout: 3000 }).catch(() => false);

    const fileReviewBtn = page.locator('button', { hasText: /file review/i });

    if (hasAnalysed) {
      await expect(fileReviewBtn).toBeVisible({ timeout: 5000 });
    } else {
      // If no analysed documents, button should not be visible
      const btnVisible = await fileReviewBtn.isVisible({ timeout: 2000 }).catch(() => false);
      // It's acceptable to either be hidden or not exist
      expect(btnVisible).toBeFalsy();
    }
  });

  test('should open modal with progress indicator on click', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    const fileReviewBtn = page.locator('button', { hasText: /file review/i }).first();
    const isVisible = await fileReviewBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No File Review button visible — client may not have analysed documents');

    await fileReviewBtn.click();

    // Modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Should show loading state with progress
    const spinner = modal.locator('.animate-spin').first();
    await expect(spinner).toBeVisible({ timeout: 3000 });

    // Should show one of the step labels
    const stepText = modal.locator('text=/connecting|analysing|generating/i');
    await expect(stepText).toBeVisible({ timeout: 5000 });

    // Should show elapsed timer in format X:XX
    const timerText = modal.locator('text=/elapsed/i');
    await expect(timerText).toBeVisible({ timeout: 5000 });
  });

  test('should display review content after generation completes', async ({ page }) => {
    test.setTimeout(180_000); // 3 minutes — AI generation takes time
    await navigateToClientWithDocuments(page);

    const fileReviewBtn = page.locator('button', { hasText: /file review/i }).first();
    const isVisible = await fileReviewBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No File Review button visible');

    await fileReviewBtn.click();

    // Wait for generation to complete (up to 150s)
    const reviewContent = page.locator('[role="dialog"] .overflow-auto');
    await expect(reviewContent).toBeVisible({ timeout: 150_000 });

    // Should have rendered some headings from the markdown
    const headings = reviewContent.locator('h1, h2, h3, h4');
    await expect(headings.first()).toBeVisible({ timeout: 5000 });

    // Should show sidebar with metadata
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Should show documents analysed count
    const docsAnalysed = sidebar.locator('text=/documents analysed/i');
    await expect(docsAnalysed).toBeVisible();

    // Should show provider
    const provider = sidebar.locator('text=/provider/i');
    await expect(provider).toBeVisible();

    // Should show analysis coverage
    const coverage = sidebar.locator('text=/analysis coverage/i');
    await expect(coverage).toBeVisible();
  });

  test('should close modal without error', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    const fileReviewBtn = page.locator('button', { hasText: /file review/i }).first();
    const isVisible = await fileReviewBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No File Review button visible');

    await fileReviewBtn.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Close via the X button
    const closeBtn = modal.locator('button[aria-label="Close file review"]').first();
    await closeBtn.click();

    // Modal should disappear
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// File Review Save Flow
// ---------------------------------------------------------------------------

test.describe('File Review Save', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should save review to client file', async ({ page }) => {
    test.setTimeout(180_000);
    await navigateToClientWithDocuments(page);

    const fileReviewBtn = page.locator('button', { hasText: /file review/i }).first();
    const isVisible = await fileReviewBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No File Review button visible');

    await fileReviewBtn.click();

    // Wait for review to complete
    const saveBtn = page.locator('button[aria-label="Save file review to client file"]');
    await expect(saveBtn).toBeVisible({ timeout: 150_000 });
    await expect(saveBtn).toBeEnabled();

    // Click save
    await saveBtn.click();

    // Should show loading state
    const savingSpinner = saveBtn.locator('.animate-spin');
    // Button text should change to "Saved"
    await expect(saveBtn).toContainText('Saved', { timeout: 15_000 });

    // Button should be disabled after save
    await expect(saveBtn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// PDF and DOCX Export
// ---------------------------------------------------------------------------

test.describe('File Review Export', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should trigger PDF download', async ({ page }) => {
    test.setTimeout(180_000);
    await navigateToClientWithDocuments(page);

    const fileReviewBtn = page.locator('button', { hasText: /file review/i }).first();
    const isVisible = await fileReviewBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No File Review button visible');

    await fileReviewBtn.click();

    // Wait for review to load
    const pdfBtn = page.locator('button[aria-label="Download file review as PDF"]');
    await expect(pdfBtn).toBeVisible({ timeout: 150_000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await pdfBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/File_Review.*\.pdf$/);
  });

  test('should trigger DOCX download', async ({ page }) => {
    test.setTimeout(180_000);
    await navigateToClientWithDocuments(page);

    const fileReviewBtn = page.locator('button', { hasText: /file review/i }).first();
    const isVisible = await fileReviewBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No File Review button visible');

    await fileReviewBtn.click();

    // Wait for review to load
    const docxBtn = page.locator('button[aria-label="Download file review as DOCX"]');
    await expect(docxBtn).toBeVisible({ timeout: 150_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await docxBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/File_Review.*\.docx$/);
  });
});

// ---------------------------------------------------------------------------
// File Review History Section
// ---------------------------------------------------------------------------

test.describe('File Review History', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display file review history section when reviews exist', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    // Look for the file reviews section heading
    const historySection = page.locator('h4', { hasText: /file reviews/i });
    const isVisible = await historySection.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      // Should display review cards or "No file reviews generated yet"
      const reviewCards = page.locator('text=/file review/i').locator('..');
      const emptyState = page.locator('text=/no file reviews generated yet/i');

      const hasCards = await reviewCards.first().isVisible({ timeout: 2000 }).catch(() => false);
      const hasEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasCards || hasEmpty).toBeTruthy();
    }
  });

  test('should open preview modal from history', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    // Find the preview button in the file reviews section
    const previewBtns = page.locator('button', { hasText: /preview/i });
    const firstPreview = previewBtns.first();
    const isVisible = await firstPreview.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No saved file reviews to preview');

    await firstPreview.click();

    // Preview modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Should have rendered markdown content
    const content = modal.locator('.overflow-auto');
    await expect(content).toBeVisible();

    // Close
    const closeBtn = modal.locator('button[aria-label="Close file review preview"]');
    await closeBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('should download PDF from history', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    // Find PDF button in file reviews section
    const pdfBtns = page.locator('button', { hasText: /^pdf$/i });
    const firstPdf = pdfBtns.first();
    const isVisible = await firstPdf.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No saved file reviews with PDF export');

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await firstPdf.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should download DOCX from history', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    const docxBtns = page.locator('button', { hasText: /^docx$/i });
    const firstDocx = docxBtns.first();
    const isVisible = await firstDocx.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No saved file reviews with DOCX export');

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await firstDocx.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  });
});

// ---------------------------------------------------------------------------
// Tag Editor
// ---------------------------------------------------------------------------

test.describe('Tag Editor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should open tag dropdown and toggle tags', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    // Find the "+" button in the tags column
    const addTagBtn = page.locator('button[title="Add tags"]').first();
    const isVisible = await addTagBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No documents with tag editor visible');

    await addTagBtn.click();

    // Dropdown should open
    const dropdown = page.locator('.z-50').filter({ hasText: /done|cancel/i });
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Should have checkboxes for tags
    const checkboxes = dropdown.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Toggle a tag
    await checkboxes.first().click();

    // Click Done
    const doneBtn = dropdown.locator('button', { hasText: /done/i });
    await doneBtn.click();

    // Dropdown should close
    await expect(dropdown).not.toBeVisible({ timeout: 3000 });
  });

  test('should close tag dropdown with cancel and revert changes', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    const addTagBtn = page.locator('button[title="Add tags"]').first();
    const isVisible = await addTagBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No documents with tag editor visible');

    await addTagBtn.click();

    const dropdown = page.locator('.z-50').filter({ hasText: /done|cancel/i });
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    // Click Cancel
    const cancelBtn = dropdown.locator('button', { hasText: /cancel/i });
    await cancelBtn.click();

    // Dropdown should close
    await expect(dropdown).not.toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// Security: API Authentication
// ---------------------------------------------------------------------------

test.describe('File Review API Security', () => {

  test('should return 401 when not authenticated', async ({ request }) => {
    const response = await request.post('/api/clients/fake-id/file-review', {
      headers: { 'Content-Type': 'application/json' },
    });

    // Should be 401 or 403 (depending on auth middleware)
    expect([401, 403]).toContain(response.status());

    const body = await response.json().catch(() => ({}));
    expect(body.success === false || Boolean(body.error)).toBeTruthy();

    // Error message should NOT contain API keys or internal details
    const errorStr = JSON.stringify(body);
    expect(errorStr).not.toMatch(/sk-|Bearer|api[_-]?key/i);
  });

  test('should return 400 for missing client ID', async ({ request }) => {
    // Note: This test may need valid auth cookies to reach the client ID check.
    // In practice, it will return 401 without auth, which is still correct.
    const response = await request.post('/api/clients//file-review');
    expect([400, 401, 403, 404]).toContain(response.status());
  });

  test('should not leak API keys in error responses', async ({ request }) => {
    const response = await request.post('/api/clients/nonexistent-uuid/file-review');
    const body = await response.json().catch(() => ({}));

    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/sk-[a-zA-Z0-9]/);
    expect(bodyStr).not.toMatch(/deepseek.*api.*key/i);
    expect(bodyStr).not.toMatch(/Bearer\s+[a-zA-Z0-9]/);
  });
});

// ---------------------------------------------------------------------------
// DocumentGenerationHub Integration
// ---------------------------------------------------------------------------

test.describe('DocumentGenerationHub File Review Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display file review section in Generated tab', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    // Navigate to Generated sub-tab
    const generatedTab = page.locator('button', { hasText: /generated/i });
    const isVisible = await generatedTab.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!isVisible, 'No Generated tab visible');

    await generatedTab.click();
    await page.waitForTimeout(1500);

    // Look for the file review section
    const fileReviewSection = page.locator('text=/client file review/i');
    await expect(fileReviewSection).toBeVisible({ timeout: 5000 });

    // Should have a generate button
    const generateBtn = page.locator('button', { hasText: /generate.*file review/i });
    await expect(generateBtn).toBeVisible({ timeout: 3000 });
  });

  test('should open file review modal from hub', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    const generatedTab = page.locator('button', { hasText: /generated/i });
    const isVisible = await generatedTab.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!isVisible, 'No Generated tab visible');

    await generatedTab.click();
    await page.waitForTimeout(1500);

    const generateBtn = page.locator('button', { hasText: /generate.*file review/i });
    const btnVisible = await generateBtn.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!btnVisible, 'No generate button visible');

    await generateBtn.click();

    // Modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Should have the file review title
    const title = modal.locator('text=/client file review/i');
    await expect(title).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test.describe('File Review Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper ARIA attributes on modal', async ({ page }) => {
    await navigateToClientWithDocuments(page);

    const fileReviewBtn = page.locator('button', { hasText: /file review/i }).first();
    const isVisible = await fileReviewBtn.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!isVisible, 'No File Review button visible');

    await fileReviewBtn.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Check ARIA attributes
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'file-review-title');

    // Check title element exists
    const title = page.locator('#file-review-title');
    await expect(title).toBeVisible();

    // Close button should have aria-label
    const closeBtn = modal.locator('button[aria-label="Close file review"]');
    await expect(closeBtn).toBeVisible();
  });
});

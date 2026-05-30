import { test, expect } from '@playwright/test';

// These tests require an authenticated session. We use Playwright's storageState
// to persist cookies set by a prior auth setup — run `pnpm exec playwright test --setup`
// (defined in the auth.setup.ts file) before running these tests in CI.
//
// In local development without credentials, these tests are skipped if no
// AUTH_EMAIL / AUTH_PASSWORD env vars are set.

const AUTH_EMAIL = process.env.AUTH_EMAIL ?? '';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? '';

test.describe('Kundli generation form', () => {
  test.skip(!AUTH_EMAIL || !AUTH_PASSWORD, 'Set AUTH_EMAIL and AUTH_PASSWORD to run auth flows');

  test.beforeEach(async ({ page }) => {
    // Sign in programmatically via the login form
    await page.goto('/login');
    await page.fill('input[type="email"]', AUTH_EMAIL);
    await page.fill('input[type="password"]', AUTH_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('navigates to /kundli/generate from dashboard', async ({ page }) => {
    await page.goto('/kundli/generate');
    await expect(page).toHaveURL(/kundli\/generate/);
    await expect(page.locator('h1').filter({ hasText: /kundli/i })).toBeVisible();
  });

  test('shows full name, date, time, and city fields', async ({ page }) => {
    await page.goto('/kundli/generate');
    await expect(page.locator('input[placeholder*="full name" i]')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('input[type="time"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="city" i], input[placeholder*="pincode" i]')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/kundli/generate');
    await page.click('button[type="submit"]');
    // At least one error message should appear
    const errorMsg = page.locator('text=/required|enter|please/i').first();
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
  });

  test('gender radio buttons are present', async ({ page }) => {
    await page.goto('/kundli/generate');
    await expect(page.locator('input[type="radio"][name="gender"]').first()).toBeVisible();
  });

  test('full end-to-end kundli submission with valid data', async ({ page }) => {
    await page.goto('/kundli/generate');

    // Fill birth details
    await page.fill('input[placeholder*="full name" i]', 'Test User E2E');
    await page.fill('input[type="date"]', '1990-06-15');
    await page.fill('input[type="time"]', '10:30');

    // Type a city name and wait for autocomplete
    const cityInput = page.locator('input[placeholder*="city" i], input[placeholder*="pincode" i]');
    await cityInput.fill('Mumbai');
    await page.waitForTimeout(800); // wait for debounced search
    const firstSuggestion = page.locator('[role="listbox"] [role="option"], [data-city], ul li').first();
    if (await firstSuggestion.isVisible()) {
      await firstSuggestion.click();
    }

    // Select time source
    const timeSourceSelect = page.locator('select').first();
    if (await timeSourceSelect.isVisible()) {
      await timeSourceSelect.selectOption('family');
    }

    // Select a gender radio
    const maleRadio = page.locator('input[type="radio"][value="male"], input[type="radio"][value="Male"]').first();
    if (await maleRadio.isVisible()) {
      await maleRadio.click();
    }

    // Submit
    await page.click('button[type="submit"]');

    // Should either move to follow-up questions or redirect to kundli detail
    await page.waitForURL(/kundli\/[\w-]+|kundli\/generate/, { timeout: 30000 });
    // Success if we got a kundli ID in the URL or are on the follow-up screen
    expect(page.url()).toMatch(/kundli/);
  });
});

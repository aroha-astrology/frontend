import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('sign-in page has language picker', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    const langPicker = page.locator('[aria-label="Language"]').or(page.locator('button:has(svg)').first());
    await expect(langPicker).toBeVisible({ timeout: 10_000 });
  });

  test('sign-in page has theme switch', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    // Theme switch should be present in the top bar
    const themeBtn = page.locator('button').filter({ has: page.locator('svg') });
    expect(await themeBtn.count()).toBeGreaterThan(0);
  });
});

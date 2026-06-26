import { test, expect } from '@playwright/test';

test.describe('Home Page (unauthenticated)', () => {
  test('redirects to sign-in', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/sign-in', { timeout: 10_000 });
    expect(page.url()).toContain('/sign-in');
  });
});

test.describe('Sign-in page UI', () => {
  test('shows phone input and send OTP button', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible({ timeout: 10_000 });
  });

  test('shows Aroha branding', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=AROHA').first()).toBeVisible({ timeout: 10_000 });
  });
});

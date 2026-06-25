import { test, expect } from '@playwright/test';

test.describe('Auth Guard', () => {
  test('redirects unauthenticated user from / to /sign-in', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/sign-in', { timeout: 10_000 });
    expect(page.url()).toContain('/sign-in');
  });

  test('redirects unauthenticated user from /kundli to /sign-in', async ({ page }) => {
    await page.goto('/kundli');
    await page.waitForURL('**/sign-in', { timeout: 10_000 });
    expect(page.url()).toContain('/sign-in');
  });

  test('redirects unauthenticated user from /ai-chat to /sign-in', async ({ page }) => {
    await page.goto('/ai-chat');
    await page.waitForURL('**/sign-in', { timeout: 10_000 });
    expect(page.url()).toContain('/sign-in');
  });

  test('sign-in page is accessible without auth', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('text=Send OTP')).toBeVisible({ timeout: 10_000 });
  });

  test('sign-up page is accessible without auth', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page.locator('text=Send OTP')).toBeVisible({ timeout: 10_000 });
  });
});

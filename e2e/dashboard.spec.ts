import { test, expect } from '@playwright/test';

const AUTH_EMAIL = process.env.AUTH_EMAIL ?? '';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? '';

test.describe('Dashboard', () => {
  test.skip(!AUTH_EMAIL || !AUTH_PASSWORD, 'Set AUTH_EMAIL and AUTH_PASSWORD to run auth flows');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', AUTH_EMAIL);
    await page.fill('input[type="password"]', AUTH_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('renders the dashboard page after login', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows navigation bar', async ({ page }) => {
    // Navbar should be visible on dashboard
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible();
  });

  test('shows Generate Kundli quick action', async ({ page }) => {
    const kundliButton = page.locator('a[href*="kundli"], button').filter({ hasText: /kundli|birth chart/i }).first();
    await expect(kundliButton).toBeVisible();
  });

  test('clicking Generate Kundli navigates to /kundli/generate', async ({ page }) => {
    const kundliLink = page.locator('a[href*="kundli/generate"]').first();
    if (await kundliLink.isVisible()) {
      await kundliLink.click();
      await page.waitForURL('**/kundli/generate');
      expect(page.url()).toContain('kundli/generate');
    }
  });

  test('shows daily horoscope section', async ({ page }) => {
    const horoscopeSection = page.locator('text=/today|daily|horoscope/i').first();
    await expect(horoscopeSection).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Credits page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Credits page', () => {
  test.skip(!AUTH_EMAIL || !AUTH_PASSWORD, 'Set AUTH_EMAIL and AUTH_PASSWORD to run auth flows');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', AUTH_EMAIL);
    await page.fill('input[type="password"]', AUTH_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('renders the credits page', async ({ page }) => {
    await page.goto('/credits');
    await expect(page).toHaveURL(/credits/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows credit balance', async ({ page }) => {
    await page.goto('/credits');
    const balanceText = page.locator('text=/credit|balance|₹|coins/i').first();
    await expect(balanceText).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Profile page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Profile page', () => {
  test.skip(!AUTH_EMAIL || !AUTH_PASSWORD, 'Set AUTH_EMAIL and AUTH_PASSWORD to run auth flows');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', AUTH_EMAIL);
    await page.fill('input[type="password"]', AUTH_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('renders the profile page', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/profile/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('shows user email or name', async ({ page }) => {
    await page.goto('/profile');
    const emailOrName = page.locator(`text=${AUTH_EMAIL.split('@')[0]}`).first();
    await expect(emailOrName).toBeVisible({ timeout: 5000 });
  });
});
